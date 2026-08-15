(function (root) {
  const Become = (root.Become = root.Become || {});

  function computeAdaptiveSuggestion(state, todayKey) {
    const weights = [...(state.weights || [])].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    if (weights.length < 14) return null;
    const oldest = weights[0].date;
    const newest = weights[weights.length - 1].date;
    const spanDays =
      (Become.parseDateKey(newest) - Become.parseDateKey(oldest)) / 86400000;
    if (spanDays < 14) return null;

    const window = state.settings.weightAvgWindow || 7;
    const avgRecent = Become.rollingAverage(weights, todayKey, window);
    const pastKey = Become.addDays(todayKey, -14);
    const avgOld = Become.rollingAverage(weights, pastKey, window);
    if (avgRecent == null || avgOld == null) return null;

    const rateLbPerWeek = Math.round(((avgOld - avgRecent) / 2) * 10) / 10;
    const aim = 2;
    const delta = rateLbPerWeek - aim;
    if (Math.abs(delta) < 0.5) return null;

    const steps = Math.round(delta / 0.5);
    // faster loss (rate > aim) → raise calories; slower → lower
    const kcalDelta = Math.round((-steps) * 250);
    const suggestedTarget = Math.max(
      1200,
      Number(state.settings.calorieTarget) + kcalDelta
    );
    const message =
      rateLbPerWeek > aim
        ? `You're losing about ${rateLbPerWeek} lb/week (aim ~2). Consider raising your target to ${suggestedTarget} kcal.`
        : `You're losing about ${rateLbPerWeek} lb/week (aim ~2). Consider lowering your target to ${suggestedTarget} kcal.`;

    return { suggestedTarget, rateLbPerWeek, message };
  }

  function acceptAdaptive(state) {
    if (!state.adaptiveSuggestion) return state;
    return {
      ...state,
      settings: {
        ...state.settings,
        calorieTarget: state.adaptiveSuggestion.suggestedTarget,
      },
      adaptiveSuggestion: null,
    };
  }

  function dismissAdaptive(state) {
    return { ...state, adaptiveSuggestion: null };
  }

  Object.assign(Become, {
    computeAdaptiveSuggestion,
    acceptAdaptive,
    dismissAdaptive,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeAdaptiveSuggestion,
      acceptAdaptive,
      dismissAdaptive,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
