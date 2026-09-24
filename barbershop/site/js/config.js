// All the shop's content lives here, so you only edit one file.
// After deploying the backend, paste its URL below (no trailing slash).
const API_URL = 'http://localhost:3000';

const SHOP = {
  name: 'Gilded Razor & Co.',
  address: '42 Anchor Street, Harbor District',
  phone: '+1 555 014 2200',
  email: 'hello@gildedrazor.example',
  hours: [
    ['Monday', 'Closed'],
    ['Tuesday - Friday', '9:00 AM - 7:00 PM'],
    ['Saturday', '9:00 AM - 6:00 PM'],
    ['Sunday', '10:00 AM - 4:00 PM']
  ]
};

// ids must match the ones in server/server.js
const SERVICES = [
  { id: 'haircut', name: 'Classic Haircut', price: 25, minutes: 30, image: '/images/service-haircut.jpg', desc: 'Scissor and clipper cut, finished with a neck shave and styling.' },
  { id: 'fade', name: 'Skin Fade', price: 30, minutes: 45, image: '/images/service-fade.jpg', desc: 'A sharp, blended fade from skin to length, styled to suit you.' },
  { id: 'beard', name: 'Beard Trim & Shape', price: 18, minutes: 30, image: '/images/service-beard.jpg', desc: 'Shaped and lined up with hot towel and beard oil.' },
  { id: 'shave', name: 'Hot Towel Shave', price: 28, minutes: 30, image: '/images/service-shave.jpg', desc: 'A traditional straight razor shave with hot towels.' },
  { id: 'kids', name: 'Kids Cut (under 12)', price: 18, minutes: 30, image: '/images/service-kids.jpg', desc: 'A patient, friendly cut for our youngest customers.' },
  { id: 'royal', name: 'The Royal Package', price: 60, minutes: 75, image: '/images/service-royal.jpg', desc: 'Haircut, beard trim, hot towel shave and scalp massage.' }
];

const BARBERS = [
  { id: 'marco', photo: 'barber-marco.jpg', name: 'Marco Reyes', role: 'Master barber and owner', bio: 'Marco trained under his grandfather and has run the shop since 1998 — a master of classic cuts and straight razor shaves.' },
  { id: 'dante', photo: 'barber-dante.jpg', name: 'Dante Cruz', role: 'Fade specialist', bio: 'Dante has spent ten years perfecting skin fades and razor-sharp line-ups that outlast your next wash.' },
  { id: 'luca', photo: 'barber-luca.jpg', name: 'Luca Bianchi', role: 'Beard and shave artist', bio: 'Luca treats every beard like a commission. Sculpted, oiled and finished with a hot towel — nothing rushed.' }
];
