(function (root) {
  const Become = (root.Become = root.Become || {});

  const STORAGE_KEY = 'become-v2';

  const REQUIRED_KEYS = [
    'version',
    'onboardingComplete',
    'settings',
    'goal',
    'habits',
    'habitCompletions',
    'foods',
    'meals',
    'mealTemplates',
    'foodLogs',
    'weights',
    'measurements',
    'fasts',
    'highCalorieEvents',
    'targetOverrides',
    'adaptiveSuggestion',
    'weeklySummaries',
    'dismissedCelebrations',
  ];

  function defaultState() {
    return {
      version: 1,
      onboardingComplete: false,
      settings: {
        calorieTarget: 1800,
        proteinTarget: null,
        weightAvgWindow: 7,
        showMeasurementsOnHome: false,
        units: 'lb',
      },
      goal: {
        startWeight: null,
        goalWeight: null,
        milestones: [],
      },
      habits: [],
      habitCompletions: {},
      foods: [],
      meals: [],
      mealTemplates: [],
      foodLogs: {},
      weights: [],
      measurements: [],
      fasts: [],
      highCalorieEvents: [],
      targetOverrides: {},
      adaptiveSuggestion: null,
      weeklySummaries: [],
      dismissedCelebrations: [],
    };
  }

  function loadState() {
    try {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
        return defaultState();
      }
      return { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings || {}) } };
    } catch {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
      return { ok: true, error: null };
    } catch {
      return {
        ok: false,
        error: 'Could not save. Changes may be lost if you close this tab.',
      };
    }
  }

  function exportState(state) {
    return JSON.stringify(state, null, 2);
  }

  function importState(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON');
    }
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      throw new Error('Unsupported version or shape');
    }
    for (const key of REQUIRED_KEYS) {
      if (!(key in parsed)) {
        throw new Error('Unsupported version or shape');
      }
    }
    return parsed;
  }

  Object.assign(Become, {
    STORAGE_KEY,
    defaultState,
    loadState,
    saveState,
    exportState,
    importState,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      STORAGE_KEY,
      defaultState,
      loadState,
      saveState,
      exportState,
      importState,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
