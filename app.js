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

function dayMatchesFilter(dateKey) {
  if (calendarFilterId === 'all') {
    const count = startedCount(dateKey);
    if (count === 0) return 'none';
    if (count === IDENTITIES.length) return 'hit';
    return 'partial';
  }
  return isStarted(dateKey, calendarFilterId) ? 'hit' : 'none';
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
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push('<div class="day-cell is-empty"></div>');
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = todayKey(new Date(year, month, day));
    const match = dayMatchesFilter(dateKey);
    const classes = ['day-cell'];
    if (dateKey === today) classes.push('is-today');
    if (match === 'hit') classes.push('is-hit');
    if (match === 'partial') classes.push('is-partial');
    cells.push(`<div class="${classes.join(' ')}" title="${dateKey}">${day}</div>`);
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
