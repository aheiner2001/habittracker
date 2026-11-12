/**
 * RPG Progression, Leveling & Forgiving Streaks Engine
 * Inspired by "Gamify Your Life" and "Bounce back, don't restart"
 */

export const INITIAL_RPG_STATE = {
  characterName: 'Paladin',
  avatarIcon: '🧙',
  level: 1,
  totalXP: 0,
  stats: {
    health: 10,
    discipline: 10,
    focus: 10,
    knowledge: 10,
    kindness: 10
  },
  questsCompletedCount: 0,
  bounceBackCount: 0
};

export const ACTION_XP_MAP = {
  LOG_MEAL: { xp: 15, stat: 'health' },
  HIT_PROTEIN: { xp: 20, stat: 'health' },
  COMPLETE_HABIT: { xp: 15, stat: 'discipline' },
  WORKOUT: { xp: 25, stat: 'health' },
  MOVED_TODAY: { xp: 15, stat: 'kindness' },
  DRINK_WATER: { xp: 5, stat: 'health' },
  URGE_TIMER: { xp: 25, stat: 'focus' },
  THOUGHT_RECORD: { xp: 20, stat: 'knowledge' },
  MEDITATION: { xp: 20, stat: 'focus' },
  EVENING_REFLECTION: { xp: 15, stat: 'knowledge' },
  BOUNCE_BACK: { xp: 30, stat: 'kindness' },
  COMPLETE_FAST: { xp: 40, stat: 'discipline' },
  BREAK_FAST_EARLY_MINDFUL: { xp: 20, stat: 'kindness' }
};

export function calculateLevel(totalXP = 0) {
  const safeXP = Math.max(0, Math.floor(totalXP));
  const level = Math.floor(safeXP / 100) + 1;
  const currentLevelXP = safeXP % 100;
  const nextLevelXP = 100;
  const progressPct = Math.min(100, Math.max(0, currentLevelXP));

  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progressPct
  };
}

export function awardActionXP(state, actionKey) {
  const action = ACTION_XP_MAP[actionKey];
  if (!action) {
    return {
      xpGained: 0,
      totalXP: state.totalXP || 0,
      level: calculateLevel(state.totalXP || 0).level,
      levelUp: false,
      stats: { ...(state.stats || INITIAL_RPG_STATE.stats) }
    };
  }

  const prevLevel = calculateLevel(state.totalXP || 0).level;
  const newXP = (state.totalXP || 0) + action.xp;
  const newLevelInfo = calculateLevel(newXP);
  const levelUp = newLevelInfo.level > prevLevel;

  const currentStats = { ...(state.stats || INITIAL_RPG_STATE.stats) };
  if (action.stat && typeof currentStats[action.stat] === 'number') {
    currentStats[action.stat] += 1;
  }

  state.totalXP = newXP;
  state.level = newLevelInfo.level;
  state.stats = currentStats;

  return {
    xpGained: action.xp,
    totalXP: newXP,
    level: newLevelInfo.level,
    levelUp,
    stats: currentStats
  };
}

export function generateBounceBackQuest() {
  return [
    {
      id: `bb_nourish_${Date.now()}`,
      category: 'nourish',
      label: 'Drink a glass of water or plan your next nourishing meal',
      icon: '💧',
      done: false
    },
    {
      id: `bb_move_${Date.now()}`,
      category: 'move',
      label: 'Take a 10-minute walk or gentle stretch',
      icon: '👟',
      done: false
    },
    {
      id: `bb_reflect_${Date.now()}`,
      category: 'reflect',
      label: 'One gentle check-in: "I am safe, learning, and ready for what is next"',
      icon: '🧘',
      done: false
    }
  ];
}

export function calculateForgivingStreak(historyDates = [], todayStr = '') {
  const cleanDates = Array.from(new Set(historyDates)).filter(Boolean).sort();
  const daysShowingUp = cleanDates.length;

  if (daysShowingUp === 0) {
    return {
      daysShowingUp: 0,
      returnRateCount: 0,
      recentReturnWindow: 0,
      showingUpRateText: '0 days showing up'
    };
  }

  let returnRateCount = 0;
  for (let i = 1; i < cleanDates.length; i++) {
    const prev = new Date(cleanDates[i - 1]);
    const curr = new Date(cleanDates[i]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      returnRateCount++;
    }
  }

  return {
    daysShowingUp,
    returnRateCount,
    recentReturnWindow: 1,
    showingUpRateText: `${daysShowingUp} days showing up (${returnRateCount} gentle bounce-backs)`
  };
}
