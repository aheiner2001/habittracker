const STORAGE_KEY = 'identity-habit-tracker';

const IDENTITIES = [
  {
    id: 'workout',
    title: 'Someone who works out',
    subtitle: 'Healthy lifestyle',
    task: 'Workout',
    duration: '~30 min',
  },
  {
    id: 'reading',
    title: 'Someone who learns',
    subtitle: 'Reads and grows',
    task: 'Reading',
    duration: '~30 min',
  },
  {
    id: 'music',
    title: 'Someone who makes music',
    subtitle: 'Practice and improve',
    task: 'Music practice',
    duration: '~30 min',
  },
  {
    id: 'professional',
    title: 'Someone professionally ready',
    subtitle: 'Career readiness',
    task: 'Resume / professional work',
    duration: '~30 min',
  },
  {
    id: 'disciple',
    title: 'Disciple of Jesus Christ',
    subtitle: '',
    task: 'Scripture study',
    duration: '~45 min',
  },
  {
    id: 'family',
    title: 'Good husband & father',
    subtitle: 'Someone in control',
    task: 'Reflection',
    duration: '~20 min',
  },
];

let state = { completions: {} };
let storageError = null;
let activeView = 'today';
let calendarCursor = startOfMonth(new Date());
let calendarFilterId = 'all';
let selectedDateKey = todayKey();

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(dateKey, delta) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return todayKey(dt);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completions: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.completions !== 'object' || parsed.completions === null) {
      return { completions: {} };
    }
    return { completions: parsed.completions };
  } catch {
    return { completions: {} };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageError = null;
  } catch {
    storageError = 'Could not save. Changes may be lost if you close this tab.';
  }
}

function isStarted(dateKey, id) {
  return Boolean(state.completions[dateKey]?.[id]);
}

function startedCount(dateKey) {
  return IDENTITIES.reduce((count, identity) => count + (isStarted(dateKey, identity.id) ? 1 : 0), 0);
}

function allStarted(dateKey) {
  return IDENTITIES.every((identity) => isStarted(dateKey, identity.id));
}

function toggleStart(id) {
  const key = todayKey();
  if (!state.completions[key]) state.completions[key] = {};
  if (state.completions[key][id]) {
    delete state.completions[key][id];
    if (Object.keys(state.completions[key]).length === 0) {
      delete state.completions[key];
    }
  } else {
    state.completions[key][id] = true;
  }
  saveState();
  render();
}

function streakFor(id) {
  let cursor = todayKey();
  if (!isStarted(cursor, id)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (isStarted(cursor, id)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function fullDayStreak() {
  let cursor = todayKey();
  if (!allStarted(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (allStarted(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function formatLongDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function formatDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return formatLongDate(new Date(y, m - 1, d));
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayMatchesFilter(dateKey) {
  if (calendarFilterId === 'all') {
    const count = startedCount(dateKey);
    if (count === 0) return 'none';
    if (count === IDENTITIES.length) return 'hit';
    return 'partial';
  }
  return isStarted(dateKey, calendarFilterId) ? 'hit' : 'none';
}

function densityClass(dateKey) {
  if (calendarFilterId !== 'all') return '';
  const count = startedCount(dateKey);
  if (count === 0) return '';
  if (count === IDENTITIES.length) return 'density-6';
  return `density-${count}`;
}

function monthStats(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();
  let withAny = 0;
  let full = 0;
  let countable = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = todayKey(new Date(year, month, day));
    if (dateKey > today) continue;
    countable += 1;
    const count = startedCount(dateKey);
    if (count > 0) withAny += 1;
    if (count === IDENTITIES.length) full += 1;
  }
  return { withAny, full, countable };
}

function ensureSelectedDateForMonth(year, month) {
  if (selectedDateKey) {
    const selected = parseDateKey(selectedDateKey);
    if (selected.getFullYear() === year && selected.getMonth() === month) return;
  }
  const thisMonth = startOfMonth(new Date());
  if (year === thisMonth.getFullYear() && month === thisMonth.getMonth()) {
    selectedDateKey = todayKey();
  } else {
    selectedDateKey = null;
  }
}

function renderDayDots(dateKey) {
  if (calendarFilterId !== 'all') return '';
  return `
    <span class="day-dots" aria-hidden="true">
      ${IDENTITIES.map(
        (identity) =>
          `<span class="day-dot${isStarted(dateKey, identity.id) ? ' is-on' : ''}"></span>`
      ).join('')}
    </span>
  `;
}

function renderDayDetail() {
  if (!selectedDateKey) {
    return `
      <div class="day-detail is-empty-detail">
        <p class="day-detail-hint">Tap a day to see which identities you started.</p>
      </div>
    `;
  }

  const count = startedCount(selectedDateKey);
  const isFuture = selectedDateKey > todayKey();

  return `
    <div class="day-detail">
      <div class="day-detail-header">
        <p class="day-detail-date">${formatDateKey(selectedDateKey)}</p>
        <p class="day-detail-count">${
          isFuture ? 'Future day' : `${count} of ${IDENTITIES.length} started`
        }</p>
      </div>
      <ul class="day-detail-list">
        ${IDENTITIES.map((identity) => {
          const started = isStarted(selectedDateKey, identity.id);
          return `
            <li class="day-detail-item${started ? ' is-started' : ''}">
              <span class="day-detail-name">${identity.title}</span>
              <span class="day-detail-status">${started ? 'Started' : 'Not started'}</span>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
}

function renderStorageError() {
  const el = document.getElementById('storage-error');
  if (!el) return;
  if (storageError) {
    el.hidden = false;
    el.textContent = storageError;
  } else {
    el.hidden = true;
    el.textContent = '';
  }
}

function renderToday() {
  const root = document.getElementById('view-today');
  const key = todayKey();
  const count = startedCount(key);

  root.innerHTML = `
    <div class="view-meta">
      <p class="view-date">${formatLongDate()}</p>
      <p class="view-count">${count} of ${IDENTITIES.length} started</p>
    </div>
    <ul class="identity-list">
      ${IDENTITIES.map((identity) => {
        const started = isStarted(key, identity.id);
        return `
          <li class="identity-row${started ? ' is-started' : ''}">
            <div class="identity-copy">
              <p class="identity-title">${identity.title}</p>
              ${identity.subtitle ? `<p class="identity-subtitle">${identity.subtitle}</p>` : ''}
              <p class="identity-task">${identity.task} <span>${identity.duration}</span></p>
            </div>
            <button
              type="button"
              class="start-btn${started ? ' is-started' : ''}"
              data-toggle="${identity.id}"
              aria-pressed="${started}"
            >
              <span class="start-mark" aria-hidden="true">${started ? '✓' : ''}</span>
              <span class="start-label">${started ? 'Started' : 'Start'}</span>
            </button>
          </li>
        `;
      }).join('')}
    </ul>
  `;

  root.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => toggleStart(btn.getAttribute('data-toggle')));
  });
}

function renderProgress() {
  const root = document.getElementById('view-progress');
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  ensureSelectedDateForMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();
  const stats = monthStats(year, month);
  const showDots = calendarFilterId === 'all';

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push('<div class="day-cell is-empty" aria-hidden="true"></div>');
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = todayKey(new Date(year, month, day));
    const match = dayMatchesFilter(dateKey);
    const density = densityClass(dateKey);
    const classes = ['day-cell'];
    if (showDots) classes.push('has-dots');
    if (dateKey === today) classes.push('is-today');
    if (dateKey === selectedDateKey) classes.push('is-selected');
    if (match === 'hit') classes.push('is-hit');
    if (match === 'partial') classes.push('is-partial');
    if (density) classes.push(density);
    const count = startedCount(dateKey);
    const label =
      calendarFilterId === 'all'
        ? `${formatDateKey(dateKey)}, ${count} of ${IDENTITIES.length} started`
        : `${formatDateKey(dateKey)}, ${
            isStarted(dateKey, calendarFilterId) ? 'started' : 'not started'
          }`;
    cells.push(`
      <button
        type="button"
        class="${classes.join(' ')}"
        data-date="${dateKey}"
        aria-label="${label}"
        aria-pressed="${dateKey === selectedDateKey}"
      >
        <span class="day-num">${day}</span>
        ${renderDayDots(dateKey)}
      </button>
    `);
  }

  const fullStreak = fullDayStreak();

  root.innerHTML = `
    <section class="progress-section">
      <h2 class="section-heading">Streaks</h2>
      <ul class="streak-list">
        <li class="streak-full">
          <p class="streak-name">Full day (all six)</p>
          <p class="streak-value">${fullStreak} day${fullStreak === 1 ? '' : 's'}</p>
        </li>
        ${IDENTITIES.map((identity) => {
          const streak = streakFor(identity.id);
          return `
            <li class="streak-item">
              <p class="streak-name">${identity.title}</p>
              <p class="streak-value">${streak} day${streak === 1 ? '' : 's'}</p>
            </li>
          `;
        }).join('')}
      </ul>
    </section>
    <section class="progress-section">
      <h2 class="section-heading">History</h2>
      <div class="calendar-toolbar">
        <div class="month-nav">
          <button type="button" class="icon-btn" id="prev-month" aria-label="Previous month">‹</button>
          <p class="month-label">${formatMonthLabel(calendarCursor)}</p>
          <button type="button" class="icon-btn" id="next-month" aria-label="Next month">›</button>
        </div>
        <label>
          <span class="visually-hidden">Filter</span>
          <select class="filter-select" id="calendar-filter">
            <option value="all"${calendarFilterId === 'all' ? ' selected' : ''}>All identities</option>
            ${IDENTITIES.map(
              (identity) =>
                `<option value="${identity.id}"${calendarFilterId === identity.id ? ' selected' : ''}>${identity.title}</option>`
            ).join('')}
          </select>
        </label>
      </div>
      <div class="calendar">
        <div class="calendar-weekdays">
          ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            .map((label) => `<div class="weekday">${label}</div>`)
            .join('')}
        </div>
        <div class="calendar-grid">
          ${cells.join('')}
        </div>
      </div>
      <div class="calendar-legend" aria-hidden="true">
        <span><i class="swatch swatch-empty"></i> None</span>
        <span><i class="swatch swatch-partial"></i> Some</span>
        <span><i class="swatch swatch-full"></i> All six</span>
      </div>
      <p class="month-summary">
        ${stats.withAny} of ${stats.countable} day${stats.countable === 1 ? '' : 's'} with a start
        · ${stats.full} full day${stats.full === 1 ? '' : 's'}
      </p>
      ${renderDayDetail()}
    </section>
  `;

  document.getElementById('prev-month').addEventListener('click', () => {
    calendarCursor = new Date(year, month - 1, 1);
    render();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    calendarCursor = new Date(year, month + 1, 1);
    render();
  });
  document.getElementById('calendar-filter').addEventListener('change', (event) => {
    calendarFilterId = event.target.value;
    render();
  });
  root.querySelectorAll('.day-cell[data-date]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedDateKey = btn.getAttribute('data-date');
      render();
    });
  });
}

function setActiveView(view) {
  activeView = view;
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-view') === view);
  });
  document.getElementById('view-today').hidden = view !== 'today';
  document.getElementById('view-progress').hidden = view !== 'progress';
}

function render() {
  renderStorageError();
  renderToday();
  renderProgress();
  setActiveView(activeView);
}

document.addEventListener('DOMContentLoaded', () => {
  state = loadState();
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveView(btn.getAttribute('data-view'));
    });
  });
  render();
});
