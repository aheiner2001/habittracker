(function (root) {
  const Become = (root.Become = root.Become || {});

  const NOTES = [
    'Steady beats perfect. One honest week is a win.',
    'Visibility is the habit. Keep logging — the trend will catch up.',
    'Cravings pass. Your rolling average remembers what matters.',
    'Small checkpoints add up. Show up again tomorrow.',
  ];

  function weekEndingSunday(dateKey) {
    const d = Become.parseDateKey(dateKey);
    const day = d.getDay(); // 0 Sun
    const end = Become.addDays(dateKey, day === 0 ? 0 : 7 - day);
    return end;
  }

  function weekStartMonday(weekEndSunday) {
    return Become.addDays(weekEndSunday, -6);
  }

  function ensureWeeklySummary(state, todayKey) {
    const weekEnd = weekEndingSunday(todayKey);
    const already = (state.weeklySummaries || []).some((s) => s.weekEnd === weekEnd);
    const today = Become.parseDateKey(todayKey);
    if (today.getDay() !== 0 && !already) {
      // Only auto-generate on Sundays; if already present, keep
      return state;
    }
    if (already) return state;

    const start = weekStartMonday(weekEnd);
    let calSum = 0;
    let calDays = 0;
    let habitDone = 0;
    let habitPossible = 0;
    const activeHabits = (state.habits || []).filter((h) => h.active);
    let cursor = start;
    while (cursor <= weekEnd) {
      if (!Become.isFastingDay || !Become.isFastingDay(state, cursor)) {
        const n = Become.dayNutrition(state, cursor);
        if ((state.foodLogs[cursor] || []).length) {
          calSum += n.calories;
          calDays += 1;
        }
      }
      for (const h of activeHabits) {
        habitPossible += 1;
        if (state.habitCompletions[cursor]?.[h.id]) habitDone += 1;
      }
      cursor = Become.addDays(cursor, 1);
    }
    const avgCalories = calDays ? Math.round(calSum / calDays) : 0;
    const window = state.settings.weightAvgWindow || 7;
    const avgEnd = Become.rollingAverage(state.weights, weekEnd, window);
    const avgStart = Become.rollingAverage(
      state.weights,
      Become.addDays(weekEnd, -7),
      window
    );
    const weightDelta =
      avgEnd != null && avgStart != null
        ? Math.round((avgEnd - avgStart) * 10) / 10
        : null;
    const habitPct = habitPossible
      ? Math.round((habitDone / habitPossible) * 100)
      : 0;
    const weekNum = Math.floor(Become.dayOfYear(Become.parseDateKey(weekEnd)) / 7);
    const note = NOTES[weekNum % NOTES.length];
    return {
      ...state,
      weeklySummaries: [
        ...(state.weeklySummaries || []),
        { weekEnd, avgCalories, weightDelta, habitPct, note },
      ],
    };
  }

  Object.assign(Become, { ensureWeeklySummary, weekEndingSunday });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ensureWeeklySummary, weekEndingSunday };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
