(function (root) {
  const Become = (root.Become = root.Become || {});

  function upsertMeasurement(state, { date, waist, chest, hips }) {
    const measurements = state.measurements.filter((m) => m.date !== date);
    measurements.push({
      date,
      waist: waist === '' || waist == null ? null : Number(waist),
      chest: chest === '' || chest == null ? null : Number(chest),
      hips: hips === '' || hips == null ? null : Number(hips),
    });
    measurements.sort((a, b) => a.date.localeCompare(b.date));
    return { ...state, measurements };
  }

  Object.assign(Become, { upsertMeasurement });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { upsertMeasurement };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
