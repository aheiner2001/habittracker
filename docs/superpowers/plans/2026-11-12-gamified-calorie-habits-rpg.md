# Gamified Calorie & Habit RPG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the `habittracker` codebase into an encouraging, gamified single-page web app with RPG leveling, OpenFoodFacts food logging, forgiving streaks, a 1-tap Bounce Back reset, a mindfulness cognitive sanctuary, and Firebase cloud synchronization.

**Architecture:** Vanilla HTML5 + CSS3 + modern ES Modules. Unified state store backed by instant `localStorage` with offline resilience, synchronized with Cloud Firestore via Firebase Web SDK (`sandbox-ed1e2`) with anonymous authentication and optional Google/Email account linking.

**Tech Stack:** JavaScript (ES2022+), Firebase Web SDK (v10 modular via ESM/CDN), OpenFoodFacts REST API, Node test runner (`node --test`).

## Global Constraints
- Target repo: `/Users/aaronheiner/habittracker`
- Firebase project: `sandbox-ed1e2`
- Core philosophy: "Bounce back, don't restart" — no red failure screens, no lost levels or subtracted XP on over-target or rest days.
- Safety floor: Calorie targets below 1200 kcal flag a gentle safety notice.
- Backward compatibility: Existing `core.test.js`, `dates.test.js`, and `storage.test.js` tests must continue to pass.

---

### Task 1: RPG Progression & Forgiving Streaks Engine

**Files:**
- Create: `js/rpg.js`
- Create: `tests/rpg.test.js`

**Interfaces:**
- Produces:
  - `calculateLevel(totalXP: number): { level: number, currentLevelXP: number, nextLevelXP: number, progressPct: number }`
  - `awardActionXP(state: object, actionKey: string): { totalXP: number, statGains: object, levelUp: boolean }`
  - `generateBounceBackQuest(): Array<{ id: string, label: string, category: string, done: boolean }>`
  - `calculateForgivingStreak(historyDates: string[], todayStr: string): { daysShowingUp: number, returnRateCount: number, recentReturnWindow: number }`

- [ ] **Step 1: Write the failing tests in `tests/rpg.test.js`**
- [ ] **Step 2: Run test to verify it fails (`node tests/rpg.test.js`)**
- [ ] **Step 3: Implement `js/rpg.js`**
- [ ] **Step 4: Run test to verify it passes (`node tests/rpg.test.js`)**
- [ ] **Step 5: Commit `js/rpg.js` and `tests/rpg.test.js`**

---

### Task 2: OpenFoodFacts API & Barcode Lookup Service

**Files:**
- Create: `js/food-api.js`
- Create: `tests/food-api.test.js`

**Interfaces:**
- Produces:
  - `searchOpenFoodFacts(query: string, fetchFn?: Function): Promise<Array<{ id: string, name: string, brand: string, calPer100g: number, proteinPer100g: number, carbsPer100g: number, fatPer100g: number }>>`
  - `fetchProductByBarcode(barcode: string, fetchFn?: Function): Promise<{ id: string, name: string, brand: string, calPer100g: number, proteinPer100g: number, carbsPer100g: number, fatPer100g: number } | null>`

- [ ] **Step 1: Write unit tests in `tests/food-api.test.js` mocking API payloads**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `js/food-api.js` with fallback error handling**
- [ ] **Step 4: Run test to verify pass**
- [ ] **Step 5: Commit `js/food-api.js` and `tests/food-api.test.js`**

---

### Task 3: Fasting Suite, Deficit Smoothing & Mindfulness Cognitive Models

**Files:**
- Create: `js/mindfulness.js`
- Create: `tests/mindfulness.test.js`
- Modify: `js/fasting.js`
- Modify: `js/calories.js`

**Interfaces:**
- Produces:
  - `calculateWeeklyDeficit(dailyTarget: number, logs: object, maintenanceCal: number): { weeklyDeficitSoFar: number, weeklyGoal: number, remainingDeficit: number, gentleAdjustment: number }`
  - `createThoughtRecord(tempting: string, truth: string): object`
  - `getRandomLovingTruth(records: object[]): object | null`
  - `getEatingWindowCountdown(openTimeStr: string, closeTimeStr: string, now: Date): { state: 'before'|'open'|'closed', hoursRemaining: number, minutesRemaining: number, message: string }`

- [ ] **Step 1: Write unit tests in `tests/mindfulness.test.js`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `js/mindfulness.js` and update `js/calories.js` / `js/fasting.js`**
- [ ] **Step 4: Run test to verify pass**
- [ ] **Step 5: Commit mindfulness and deficit updates**

---

### Task 4: Firebase Client & Real-time Cloud Sync Layer

**Files:**
- Create: `js/firebase-client.js`
- Modify: `js/storage.js`

**Interfaces:**
- Produces:
  - `initFirebaseSync(onRemoteUpdate: Function): Promise<{ auth: object, db: object, getUid: Function, saveStateToCloud: Function }>`
  - `linkGoogleAccount(): Promise<object>`

- [ ] **Step 1: Implement `js/firebase-client.js` with project configuration and graceful fallback**
- [ ] **Step 2: Update `js/storage.js` to trigger debounced cloud sync while maintaining offline zero-latency `localStorage`**
- [ ] **Step 3: Run existing storage tests to confirm backward compatibility (`node tests/storage.test.js`)**
- [ ] **Step 4: Commit Firebase client and storage bridge**

---

### Task 5: Gamified RPG Single-Page UI & Responsive Design

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Create: `js/app.js`

**Deliverables:**
- Unified RPG layout with tabs: Hero, Quests, Tavern, Sanctuary, Cloud/Settings.
- Hero character card with Level, XP bar, stats (Health, Discipline, Focus, Knowledge, Kindness), Weekly Deficit bar, and Protein ring.
- Quests tab: Daily checklist, "I moved today", and 1-tap "Bounce Back" reset modal.
- Tavern tab: Meal logger with OpenFoodFacts search & barcode scanner, custom food DB, and 48-hour fasting suite.
- Sanctuary tab: Thought Record library, 10-minute Urge Timer, "Why" wall, and Meditation timer.
- Settings tab: Firebase account link, calorie safety warning, and JSON backup export/import.

- [ ] **Step 1: Upgrade `styles.css` with RPG fantasy theme, pixel headers, animated XP meters, and responsive cards**
- [ ] **Step 2: Overhaul `index.html` to house the unified SPA components and modals**
- [ ] **Step 3: Wire reactive controllers in `js/app.js`**
- [ ] **Step 4: Verify in local browser and test suite**
- [ ] **Step 5: Commit SPA interface changes**

---

### Task 6: Final Verification, Build Health Check & Git Push

**Files:**
- Repository root

- [ ] **Step 1: Execute all unit tests (`tests/*.test.js`)**
- [ ] **Step 2: Verify git status and clean working tree**
- [ ] **Step 3: Push changes to remote origin master (`git push origin master`)**
