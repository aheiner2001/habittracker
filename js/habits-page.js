(function () {
  let state = Become.loadState();
  const root = document.getElementById('app');
  const errEl = document.getElementById('storage-error');

  function persist(next) {
    state = next;
    const saved = Become.saveState(state);
    if (errEl) {
      if (saved.ok) errEl.hidden = true;
      else {
        errEl.hidden = false;
        errEl.textContent = saved.error;
      }
    }
  }

  function render() {
    const today = Become.todayKey();
    const { headerHtml, navHtml } = Become.renderShell({ active: 'habits' });
    const habits = state.habits.filter((h) => h.active);
    root.innerHTML = `${headerHtml}
      <main class="stack">
        <section class="panel">
          <h2>Today</h2>
          <ul class="habit-list" style="margin-top:0.55rem">
            ${habits
              .map((h) => {
                const done = Become.isHabitDone(state, today, h.id);
                const streak = Become.streakFor(state, h.id, today);
                return `<li>
                  <label>
                    <input type="checkbox" data-toggle="${h.id}" ${done ? 'checked' : ''} />
                    <span class="habit-copy">
                      <strong>${h.name}</strong>
                      <span class="meta">${streak} day streak</span>
                    </span>
                  </label>
                  <div class="habit-actions">
                    <button type="button" class="btn" data-rename="${h.id}">Rename</button>
                    <button type="button" class="btn" data-remove="${h.id}">Remove</button>
                  </div>
                </li>`;
              })
              .join('')}
          </ul>
        </section>
        <section class="panel">
          <h2>Add habit</h2>
          <form id="add-habit" class="stack" style="margin-top:0.65rem">
            <div class="field">
              <label for="habit-name">Name</label>
              <input id="habit-name" name="name" required placeholder="e.g. Morning outside" />
            </div>
            <button class="btn btn-primary" type="submit">Add</button>
          </form>
        </section>
      </main>
      ${navHtml}`;

    const dateEl = root.querySelector('#shell-date');
    if (dateEl) dateEl.textContent = Become.formatLongDate();

    root.querySelectorAll('[data-toggle]').forEach((el) => {
      el.addEventListener('change', () => {
        persist(Become.toggleHabit(state, today, el.getAttribute('data-toggle')));
        render();
      });
    });
    root.querySelectorAll('[data-remove]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!confirm('Remove this habit?')) return;
        persist(Become.removeHabit(state, el.getAttribute('data-remove')));
        render();
      });
    });
    root.querySelectorAll('[data-rename]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-rename');
        const current = state.habits.find((h) => h.id === id);
        const name = prompt('Habit name', current?.name || '');
        if (name == null) return;
        persist(Become.renameHabit(state, id, name));
        render();
      });
    });
    root.querySelector('#add-habit').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get('name');
      persist(Become.addHabit(state, name));
      render();
    });
  }

  render();
})();
