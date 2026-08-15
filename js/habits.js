(function (root) {
  const Become = (root.Become = root.Become || {});

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function addHabit(state, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return state;
    return {
      ...state,
      habits: [...state.habits, { id: newId('habit'), name: trimmed, active: true }],
    };
  }

  function removeHabit(state, id) {
    return {
      ...state,
      habits: state.habits.map((h) =>
        h.id === id ? { ...h, active: false } : h
      ),
    };
  }

  function renameHabit(state, id, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return state;
    return {
      ...state,
      habits: state.habits.map((h) =>
        h.id === id ? { ...h, name: trimmed } : h
      ),
    };
  }

  function toggleHabit(state, dateKey, habitId) {
    const day = { ...(state.habitCompletions[dateKey] || {}) };
    if (day[habitId]) delete day[habitId];
    else day[habitId] = true;
    const habitCompletions = { ...state.habitCompletions };
    if (Object.keys(day).length === 0) delete habitCompletions[dateKey];
    else habitCompletions[dateKey] = day;
    return { ...state, habitCompletions };
  }

  function isDone(state, dateKey, habitId) {
    return Boolean(state.habitCompletions[dateKey]?.[habitId]);
  }

  function streakFor(state, habitId, today) {
    let cursor = today;
    if (!isDone(state, cursor, habitId)) {
      cursor = Become.addDays(today, -1);
      if (!isDone(state, cursor, habitId)) return 0;
    }
    let streak = 0;
    while (isDone(state, cursor, habitId)) {
      streak += 1;
      cursor = Become.addDays(cursor, -1);
    }
    return streak;
  }

  Object.assign(Become, {
    addHabit,
    removeHabit,
    renameHabit,
    toggleHabit,
    streakFor,
    isHabitDone: isDone,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      addHabit,
      removeHabit,
      renameHabit,
      toggleHabit,
      streakFor,
      isHabitDone: isDone,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
