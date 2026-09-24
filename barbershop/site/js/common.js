// Shared code for every page: header, footer, mobile menu, popup and entrance animations.
// Each page has empty <div id="site-header"> and <div id="site-footer">, filled in here.
const PAGES = [
  ['index.html', 'Home'], ['services.html', 'Services'],
  ['about.html', 'About'], ['booking.html', 'Contact & Booking']
];

// Gate CSS animations (scroll-reveal etc.) behind JS availability.
document.documentElement.classList.add('js');

function buildHeader() {
  const parts = location.pathname.split('/').filter(Boolean);
  const current = (parts.length ? parts[parts.length - 1] : 'index').replace(/\.[^.]+$/, '') || 'index';
  const links = PAGES.map(([file, label]) =>
    `<li><a href="${file}" ${file.replace(/\.[^.]+$/, '') === current ? 'class="active" aria-current="page"' : ''}>${label}</a></li>`).join('');
  document.getElementById('site-header').innerHTML = `
    <header class="site-header">
      <i class="scroll-progress" aria-hidden="true"></i>
      <div class="container header-inner">
        <a href="index.html" class="brand"><img src="images/logo.svg" alt="" width="48" height="48"><span>Gilded Razor &amp; Co.</span></a>
        <nav id="main-nav" aria-label="Main">
          <ul>${links}</ul>
        </nav>
        <a href="booking.html" class="btn btn-small">Book Now</a>
        <button class="menu-btn" id="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="main-nav">&#9776;</button>
      </div>
    </header>`;
  const btn = document.getElementById('menu-btn');
  const nav = document.getElementById('main-nav');
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.innerHTML = open ? '&times;' : '&#9776;';
  });
}

function buildFooter() {
  const hours = SHOP.hours.map(([d, t]) => `<li>${d}: ${t}</li>`).join('');
  document.getElementById('site-footer').innerHTML = `
    <footer class="site-footer">
      <span class="watermark" aria-hidden="true">GILDED RAZOR</span>
      <div class="container footer-grid">
        <div>
          <h3>${SHOP.name}</h3>
          <p>Traditional barbering since 1952. Sharp cuts, close shaves, good conversation.</p>
          <p class="social">
            <a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.facebook.com/" target="_blank" rel="noopener">Facebook</a>
            <a href="https://www.tiktok.com/" target="_blank" rel="noopener">TikTok</a>
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="services.html">Services</a></li>
            <li><a href="about.html">About</a></li>
            <li><a href="booking.html">Book an appointment</a></li>
          </ul>
        </div>
        <div>
          <h3>Visit us</h3>
          <ul>
            <li>${SHOP.address}</li>
            <li><a href="tel:${SHOP.phone.replace(/\s/g, '')}">${SHOP.phone}</a></li>
            <li><a href="mailto:${SHOP.email}">${SHOP.email}</a></li>
          </ul>
        </div>
        <div>
          <h3>Opening hours</h3>
          <ul>${hours}</ul>
        </div>
      </div>
      <div class="container footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${SHOP.name} All rights reserved.</p>
        <p><a href="terms.html">Terms &amp; Conditions</a> <a href="terms.html#privacy">Privacy</a></p>
      </div>
    </footer>`;
}

// Scroll-reveal: anything with [data-reveal] fades up into view.
function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const finish = (el) => {
    // Drop the marker once animated so the element's own hover transitions still apply.
    const delay = parseFloat(getComputedStyle(el).transitionDelay) || 0;
    setTimeout(() => el.removeAttribute('data-reveal'), 850 + delay * 1000);
  };
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => { el.classList.add('in'); finish(el); });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      io.unobserve(el);
      finish(el);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}

// Exposed so pages that inject content (services, about, featured) can scan again.
window.refreshReveals = initReveal;

// Header shrink, top progress bar and hero fade as you scroll.
function initScrollEffects() {
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  const hero = document.querySelector('.hero');
  let ticking = false;
  function apply() {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 24);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
    if (hero) {
      const max = window.innerHeight * 0.9;
      hero.style.setProperty('--hero-fade', String(Math.min(1, y / max)));
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(apply); ticking = true; }
  }, { passive: true });
  apply();
}

// Highlight the nav item for the section currently in view (scroll-spy).
// Sections opt in with data-nav = the nav label they belong to.
function initScrollSpy() {
  const sections = [...document.querySelectorAll('[data-nav]')];
  if (!sections.length) return;
  const links = [...document.querySelectorAll('#main-nav a')];
  const byText = new Map(links.map((a) => [a.textContent.trim().toLowerCase(), a]));
  let ticking = false;
  const apply = () => {
    const line = 110;
    let current = sections[0].dataset.nav;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) current = s.dataset.nav;
    }
    links.forEach((a) => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
    const link = byText.get(String(current).toLowerCase());
    if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(apply); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', () => { if (!ticking) { requestAnimationFrame(apply); ticking = true; } });
  apply();
}

// Slow, eased page scrolling powered by Lenis (vendored: js/vendor/lenis.min.js).
// Feel knobs: SCROLL_LERP (lower = smoother/laggier, higher = snappier) and
// SCROLL_WHEEL (multiplier on wheel input; 1 keeps near-native speed).
const SCROLL_LERP = 0.15;
const SCROLL_WHEEL = 1;

function initSmoothScroll() {
  if (!window.Lenis) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lenis = new Lenis({ lerp: SCROLL_LERP, wheelMultiplier: SCROLL_WHEEL });

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  window.lenis = lenis;

  // Route programmatic window.scrollTo (e.g. the booking done-screen) through Lenis.
  const native = window.scrollTo.bind(window);
  window.scrollTo = (a, b) => {
    if (a && typeof a === 'object') {
      if (a.behavior === 'smooth') lenis.scrollTo(a.top || 0, { duration: 0.9 });
      else native(a);
    } else {
      native(a, b);
    }
  };
}

// Popup: first-visit offer, shown once per browser on the home page
function buildPopup() {
  try { if (localStorage.getItem('offerSeen')) return; } catch (e) { /* storage blocked: show anyway */ }
  const box = document.createElement('div');
  box.className = 'modal-overlay';
  box.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal-close" aria-label="Close offer">&times;</button>
      <h2 id="modal-title">10% off your first visit</h2>
      <p>New to the shop? Book your first visit online and take 10% off any service.</p>
      <a href="booking.html?promo=FIRST10" class="btn">Claim my offer</a>
      <button class="link-btn" id="modal-no">No thanks</button>
    </div>`;
  document.body.appendChild(box);
  const close = () => {
    box.remove();
    document.removeEventListener('keydown', onKey);
    try { localStorage.setItem('offerSeen', '1'); } catch (e) { /* ignore */ }
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  box.querySelector('.modal-close').addEventListener('click', close);
  box.querySelector('#modal-no').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); }); // click outside
  document.addEventListener('keydown', onKey);
  box.querySelector('.modal-close').focus();
}

buildHeader();
buildFooter();
initReveal();
initScrollEffects();
initScrollSpy();
initSmoothScroll();
if (document.body.dataset.page === 'home') setTimeout(buildPopup, 3000);