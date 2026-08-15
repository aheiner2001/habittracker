# Become — Lifestyle Tracker Design

**Date:** 2026-08-14  
**Product:** Become (existing brand retained)  
**Stack:** Pure HTML/CSS/JS, multi-page, `localStorage`, optional PWA (manifest + service worker for offline / add-to-home-screen). No backend, no accounts.

## Intent

Make calorie and habit visibility low-friction so weight loss sticks as lifestyle, not a crash diet. Encouraging, checkpoint-based wins; honest trends via rolling averages — not punishing single-day weigh-ins.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| App shape | One app, three pages: Home · Habits · Lifestyle |
| Habits model | Simple customizable checklist + per-habit streaks (not identity cards) |
| Scope | Full build spec in one implementation cycle |
| Calorie target | User enters manually at onboarding; editable later |
| Brand | Become across all pages |
| Prior data | Fresh start — new storage key; no migration from `identity-habit-tracker` |
| Architecture | Multi-page shell + shared modules (Approach 1) |
| Visual | White / near-white, sleek, quiet chrome; calendar interaction pattern preserved |

## Information architecture

| Page | File | Role |
|------|------|------|
| Home (dashboard) | `index.html` | Today snapshot: calories + protein progress, habit checklist, weight trend snippet, fasting timer (if active), daily passage, weekly summary when due, milestone progress, adaptive-target suggestion when present |
| Habits | `habits.html` | Full habit CRUD, daily checklist, streaks |
| Lifestyle | `lifestyle.html` | Food log, food DB, meals/templates, weight + measurements charts, Lifestyle calendar, high-calorie events, fasting schedule, milestones/settings, export/import |

**Nav:** Persistent **Home · Habits · Lifestyle** on every page (mobile-first; sticky bottom bar preferred). Header shows **Become**.

**First-run:** Onboarding before Home is useful — current weight, goal weight, manual calorie target, optional protein target, starting habits → seeds milestone checkpoints and empty food DB.

## Visual direction

- Background: white / `#F7F7F5`; surfaces white with thin borders; minimal or no shadow.
- Accent: deep forest `#2F6B4F` (single accent for progress, calendar hits, primary actions). No purple-gradient cliché.
- Type: display + body pair (Fraunces + Source Sans 3 acceptable; prefer sharp hierarchy). Brand name is the strongest Home signal.
- Calendar: reuse Progress month-grid interaction (weekdays, prev/next month, day cells, day detail panel); restyle to white/sleek. Lifestyle markers distinguish calorie-logged days, fast windows, and high-calorie events (dots / subtle fills — not cluttered badges).
- Motion: brief milestone celebrate, progress fills, live fasting countdown; honor `prefers-reduced-motion`.

## Feature design

### 1. Goals & milestones

- One primary goal: start weight → goal weight.
- Auto-seed editable checkpoints (e.g. first 1 lb, then ~5 lb steps). User can change checkpoint sizes anytime.
- “Hit” detection uses **rolling average weight** (active window), not a single weigh-in.
- On hit: small in-app moment (badge + short encouraging message); dismissable.

### 2. Calorie tracker

- **Foods:** name + grams + calories for that amount → store calories-per-gram (and optional protein/carbs/fat per gram). Persist in local food DB.
- Re-selecting a food defaults to last-used (or original) grams; adjusting grams recalculates from stored ratios.
- **Meals:** saved combinations of foods + quantities; one tap logs all components.
- **Meal templates by time of day:** flexible templates (e.g. light breakfast / light lunch / heavier dinner) — quick-apply to a day, then tweak items. Not hardcoded meal times.
- Daily log shows intake vs target; optional **protein progress** beside calories on Home when a protein target is set.

### 3. Deficit & adaptive target

- Daily target = user-set intake aiming at ~2 lb/week loss (user owns the number).
- Home/Lifestyle show target vs logged today and remaining (or over).
- **Adaptive suggestion:** after ≥14 days of weight data, compare rolling-average loss rate (lb/week) to the 2 lb/week aim. If off by **≥0.5 lb/week**, show Accept / Dismiss with a suggested calorie delta (~250 kcal per 0.5 lb/week). Never silent auto-change. At most one pending suggestion at a time.

### 4. High-calorie event planning

- Flag a day or date range as a planned high-calorie event; user sets expected extra calories for the event (or an elevated daily target for those days).
- **Redistribution rule:** for each event, compute surplus = (event-day targets − baseline target) summed over event days. Spread an equal calorie reduction across the **N weekdays immediately before** the event (default N = 5, user-editable), writing `targetOverrides` so the week’s average intake matches baseline. User can edit/clear overrides.
- Marked clearly on Lifestyle calendar; adjustable/dismissable.

### 5. Intermittent fasting

- Recurring or one-off fast windows (e.g. dinner Tue → dinner Thu ~48h water/electrolytes). v1 recurrence: `none` or `every_other_week` from an anchor start/end pair.
- Fast days do not count as “missed” calorie logging.
- During an active window: only water/electrolytes logging (or simple “fasting” day mode).
- **Live countdown on Home:** hours elapsed + hours remaining until scheduled end.

### 6. Lifestyle calendar

- Month grid matching current Progress interaction pattern.
- At-a-glance: calorie logged, fast, high-calorie event (and combinations).
- Day detail: that day’s log summary / flags; deep-link into editing where useful.

### 7. Habits

- Customizable daily checklist (add / edit / remove).
- Per-habit streaks; Home shows today’s checklist; Habits page owns management + streak detail.
- Completions keyed by local `YYYY-MM-DD`.

### 8. Daily passages

- Curated short insights in the spirit of *The Craving Mind* (and related mindfulness-around-craving ideas), adapted from highlights — short paraphrases/insights, not long verbatim copyrighted excerpts.
- One passage per calendar day on Home: `passages[dayOfYear % passages.length]` so the same day always shows the same passage; loops naturally.
- Stored as a static list in `js/passages.js`.

### 9. Weight tracking

- Morning weight logs.
- Chart: rolling-average line + light raw dots.
- **7-day / 14-day toggle on the chart** (default 7). Goal/trend/milestone logic uses selected window.

### 10. Body measurements

- Optional waist / chest / hips (extensible).
- Same rolling-average chart pattern as weight.
- Hidden from Home unless user enables “show on dashboard”; always on Lifestyle.

### 11. Weekly summary

- Auto recap (default: each Sunday): avg daily calories, weight trend (rolling avg), habit completion %, short encouraging note.
- Surfaces on Home when due / recent; accessible from Lifestyle.

### 12. Backup & export

- Export all app data to downloadable JSON.
- Import restores from that JSON (replace with confirm).
- Protects against cleared browser data / device switch.

### 13. Onboarding

- Current weight, goal weight, calorie target (manual), optional protein target, starting habits.
- Seeds milestones and default empty structures so day one is not blank.

### 14. PWA

- Web app manifest + minimal service worker for offline shell and add-to-home-screen on mobile.

## Module / file layout

```
index.html          Home dashboard
habits.html         Habits
lifestyle.html      Lifestyle hub
styles.css          Shared white/sleek system
js/
  storage.js        load/save, export/import, schema version
  onboarding.js
  home.js
  habits.js
  lifestyle.js      page orchestrator
  calories.js       foods, meals, templates, daily log
  weight.js         weight + rolling average + chart helpers
  measurements.js
  milestones.js
  fasting.js
  events.js         high-calorie redistribution
  calendar.js       shared month grid (Lifestyle)
  passages.js       static passage list + day picker
  summary.js        weekly recap
  adaptive.js       target suggestion logic
manifest.webmanifest
sw.js
```

Exact filenames may be adjusted during planning; boundaries above are required.

## Data model (conceptual)

Single key: `become-v2` (JSON). Schema version field for future migrations.

```json
{
  "version": 1,
  "onboardingComplete": true,
  "settings": {
    "calorieTarget": 1800,
    "proteinTarget": null,
    "weightAvgWindow": 7,
    "showMeasurementsOnHome": false,
    "units": "lb"
  },
  "goal": {
    "startWeight": 225,
    "goalWeight": 175,
    "milestones": [{ "id": "...", "lbsFromStart": 1, "reachedAt": null }]
  },
  "habits": [{ "id": "...", "name": "20-min workout", "active": true }],
  "habitCompletions": { "2026-08-14": { "habitId": true } },
  "foods": [{ "id": "...", "name": "...", "calPerG": 1.2, "proteinPerG": 0.1, "carbsPerG": null, "fatPerG": null, "defaultGrams": 100, "lastGrams": 120 }],
  "meals": [{ "id": "...", "name": "Berry smoothie", "items": [{ "foodId": "...", "grams": 200 }] }],
  "mealTemplates": [{ "id": "...", "name": "Light breakfast", "items": [{ "foodId": "...", "grams": 200 }] }],
  "foodLogs": { "2026-08-14": [{ "id": "...", "foodId": "...", "grams": 120, "mealId": null, "note": null }] },
  "weights": [{ "date": "2026-08-14", "lbs": 224.2 }],
  "measurements": [{ "date": "2026-08-14", "waist": 36, "chest": null, "hips": null }],
  "fasts": [{ "id": "...", "start": "2026-08-12T19:00", "end": "2026-08-14T19:00", "recurrence": "none" }],
  "highCalorieEvents": [{ "id": "...", "startDate": "2026-08-20", "endDate": "2026-08-20", "eventTargetCalories": 2800, "preDays": 5 }],
  "targetOverrides": { "2026-08-14": 1500 },
  "adaptiveSuggestion": null,
  "weeklySummaries": [],
  "dismissedCelebrations": []
}
```

- Dates for daily logs: local `YYYY-MM-DD`.
- Corrupt / missing storage → safe empty defaults; show inline save errors if quota fails.
- IndexedDB only if `localStorage` quota proves insufficient during implementation; default is `localStorage`.

## Error handling

- Storage write failure: keep session state; show non-blocking banner.
- Import: validate shape/version; reject with clear message; do not partially apply.
- Future dates: weight/habit/food logging limited to today (and past for corrections where useful); calendar can view future for planning fasts/events.

## Testing (manual)

Mobile-first checklist: onboarding → log food → habit check → weight → calendar markers → fast timer → event redistribution → milestone celebrate → adaptive Accept/Dismiss → weekly card → export/import → offline shell load.

## Out of scope

- Accounts, cloud sync, multi-user.
- Barcode scanning, USDA live API (foods are user-defined).
- Push notifications / OS reminders.
- Migrating old `identity-habit-tracker` completions.
- Literal full-book copyright dump; passages are short curated insights only.

## Philosophy (product copy)

Visibility without friction. The app’s job is effortless logging and honest trends so the habit sticks — not shame for a high day or a water-weight blip.
