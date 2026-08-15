(function (root) {
  const Become = (root.Become = root.Become || {});

  function upsertWeight(state, date, lbs) {
    const weights = state.weights.filter((w) => w.date !== date);
    weights.push({ date, lbs: Number(lbs) });
    weights.sort((a, b) => a.date.localeCompare(b.date));
    return { ...state, weights };
  }

  function rollingAverage(weights, dateKey, windowDays) {
    const start = Become.addDays(dateKey, -(windowDays - 1));
    const inWindow = weights.filter((w) => w.date >= start && w.date <= dateKey);
    if (!inWindow.length) return null;
    const sum = inWindow.reduce((acc, w) => acc + Number(w.lbs), 0);
    return Math.round((sum / inWindow.length) * 10) / 10;
  }

  function rollingSeries(weights, windowDays) {
    return weights.map((w) => ({
      date: w.date,
      raw: w.lbs,
      avg: rollingAverage(weights, w.date, windowDays),
    }));
  }

  function renderWeightChart(container, series, { windowDays }) {
    if (!series.length) {
      container.innerHTML = `<p class="tagline">No weight logs yet.</p>`;
      return;
    }
    const width = 320;
    const height = 140;
    const pad = 16;
    const avgs = series.map((s) => s.avg).filter((n) => n != null);
    const raws = series.map((s) => s.raw);
    const min = Math.min(...avgs, ...raws) - 1;
    const max = Math.max(...avgs, ...raws) + 1;
    const x = (i) =>
      pad + (i / Math.max(series.length - 1, 1)) * (width - pad * 2);
    const y = (v) =>
      height - pad - ((v - min) / Math.max(max - min, 0.1)) * (height - pad * 2);
    const line = series
      .map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.avg ?? s.raw)}`)
      .join(' ');
    const dots = series
      .map((s, i) => `<circle cx="${x(i)}" cy="${y(s.raw)}" r="2.5" fill="rgba(26,26,26,0.35)" />`)
      .join('');
    container.innerHTML = `
      <p class="tagline">${windowDays}-day rolling average</p>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="140" role="img" aria-label="Weight trend">
        <path d="${line}" fill="none" stroke="#2f6b4f" stroke-width="2" />
        ${dots}
      </svg>`;
  }

  Object.assign(Become, {
    upsertWeight,
    rollingAverage,
    rollingSeries,
    renderWeightChart,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      upsertWeight,
      rollingAverage,
      rollingSeries,
      renderWeightChart,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
