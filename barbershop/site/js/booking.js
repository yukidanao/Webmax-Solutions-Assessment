// Booking page logic: pick options -> load free times -> save booking -> calendar links.
// Wrapped in an IIFE so helper/state names can't collide with other scripts on the page.
(() => {
const form = document.getElementById('booking-form');
const serviceSel = document.getElementById('service');
const barberSel = document.getElementById('barber');
const dateInput = document.getElementById('date');
const slotsBox = document.getElementById('slots');
const slotsMsg = document.getElementById('slots-msg');
const errorBox = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
let shopTimezone = 'Asia/Manila'; // filled in from the availability response
let chosenTime = '';
const params = new URLSearchParams(location.search);
const hashParams = new URLSearchParams(location.hash.slice(1));
const promo = (params.get('promo') || hashParams.get('promo')) === 'FIRST10';

// Fill the dropdowns from config.js
serviceSel.innerHTML = '<option value="">Choose a service</option>' +
  SERVICES.map((s) => `<option value="${s.id}">${s.name} - $${s.price} (${s.minutes} min)</option>`).join('');
barberSel.innerHTML = '<option value="">Choose a barber</option>' +
  BARBERS.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
const requestedService = params.get('service') || hashParams.get('service');
if (requestedService && SERVICES.some((service) => service.id === requestedService)) {
  serviceSel.value = requestedService;
}
if (promo) document.getElementById('promo-note').hidden = false;

// Custom calendar picker (replaces the native date input UI)
const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const closedWeekdays = new Set();
SHOP.hours.forEach(([days, hours]) => {
  if (!/closed/i.test(hours)) return;
  const [a, b] = days.split('-').map((s) => s.trim().toLowerCase());
  const from = DAY_INDEX[a];
  const to = b ? DAY_INDEX[b] : from;
  for (let d = from; ; d = (d + 1) % 7) {
    closedWeekdays.add(d);
    if (d === to) break;
  }
});
createDatePicker(document.getElementById('date-picker'), { input: dateInput, closedWeekdays });

async function loadSlots() {
  chosenTime = '';
  slotsBox.innerHTML = '';
  if (!serviceSel.value || !barberSel.value || !dateInput.value) {
    slotsMsg.textContent = 'Choose a service, barber and date to see available times.';
    return;
  }
  slotsMsg.textContent = 'Loading times...';
  try {
    const url = `${API_URL}/api/availability?date=${dateInput.value}&barber=${barberSel.value}&service=${serviceSel.value}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.shopTz) shopTimezone = data.shopTz;
    if (!res.ok) { slotsMsg.textContent = data.error; return; }
    if (data.slots.length === 0) {
      slotsMsg.textContent = data.message || 'No times left on this day. Try another date or barber.';
      return;
    }
    slotsMsg.textContent = 'Pick a time:' + (shopTimezone !== userTz
      ? ` Times are shown in your timezone (${userTz}). The shop is in ${shopTimezone}.`
      : '');
    data.slots.forEach((time) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      const [sh, sm] = time.split(':').map(Number);
      b.textContent = localTimeLabel(wallClockToInstant(shopTimezone, dateInput.value, sh * 60 + sm));
      b.addEventListener('click', () => {
        chosenTime = time;
        slotsBox.querySelectorAll('.slot').forEach((s) => s.classList.remove('selected'));
        b.classList.add('selected');
      });
      slotsBox.appendChild(b);
    });
  } catch (err) {
    slotsMsg.textContent = 'Could not load times. The server may be waking up, so please try again in a few seconds.';
  }
}
[serviceSel, barberSel, dateInput].forEach((el) => el.addEventListener('change', loadSlots));
loadSlots();

// ---- Timezone helpers ----
// The API sends slot times as wall-clock time in the shop's timezone (SHOP_TZ).
// Turn a shop-local "YYYY-MM-DD HH:MM" into an absolute moment, then format it
// for display or for a calendar stamp, so testers see times in THEIR timezone.
function wallClockToInstant(shopTz, date, minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const guess = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h, m));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: shopTz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(guess);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const offset = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - guess.getTime();
  return new Date(guess.getTime() - offset);
}
function localTimeLabel(moment) {
  return moment.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function localDateKey(moment) {
  const p = (n) => String(n).padStart(2, '0');
  return `${moment.getFullYear()}-${p(moment.getMonth() + 1)}-${p(moment.getDate())}`;
}
function formatDate(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.textContent = '';
  if (!chosenTime) { errorBox.textContent = 'Please choose a time slot.'; return; }
  if (!document.getElementById('agree').checked) { errorBox.textContent = 'Please accept the Terms & Conditions.'; return; }
  submitBtn.disabled = true;
  submitBtn.textContent = 'Booking...';
  try {
    const res = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: serviceSel.value, barber: barberSel.value, date: dateInput.value, time: chosenTime,
        name: document.getElementById('name').value, email: document.getElementById('email').value,
        phone: document.getElementById('phone').value, notes: document.getElementById('notes').value, promo
      })
    });
    const data = await res.json();
    if (!res.ok) {
      errorBox.textContent = data.error;
      if (res.status === 409) loadSlots(); // slot was taken, refresh the list
      return;
    }
    showConfirmation(data);
  } catch (err) {
    errorBox.textContent = 'Could not reach the server. Please try again in a few seconds.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm booking';
  }
});

// ---- Calendar ----
// Stamps are UTC with a trailing Z, i.e. the same absolute moment everywhere,
// so a tester in another country sees the appointment at their local clock time.
function utcStamp(moment) {
  const p = (n) => String(n).padStart(2, '0');
  return moment.getUTCFullYear() + p(moment.getUTCMonth() + 1) + p(moment.getUTCDate()) +
    'T' + p(moment.getUTCHours()) + p(moment.getUTCMinutes()) + p(moment.getUTCSeconds()) + 'Z';
}
function icsText(s) { // escape special characters for .ics files
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function showConfirmation(b) {
  const [h, m] = b.time.split(':').map(Number);
  const tz = shopTimezone || 'Asia/Manila';
  const startMoment = wallClockToInstant(tz, b.date, h * 60 + m);
  const endMoment = new Date(startMoment.getTime() + b.minutes * 60000); // end = start + service length
  const start = utcStamp(startMoment);
  const end = utcStamp(endMoment);
  const title = `${b.serviceName} at ${SHOP.name}`;
  const details = `Barber: ${b.barberName}\nService: ${b.serviceName} (${b.minutes} min)\nBooking ref: ${b.id}\nPlease arrive 5 minutes early. To change or cancel, call ${SHOP.phone} at least 24 hours before.`;

  // Google Calendar: a link that opens a pre-filled event
  const googleUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}&dates=${start}/${end}` +
    `&details=${encodeURIComponent(details)}&location=${encodeURIComponent(SHOP.name + ', ' + SHOP.address)}`;

  // Apple / Outlook: a .ics file created in the browser
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gilded Razor//Booking//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${b.id}@gildedrazor.example`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(details)}`, `LOCATION:${icsText(SHOP.name + ', ' + SHOP.address)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Barber appointment in 1 hour', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const icsUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));

  document.getElementById('booking-area').innerHTML = `
    <div class="confirm">
      <h2>You're booked, ${b.name.split(' ')[0]}!</h2>
      <p>A spot is reserved for you. Your booking reference is <strong>${b.id}</strong>.</p>
      <ul class="summary">
        <li><strong>Service:</strong> ${b.serviceName}${b.promo ? ' (10% first-visit discount applies)' : ''}</li>
        <li><strong>Barber:</strong> ${b.barberName}</li>
        <li><strong>When:</strong> ${formatDate(localDateKey(startMoment))}, ${localTimeLabel(startMoment)} - ${localTimeLabel(endMoment)}</li>
        <li><strong>Where:</strong> ${SHOP.address}</li>
      </ul>
      <div class="cal-buttons">
        <a class="btn" href="${googleUrl}" target="_blank" rel="noopener">Add to Google Calendar</a>
        <a class="btn btn-outline" href="${icsUrl}" download="barber-appointment.ics">Add to Apple Calendar (.ics)</a>
      </div>
      <p><a href="booking.html">Make another booking</a></p>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
})();
