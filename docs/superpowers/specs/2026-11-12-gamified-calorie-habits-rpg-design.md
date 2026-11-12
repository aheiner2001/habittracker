# Gamified Calorie & Habit RPG — Website Specification

**Date:** 2026-11-12  
**Product:** LifeQuest / Become RPG  
**Target Repository:** `/Users/aaronheiner/habittracker`  
**Stack:** Vanilla HTML5, CSS3, Modern ES Modules, Firebase Web SDK (v10+ Auth & Cloud Firestore), OpenFoodFacts API, PWA Service Worker + localStorage offline cache.

---

## 1. Executive Summary & Design Philosophy

This project transforms the existing habit and lifestyle tracker into an encouraging, gamified Web App inspired by the **"Gamify Your Life"** design aesthetic and grounded in the core philosophy: **"Bounce back, don't restart."**

Traditional calorie counters and fitness trackers suffer from the "all-or-nothing" trap: one over-target meal or a missed day triggers failure screens, broken streaks, and guilt-driven abandonment. 

This app solves that by:
1. **Shifting focus from daily pass/fail to a Weekly Deficit View.** An extra 400 calories on Tuesday doesn't mean failure—it smoothly redistributes across subsequent days with zero red alert screens.
2. **Replacing fragile streaks with Forgiving Streaks ("Days Showing Up" & "Return Rate").** Users are celebrated for returning after a break rather than punished for missing a day.
3. **Providing a 1-tap "Bounce Back" Button.** Generates a gentle reset quest (nourishing meal, short walk, mindful check-in) without guilt or level resets.
4. **Gamifying Real Life with RPG Progression.** Actions earn XP and level up 5 core character stats (*Health, Discipline, Focus, Knowledge, Kindness*).
5. **Embedding Mindfulness into Nutrition.** Cognitive thought records (Tempting Thoughts vs. Loving Truths), a 10-minute urge timer, snack check-ins (*"hungry, bored, stressed, or tired?"*), and a visual "Why" wall.
6. **Zero-Friction Cloud Sync via Firebase.** Starts immediately with anonymous authentication into Cloud Firestore (`sandbox-ed1e2`), with optional Google/Email account linking to preserve character progress across devices.

---

## 2. Information Architecture & Navigation

The application is structured as a unified, responsive Single-Page App (SPA) housed in `index.html` with an RPG-styled navigation bar:

```
+-------------------------------------------------------------------------+
| [🧙 Hero Avatar]  Level 7 Paladin   [XP Bar: 740 / 800 XP]   [🔥 Day 14] |
+-------------------------------------------------------------------------+
| [🧙 HERO]  |  [📜 QUESTS]  |  [🍖 TAVERN]  |  [🧘 SANCTUARY]  |  [⚙️ CLOUD] |
+-------------------------------------------------------------------------+
|                                                                         |
| ACTIVE TAB VIEW AREA                                                    |
|                                                                         |
+-------------------------------------------------------------------------+
| 🆘 [BOUNCE BACK BUTTON: "Had a rough moment? Tap to reset gently"]       |
+-------------------------------------------------------------------------+
```

### Tab Breakdown:
1. **Hero (Dashboard):**
   - Character avatar card, current Level, total XP, and progress bar to next level.
   - 5 Character Stats: Health, Discipline, Focus, Knowledge, Kindness.
   - Weekly Calorie Deficit Progress Bar (Deficit so far vs. Weekly goal).
   - Protein Progress Ring alongside Calorie intake.
   - Today's Summary & Active Eating Window / Fasting countdown widget.
   - "Bounce Back" quick-launch banner.

2. **Quests (Habits & Missions):**
   - Daily habit checklist (customizable, with XP rewards per completion).
   - "I moved today" low-energy workout option.
   - Active Quests & Milestones (e.g., "Hit 5 protein targets this week", "Log 3 meditations").
   - Forgiving Streak tracker: Days showing up and Return Rate counter.

3. **Tavern (Food, Deficit & Fasting):**
   - Quick calorie & protein log with meal time tags (Breakfast, Lunch, Dinner, Snacks).
   - Pre-snack mindful check-in (*"Hungry, bored, stressed, or tired?"*).
   - OpenFoodFacts live search & barcode scan lookup.
   - Custom Food Database & Cooked Meal Yield calculator.
   - Eating window timer (configurable 6-hour or custom window; "Opens in X / Closes in Y").
   - 48-Hour Fasting Suite: Prep checklist, "Why I'm fasting" anchor, mid-fast support, break-early compassion log, and refeeding guide.
   - High-Calorie Event Planner: Holiday/event scheduling with automated deficit redistribution.

4. **Sanctuary (Mindfulness & Obstacles):**
   - Cognitive Thought Records: Two-column library (Tempting Thought vs. Loving Truth).
   - "Craving Help": Instant random recall of past personal Loving Truths.
   - Urge Timer: 10-minute mindful pause timer with personalized snack swap ideas.
   - Meditation Timer: 5, 10, or 20-minute guided/silent timer with chime.
   - "Why" Wall: Visual board for personal photos, affirmations, and non-scale victories.
   - Evening Reflection: Daily 1-question check-in (*"What went well today?"*).

5. **Cloud / Settings:**
   - Firebase status & user UID badge.
   - Anonymous-to-Google/Email account link button.
   - Calorie & protein target settings with safety guardrail (>1200 kcal floor).
   - Start weight, goal weight, and rolling average trend line.
   - JSON export and import for local data ownership.

---

## 3. Game Mechanics & XP Progression

### 3.1 Character Attributes
- **Health (HP):** Nourishment and movement (logging balanced meals, hitting protein goals, workouts, drinking water).
- **Discipline (DEF):** Consistency and structure (completing daily habits, sticking to eating windows, completing fasts).
- **Focus (INT):** Mental clarity (completing meditations, waiting out urge timers).
- **Knowledge (WIS):** Cognitive growth (saving thought records, evening reflections, reading daily passages).
- **Kindness (CHA):** Self-compassion and resilience (bouncing back after slip-ups, forgiving streaks, celebrating non-scale victories).

### 3.2 XP Table & Progression Rule
- Progression formula:
  $$\text{Level} = \left\lfloor \frac{\text{Total XP}}{100} \right\rfloor + 1$$
- Current level progress:
  $$\text{Current Level XP} = \text{Total XP} \pmod{100}$$
- **Reward Catalog:**
  | Action | XP Awarded | Primary Stat |
  |---|---|---|
  | Log meal / food item | +15 XP | Health |
  | Hit daily protein target | +20 XP | Health |
  | Complete daily habit | +15 XP | Discipline |
  | Workout completed | +25 XP | Health |
  | "I moved today" (low energy) | +15 XP | Health & Kindness |
  | Drink water check-in | +5 XP | Health |
  | Survive 10-min urge timer | +25 XP | Focus & Discipline |
  | Record Tempting / Loving thought | +20 XP | Knowledge & Focus |
  | Complete meditation session | +20 XP | Focus |
  | Evening reflection completed | +15 XP | Knowledge |
  | Tap "Bounce Back" & complete reset | +30 XP | Kindness & Discipline |
  | Complete scheduled fast | +40 XP | Discipline |
  | End fast early with reflection | +20 XP | Kindness & Knowledge |

### 3.3 Zero-Punishment Guarantee
- No XP is ever deducted for missing a day, exceeding calorie goals, or taking rest.
- No levels are ever lost.
- Red warning colors and negative sounds are strictly excluded from the user experience.

---

## 4. Nutrition, Deficit & Fasting Engine

### 4.1 Weekly Deficit Over Daily Pass/Fail
- Daily calorie target: $T_{\text{daily}}$ (user-defined, e.g. 1800 kcal).
- Target weekly deficit: $D_{\text{week}} = 7 \times (T_{\text{maintenance}} - T_{\text{daily}})$.
- Actual weekly deficit to date:
  $$D_{\text{actual}} = \sum_{d \in \text{week}} (T_{\text{maintenance}} - C_{\text{logged}}(d))$$
- When daily intake exceeds target by $\Delta C$:
  - The UI remains neutral (warm slate / gold, no harsh reds).
  - A gentle suggestion adjusts the remaining $N$ days of the week by $-\frac{\Delta C}{N}$ (bounded by the 1200 kcal safety floor).

### 4.2 OpenFoodFacts & Custom Food Database
- **OpenFoodFacts Integration:**
  - Endpoint: `https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&search_simple=1&action=process&json=1`
  - Barcode Lookup: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
  - Extracts Product Name, Brand, Energy (kcal / 100g), Protein (g / 100g), Carbs, Fat.
- **Local Food Database & Recipes:**
  - Persisted custom foods with grams-to-calories ratio (`calPerG`).
  - Cooked Recipe Yield calculator: Computes net cooked weight shrinkage factor to calculate accurate per-gram calories.

### 4.3 48-Hour Fasting & Window Suite
- **Eating Window:** Default 6-hour window (e.g., 12:00 PM – 6:00 PM) with live status:
  - If before window: *"Window opens in $H\text{h } M\text{m}$"*
  - If inside window: *"Window active — closes in $H\text{h } M\text{m}$"*
  - If after window: *"Fast in progress. Water & electrolytes mode."*
- **Extended Fasting (48h Support):**
  - **Pre-fast Checklist:** Hydration, Electrolytes, Light preparatory meal.
  - **In-fast Anchor:** Displays user's stored *"Why I'm fasting today"* note.
  - **Early Break Handling:** If ended before target time, presents loving text: *"You fasted for X hours! Here's what you learned."* Records reflections without failure flags.
  - **Refeeding Guide:** Step-by-step guidance on gentle refeeding foods.

---

## 5. Mindfulness, Obstacles & The Bounce Back System

### 5.1 Cognitive Thought Record
- Storage Schema:
  ```json
  {
    "id": "tr_1731420000",
    "temptingThought": "I already blew my diet with that donut, might as well keep bingeing.",
    "lovingTruth": "One donut is just 250 calories. It's already in the past. My next meal is a fresh opportunity.",
    "createdAt": "2026-11-12T08:30:00Z",
    "timesRecalled": 3
  }
  ```
- Instant Craving Drawer: Surfaced whenever user taps "I'm having a craving" or opens the Urge Timer.

### 5.2 The "Bounce Back" Flow
- Triggered by a prominent button available in Hero and Quests.
- Spawns a dedicated 3-step immediate reset quest:
  1. **Nourish:** Drink 1 glass of cold water or plan the next balanced meal.
  2. **Move:** Take a 10-minute walk or do a quick stretch.
  3. **Reflect:** One mindful note (*"What was I feeling right before this?"*).
- Completing all 3 steps completes the Bounce Back Quest, awards +30 XP, and logs a "Bounced Back" badge.

---

## 6. Technical Architecture & Firebase Sync

### 6.1 Firebase Configuration
Using the user-provided Firebase Web App configuration:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCyXhVv05H51JMmtZ3gQ_zSWPQ_3PIHwfk",
  authDomain: "sandbox-ed1e2.firebaseapp.com",
  projectId: "sandbox-ed1e2",
  storageBucket: "sandbox-ed1e2.firebasestorage.app",
  messagingSenderId: "741844679458",
  appId: "1:741844679458:web:ad88427955e1ad24ac837b"
};
```

### 6.2 Data Flow & Offline Resilience
```
+-----------------------------------------------------------+
|                        User Action                        |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|          Local State Store (`js/storage.js`)             |
|   1. Update in-memory reactive state                      |
|   2. Immediately persist to `localStorage` (0ms latency)  |
|   3. Trigger UI re-render                                 |
+-----------------------------------------------------------+
                             |
                             | (Debounced 1500ms / Online)
                             v
+-----------------------------------------------------------+
|            Firebase Sync Layer (`js/firebase.js`)         |
|   1. Anonymous Auth (`signInAnonymously`)                 |
|   2. Upsert document in Cloud Firestore:                  |
|      `artifacts/sandbox-ed1e2/users/{uid}/...`            |
|   3. Handle offline retry gracefully                      |
+-----------------------------------------------------------+
```

### 6.3 Firestore Schema
- `/users/{uid}/profile`: Character name, avatar, level, totalXP, stats (`{ health, discipline, focus, knowledge, kindness }`).
- `/users/{uid}/settings`: Targets (`calorieTarget`, `proteinTarget`, `eatingWindowHours`, `startWeight`, `goalWeight`).
- `/users/{uid}/days/{YYYY-MM-DD}`: Daily calories, protein, food log array, habit completions array, weight, reflections, XP earned.
- `/users/{uid}/library/foods`: Array of custom food items and recipes.
- `/users/{uid}/mindfulness/thoughtRecords`: Array of thought record pairs.
- `/users/{uid}/mindfulness/whyWall`: Text cards, motivation statements, and non-scale victory list.
- `/users/{uid}/fasts/state`: Active fast status, start/end timestamps, past completed fasts log.

---

## 7. Quality Assurance & Verification Plan

1. **Unit Tests (`tests/rpg.test.js` & `tests/core.test.js`):**
   - XP level formula verification (`0 XP -> Level 1`, `99 XP -> Level 1`, `100 XP -> Level 2`, `750 XP -> Level 8`).
   - Stat point attribution logic per action.
   - Forgiving streak "return rate" calculations.
   - Weekly deficit calculations and overage smoothing.
   - OpenFoodFacts API response parsing with null/missing field fallbacks.
2. **Browser Verification:**
   - Single-Page navigation transitions between tabs without reloads.
   - Food logging updates calorie progress bar and protein ring in real-time.
   - Urge timer 10-minute countdown operation.
   - Bounce Back button generates reset checklist and awards XP.
   - Offline simulation (Network disabled in DevTools): logs persist locally and sync upon reconnect.
3. **Safety Guardrails:**
   - Calorie targets below 1200 kcal trigger gentle minimum-safety warning.
   - Fasting durations above 48 hours present safety advisory checklist.

---

## 8. Rollout Plan
1. Spec approval and repository commit.
2. Implementation plan generation via `writing-plans` skill.
3. Execution in isolated test-driven steps.
4. Final verification and deployment review.
