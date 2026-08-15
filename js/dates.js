(function (root) {
  const Become = (root.Become = root.Become || {});

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(dateKey, delta) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return todayKey(dt);
  }

  function dayOfYear(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function parseDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatLongDate(date = new Date()) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatMonthLabel(date) {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  Object.assign(Become, {
    todayKey,
    addDays,
    dayOfYear,
    startOfMonth,
    parseDateKey,
    formatLongDate,
    formatMonthLabel,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      todayKey,
      addDays,
      dayOfYear,
      startOfMonth,
      parseDateKey,
      formatLongDate,
      formatMonthLabel,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
