/**
 * LifeQuest / Become RPG - Unified Single-Page Web App
 */

import {
  calculateLevel,
  awardActionXP,
  generateBounceBackQuest,
  calculateForgivingStreak,
  ACTION_XP_MAP,
  INITIAL_RPG_STATE
} from './rpg.js';

import {
  searchOpenFoodFacts,
  fetchProductByBarcode
} from './food-api.js';

import {
  calculateWeeklyDeficit,
  createThoughtRecord,
  getRandomLovingTruth,
  getEatingWindowCountdown,
  breakFastEarlyCompassion,
  MIN_CALORIE_SAFETY_FLOOR
} from './mindfulness.js';

import {
  initFirebase,
  debounceCloudSync,
  linkGoogleAccount
} from './firebase-client.js';

const B = window.Become || {};
let appState = null;
let activeTab = 'hero';
let activeUrgeTimer = null;
let urgeSecondsLeft = 600; // 10 minutes
let fastingInterval = null;
let firebaseInstance = null;

// Ensure state is loaded and hydrated
function getAppState() {
  if (!appState) {
    appState = B.loadState ? B.loadState() : {};
    if (!appState.rpg) appState.rpg = { ...INITIAL_RPG_STATE };
    if (!appState.thoughtRecords) appState.thoughtRecords = [];
    if (!appState.whyWall) appState.whyWall = [];
    if (!appState.activeBounceBack) appState.activeBounceBack = null;
    if (!appState.settings) appState.settings = {};
    if (!appState.settings.calorieTarget) appState.settings.calorieTarget = 1800;
  }
  return appState;
}

function persistState() {
  if (B.saveState) {
    B.saveState(appState);
  }
  debounceCloudSync(appState);
  renderApp();
}

function showToast(message, icon = '✨') {
  let toast = document.getElementById('rpg-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'rpg-toast';
    toast.className = 'rpg-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-msg">${message}</span>`;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3500);
}

function handleAwardXP(actionKey, label = '') {
  const state = getAppState();
  const res = awardActionXP(state.rpg, actionKey);
  const actionName = label || actionKey.replace(/_/g, ' ').toLowerCase();

  if (res.levelUp) {
    showToast(`🎉 LEVEL UP! You reached Level ${res.level}! Keep shining!`, '👑');
  } else if (res.xpGained > 0) {
    showToast(`+${res.xpGained} XP: ${actionName}`, '⭐');
  }

  // Record day in showingUp
  const today = B.todayKey ? B.todayKey() : new Date().toISOString().split('T')[0];
  if (!state.rpg.showingUpDays) state.rpg.showingUpDays = [];
  if (!state.rpg.showingUpDays.includes(today)) {
    state.rpg.showingUpDays.push(today);
  }

  persistState();
}

export function initApp() {
  const container = document.getElementById('app');
  if (!container) return;

  appState = getAppState();

  // Initialize Firebase in background
  initFirebase((user) => {
    console.log('Firebase ready. Current User UID:', user.uid);
    renderApp();
  }).then(res => {
    firebaseInstance = res;
    renderApp();
  });

  // Fasting countdown tick
  if (fastingInterval) clearInterval(fastingInterval);
  fastingInterval = setInterval(() => {
    const countdownEl = document.getElementById('fasting-countdown-banner');
    if (countdownEl) {
      updateFastingBanner(countdownEl);
    }
  }, 30000);

  renderApp();
}

function updateFastingBanner(el) {
  const state = getAppState();
  const openTime = state.settings.eatingWindowOpen || '12:00';
  const closeTime = state.settings.eatingWindowClose || '18:00';
  const status = getEatingWindowCountdown(openTime, closeTime, new Date());
  el.textContent = status.message;
}

function renderApp() {
  const container = document.getElementById('app');
  if (!container) return;

  const state = getAppState();
  const today = B.todayKey ? B.todayKey() : new Date().toISOString().split('T')[0];
  const levelInfo = calculateLevel(state.rpg.totalXP || 0);
  const streakInfo = calculateForgivingStreak(state.rpg.showingUpDays || [], today);

  container.innerHTML = `
    <!-- Top Brand & Header -->
    <header class="rpg-header">
      <div class="rpg-brand-row">
        <div class="brand-left">
          <span class="pixel-crown">👑</span>
          <span class="rpg-brand-title">LifeQuest</span>
          <span class="rpg-tagline">"Bounce back, don't restart"</span>
        </div>
        <div class="header-level-pill" title="Every 100 XP is a Level Up!">
          LVL ${levelInfo.level}
        </div>
      </div>

      <!-- Hero XP Progress Meter -->
      <div class="xp-bar-container">
        <div class="xp-bar-labels">
          <span class="xp-label-sub">Level ${levelInfo.level}</span>
          <span class="xp-label-count">${levelInfo.currentLevelXP} / ${levelInfo.nextLevelXP} XP</span>
        </div>
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width: ${levelInfo.progressPct}%;"></div>
        </div>
      </div>

      <!-- Eating Window Status Pill -->
      <div class="eating-window-pill" id="fasting-countdown-banner">
        ${getEatingWindowCountdown(state.settings.eatingWindowOpen || '12:00', state.settings.eatingWindowClose || '18:00', new Date()).message}
      </div>
    </header>

    <!-- Gentle Bounce Back Banner -->
    <section class="bounce-back-banner">
      <div class="bb-text">
        <strong>Had a rough moment or gap in logging?</strong>
        <p>No guilt, no lost levels. Start your gentle 3-step reset right now.</p>
      </div>
      <button class="btn-bounce-back" id="btn-trigger-bounce-back">
        ✨ Bounce Back
      </button>
    </section>

    <!-- Navigation Tabs -->
    <nav class="rpg-nav-tabs">
      <button class="nav-tab ${activeTab === 'hero' ? 'active' : ''}" data-tab="hero">
        <span class="tab-icon">🧙</span> Hero
      </button>
      <button class="nav-tab ${activeTab === 'quests' ? 'active' : ''}" data-tab="quests">
        <span class="tab-icon">📜</span> Quests
      </button>
      <button class="nav-tab ${activeTab === 'tavern' ? 'active' : ''}" data-tab="tavern">
        <span class="tab-icon">🍖</span> Tavern & Food
      </button>
      <button class="nav-tab ${activeTab === 'sanctuary' ? 'active' : ''}" data-tab="sanctuary">
        <span class="tab-icon">🧘</span> Sanctuary
      </button>
      <button class="nav-tab ${activeTab === 'cloud' ? 'active' : ''}" data-tab="cloud">
        <span class="tab-icon">⚙️</span> Cloud
      </button>
    </nav>

    <!-- Main Tab View Content -->
    <main class="rpg-view-content" id="rpg-view-content">
      ${renderActiveTab(activeTab, state, today, levelInfo, streakInfo)}
    </main>

    <!-- Modals Container -->
    <div id="modal-container"></div>
  `;

  attachEventHandlers();
}

function renderActiveTab(tab, state, today, levelInfo, streakInfo) {
  switch (tab) {
    case 'hero':
      return renderHeroTab(state, today, levelInfo, streakInfo);
    case 'quests':
      return renderQuestsTab(state, today, streakInfo);
    case 'tavern':
      return renderTavernTab(state, today);
    case 'sanctuary':
      return renderSanctuaryTab(state);
    case 'cloud':
      return renderCloudTab(state);
    default:
      return renderHeroTab(state, today, levelInfo, streakInfo);
  }
}

// -------------------------------------------------------------
// TAB 1: HERO (DASHBOARD)
// -------------------------------------------------------------
function renderHeroTab(state, today, levelInfo, streakInfo) {
  const stats = state.rpg.stats || INITIAL_RPG_STATE.stats;
  const todayLog = (state.foodLogs && state.foodLogs[today]) || { calories: 0, protein: 0 };
  const dailyTarget = state.settings.calorieTarget || 1800;
  const proteinTarget = state.settings.proteinTarget || 120;

  // Calorie & Deficit calculations
  const maintenanceCal = dailyTarget + 500;
  const weekDates = getWeekDates(today);
  const deficitData = calculateWeeklyDeficit(
    dailyTarget,
    state.foodLogs || {},
    maintenanceCal,
    weekDates,
    today
  );

  const caloriePct = Math.min(100, Math.round(((todayLog.calories || 0) / dailyTarget) * 100));
  const proteinPct = Math.min(100, Math.round(((todayLog.protein || 0) / proteinTarget) * 100));

  return `
    <div class="tab-pane hero-pane">
      <!-- Character Card -->
      <div class="rpg-card character-card">
        <div class="char-header">
          <div class="avatar-box">
            <span class="avatar-icon">${state.rpg.avatarIcon || '🧙'}</span>
          </div>
          <div class="char-info">
            <h2 class="char-name">${state.rpg.characterName || 'Paladin of Balance'}</h2>
            <div class="char-rank">Level ${levelInfo.level} Champion · ${streakInfo.daysShowingUp} Days Showing Up</div>
            <div class="forgiving-streak-note">🌿 ${streakInfo.showingUpRateText}</div>
          </div>
        </div>

        <!-- 5 Stats Attribute Grid -->
        <div class="stats-grid">
          <div class="stat-cell" title="Health: Raised by meals, workouts, protein & water">
            <span class="stat-name">🛡️ Health</span>
            <span class="stat-val">${stats.health}</span>
          </div>
          <div class="stat-cell" title="Discipline: Raised by habits & eating windows">
            <span class="stat-name">🔒 Discipline</span>
            <span class="stat-val">${stats.discipline}</span>
          </div>
          <div class="stat-cell" title="Focus: Raised by meditation & urge timer">
            <span class="stat-name">🎯 Focus</span>
            <span class="stat-val">${stats.focus}</span>
          </div>
          <div class="stat-cell" title="Knowledge: Raised by reflections & thought records">
            <span class="stat-name">📖 Knowledge</span>
            <span class="stat-val">${stats.knowledge}</span>
          </div>
          <div class="stat-cell" title="Kindness: Raised by bouncing back & self-compassion">
            <span class="stat-name">💖 Kindness</span>
            <span class="stat-val">${stats.kindness}</span>
          </div>
        </div>
      </div>

      <!-- Nutrition Dashboard: Weekly Deficit & Protein -->
      <div class="rpg-card deficit-card">
        <h3 class="card-title">Weekly Deficit Progress</h3>
        <p class="card-sub">Your weekly deficit shifts smoothly if Tuesday is high. No red failure screens.</p>
        
        <div class="metric-bar-block">
          <div class="metric-row">
            <span>Weekly Deficit so far: <strong>${Math.max(0, deficitData.weeklyDeficitSoFar)} kcal</strong></span>
            <span>Goal: ${deficitData.weeklyGoal} kcal</span>
          </div>
          <div class="metric-track">
            <div class="metric-fill gold" style="width: ${Math.min(100, Math.max(0, Math.round((deficitData.weeklyDeficitSoFar / deficitData.weeklyGoal) * 100)))}%;"></div>
          </div>
        </div>

        <div class="gentle-plan-callout">
          <strong>Next 3 Days Gentle Target:</strong> ${deficitData.adjustedDailyTarget} kcal/day
          ${deficitData.isAtSafetyFloor ? '<span class="safety-tag">Safety Floor</span>' : ''}
        </div>
      </div>

      <!-- Today's Intake Snapshot -->
      <div class="rpg-card today-snapshot-card">
        <h3 class="card-title">Today's Fuel Snapshot</h3>
        
        <div class="macro-gauges">
          <!-- Calorie Gauge -->
          <div class="macro-gauge">
            <div class="gauge-title">Calories</div>
            <div class="gauge-numbers">
              <span class="logged">${todayLog.calories || 0}</span> / ${dailyTarget} kcal
            </div>
            <div class="gauge-bar">
              <div class="gauge-fill ${caloriePct > 100 ? 'over' : ''}" style="width: ${caloriePct}%;"></div>
            </div>
          </div>

          <!-- Protein Ring/Bar -->
          <div class="macro-gauge">
            <div class="gauge-title">Protein</div>
            <div class="gauge-numbers">
              <span class="logged">${todayLog.protein || 0}g</span> / ${proteinTarget}g
            </div>
            <div class="gauge-bar">
              <div class="gauge-fill protein" style="width: ${proteinPct}%;"></div>
            </div>
          </div>
        </div>

        <div class="quick-hero-actions">
          <button class="btn-action-pill" id="btn-quick-water">💧 Drink Water (+5 XP)</button>
          <button class="btn-action-pill" id="btn-moved-today">👟 I Moved Today (+15 XP)</button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 2: QUESTS (HABITS & MISSIONS)
// -------------------------------------------------------------
function renderQuestsTab(state, today, streakInfo) {
  const habits = state.habits || [];
  const completions = (state.habitCompletions && state.habitCompletions[today]) || {};
  const activeBB = state.activeBounceBack;

  return `
    <div class="tab-pane quests-pane">
      ${activeBB ? `
        <div class="rpg-card active-bounce-back-card">
          <div class="bb-header">
            <h3>🌱 Active Bounce-Back Reset Quest</h3>
            <span class="bb-badge">In Progress (+30 XP upon completion)</span>
          </div>
          <div class="bb-steps-list">
            ${activeBB.steps.map(step => `
              <label class="bb-step-item ${step.done ? 'done' : ''}">
                <input type="checkbox" class="cb-bb-step" data-step-id="${step.id}" ${step.done ? 'checked' : ''} />
                <span>${step.icon} ${step.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="rpg-card quests-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">Daily Habit Quests</h3>
            <p class="card-sub">Small daily actions. Big compound impact. +15 XP per habit.</p>
          </div>
          <button class="btn-sm btn-primary" id="btn-add-habit-modal">+ New Habit</button>
        </div>

        <div class="habits-checklist">
          ${habits.length === 0 ? `
            <div class="empty-hint">No habits configured yet! Tap "+ New Habit" to create your first quest.</div>
          ` : habits.map(h => {
            const done = !!completions[h.id];
            return `
              <div class="habit-quest-item ${done ? 'completed' : ''}">
                <label class="habit-label">
                  <input type="checkbox" class="cb-habit-toggle" data-habit-id="${h.id}" ${done ? 'checked' : ''} />
                  <span class="habit-name">${h.name}</span>
                </label>
                <div class="habit-actions">
                  <span class="habit-xp-tag">+15 XP</span>
                  <button class="btn-icon-del" data-del-habit="${h.id}" title="Remove">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Movement & Fitness Quests -->
      <div class="rpg-card movement-card">
        <h3 class="card-title">Movement & Workout Quests</h3>
        <p class="card-sub">Low energy day? "I moved today" preserves the habit without exhaustion.</p>
        <div class="quest-button-group">
          <button class="btn-quest-action" id="btn-log-workout">
            🏋️ Complete Workout (+25 XP)
          </button>
          <button class="btn-quest-action secondary" id="btn-log-moved-today">
            🚶 I Moved Today (+15 XP)
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 3: TAVERN (FOOD, DEFICIT & FASTING)
// -------------------------------------------------------------
function renderTavernTab(state, today) {
  const todayLog = (state.foodLogs && state.foodLogs[today]) || { calories: 0, protein: 0, items: [] };
  const items = todayLog.items || [];
  const openTime = state.settings.eatingWindowOpen || '12:00';
  const closeTime = state.settings.eatingWindowClose || '18:00';

  return `
    <div class="tab-pane tavern-pane">
      <!-- Quick Food Search & Add -->
      <div class="rpg-card food-search-card">
        <h3 class="card-title">Nourishment Tavern</h3>
        <p class="card-sub">Instant search OpenFoodFacts database or scan barcodes</p>

        <div class="search-input-row">
          <input type="text" id="food-search-query" class="rpg-input" placeholder="Search OpenFoodFacts (e.g. Greek yogurt, oats, chicken)..." />
          <button class="btn-primary" id="btn-search-foods">🔍 Search</button>
        </div>

        <div class="barcode-row">
          <input type="text" id="barcode-input" class="rpg-input" placeholder="Or enter barcode UPC..." />
          <button class="btn-secondary" id="btn-lookup-barcode">🏷️ Lookup</button>
        </div>

        <div id="food-search-results" class="search-results-list"></div>
      </div>

      <!-- Today's Logged Items -->
      <div class="rpg-card food-logs-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">Today's Meals (${todayLog.calories || 0} kcal · ${todayLog.protein || 0}g protein)</h3>
          </div>
          <button class="btn-sm btn-outline" id="btn-custom-food-modal">+ Quick Custom Entry</button>
        </div>

        <div class="food-entries-list">
          ${items.length === 0 ? `
            <div class="empty-hint">No food logged yet today. Use the search above to add your first meal!</div>
          ` : items.map((item, idx) => `
            <div class="food-item-row">
              <div class="food-item-details">
                <span class="food-item-name">${item.name}</span>
                <span class="food-item-sub">${item.grams || 100}g · ${item.protein || 0}g protein</span>
              </div>
              <div class="food-item-cal">
                <strong>${item.calories}</strong> kcal
                <button class="btn-icon-del" data-remove-food-idx="${idx}">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 48-Hour Fasting Companion & Checklist -->
      <div class="rpg-card fasting-suite-card">
        <h3 class="card-title">Fasting & Window Lounge</h3>
        <p class="card-sub">Support for daily eating windows and scheduled fasts with zero guilt.</p>

        <div class="fasting-checklist">
          <h4>Pre-Fast Prep Checklist:</h4>
          <label><input type="checkbox" /> 💧 Hydrated with at least 500ml water</label>
          <label><input type="checkbox" /> 🧂 Electrolytes ready (sodium/potassium/magnesium)</label>
          <label><input type="checkbox" /> 🥗 Light balanced preparatory meal</label>
        </div>

        <div class="fasting-button-row">
          <button class="btn-primary" id="btn-start-fast-now">⏱️ Start Fast Now</button>
          <button class="btn-outline" id="btn-break-fast-compassion">🌿 Break Fast Early (Compassion Reflection)</button>
        </div>

        <div class="refeeding-guide">
          <strong>Gentle Refeeding Guide:</strong> Bone broth, scrambled eggs, or light Greek yogurt first. Avoid heavy sugars or large fatty meals immediately after.
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 4: SANCTUARY (MINDFULNESS & OBSTACLES)
// -------------------------------------------------------------
function renderSanctuaryTab(state) {
  const records = state.thoughtRecords || [];
  const whyWall = state.whyWall || [];

  return `
    <div class="tab-pane sanctuary-pane">
      <!-- Craving & Urge Timer Widget -->
      <div class="rpg-card urge-timer-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">10-Minute Urge Timer</h3>
            <p class="card-sub">Wait 10 minutes, take 5 slow breaths, then decide. Earns +25 Focus XP.</p>
          </div>
          <button class="btn-sm btn-primary" id="btn-toggle-urge-timer">
            ${activeUrgeTimer ? '⏸️ Pause' : '⏳ Start 10-Min Timer'}
          </button>
        </div>
        <div class="urge-timer-display" id="urge-timer-display">
          ${Math.floor(urgeSecondsLeft / 60)}:${String(urgeSecondsLeft % 60).padStart(2, '0')}
        </div>
        <div class="swap-ideas">
          <strong>Smart Swap Ideas:</strong> Sparkling water with lime, herbal peppermint tea, 10-minute fresh air walk, crunchy celery or cucumber slices.
        </div>
      </div>

      <!-- Tempting Thoughts vs Loving Truths -->
      <div class="rpg-card thought-records-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">Cognitive Grimoire (Tempting Thought vs. Loving Truth)</h3>
            <p class="card-sub">When cravings hit, review your past truth to anchor your mind.</p>
          </div>
          <div class="thought-buttons">
            <button class="btn-sm btn-outline" id="btn-recall-random-truth">✨ Craving Help (Random Truth)</button>
            <button class="btn-sm btn-primary" id="btn-add-thought-record">+ New Reframe</button>
          </div>
        </div>

        <div class="thought-records-list">
          ${records.length === 0 ? `
            <div class="empty-hint">No thought pairs recorded yet. Tap "+ New Reframe" to turn a tempting thought into loving truth!</div>
          ` : records.map(r => `
            <div class="thought-record-pair">
              <div class="thought-col tempting">
                <span class="thought-tag">Tempting Thought</span>
                <p>"${r.tempting}"</p>
              </div>
              <div class="thought-col truth">
                <span class="thought-tag">Loving Truth</span>
                <p>"${r.truth}"</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Why Wall & Wins Log -->
      <div class="rpg-card why-wall-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">The "Why" Wall & Non-Scale Victories</h3>
            <p class="card-sub">Celebrate deeper energy, better sleep, looser clothes, and peace of mind.</p>
          </div>
          <button class="btn-sm btn-primary" id="btn-add-why-card">+ Add Victory / Why</button>
        </div>

        <div class="why-wall-grid">
          ${whyWall.length === 0 ? `
            <div class="empty-hint">Your wall is waiting for your core reasons and victories. Tap "+ Add Victory / Why"!</div>
          ` : whyWall.map((w, idx) => `
            <div class="why-card-item">
              <span class="why-icon">${w.icon || '🌟'}</span>
              <p class="why-text">${w.text}</p>
              <button class="btn-icon-del" data-del-why="${idx}">✕</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Evening Reflection -->
      <div class="rpg-card evening-reflection-card">
        <h3 class="card-title">Evening Reflection</h3>
        <p class="card-sub">End each day like a true player: "What went well today?" (+15 XP)</p>
        <div class="reflection-input-row">
          <input type="text" id="input-evening-reflection" class="rpg-input" placeholder="Today I felt proud of..." />
          <button class="btn-primary" id="btn-save-evening-reflection">Save Reflection</button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 5: CLOUD (FIREBASE & SETTINGS)
// -------------------------------------------------------------
function renderCloudTab(state) {
  const isAnonymous = firebaseInstance?.isAnonymous?.() ?? true;
  const uid = firebaseInstance?.getUid?.() || 'offline_guest';
  const calTarget = state.settings.calorieTarget || 1800;

  return `
    <div class="tab-pane cloud-pane">
      <div class="rpg-card cloud-card">
        <h3 class="card-title">Firebase Cloud Sync</h3>
        <p class="card-sub">Connected to Firebase Project <code>sandbox-ed1e2</code>. Progress saves automatically in Cloud Firestore.</p>

        <div class="sync-status-box">
          <div class="sync-row">
            <span>Status:</span>
            <span class="status-badge ${firebaseInstance?.ok ? 'online' : 'offline'}">
              ● ${firebaseInstance?.ok ? 'Connected (Auto-Sync Active)' : 'Offline / LocalStorage'}
            </span>
          </div>
          <div class="sync-row">
            <span>Player UID:</span>
            <code>${uid}</code>
          </div>
          <div class="sync-row">
            <span>Account Type:</span>
            <span>${isAnonymous ? 'Anonymous Guest' : 'Linked Google Account'}</span>
          </div>
        </div>

        ${isAnonymous ? `
          <button class="btn-primary btn-google" id="btn-link-google">
            🔗 Link Google Account (Save Progress Across Devices)
          </button>
        ` : `
          <div class="linked-success-banner">✅ Google Account Linked. All progress synchronizes across all your devices.</div>
        `}
      </div>

      <!-- Targets & Safety Floor -->
      <div class="rpg-card settings-targets-card">
        <h3 class="card-title">Nutrition & Window Targets</h3>

        <div class="settings-form-row">
          <label>Daily Calorie Target (kcal):</label>
          <input type="number" id="setting-calorie-target" class="rpg-input" value="${calTarget}" min="800" max="6000" />
        </div>
        ${calTarget < MIN_CALORIE_SAFETY_FLOOR ? `
          <div class="safety-warning">
            ⚠️ <strong>Safety Floor Notice:</strong> Targets below 1200 kcal/day can trigger extreme cravings and fatigue. Consider raising this to protect your metabolism.
          </div>
        ` : ''}

        <div class="settings-form-row">
          <label>Daily Protein Target (grams):</label>
          <input type="number" id="setting-protein-target" class="rpg-input" value="${state.settings.proteinTarget || 120}" />
        </div>

        <div class="settings-form-row">
          <label>Eating Window Hours:</label>
          <div class="time-inputs-pair">
            <input type="time" id="setting-eating-open" class="rpg-input" value="${state.settings.eatingWindowOpen || '12:00'}" />
            <span>to</span>
            <input type="time" id="setting-eating-close" class="rpg-input" value="${state.settings.eatingWindowClose || '18:00'}" />
          </div>
        </div>

        <button class="btn-primary" id="btn-save-settings">Save Settings</button>
      </div>

      <!-- Data Export & Import -->
      <div class="rpg-card backup-card">
        <h3 class="card-title">Local Data Ownership</h3>
        <p class="card-sub">Export your entire character history, food logs, and thought records as JSON anytime.</p>
        <div class="backup-buttons">
          <button class="btn-outline" id="btn-export-json">💾 Export JSON Backup</button>
          <button class="btn-outline" id="btn-import-json">📥 Import Backup</button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// EVENT HANDLERS & MODAL CONTROLLERS
// -------------------------------------------------------------
function attachEventHandlers() {
  const container = document.getElementById('app');
  if (!container) return;

  // Nav tabs switching
  container.querySelectorAll('.nav-tab').forEach(btn => {
    btn.onclick = () => {
      activeTab = btn.getAttribute('data-tab');
      renderApp();
    };
  });

  // Bounce Back trigger
  const btnBB = document.getElementById('btn-trigger-bounce-back');
  if (btnBB) {
    btnBB.onclick = () => {
      const state = getAppState();
      state.activeBounceBack = {
        createdAt: new Date().toISOString(),
        steps: generateBounceBackQuest()
      };
      activeTab = 'quests';
      handleAwardXP('BOUNCE_BACK', 'Bounced Back with compassion');
    };
  }

  // Bounce Back step toggles
  container.querySelectorAll('.cb-bb-step').forEach(cb => {
    cb.onchange = () => {
      const stepId = cb.getAttribute('data-step-id');
      const state = getAppState();
      if (!state.activeBounceBack) return;
      const step = state.activeBounceBack.steps.find(s => s.id === stepId);
      if (step) {
        step.done = cb.checked;
        if (state.activeBounceBack.steps.every(s => s.done)) {
          showToast('🎉 Gentle Reset Quest Complete! You are back on track!', '🌱');
          state.activeBounceBack = null;
        }
        persistState();
      }
    };
  });

  // Quick hero buttons
  const btnWater = document.getElementById('btn-quick-water');
  if (btnWater) btnWater.onclick = () => handleAwardXP('DRINK_WATER', 'Drank cold water');

  const btnMoved = document.getElementById('btn-moved-today');
  if (btnMoved) btnMoved.onclick = () => handleAwardXP('MOVED_TODAY', 'I moved today');

  const btnWorkout = document.getElementById('btn-log-workout');
  if (btnWorkout) btnWorkout.onclick = () => handleAwardXP('WORKOUT', 'Completed workout');

  const btnMovedQuest = document.getElementById('btn-log-moved-today');
  if (btnMovedQuest) btnMovedQuest.onclick = () => handleAwardXP('MOVED_TODAY', 'I moved today');

  // Habit check/uncheck
  container.querySelectorAll('.cb-habit-toggle').forEach(cb => {
    cb.onchange = () => {
      const habitId = cb.getAttribute('data-habit-id');
      const state = getAppState();
      const today = B.todayKey ? B.todayKey() : new Date().toISOString().split('T')[0];
      if (!state.habitCompletions) state.habitCompletions = {};
      if (!state.habitCompletions[today]) state.habitCompletions[today] = {};

      state.habitCompletions[today][habitId] = cb.checked;
      if (cb.checked) {
        handleAwardXP('COMPLETE_HABIT', 'Completed habit');
      } else {
        persistState();
      }
    };
  });

  // Add Habit modal
  const btnAddHabit = document.getElementById('btn-add-habit-modal');
  if (btnAddHabit) {
    btnAddHabit.onclick = () => {
      const name = prompt('Enter habit quest name (e.g., Read 15 mins, Morning meditation, 8k steps):');
      if (name && name.trim()) {
        const state = getAppState();
        state.habits.push({ id: `h_${Date.now()}`, name: name.trim() });
        persistState();
      }
    };
  }

  // Delete habit
  container.querySelectorAll('[data-del-habit]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-del-habit');
      if (confirm('Delete this habit quest?')) {
        const state = getAppState();
        state.habits = state.habits.filter(h => h.id !== id);
        persistState();
      }
    };
  });

  // OpenFoodFacts search
  const btnSearchFood = document.getElementById('btn-search-foods');
  const inputSearchFood = document.getElementById('food-search-query');
  if (btnSearchFood && inputSearchFood) {
    const doSearch = async () => {
      const q = inputSearchFood.value;
      if (!q.trim()) return;
      btnSearchFood.textContent = 'Searching...';
      const results = await searchOpenFoodFacts(q);
      btnSearchFood.textContent = '🔍 Search';

      const resultsContainer = document.getElementById('food-search-results');
      if (!resultsContainer) return;

      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-hint">No matching foods found in OpenFoodFacts. Try another keyword or add a custom entry below.</div>';
        return;
      }

      resultsContainer.innerHTML = results.slice(0, 8).map(r => `
        <div class="food-search-result-item">
          <div>
            <strong>${r.name}</strong> ${r.brand ? `<span class="brand-sub">(${r.brand})</span>` : ''}
            <div class="off-macro-row">${r.calPer100g} kcal · ${r.proteinPer100g}g P per 100g</div>
          </div>
          <button class="btn-sm btn-primary btn-add-food-item" 
            data-food-name="${escapeHtml(r.name)}" 
            data-cal100="${r.calPer100g}" 
            data-pro100="${r.proteinPer100g}">
            + Log
          </button>
        </div>
      `).join('');

      resultsContainer.querySelectorAll('.btn-add-food-item').forEach(addBtn => {
        addBtn.onclick = () => {
          const foodName = addBtn.getAttribute('data-food-name');
          const cal100 = parseFloat(addBtn.getAttribute('data-cal100')) || 0;
          const pro100 = parseFloat(addBtn.getAttribute('data-pro100')) || 0;
          const gramsStr = prompt(`How many grams of "${foodName}" did you eat?`, '100');
          const grams = parseFloat(gramsStr) || 100;

          const calories = Math.round((cal100 * grams) / 100);
          const protein = Math.round(((pro100 * grams) / 100) * 10) / 10;

          logFoodItem({ name: foodName, calories, protein, grams });
        };
      });
    };

    btnSearchFood.onclick = doSearch;
    inputSearchFood.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
  }

  // Barcode Lookup
  const btnBarcode = document.getElementById('btn-lookup-barcode');
  const inputBarcode = document.getElementById('barcode-input');
  if (btnBarcode && inputBarcode) {
    btnBarcode.onclick = async () => {
      const code = inputBarcode.value.trim();
      if (!code) return;
      btnBarcode.textContent = 'Searching...';
      const prod = await fetchProductByBarcode(code);
      btnBarcode.textContent = '🏷️ Lookup';
      if (!prod) {
        alert('Product not found for this barcode in OpenFoodFacts.');
        return;
      }
      const gramsStr = prompt(`Found "${prod.name}" (${prod.calPer100g} kcal/100g). How many grams?`, '100');
      const grams = parseFloat(gramsStr) || 100;
      const calories = Math.round((prod.calPer100g * grams) / 100);
      const protein = Math.round(((prod.proteinPer100g * grams) / 100) * 10) / 10;
      logFoodItem({ name: prod.name, calories, protein, grams });
    };
  }

  // Custom food quick entry
  const btnCustom = document.getElementById('btn-custom-food-modal');
  if (btnCustom) {
    btnCustom.onclick = () => {
      const name = prompt('Food or Meal name:');
      if (!name) return;
      const calStr = prompt('Total Calories (kcal):', '350');
      const proStr = prompt('Protein (g):', '25');
      const calories = parseFloat(calStr) || 0;
      const protein = parseFloat(proStr) || 0;
      logFoodItem({ name: name.trim(), calories, protein, grams: 100 });
    };
  }

  // Remove food item
  container.querySelectorAll('[data-remove-food-idx]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-remove-food-idx'), 10);
      const state = getAppState();
      const today = B.todayKey ? B.todayKey() : new Date().toISOString().split('T')[0];
      if (state.foodLogs && state.foodLogs[today] && state.foodLogs[today].items) {
        state.foodLogs[today].items.splice(idx, 1);
        // Recalculate totals
        state.foodLogs[today].calories = state.foodLogs[today].items.reduce((s, i) => s + (i.calories || 0), 0);
        state.foodLogs[today].protein = state.foodLogs[today].items.reduce((s, i) => s + (i.protein || 0), 0);
        persistState();
      }
    };
  });

  // Fasting buttons
  const btnStartFast = document.getElementById('btn-start-fast-now');
  if (btnStartFast) {
    btnStartFast.onclick = () => {
      showToast('⏱️ Fast started! Stay hydrated with water & electrolytes.', '💧');
      handleAwardXP('COMPLETE_FAST', 'Started Fast Window');
    };
  }

  const btnBreakFast = document.getElementById('btn-break-fast-compassion');
  if (btnBreakFast) {
    btnBreakFast.onclick = () => {
      const hoursStr = prompt('How many hours did you fast?', '24');
      const hours = parseFloat(hoursStr) || 24;
      const message = breakFastEarlyCompassion(hours, 48);
      alert(message);
      handleAwardXP('BREAK_FAST_EARLY_MINDFUL', 'Mindful Fast Conclusion');
    };
  }

  // Urge timer toggle
  const btnUrge = document.getElementById('btn-toggle-urge-timer');
  if (btnUrge) {
    btnUrge.onclick = () => {
      if (activeUrgeTimer) {
        clearInterval(activeUrgeTimer);
        activeUrgeTimer = null;
        btnUrge.textContent = '⏳ Resume 10-Min Timer';
      } else {
        btnUrge.textContent = '⏸️ Pause';
        activeUrgeTimer = setInterval(() => {
          urgeSecondsLeft--;
          const display = document.getElementById('urge-timer-display');
          if (display) {
            display.textContent = `${Math.floor(urgeSecondsLeft / 60)}:${String(urgeSecondsLeft % 60).padStart(2, '0')}`;
          }
          if (urgeSecondsLeft <= 0) {
            clearInterval(activeUrgeTimer);
            activeUrgeTimer = null;
            urgeSecondsLeft = 600;
            showToast('🎉 You completed the 10-minute urge timer! Urge survived!', '🏆');
            handleAwardXP('URGE_TIMER', 'Surviving 10-minute urge timer');
          }
        }, 1000);
      }
    };
  }

  // Thought records
  const btnAddThought = document.getElementById('btn-add-thought-record');
  if (btnAddThought) {
    btnAddThought.onclick = () => {
      const tempting = prompt('What is the tempting thought? (e.g., "I already blew today, might as well keep eating"):');
      if (!tempting) return;
      const truth = prompt('What is the loving truth? (e.g., "One meal does not define my progress. I can start fresh right now"):');
      if (!truth) return;

      const state = getAppState();
      state.thoughtRecords.push(createThoughtRecord(tempting, truth));
      handleAwardXP('THOUGHT_RECORD', 'Saved Cognitive Thought Reframe');
    };
  }

  const btnRecallTruth = document.getElementById('btn-recall-random-truth');
  if (btnRecallTruth) {
    btnRecallTruth.onclick = () => {
      const state = getAppState();
      const truth = getRandomLovingTruth(state.thoughtRecords || []);
      if (!truth) {
        alert('You haven’t recorded any Loving Truths yet. Tap "+ New Reframe" to record your first one!');
      } else {
        alert(`🌟 Loving Truth Reminder:\n\n"${truth.truth}"\n\n(Originally written to counter: "${truth.tempting}")`);
      }
    };
  }

  // Why Wall
  const btnAddWhy = document.getElementById('btn-add-why-card');
  if (btnAddWhy) {
    btnAddWhy.onclick = () => {
      const text = prompt('Enter your motivation statement or non-scale victory:');
      if (text && text.trim()) {
        const state = getAppState();
        state.whyWall.push({ icon: '🌟', text: text.trim() });
        persistState();
      }
    };
  }

  container.querySelectorAll('[data-del-why]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-del-why'), 10);
      const state = getAppState();
      state.whyWall.splice(idx, 1);
      persistState();
    };
  });

  // Evening reflection
  const btnSaveRefl = document.getElementById('btn-save-evening-reflection');
  const inputRefl = document.getElementById('input-evening-reflection');
  if (btnSaveRefl && inputRefl) {
    btnSaveRefl.onclick = () => {
      const val = inputRefl.value.trim();
      if (!val) return;
      handleAwardXP('EVENING_REFLECTION', 'Evening reflection completed');
      inputRefl.value = '';
    };
  }

  // Firebase Google link
  const btnGoogle = document.getElementById('btn-link-google');
  if (btnGoogle) {
    btnGoogle.onclick = async () => {
      try {
        btnGoogle.textContent = 'Connecting...';
        await linkGoogleAccount();
        showToast('Google account linked! Character saved to cloud.', '☁️');
        renderApp();
      } catch (err) {
        alert('Google Link error: ' + err.message);
        renderApp();
      }
    };
  }

  // Save Settings
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.onclick = () => {
      const state = getAppState();
      const calInput = document.getElementById('setting-calorie-target');
      const proInput = document.getElementById('setting-protein-target');
      const openInput = document.getElementById('setting-eating-open');
      const closeInput = document.getElementById('setting-eating-close');

      state.settings.calorieTarget = parseFloat(calInput.value) || 1800;
      state.settings.proteinTarget = parseFloat(proInput.value) || 120;
      state.settings.eatingWindowOpen = openInput.value || '12:00';
      state.settings.eatingWindowClose = closeInput.value || '18:00';

      persistState();
      showToast('Settings saved successfully!', '⚙️');
    };
  }

  // Export / Import JSON
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.onclick = () => {
      const state = getAppState();
      const json = B.exportState ? B.exportState(state) : JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifequest-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  const btnImport = document.getElementById('btn-import-json');
  if (btnImport) {
    btnImport.onclick = () => {
      const raw = prompt('Paste your exported JSON here:');
      if (!raw) return;
      try {
        const imported = B.importState ? B.importState(raw) : JSON.parse(raw);
        appState = imported;
        persistState();
        showToast('Backup restored successfully!', '✅');
      } catch (e) {
        alert('Invalid JSON: ' + e.message);
      }
    };
  }
}

function logFoodItem({ name, calories, protein, grams }) {
  const state = getAppState();
  const today = B.todayKey ? B.todayKey() : new Date().toISOString().split('T')[0];
  if (!state.foodLogs) state.foodLogs = {};
  if (!state.foodLogs[today]) state.foodLogs[today] = { calories: 0, protein: 0, items: [] };

  const dayLog = state.foodLogs[today];
  if (!dayLog.items) dayLog.items = [];

  dayLog.items.push({ name, calories, protein, grams });
  dayLog.calories = dayLog.items.reduce((s, i) => s + (i.calories || 0), 0);
  dayLog.protein = dayLog.items.reduce((s, i) => s + (i.protein || 0), 0);

  handleAwardXP('LOG_MEAL', `Logged ${name}`);
}

function getWeekDates(todayStr) {
  const dates = [];
  const [y, m, d] = todayStr.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  const dayOfWeek = cur.getDay(); // 0 is Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(cur);
  monday.setDate(cur.getDate() + mondayOffset);

  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    dates.push(`${yr}-${mo}-${da}`);
  }
  return dates;
}

function escapeHtml(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Auto-run on DOM load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
