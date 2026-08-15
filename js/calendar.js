(function (root) {
  const Become = (root.Become = root.Become || {});

  function dayFlags(state, dateKey) {
    const hasLog = (state.foodLogs[dateKey] || []).length > 0;
    const hasWeight = (state.weights || []).some((w) => w.date === dateKey);
    const isFast = Become.isFastingDay(state, dateKey);
    const isEvent = (state.highCalorieEvents || []).some(
      (e) => dateKey >= e.startDate && dateKey <= e.endDate
    );
    return { hasLog, hasWeight, isFast, isEvent };
  }

  function weightForDate(state, dateKey) {
    const entry = (state.weights || []).find((w) => w.date === dateKey);
    return entry ? Number(entry.lbs) : null;
  }

  function renderLifestyleCalendar(
    container,
    state,
    { cursor, selectedDateKey, onSelect, onMonthChange }
  ) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(`<div class="day-cell is-empty" aria-hidden="true"></div>`);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = Become.todayKey(new Date(year, month, day));
      const flags = dayFlags(state, dateKey);
      const classes = ['day-cell'];
      if (dateKey === selectedDateKey) classes.push('is-selected');
      if (flags.hasLog) classes.push('has-log');
      if (flags.hasWeight) classes.push('has-weight');
      if (flags.isFast) classes.push('is-fast');
      if (flags.isEvent) classes.push('is-event');
      cells.push(
        `<button type="button" class="${classes.join(' ')}" data-date="${dateKey}">${day}</button>`
      );
    }
    const nutrition = Become.dayNutrition(state, selectedDateKey);
    const target = Become.effectiveTarget(state, selectedDateKey);
    const weight = weightForDate(state, selectedDateKey);
    const flags = dayFlags(state, selectedDateKey);
    const label = Become.formatLongDate
      ? Become.formatLongDate(Become.parseDateKey(selectedDateKey))
      : selectedDateKey;
    const flagBits = [];
    if (flags.isFast) flagBits.push('Fasting');
    if (flags.isEvent) flagBits.push('High-calorie event');

    container.innerHTML = `
      <div class="calendar-toolbar">
        <div class="month-nav">
          <button type="button" class="btn" data-cal="prev" aria-label="Previous month">‹</button>
          <p class="month-label">${Become.formatMonthLabel(cursor)}</p>
          <button type="button" class="btn" data-cal="next" aria-label="Next month">›</button>
        </div>
      </div>
      <div class="calendar">
        <div class="calendar-weekdays">
          ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
            .map((d) => `<span>${d}</span>`)
            .join('')}
        </div>
        <div class="calendar-grid">${cells.join('')}</div>
      </div>
      <div class="day-detail">
        <h3 class="day-detail-title">${label}</h3>
        <div class="day-detail-grid">
          <div>
            <p class="day-dash-label">Calories</p>
            <p class="metric">${
              flags.hasLog || nutrition.calories
                ? Math.round(nutrition.calories)
                : '—'
            }</p>
            <p class="meta">${
              flags.hasLog || nutrition.calories
                ? `of ${target} kcal target`
                : 'No food logged'
            }</p>
          </div>
          <div>
            <p class="day-dash-label">Weigh-in</p>
            <p class="metric">${weight != null ? weight : '—'}</p>
            <p class="meta">${weight != null ? 'lb that morning' : 'No weigh-in'}</p>
          </div>
        </div>
        ${
          state.settings.proteinTarget && (flags.hasLog || nutrition.protein)
            ? `<p class="meta" style="margin-top:0.55rem">Protein ${Math.round(
                nutrition.protein
              )} / ${state.settings.proteinTarget} g</p>`
            : ''
        }
        ${
          flagBits.length
            ? `<p class="meta" style="margin-top:0.35rem">${flagBits.join(' · ')}</p>`
            : ''
        }
      </div>`;

    container.querySelector('[data-cal="prev"]').addEventListener('click', () => {
      onMonthChange(new Date(year, month - 1, 1));
    });
    container.querySelector('[data-cal="next"]').addEventListener('click', () => {
      onMonthChange(new Date(year, month + 1, 1));
    });
    container.querySelectorAll('.day-cell[data-date]').forEach((btn) => {
      btn.addEventListener('click', () => onSelect(btn.getAttribute('data-date')));
    });
  }

  Object.assign(Become, { renderLifestyleCalendar, dayFlags, weightForDate });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderLifestyleCalendar, dayFlags, weightForDate };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
