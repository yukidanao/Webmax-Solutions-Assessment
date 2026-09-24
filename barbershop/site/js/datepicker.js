// Custom date picker: a styled month-grid calendar that replaces the native
// <input type="date"> UI. The chosen value still lives in a hidden <input>, so
// the existing booking logic keeps working completely unchanged.
(() => {
  const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DIAMOND = '\u25C6';

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const pretty = (key) => new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  window.createDatePicker = (root, opts = {}) => {
    const closed = opts.closedWeekdays || new Set();
    const input = opts.input || root.querySelector('input');
    const placeholder = opts.placeholder || 'Choose a date';
    const forwardMonths = opts.forwardMonths || 24;

    const today = new Date();
    const todayKey = iso(today);
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear(), today.getMonth() + forwardMonths + 1, 0);

    let value = (input && input.value) || '';
    let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let focusDate = todayMid;

    // ---- Build the DOM ----
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'datepicker-toggle';
    toggle.id = 'date-toggle';
    toggle.setAttribute('aria-haspopup', 'dialog');
    toggle.setAttribute('aria-expanded', 'false');
    const valueSpan = document.createElement('span');
    valueSpan.className = 'datepicker-value' + (value ? '' : ' is-empty');
    valueSpan.textContent = value ? pretty(value) : placeholder;
    const caret = document.createElement('span');
    caret.className = 'datepicker-caret';
    caret.setAttribute('aria-hidden', 'true');
    toggle.append(valueSpan, caret);

    const pop = document.createElement('div');
    pop.className = 'datepicker-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Choose a date');
    pop.hidden = true;
    pop.innerHTML =
      `<div class="datepicker-head">` +
        `<button type="button" class="dp-nav" data-nav="-1" aria-label="Previous month">&lsaquo;</button>` +
        `<div class="dp-title"></div>` +
        `<button type="button" class="dp-nav" data-nav="1" aria-label="Next month">&rsaquo;</button>` +
      `</div>` +
      `<div class="dp-grid dp-week" aria-hidden="true">${WEEKDAYS.map((d) => `<span class="dp-weekday">${d}</span>`).join('')}</div>` +
      `<div class="dp-grid dp-days" role="grid"></div>` +
      `<p class="dp-foot">Closed Mondays <span class="dp-dot">${DIAMOND}</span> Today outlined</p>`;

    const navBtns = pop.querySelectorAll('.dp-nav');
    const title = pop.querySelector('.dp-title');
    const daysBox = pop.querySelector('.dp-days');

    root.classList.add('datepicker');
    root.append(toggle, pop);
    if (input) root.append(input);

    // ---- Selection rules ----
    const isDisabled = (d) => iso(d) < todayKey || d > maxDate || closed.has(d.getDay());
    const isEnabled = (d) => !isDisabled(d);

    // ---- Rendering ----
    function render() {
      title.textContent = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
      navBtns[0].disabled = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();
      const lastMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      navBtns[1].disabled = viewDate.getFullYear() === lastMonth.getFullYear() && viewDate.getMonth() === lastMonth.getMonth();

      const offset = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
      const dim = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < offset; i++) {
        cells.push('<span class="dp-day is-empty" aria-hidden="true"></span>');
      }
      for (let day = 1; day <= dim; day++) {
        const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const key = iso(dt);
        const cls = ['dp-day'];
        if (key === todayKey) cls.push('is-today');
        if (key === value) cls.push('is-selected');
        if (isDisabled(dt)) {
          cls.push('is-disabled');
          if (closed.has(dt.getDay()) && iso(dt) >= todayKey) cls.push('is-closed');
        }
        const label = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        cells.push(
          `<button type="button" class="${cls.join(' ')}" data-date="${key}"${isEnabled(dt) ? '' : ' disabled'}` +
          ` aria-label="${label}"${key === value ? ' aria-pressed="true"' : ''}>${day}</button>`
        );
      }
      daysBox.innerHTML = cells.join('');
    }

    // ---- Open / close ----
    function open() {
      if (value) {
        const v = new Date(value + 'T00:00:00');
        viewDate = new Date(v.getFullYear(), v.getMonth(), 1);
        focusDate = v;
      } else {
        viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
        focusDate = todayMid;
      }
      render();
      pop.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => pop.classList.add('open'));
      const first = daysBox.querySelector('.dp-day:not(:disabled)');
      if (first) first.focus();
    }

    function close() {
      pop.classList.remove('open');
      pop.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    function setValue(key) {
      value = key;
      if (input) {
        input.value = key;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      valueSpan.textContent = pretty(key);
      valueSpan.classList.remove('is-empty');
      close();
    }

    // ---- Keyboard navigation (skips disabled days) ----
    function focusOn(d) {
      if (!isEnabled(d)) return;
      focusDate = d;
      if (d.getFullYear() !== viewDate.getFullYear() || d.getMonth() !== viewDate.getMonth()) {
        viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
        render();
      }
      const btn = daysBox.querySelector(`[data-date="${iso(d)}"]`);
      if (btn) btn.focus();
    }

    function moveFocus(delta) {
      let d = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() + delta);
      for (let i = 0; i < 42 && !isEnabled(d); i++) {
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (delta > 0 ? 1 : -1));
        if (d < todayMid) d = todayMid;
      }
      focusOn(d);
    }

    // ---- Events ----
    toggle.addEventListener('click', () => {
      if (pop.hidden) open();
      else close();
    });

    daysBox.addEventListener('click', (e) => {
      const btn = e.target.closest('.dp-day');
      if (!btn || btn.disabled) return;
      setValue(btn.dataset.date);
    });

    daysBox.addEventListener('keydown', (e) => {
      const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key in map) {
        moveFocus(map[e.key]);
        e.preventDefault();
      } else if (e.key === 'Home') {
        focusOn(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
        e.preventDefault();
      } else if (e.key === 'End') {
        focusOn(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0));
        e.preventDefault();
      }
    });

    navBtns.forEach((btn) => btn.addEventListener('click', () => {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + Number(btn.dataset.nav), 1);
      render();
    }));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden) {
        close();
        toggle.focus();
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!root.contains(e.target)) close();
    });

    root.addEventListener('focusout', (e) => {
      if (!root.contains(e.relatedTarget)) close();
    });

    render();
  };
})();