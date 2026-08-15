(function (root) {
  const Become = (root.Become = root.Become || {});

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function addHabit(state, nameOrOpts) {
    const opts =
      typeof nameOrOpts === 'string' ? { name: nameOrOpts } : nameOrOpts || {};
    const trimmed = String(opts.name || '').trim();
    if (!trimmed) return state;
    const timed = Boolean(opts.timed);
    const habit = {
      id: newId('habit'),
      name: trimmed,
      active: true,
      timed,
      defaultMinutes: timed
        ? Math.max(1, Number(opts.defaultMinutes) || 20)
        : null,
    };
    return { ...state, habits: [...state.habits, habit] };
  }

  function removeHabit(state, id) {
    const habitTimers = { ...(state.habitTimers || {}) };
    delete habitTimers[id];
    return {
      ...state,
      habitTimers,
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

  function updateHabitTiming(state, id, { timed, defaultMinutes }) {
    return {
      ...state,
      habits: state.habits.map((h) => {
        if (h.id !== id) return h;
        const nextTimed = timed == null ? Boolean(h.timed) : Boolean(timed);
        return {
          ...h,
          timed: nextTimed,
          defaultMinutes: nextTimed
            ? Math.max(1, Number(defaultMinutes ?? h.defaultMinutes) || 20)
            : null,
        };
      }),
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

  function markHabitDone(state, dateKey, habitId) {
    if (isDone(state, dateKey, habitId)) return state;
    return toggleHabit(state, dateKey, habitId);
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

  function formatTimer(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function syncTimerEntry(entry, now) {
    if (!entry || !entry.running) return entry;
    const elapsed = Math.max(0, now - (entry.updatedAt || now));
    const remainingMs = Math.max(0, (entry.remainingMs || 0) - elapsed);
    return { ...entry, remainingMs, updatedAt: now };
  }

  function getHabitTimer(state, habitId, now = Date.now()) {
    const raw = (state.habitTimers || {})[habitId];
    if (!raw) return null;
    return syncTimerEntry(raw, now);
  }

  function startHabitTimer(state, habitId, dateKey, minutes, now = Date.now()) {
    const targetMs = Math.max(1, Number(minutes) || 1) * 60000;
    return {
      ...state,
      habitTimers: {
        ...(state.habitTimers || {}),
        [habitId]: {
          habitId,
          dateKey,
          targetMs,
          remainingMs: targetMs,
          running: true,
          updatedAt: now,
        },
      },
    };
  }

  function pauseHabitTimer(state, habitId, now = Date.now()) {
    const entry = getHabitTimer(state, habitId, now);
    if (!entry) return state;
    return {
      ...state,
      habitTimers: {
        ...(state.habitTimers || {}),
        [habitId]: { ...entry, running: false, updatedAt: now },
      },
    };
  }

  function resumeHabitTimer(state, habitId, now = Date.now()) {
    const entry = getHabitTimer(state, habitId, now);
    if (!entry || entry.remainingMs <= 0) return state;
    return {
      ...state,
      habitTimers: {
        ...(state.habitTimers || {}),
        [habitId]: { ...entry, running: true, updatedAt: now },
      },
    };
  }

  function clearHabitTimer(state, habitId) {
    const habitTimers = { ...(state.habitTimers || {}) };
    delete habitTimers[habitId];
    return { ...state, habitTimers };
  }

  function tickHabitTimers(state, now = Date.now()) {
    const timers = state.habitTimers || {};
    let next = state;
    const completed = [];
    Object.keys(timers).forEach((habitId) => {
      const synced = getHabitTimer(next, habitId, now);
      if (!synced) return;
      next = {
        ...next,
        habitTimers: { ...(next.habitTimers || {}), [habitId]: synced },
      };
      if (synced.remainingMs <= 0) {
        completed.push({ habitId, dateKey: synced.dateKey });
        next = markHabitDone(next, synced.dateKey, habitId);
        next = clearHabitTimer(next, habitId);
      }
    });
    return { state: next, completed };
  }

  Object.assign(Become, {
    addHabit,
    removeHabit,
    renameHabit,
    updateHabitTiming,
    toggleHabit,
    markHabitDone,
    streakFor,
    isHabitDone: isDone,
    formatTimer,
    getHabitTimer,
    startHabitTimer,
    pauseHabitTimer,
    resumeHabitTimer,
    clearHabitTimer,
    tickHabitTimers,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      addHabit,
      removeHabit,
      renameHabit,
      updateHabitTiming,
      toggleHabit,
      markHabitDone,
      streakFor,
      isHabitDone: isDone,
      formatTimer,
      getHabitTimer,
      startHabitTimer,
      pauseHabitTimer,
      resumeHabitTimer,
      clearHabitTimer,
      tickHabitTimers,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
