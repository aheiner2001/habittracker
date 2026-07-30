# Identity Habit Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local HTML/CSS/JS identity habit tracker where checking means “I started,” with streaks and a history calendar in `localStorage`.

**Architecture:** Single-page app with Today and Progress views. Hardcoded identities; completions keyed by `YYYY-MM-DD` in `localStorage`; streak and calendar logic derived from that store.

**Tech Stack:** Vanilla HTML, CSS, JavaScript (no build tools, no backend).

## Global Constraints

- Local-only: no Firebase, auth, or network APIs.
- Win condition is starting, not finishing a duration; no timers.
- Fixed six identities; not editable in v1.
- No notifications or reminders.
- Spec: `docs/superpowers/specs/2026-07-30-identity-habit-tracker-design.md`.

---

### Task 1: Scaffold HTML shell and identity data

**Files:**
- Create: `index.html`
- Create: `app.js` (identities constant + empty storage stubs)
- Create: `styles.css` (minimal reset only)

**Interfaces:**
- Produces: `IDENTITIES` array with `{ id, title, subtitle, task, duration }`; `STORAGE_KEY = 'identity-habit-tracker'`.

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Become — Identity Habits</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="app">
    <header class="site-header">
      <p class="brand">Become</p>
      <p class="tagline">Start as who you’re becoming.</p>
      <nav class="view-nav" aria-label="Views">
        <button type="button" data-view="today" class="nav-btn is-active">Today</button>
        <button type="button" data-view="progress" class="nav-btn">Progress</button>
      </nav>
    </header>
    <p id="storage-error" class="storage-error" hidden></p>
    <main id="view-today" class="view"></main>
    <main id="view-progress" class="view" hidden></main>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `app.js` with identities and load/save stubs**

```js
const STORAGE_KEY = 'identity-habit-tracker';

const IDENTITIES = [
  { id: 'workout', title: 'Someone who works out', subtitle: 'Healthy lifestyle', task: 'Workout', duration: '~30 min' },
  { id: 'reading', title: 'Someone who learns', subtitle: 'Reads and grows', task: 'Reading', duration: '~30 min' },
  { id: 'music', title: 'Someone who makes music', subtitle: 'Practice and improve', task: 'Music practice', duration: '~30 min' },
  { id: 'professional', title: 'Someone professionally ready', subtitle: 'Career readiness', task: 'Resume / professional work', duration: '~30 min' },
  { id: 'disciple', title: 'Disciple of Jesus Christ', subtitle: '', task: 'Scripture study', duration: '~45 min' },
  { id: 'family', title: 'Good husband & father', subtitle: 'Someone in control', task: 'Reflection', duration: '~20 min' },
];

let state = { completions: {} };
let storageError = null;

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
```

- [ ] **Step 3: Create minimal `styles.css`**

```css
:root {
  --bg0: #e8efe8;
  --bg1: #d4e0d6;
  --ink: #1c2a22;
  --muted: #5a6b60;
  --accent: #2f6b4f;
  --surface: rgba(255, 252, 247, 0.78);
  --started: #2f6b4f;
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Source Sans 3', Georgia, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-body);
  color: var(--ink);
  background:
    radial-gradient(1200px 600px at 10% -10%, #f3f7f0 0%, transparent 55%),
    radial-gradient(900px 500px at 100% 0%, #c5d4c8 0%, transparent 50%),
    linear-gradient(165deg, var(--bg0), var(--bg1));
}
```

- [ ] **Step 4: Open `index.html` in a browser**

Expected: Brand header and Today/Progress nav render; no console errors from missing files.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css app.js
git commit -m "Scaffold Become habit tracker shell and identity data"
```

---

### Task 2: Today view — list and toggle starts

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `index.html` (only if needed)

**Interfaces:**
- Consumes: `IDENTITIES`, `loadState`, `saveState`, `state`
- Produces: `todayKey()`, `isStarted(dateKey, id)`, `toggleStart(id)`, `renderToday()`, view navigation

- [ ] **Step 1: Add date helpers and toggle**

```js
function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isStarted(dateKey, id) {
  return Boolean(state.completions[dateKey]?.[id]);
}

function toggleStart(id) {
  const key = todayKey();
  if (!state.completions[key]) state.completions[key] = {};
  state.completions[key][id] = !state.completions[key][id];
  if (!state.completions[key][id]) delete state.completions[key][id];
  saveState();
  render();
}
```

- [ ] **Step 2: Render Today list with “X of 6 started” and started labels**

Each row: identity title, subtitle (if any), task + soft duration, checkbox labeled “Started” / “Start”.

- [ ] **Step 3: Wire view nav and initial `render()` on DOMContentLoaded**

- [ ] **Step 4: Manual test**

Check a habit, reload page — still checked. Uncheck — persists. Count updates.

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css
git commit -m "Add Today view with start toggles and persistence"
```

---

### Task 3: Streaks and Progress calendar

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Produces: `streakFor(id)`, `fullDayStreak()`, `renderProgress()`, calendar month state (`calendarCursor`, `calendarFilterId`)

- [ ] **Step 1: Implement streak helpers**

```js
function addDays(dateKey, delta) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return todayKey(dt);
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

function allStarted(dateKey) {
  return IDENTITIES.every((i) => isStarted(dateKey, i.id));
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
```

- [ ] **Step 2: Render Progress — streak list + month grid**

- Filter: All | each identity.
- Day cells: highlight if selected filter matches (all six for “all”, or that identity).
- Prev/next month buttons.

- [ ] **Step 3: Manual test**

With seeded `localStorage` dates, streaks and calendar highlights match. Month navigation works.

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "Add streaks and history calendar on Progress view"
```

---

### Task 4: Polish UI, storage error banner, final pass

**Files:**
- Modify: `styles.css`
- Modify: `app.js`

- [ ] **Step 1: Style identity rows, started state, calendar, streaks** per visual direction (calm green/earth, Fraunces + Source Sans 3, atmospheric background).

- [ ] **Step 2: Show `#storage-error` when `storageError` is set; hide when clear.**

- [ ] **Step 3: Manual verification checklist from spec**

- Check/uncheck + reload persists.
- Streaks correct for consecutive days.
- Calendar highlights and month nav.
- Corrupt `localStorage` recovers to empty day.

- [ ] **Step 4: Commit**

```bash
git add styles.css app.js index.html
git commit -m "Polish Become UI and storage error handling"
```
