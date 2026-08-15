(function (root) {
  const Become = (root.Become = root.Become || {});

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function addFast(state, { start, end, recurrence }) {
    return {
      ...state,
      fasts: [
        ...state.fasts,
        {
          id: newId('fast'),
          start,
          end,
          recurrence: recurrence || 'none',
        },
      ],
    };
  }

  function removeFast(state, fastId) {
    return {
      ...state,
      fasts: (state.fasts || []).filter((f) => f.id !== fastId),
    };
  }

  /** Format local datetime for datetime-local / parseLocal: YYYY-MM-DDTHH:mm */
  function formatLocalDateTime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function startFastNow(state, { hours = 24, now = new Date() } = {}) {
    const h = Number(hours);
    if (!(h > 0)) return state;
    const end = new Date(now.getTime() + h * 3600000);
    return addFast(state, {
      start: formatLocalDateTime(now),
      end: formatLocalDateTime(end),
      recurrence: 'none',
    });
  }

  function parseLocal(iso) {
    // Accept "YYYY-MM-DDTHH:mm"
    const [datePart, timePart = '00:00'] = iso.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0);
  }

  function expandFasts(state, fromDateKey, toDateKey) {
    const from = Become.parseDateKey(fromDateKey);
    const to = Become.parseDateKey(toDateKey);
    to.setHours(23, 59, 59, 999);
    const intervals = [];
    for (const fast of state.fasts || []) {
      let start = parseLocal(fast.start);
      let end = parseLocal(fast.end);
      const span = end - start;
      const maxIterations = fast.recurrence === 'every_other_week' ? 30 : 1;
      for (let i = 0; i < maxIterations; i += 1) {
        if (end >= from && start <= to) {
          intervals.push({ id: fast.id, start: new Date(start), end: new Date(end) });
        }
        if (fast.recurrence !== 'every_other_week') break;
        start = new Date(start.getTime() + 14 * 86400000);
        end = new Date(start.getTime() + span);
        if (start > to) break;
      }
    }
    return intervals;
  }

  function activeFast(state, now = new Date()) {
    const key = Become.todayKey(now);
    const intervals = expandFasts(
      state,
      Become.addDays(key, -30),
      Become.addDays(key, 30)
    );
    for (const iv of intervals) {
      if (now >= iv.start && now < iv.end) return iv;
    }
    return null;
  }

  function fastProgress(now, fast) {
    const elapsedMs = Math.max(0, now - fast.start);
    const remainingMs = Math.max(0, fast.end - now);
    return {
      elapsedHours: Math.round((elapsedMs / 3600000) * 10) / 10,
      remainingHours: Math.round((remainingMs / 3600000) * 10) / 10,
    };
  }

  function isFastingDay(state, dateKey) {
    const dayStart = Become.parseDateKey(dateKey);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const intervals = expandFasts(state, dateKey, dateKey);
    return intervals.some((iv) => iv.start <= dayEnd && iv.end >= dayStart);
  }

  function endFastsOnDate(state, dateKey) {
    const intervals = expandFasts(state, dateKey, dateKey);
    if (!intervals.length) return state;
    const ids = new Set(intervals.map((iv) => iv.id));
    return {
      ...state,
      fasts: (state.fasts || []).filter((f) => !ids.has(f.id)),
    };
  }

  Object.assign(Become, {
    addFast,
    removeFast,
    startFastNow,
    endFastsOnDate,
    expandFasts,
    activeFast,
    fastProgress,
    isFastingDay,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      addFast,
      removeFast,
      startFastNow,
      endFastsOnDate,
      expandFasts,
      activeFast,
      fastProgress,
      isFastingDay,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
