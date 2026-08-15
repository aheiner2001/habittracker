(function (root) {
  const Become = (root.Become = root.Become || {});

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function addHighCalorieEvent(state, event) {
    const entry = {
      id: newId('event'),
      startDate: event.startDate,
      endDate: event.endDate || event.startDate,
      eventTargetCalories: Number(event.eventTargetCalories),
      preDays: Number(event.preDays) || 5,
    };
    return {
      ...state,
      highCalorieEvents: [...state.highCalorieEvents, entry],
    };
  }

  function applyRedistribution(state, eventId) {
    const event = state.highCalorieEvents.find((e) => e.id === eventId);
    if (!event) return state;
    const baseline = Number(state.settings.calorieTarget);
    let surplus = 0;
    const eventDays = [];
    let cursor = event.startDate;
    while (cursor <= event.endDate) {
      eventDays.push(cursor);
      surplus += event.eventTargetCalories - baseline;
      cursor = Become.addDays(cursor, 1);
    }
    const preDays = [];
    for (let i = event.preDays; i >= 1; i -= 1) {
      preDays.push(Become.addDays(event.startDate, -i));
    }
    const reductionPerDay = Math.round(surplus / Math.max(preDays.length, 1));
    const targetOverrides = { ...state.targetOverrides };
    for (const day of preDays) {
      targetOverrides[day] = baseline - reductionPerDay;
    }
    for (const day of eventDays) {
      targetOverrides[day] = event.eventTargetCalories;
    }
    return { ...state, targetOverrides };
  }

  function clearEventOverrides(state, eventId) {
    const event = state.highCalorieEvents.find((e) => e.id === eventId);
    if (!event) return state;
    const targetOverrides = { ...state.targetOverrides };
    let cursor = Become.addDays(event.startDate, -event.preDays);
    while (cursor <= event.endDate) {
      delete targetOverrides[cursor];
      cursor = Become.addDays(cursor, 1);
    }
    return {
      ...state,
      targetOverrides,
      highCalorieEvents: state.highCalorieEvents.filter((e) => e.id !== eventId),
    };
  }

  Object.assign(Become, {
    addHighCalorieEvent,
    applyRedistribution,
    clearEventOverrides,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      addHighCalorieEvent,
      applyRedistribution,
      clearEventOverrides,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
