// Gilded Razor & Co. booking API (Node + Express)
// Bookings are saved in a SQLite database file (better-sqlite3).
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const SHOP_TZ = process.env.SHOP_TZ || 'Asia/Manila'; // change to your shop's timezone

// Only allow your Cloudflare site to call this API (set FRONTEND_URL on the host)
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ---- Database ----
// The file is created automatically the first time the server starts.
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'bookings.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    barber TEXT NOT NULL,
    barberName TEXT NOT NULL,
    date TEXT NOT NULL,          -- "2026-10-01"
    time TEXT NOT NULL,          -- "15:00"
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT,
    promo INTEGER DEFAULT 0,     -- 1 = first-visit offer
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (date, barber, time)  -- safety net: same barber can't start two bookings at once
  )
`);
// Prepared statements: the ? marks are filled in safely (this stops SQL injection)
const findTaken = db.prepare('SELECT time, minutes FROM bookings WHERE date = ? AND barber = ?');
const insertBooking = db.prepare(`
  INSERT INTO bookings (id, service, serviceName, minutes, barber, barberName, date, time, name, email, phone, notes, promo)
  VALUES (@id, @service, @serviceName, @minutes, @barber, @barberName, @date, @time, @name, @email, @phone, @notes, @promo)
`);

// ---- Shop data (keep the ids in sync with site/js/config.js) ----
const SERVICES = {
  haircut: { name: 'Classic Haircut', minutes: 30 },
  fade: { name: 'Skin Fade', minutes: 45 },
  beard: { name: 'Beard Trim & Shape', minutes: 30 },
  shave: { name: 'Hot Towel Shave', minutes: 30 },
  kids: { name: 'Kids Cut (under 12)', minutes: 30 },
  royal: { name: 'The Royal Package', minutes: 75 }
};
const BARBERS = { marco: 'Marco Reyes', dante: 'Dante Cruz', luca: 'Luca Bianchi' };
// Opening hours by weekday (0 = Sunday). Hours are 24h: [open, close]. Monday is closed.
const HOURS = { 0: [10, 16], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 18] };

// ---- Helpers ----
function toMinutes(time) { // "15:30" -> 930
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
function toTime(min) { // 930 -> "15:30"
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}
function shopNow() { // current date and minutes in the shop's timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
function isRealDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date + 'T00:00:00Z'));
}
// Returns every start time still free for this barber, date and service
function freeSlots(date, barber, serviceId) {
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  const hours = HOURS[day];
  if (!hours) return [];
  const length = SERVICES[serviceId].minutes;
  const now = shopNow();
  const taken = findTaken.all(date, barber); // bookings that already exist that day
  const slots = [];
  for (let start = hours[0] * 60; start + length <= hours[1] * 60; start += 30) {
    if (date === now.date && start <= now.minutes) continue; // already passed
    const clash = taken.some((b) => start < toMinutes(b.time) + b.minutes && toMinutes(b.time) < start + length);
    if (!clash) slots.push(toTime(start));
  }
  return slots;
}

// ---- Routes ----
app.get('/', (req, res) => res.send('Gilded Razor API is running'));

app.get('/api/availability', (req, res) => {
  const { date, barber, service } = req.query;
  if (!isRealDate(date) || !BARBERS[barber] || !SERVICES[service]) {
    return res.status(400).json({ error: 'Choose a service, barber and date.' });
  }
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  if (!HOURS[day]) return res.json({ slots: [], message: 'We are closed on Mondays. Please pick another day.', shopTz: SHOP_TZ });
  res.json({ slots: freeSlots(date, barber, service), shopTz: SHOP_TZ });
});

app.post('/api/bookings', (req, res) => {
  const { service, barber, date, time, name, email, phone, notes, promo } = req.body || {};
  if (!SERVICES[service] || !BARBERS[barber] || !isRealDate(date) || !/^\d{2}:\d{2}$/.test(time || '')) {
    return res.status(400).json({ error: 'Some appointment details are missing or invalid.' });
  }
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone || '')) return res.status(400).json({ error: 'Please enter a valid phone number.' });

  // Check again on the server so two people can't book the same slot
  if (!freeSlots(date, barber, service).includes(time)) {
    return res.status(409).json({ error: 'Sorry, that time was just taken. Please pick another slot.' });
  }
  const booking = {
    id: 'GR-' + Date.now().toString(36).toUpperCase(),
    service, serviceName: SERVICES[service].name, minutes: SERVICES[service].minutes,
    barber, barberName: BARBERS[barber], date, time,
    name: name.trim(), email: email.trim(), phone: phone.trim(),
    notes: (notes || '').slice(0, 300), promo: promo === true ? 1 : 0
  };
  try {
    insertBooking.run(booking);
  } catch (err) {
    // Only happens if two people book the exact same slot at the same moment
    return res.status(409).json({ error: 'Sorry, that time was just taken. Please pick another slot.' });
  }
  booking.promo = booking.promo === 1; // send true/false back to the browser
  res.status(201).json(booking);
});

// Serve normally when run locally; export the app when hosted on Vercel.
if (require.main === module) {
  app.listen(PORT, () => console.log('API running on port ' + PORT));
}
module.exports = app;
