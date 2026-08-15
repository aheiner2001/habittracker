(function (root) {
  const Become = (root.Become = root.Become || {});

  function dayFlags(state, dateKey) {
    const hasLog = (state.foodLogs[dateKey] || []).length > 0;
    const isFast = Become.isFastingDay(state, dateKey);
    const isEvent = (state.highCalorieEvents || []).some(
      (e) => dateKey >= e.startDate && dateKey <= e.endDate
    );
    return { hasLog, isFast, isEvent };
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
      if (flags.isFast) classes.push('is-fast');
      if (flags.isEvent) classes.push('is-event');
      cells.push(
        `<button type="button" class="${classes.join(' ')}" data-date="${dateKey}">${day}</button>`
      );
    }
    const nutrition = Become.dayNutrition(state, selectedDateKey);
    const flags = dayFlags(state, selectedDateKey);
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
      <div class="day-detail section">
        <h2>${selectedDateKey}</h2>
        <p>${nutrition.calories} kcal logged</p>
        <p>${flags.isFast ? 'Fasting day' : ''}${flags.isEvent ? ' · High-calorie event' : ''}</p>
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

  Object.assign(Become, { renderLifestyleCalendar, dayFlags });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderLifestyleCalendar, dayFlags };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
