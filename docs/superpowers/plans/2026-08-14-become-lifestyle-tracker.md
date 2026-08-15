# Become Lifestyle Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Become as a white/sleek multi-page local PWA with Home dashboard, customizable habits, and full Lifestyle tracking (calories, weight, milestones, fasting, events, calendar, passages, backup).

**Architecture:** Three HTML pages sharing `styles.css` and a `js/` module set on `window.Become`. Single `localStorage` key `become-v2`. Pure logic modules are dual-export (browser + Node) so `node --test` covers math without a browser. Old identity `app.js` flow is replaced; no migration from `identity-habit-tracker`.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage, Web App Manifest + service worker, Node built-in test runner for pure helpers.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-14-become-lifestyle-tracker-design.md`
- Brand: Become; pages Home · Habits · Lifestyle; sticky bottom nav
- Visual: white/`#F7F7F5`, accent `#2F6B4F`, Fraunces + Source Sans 3, quiet chrome
- Storage key: `become-v2` only; fresh start; no identity-habit migration
- Calorie target: user-entered; adaptive suggestions Accept/Dismiss only
- Passages: short paraphrased insights; not long verbatim book text
- No backend, auth, barcode, push notifications
- Mobile-first; honor `prefers-reduced-motion`
- Commit after each task; use `/usr/bin/git commit` if wrapper injects unsupported `--trailer`

## File map

| Path | Responsibility |
|------|----------------|
| `index.html` | Home shell + onboarding mount |
| `habits.html` | Habits page |
| `lifestyle.html` | Lifestyle hub |
| `styles.css` | Shared white/sleek system + nav + calendar |
| `js/dates.js` | `todayKey`, `addDays`, `dayOfYear`, month helpers |
| `js/storage.js` | default state, load/save, export/import, banner |
| `js/shell.js` | shared header/nav markup helpers, storage banner |
| `js/onboarding.js` | first-run flow + milestone seed |
| `js/habits.js` | habit CRUD, completions, streaks |
| `js/weight.js` | weight logs, rolling average, chart SVG helpers |
| `js/measurements.js` | measurement logs + same chart helpers |
| `js/milestones.js` | seed, edit, hit detection, celebrate |
| `js/calories.js` | foods, meals, templates, daily log, day totals |
| `js/targets.js` | effective daily target (baseline + overrides) |
| `js/events.js` | high-calorie events + redistribution |
| `js/fasting.js` | fast windows, recurrence expand, timer |
| `js/adaptive.js` | 14-day rate vs 2 lb/week suggestion |
| `js/calendar.js` | Lifestyle month grid + day detail |
| `js/passages.js` | static list + day picker |
| `js/summary.js` | weekly Sunday recap |
| `js/home.js` | Home dashboard render |
| `js/habits-page.js` | Habits page render |
| `js/lifestyle-page.js` | Lifestyle page sections orchestrator |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | offline shell cache |
| `tests/*.test.js` | Node tests for pure logic |
| `app.js` | Delete after cutover (replaced by `js/`) |

**Module pattern** (every pure `js/*.js` file):

```js
(function (root) {
  const Become = (root.Become = root.Become || {});
  function todayKey(d = new Date()) { /* ... */ }
  Become.todayKey = todayKey;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { todayKey };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
```

---

### Task 1: Dates helpers + storage schema + white shell

**Files:**
- Create: `js/dates.js`
- Create: `js/storage.js`
- Create: `js/shell.js`
- Create: `styles.css` (replace)
- Create: `index.html` (replace)
- Create: `habits.html`
- Create: `lifestyle.html`
- Create: `tests/dates.test.js`
- Create: `tests/storage.test.js`
- Delete or stop linking: old Today/Progress-only `app.js` usage from pages

**Interfaces:**
- Produces: `Become.todayKey(d?)`, `Become.addDays(dateKey, delta)`, `Become.dayOfYear(d?)`, `Become.startOfMonth(d)`, `Become.formatLongDate(d?)`, `Become.STORAGE_KEY = 'become-v2'`, `Become.defaultState()`, `Become.loadState()`, `Become.saveState(state)`, `Become.exportState(state)`, `Become.importState(jsonString)`, `Become.renderShell({ active: 'home'|'habits'|'lifestyle' })` → `{ headerHtml, navHtml }`

- [ ] **Step 1: Write `tests/dates.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { todayKey, addDays, dayOfYear } = require('../js/dates.js');

test('todayKey formats local YYYY-MM-DD', () => {
  assert.equal(todayKey(new Date(2026, 7, 14)), '2026-08-14');
});

test('addDays crosses months', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
});

test('dayOfYear is stable for a fixed date', () => {
  const n = dayOfYear(new Date(2026, 0, 1));
  assert.equal(n, 1);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test tests/dates.test.js`  
Expected: FAIL (cannot find module / missing exports)

- [ ] **Step 3: Implement `js/dates.js`**

```js
(function (root) {
  const Become = (root.Become = root.Become || {});

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(dateKey, delta) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return todayKey(dt);
  }

  function dayOfYear(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function parseDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatLongDate(date = new Date()) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatMonthLabel(date) {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  Object.assign(Become, {
    todayKey,
    addDays,
    dayOfYear,
    startOfMonth,
    parseDateKey,
    formatLongDate,
    formatMonthLabel,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      todayKey,
      addDays,
      dayOfYear,
      startOfMonth,
      parseDateKey,
      formatLongDate,
      formatMonthLabel,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
```

- [ ] **Step 4: Re-run dates tests — expect PASS**

Run: `node --test tests/dates.test.js`  
Expected: PASS

- [ ] **Step 5: Write `tests/storage.test.js` for defaultState + import validation**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultState, importState } = require('../js/storage.js');

test('defaultState has version 1 and empty collections', () => {
  const s = defaultState();
  assert.equal(s.version, 1);
  assert.equal(s.onboardingComplete, false);
  assert.deepEqual(s.habits, []);
  assert.deepEqual(s.foods, []);
  assert.equal(s.settings.weightAvgWindow, 7);
});

test('importState rejects invalid JSON', () => {
  assert.throws(() => importState('{'), /Invalid JSON/);
});

test('importState rejects wrong version shape', () => {
  assert.throws(() => importState(JSON.stringify({ version: 99 })), /Unsupported/);
});
```

- [ ] **Step 6: Implement `js/storage.js` with full default schema matching the spec**

Include: `STORAGE_KEY = 'become-v2'`, `defaultState()`, `loadState()`, `saveState(state)` (returns `{ ok, error }`), `exportState(state)` → string, `importState(jsonString)` → state (throws on bad input). Validate `version === 1` and required top-level keys. On corrupt load, return `defaultState()`.

- [ ] **Step 7: Run storage tests — expect PASS**

Run: `node --test tests/storage.test.js`

- [ ] **Step 8: Replace `styles.css` with white/sleek tokens**

```css
:root {
  --bg: #f7f7f5;
  --surface: #ffffff;
  --ink: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #2f6b4f;
  --accent-soft: #e8f0eb;
  --border: rgba(26, 26, 26, 0.1);
  --danger: #8a3b2c;
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Source Sans 3", system-ui, sans-serif;
  --radius: 12px;
  --nav-h: 64px;
}
body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-body);
  color: var(--ink);
  background: var(--bg);
  padding-bottom: calc(var(--nav-h) + 1.5rem);
}
.app { width: min(640px, calc(100% - 2rem)); margin: 0 auto; padding: 1.5rem 0; }
.brand { margin: 0; font-family: var(--font-display); font-size: clamp(2rem, 7vw, 2.8rem); font-weight: 700; letter-spacing: -0.03em; }
.bottom-nav {
  position: fixed; left: 0; right: 0; bottom: 0; height: var(--nav-h);
  display: flex; justify-content: center; gap: 0.5rem;
  background: var(--surface); border-top: 1px solid var(--border);
  padding: 0.5rem 1rem; z-index: 20;
}
.bottom-nav a {
  flex: 1; max-width: 120px; text-align: center; text-decoration: none;
  color: var(--muted); font-weight: 600; padding: 0.65rem 0.5rem; border-radius: 10px;
}
.bottom-nav a.is-active { color: var(--accent); background: var(--accent-soft); }
.storage-error { color: var(--danger); font-size: 0.9rem; }
```

Add form, button, card, progress-bar, calendar base styles (calendar grid matching prior Progress structure: `.calendar`, `.calendar-grid`, `.day-cell`, `.day-cell.is-hit`, etc. on white).

- [ ] **Step 9: Implement `js/shell.js`**

```js
(function (root) {
  const Become = (root.Become = root.Become || {});
  function renderShell({ active }) {
    const links = [
      { id: 'home', href: 'index.html', label: 'Home' },
      { id: 'habits', href: 'habits.html', label: 'Habits' },
      { id: 'lifestyle', href: 'lifestyle.html', label: 'Lifestyle' },
    ];
    const navHtml = `<nav class="bottom-nav" aria-label="Primary">${links
      .map(
        (l) =>
          `<a href="${l.href}" class="${l.id === active ? 'is-active' : ''}">${l.label}</a>`
      )
      .join('')}</nav>`;
    const headerHtml = `<header class="site-header"><p class="brand">Become</p></header>`;
    return { headerHtml, navHtml };
  }
  Become.renderShell = renderShell;
})(typeof globalThis !== 'undefined' ? globalThis : window);
```

- [ ] **Step 10: Write three HTML shells**

Each page: fonts + `styles.css`, `#app` root, `#storage-error`, scripts in order: `dates.js`, `storage.js`, `shell.js`, then page script. `index.html` title `Become`; load `js/home.js` later (for now a stub that paints shell + “Home”).

Stub boot:

```js
const state = Become.loadState();
const root = document.getElementById('app');
const { headerHtml, navHtml } = Become.renderShell({ active: 'home' });
root.innerHTML = `${headerHtml}<main><p class="tagline">Home</p></main>${navHtml}`;
```

Mirror for habits/lifestyle with correct `active`.

- [ ] **Step 11: Manual check**

Open `index.html` in browser: white background, Become header, bottom nav works across three pages.

- [ ] **Step 12: Commit**

```bash
git add js/dates.js js/storage.js js/shell.js styles.css index.html habits.html lifestyle.html tests/dates.test.js tests/storage.test.js
/usr/bin/git commit -m "Scaffold Become multi-page shell and storage schema."
```

---

### Task 2: Onboarding + milestone seeding

**Files:**
- Create: `js/milestones.js`
- Create: `js/onboarding.js`
- Modify: `index.html` (include scripts)
- Create: `tests/milestones.test.js`

**Interfaces:**
- Consumes: `Become.defaultState`, `Become.saveState`, `Become.loadState`
- Produces: `Become.seedMilestones(startWeight, goalWeight)` → milestone array `{ id, lbsFromStart, label, reachedAt }`; `Become.completeOnboarding(state, answers)` → new state; `Become.renderOnboarding(container, onDone)`

- [ ] **Step 1: Write milestone seed test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { seedMilestones } = require('../js/milestones.js');

test('seedMilestones includes 1lb then ~5lb steps toward goal', () => {
  const ms = seedMilestones(225, 175);
  assert.equal(ms[0].lbsFromStart, 1);
  const last = ms[ms.length - 1];
  assert.equal(last.lbsFromStart, 50);
  assert.ok(ms.some((m) => m.lbsFromStart === 5));
});
```

- [ ] **Step 2: Implement `seedMilestones`**

Logic: totalLoss = start − goal. Push 1 if totalLoss ≥ 1. Then add 5, 10, … while < totalLoss. Always ensure a final milestone at exact `totalLoss`. `id` via `crypto.randomUUID()` in browser or simple `m-${lbs}` in Node.

- [ ] **Step 3: Implement onboarding UI on Home**

If `!state.onboardingComplete`, full-screen/panel form fields:
- current weight (number)
- goal weight (number)
- calorie target (number, required)
- protein target (number, optional empty → null)
- starting habits: textarea or chip-add list (default suggestions: `20-min workout`, `Morning outside`)

On submit: set settings, goal, habits, first weight log for today, milestones via seed, `onboardingComplete: true`, save, call `onDone(state)`.

- [ ] **Step 4: Manual check** — clear `localStorage`, reload Home, complete onboarding, confirm `become-v2` in DevTools.

- [ ] **Step 5: Commit**

```bash
/usr/bin/git commit -m "Add onboarding flow and milestone seeding."
```

---

### Task 3: Habits logic + Habits page

**Files:**
- Create: `js/habits.js`
- Create: `js/habits-page.js`
- Modify: `habits.html`
- Create: `tests/habits.test.js`

**Interfaces:**
- Produces: `Become.toggleHabit(state, dateKey, habitId)`, `Become.addHabit(state, name)`, `Become.removeHabit(state, id)`, `Become.renameHabit(state, id, name)`, `Become.streakFor(state, habitId, todayKey)`, `Become.renderHabitsPage(root, state)`

- [ ] **Step 1: Streak test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { streakFor } = require('../js/habits.js');
const { addDays } = require('../js/dates.js');

test('streak counts consecutive days ending today or yesterday', () => {
  const today = '2026-08-14';
  const state = {
    habits: [{ id: 'h1', name: 'Workout', active: true }],
    habitCompletions: {
      [addDays(today, -2)]: { h1: true },
      [addDays(today, -1)]: { h1: true },
      [today]: { h1: true },
    },
  };
  assert.equal(streakFor(state, 'h1', today), 3);
});
```

- [ ] **Step 2: Implement habits module + page UI**

Habits page: list active habits with checkbox for today, streak chip, add form, edit name, remove (confirm). Persist via `saveState`.

- [ ] **Step 3: Run `node --test tests/habits.test.js` — PASS**

- [ ] **Step 4: Manual check** on `habits.html`

- [ ] **Step 5: Commit** — `"Add customizable habits with streaks."`

---

### Task 4: Weight rolling average + chart helpers

**Files:**
- Create: `js/weight.js`
- Create: `tests/weight.test.js`

**Interfaces:**
- Produces: `Become.upsertWeight(state, date, lbs)`, `Become.rollingAverage(weights, dateKey, windowDays)`, `Become.rollingSeries(weights, windowDays)` → `[{ date, raw, avg }]`, `Become.renderWeightChart(container, series, { windowDays })` (SVG: avg polyline + raw dots), toggle 7/14 calling settings update

- [ ] **Step 1: Rolling average tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { rollingAverage } = require('../js/weight.js');

test('rollingAverage averages available days in window', () => {
  const weights = [
    { date: '2026-08-10', lbs: 220 },
    { date: '2026-08-11', lbs: 218 },
    { date: '2026-08-12', lbs: 219 },
  ];
  assert.equal(rollingAverage(weights, '2026-08-12', 7), 219);
});
```

- [ ] **Step 2: Implement weight module**

`rollingAverage`: include entries with `date` in `(dateKey - (window-1))…dateKey` inclusive; mean of lbs; `null` if none.

- [ ] **Step 3: Tests PASS; commit** — `"Add weight logging and rolling-average helpers."`

(UI wiring for Lifestyle weight section lands in Task 8/10; Home snippet in Task 7.)

---

### Task 5: Milestone hit detection + celebration

**Files:**
- Modify: `js/milestones.js`
- Create: `tests/milestones-hit.test.js`

**Interfaces:**
- Produces: `Become.lbsLostFromStart(state, avgLbs)`, `Become.checkMilestones(state, avgLbs, todayKey)` → `{ state, newlyReached: [] }`, `Become.renderCelebration(root, milestone)` dismiss → push id to `dismissedCelebrations`

- [ ] **Step 1: Hit test** — when avg shows 5 lb lost from start 225, milestone `lbsFromStart: 5` gets `reachedAt` set once.

- [ ] **Step 2: Implement; tests PASS; commit** — `"Detect milestone hits from rolling average."`

---

### Task 6: Foods, daily log, day totals

**Files:**
- Create: `js/calories.js`
- Create: `js/targets.js`
- Create: `tests/calories.test.js`

**Interfaces:**
- Produces:
  - `Become.addFood(state, { name, grams, calories, protein?, carbs?, fat? })` stores per-gram ratios + `defaultGrams`/`lastGrams`
  - `Become.logFood(state, dateKey, { foodId, grams })` updates `lastGrams`, appends log entry with id
  - `Become.removeFoodLog(state, dateKey, entryId)`
  - `Become.dayNutrition(state, dateKey)` → `{ calories, protein, carbs, fat }`
  - `Become.effectiveTarget(state, dateKey)` → number (override or `settings.calorieTarget`; fasting handled later)

- [ ] **Step 1: Ratio + recalc test**

```js
test('logging scales calories from calPerG', () => {
  let state = defaultState();
  state = addFood(state, { name: 'Oats', grams: 100, calories: 380, protein: 13 });
  const id = state.foods[0].id;
  state = logFood(state, '2026-08-14', { foodId: id, grams: 50 });
  const day = dayNutrition(state, '2026-08-14');
  assert.equal(day.calories, 190);
  assert.equal(day.protein, 6.5);
});
```

- [ ] **Step 2: Implement modules; tests PASS; commit** — `"Add food database and daily calorie logging core."`

---

### Task 7: Meals, templates, Home calorie + habit snapshot

**Files:**
- Modify: `js/calories.js` (meals + templates)
- Create: `js/home.js`
- Create: `js/passages.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `Become.saveMeal`, `Become.logMeal(state, dateKey, mealId)`, `Become.saveMealTemplate`, `Become.applyTemplate(state, dateKey, templateId)`, `Become.passageForDate(date)`, `Become.renderHome(root, state)`

- [ ] **Step 1: Add ≥12 short paraphrased passages in `js/passages.js`** (craving awareness, RAIN-style, habit loops — original short wording). Export `PASSAGES` and `passageForDate(d)` using `dayOfYear % length`.

- [ ] **Step 2: Meal/template helpers + tests for `logMeal` expanding items**

- [ ] **Step 3: `renderHome`** sections in order:
  1. Date + milestone progress (lbs lost via rolling avg / total)
  2. Calorie progress bar (dayNutrition vs effectiveTarget) + protein if target set
  3. Habit checklist (toggle → save → re-render)
  4. Weight snippet (latest + avg) if any weights
  5. Passage card
  6. Placeholders comments/empty for fast timer, weekly summary, adaptive (filled in later tasks)

- [ ] **Step 4: Manual Home check after onboarding**

- [ ] **Step 5: Commit** — `"Wire Home dashboard with calories, habits, and passages."`

---

### Task 8: Lifestyle page — food log UI + weight UI

**Files:**
- Create: `js/lifestyle-page.js`
- Modify: `lifestyle.html`

**Interfaces:**
- Produces: `Become.renderLifestyle(root, state)` with sections: Today’s log, Add food, Foods library, Meals, Templates, Weight (log + chart + 7/14 toggle), Settings (edit calorie/protein targets)

- [ ] **Step 1: Implement sectioned Lifestyle UI** (no cards-as-decoration; section headings + forms). Use same chart helper from weight.js.

- [ ] **Step 2: Manual: add food, log, see Home totals update**

- [ ] **Step 3: Commit** — `"Add Lifestyle food logging and weight chart UI."`

---

### Task 9: Lifestyle calendar (Progress-style)

**Files:**
- Create: `js/calendar.js`
- Modify: `js/lifestyle-page.js`
- Modify: `styles.css` (calendar markers)

**Interfaces:**
- Produces: `Become.renderLifestyleCalendar(container, state, { cursor, selectedDateKey, onSelect, onMonthChange })`
- Day classes: `has-log`, `is-fast`, `is-event` (combinable). Day detail shows calories total, flags, link cues.

- [ ] **Step 1: Port interaction from old Progress calendar** (month nav, weekday row, grid, selected day detail) — restyle only, white/sleek.

- [ ] **Step 2: Marker helpers reading `foodLogs`, expanded fasts, `highCalorieEvents`

- [ ] **Step 3: Manual month navigation + markers

- [ ] **Step 4: Commit** — `"Add Lifestyle calendar with log, fast, and event markers."`

---

### Task 10: Fasting scheduler + Home timer

**Files:**
- Create: `js/fasting.js`
- Create: `tests/fasting.test.js`
- Modify: `js/home.js`, `js/lifestyle-page.js`, `js/calories.js` / `targets` as needed

**Interfaces:**
- Produces: `Become.addFast(state, { start, end, recurrence })`, `Become.expandFasts(state, fromDateKey, toDateKey)` → intervals, `Become.activeFast(state, now)` → `{ start, end }|null`, `Become.fastProgress(now, fast)` → `{ elapsedHours, remainingHours }`, `Become.isFastingDay(state, dateKey)`

- [ ] **Step 1: Tests for every_other_week expansion and active window**

- [ ] **Step 2: Lifestyle UI to create/edit/delete fasts; during active fast, food log UI switches to fasting mode (water/electrolytes note + block normal foods or allow only flagged electrolyte entries)

- [ ] **Step 3: Home live timer** — `setInterval` 30s update; clear on hide; respect reduced motion (still update numbers, no pulse animation)

- [ ] **Step 4: Commit** — `"Add intermittent fasting schedule and dashboard timer."`

---

### Task 11: High-calorie events + redistribution

**Files:**
- Create: `js/events.js`
- Create: `tests/events.test.js`
- Modify: `js/lifestyle-page.js`, `js/targets.js`

**Interfaces:**
- Produces: `Become.addHighCalorieEvent(state, event)`, `Become.applyRedistribution(state, eventId)` → writes `targetOverrides`, `Become.clearEventOverrides(state, eventId)`

**Redistribution algorithm (exact):**
1. `baseline = state.settings.calorieTarget`
2. For each date D in `[startDate, endDate]`: surplus += (`eventTargetCalories` − baseline)
3. Collect the `preDays` calendar days immediately before `startDate` (count all days, not only weekdays — spec said weekdays; **implement as N calendar days before start** named `preDays` to match data model; document in UI as “days before”)
4. `reductionPerDay = round(surplus / preDays)`
5. For each pre day: `targetOverrides[day] = baseline - reductionPerDay`
6. For each event day: `targetOverrides[day] = eventTargetCalories`

- [ ] **Step 1: Unit test fixed numbers** (baseline 1800, one event day 2800, preDays 5 → surplus 1000 → −200 on each of 5 pre days)

- [ ] **Step 2: Lifestyle UI + calendar refresh; commit** — `"Add high-calorie event planning and target redistribution."`

---

### Task 12: Adaptive calorie suggestion

**Files:**
- Create: `js/adaptive.js`
- Create: `tests/adaptive.test.js`
- Modify: `js/home.js`

**Interfaces:**
- Produces: `Become.computeAdaptiveSuggestion(state, todayKey)` → `null | { suggestedTarget, rateLbPerWeek, message }`, `Become.acceptAdaptive(state)`, `Become.dismissAdaptive(state)`

Logic: need ≥14 weight entries spanning ≥14 days. `rate = (avg_old − avg_recent) / weeks` using window from settings. Aim 2.0 lb/week. If `abs(rate - 2) >= 0.5`, suggest delta kcal = `round(((2 - rate) / 0.5) * 250)` applied to current target (faster loss → higher intake suggestion). Store on `state.adaptiveSuggestion`; Home shows Accept/Dismiss once.

- [ ] **Step 1: Tests for null (insufficient data) and off-rate suggestion**

- [ ] **Step 2: Wire Home; commit** — `"Add adaptive calorie target suggestions."`

---

### Task 13: Measurements + weekly summary

**Files:**
- Create: `js/measurements.js`
- Create: `js/summary.js`
- Create: `tests/summary.test.js`
- Modify: `js/lifestyle-page.js`, `js/home.js`

**Interfaces:**
- Produces: `Become.upsertMeasurement`, `Become.ensureWeeklySummary(state, todayKey)` — if today is Sunday (local) or summary missing for week ending last Sunday, append `{ weekEnd, avgCalories, weightDelta, habitPct, note }` with short fixed encouraging notes rotated by week number

- [ ] **Step 1: Tests for habitPct and avg calories over Mon–Sun window**

- [ ] **Step 2: Lifestyle measurements UI + optional Home toggle `settings.showMeasurementsOnHome`

- [ ] **Step 3: Home weekly summary card when present for current/last week

- [ ] **Step 4: Commit** — `"Add body measurements and weekly summary card."`

---

### Task 14: Milestone editor, settings polish, export/import UI, PWA

**Files:**
- Modify: `js/lifestyle-page.js`, `js/milestones.js`, `js/storage.js`
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Modify: all HTML `<head>` (manifest + theme-color + sw register)
- Delete: `app.js` if unused

**Interfaces:**
- Export button downloads `become-export-YYYY-MM-DD.json`
- Import file input → confirm → `importState` → `saveState` → reload
- Editable milestones list (change `lbsFromStart`, regenerate labels)
- `manifest`: name Become, `display: standalone`, `start_url: ./index.html`, theme `#2f6b4f`, background `#f7f7f5`
- `sw.js`: precache `index.html`, `habits.html`, `lifestyle.html`, `styles.css`, all `js/*`

- [ ] **Step 1: Implement export/import + milestone edit UI**

- [ ] **Step 2: PWA files + register**

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
```

- [ ] **Step 3: Manual: export, clear storage, import, data restored; offline reload of shell

- [ ] **Step 4: Remove dead `app.js`; grep for `identity-habit-tracker` — should be none in app code

- [ ] **Step 5: Commit** — `"Add export/import, milestone editing, and PWA offline shell."`

---

### Task 15: End-to-end polish pass

**Files:**
- Modify: `styles.css`, copy strings across pages as needed

- [ ] **Step 1: Run all Node tests**

Run: `node --test tests/*.test.js`  
Expected: all PASS

- [ ] **Step 2: Manual checklist from spec**

1. Onboarding → Home populated  
2. Log food → totals  
3. Habit check → streak  
4. Weight → chart 7/14  
5. Calendar markers  
6. Fast timer  
7. Event redistribution  
8. Milestone celebrate  
9. Adaptive Accept/Dismiss  
10. Weekly card (set date or seed summary)  
11. Export/import  
12. Offline shell  

- [ ] **Step 3: Fix gaps found; commit** — `"Polish Become lifestyle tracker for mobile use."`

---

## Spec coverage checklist

| Spec area | Task(s) |
|-----------|---------|
| Multi-page Home/Habits/Lifestyle + nav | 1 |
| White/sleek visual | 1, 15 |
| Onboarding + manual calorie target | 2 |
| Milestones seed/edit/celebrate | 2, 5, 14 |
| Custom habits + streaks | 3, 7 |
| Weight rolling avg + 7/14 chart | 4, 8 |
| Foods/meals/templates/logging | 6, 7, 8 |
| Targets + deficit display | 6, 7 |
| Adaptive suggestion | 12 |
| High-calorie events | 11 |
| Fasting + timer | 10 |
| Lifestyle calendar | 9 |
| Passages | 7 |
| Measurements | 13 |
| Weekly summary | 13 |
| Export/import | 1 (core), 14 (UI) |
| PWA | 14 |
| Fresh `become-v2` storage | 1 |

## Self-review notes

- No TBD placeholders in task algorithms; redistribution and adaptive math pinned.
- Spec said “N weekdays” for pre-days; plan standardizes on **N calendar days** via `preDays` for simpler UX — call out in Lifestyle copy as “days before event.”
- Type names kept consistent: `effectiveTarget`, `dayNutrition`, `seedMilestones`, `become-v2`.
