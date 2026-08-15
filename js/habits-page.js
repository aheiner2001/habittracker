(function () {
  let state = Become.loadState();
  let habitTick = null;
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

  function syncTimers() {
    const { state: next } = Become.tickHabitTimers(state, Date.now());
    if (next !== state) persist(next);
  }

  function timerBlock(h, today) {
    if (!h.timed || Become.isHabitDone(state, today, h.id)) return '';
    const timer = Become.getHabitTimer(state, h.id, Date.now());
    if (timer) {
      return `<div class="habit-timer">
        <p class="habit-timer-display">${Become.formatTimer(timer.remainingMs)}</p>
        <div class="btn-row">
          ${
            timer.running
              ? `<button type="button" class="btn" data-timer-pause="${h.id}">Pause</button>`
              : `<button type="button" class="btn btn-primary" data-timer-resume="${h.id}">Resume</button>`
          }
          <button type="button" class="btn" data-timer-clear="${h.id}">Cancel</button>
        </div>
      </div>`;
    }
    const mins = h.defaultMinutes || 20;
    return `<div class="habit-timer">
      <div class="form-grid">
        <div class="field">
          <label>Minutes</label>
          <input type="number" min="1" inputmode="numeric" value="${mins}" data-timer-mins="${h.id}" />
        </div>
        <div class="field" style="display:flex;align-items:end">
          <button type="button" class="btn btn-primary" style="width:100%" data-timer-start="${h.id}">Start</button>
        </div>
      </div>
    </div>`;
  }

  function render() {
    syncTimers();
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
                const timedLabel = h.timed
                  ? ` · Timed ${h.defaultMinutes || 20}m`
                  : '';
                return `<li class="habit-item">
                  <div class="habit-item-top">
                    <label>
                      <input type="checkbox" data-toggle="${h.id}" ${done ? 'checked' : ''} />
                      <span class="habit-copy">
                        <strong>${h.name}</strong>
                        <span class="meta">${streak} day streak${timedLabel}</span>
                      </span>
                    </label>
                    <div class="habit-actions">
                      <button type="button" class="btn" data-rename="${h.id}">Rename</button>
                      <button type="button" class="btn" data-remove="${h.id}">Remove</button>
                    </div>
                  </div>
                  ${timerBlock(h, today)}
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
              <input id="habit-name" name="name" required placeholder="e.g. 20-min workout" />
            </div>
            <label class="check-row">
              <input type="checkbox" name="timed" id="habit-timed" /> Timed habit
            </label>
            <div class="field" id="habit-mins-wrap" hidden>
              <label for="habit-mins">Default minutes</label>
              <input id="habit-mins" name="defaultMinutes" type="number" min="1" value="20" />
            </div>
            <button class="btn btn-primary" type="submit">Add</button>
          </form>
        </section>
      </main>
      ${navHtml}`;

    const dateEl = root.querySelector('#shell-date');
    if (dateEl) dateEl.textContent = Become.formatLongDate();

    const timedCheck = root.querySelector('#habit-timed');
    const minsWrap = root.querySelector('#habit-mins-wrap');
    if (timedCheck && minsWrap) {
      timedCheck.addEventListener('change', () => {
        minsWrap.hidden = !timedCheck.checked;
      });
    }

    root.querySelectorAll('[data-toggle]').forEach((el) => {
      el.addEventListener('change', () => {
        const id = el.getAttribute('data-toggle');
        let next = Become.toggleHabit(state, today, id);
        if (Become.isHabitDone(next, today, id)) next = Become.clearHabitTimer(next, id);
        persist(next);
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
      const fd = new FormData(e.target);
      persist(
        Become.addHabit(state, {
          name: fd.get('name'),
          timed: fd.get('timed') === 'on',
          defaultMinutes: fd.get('defaultMinutes'),
        })
      );
      render();
    });

    bindTimers(today);
    scheduleTick();
  }

  function bindTimers(today) {
    root.querySelectorAll('[data-timer-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-timer-start');
        const input = root.querySelector(`[data-timer-mins="${id}"]`);
        const minutes = Number(input?.value) || 20;
        persist(Become.startHabitTimer(state, id, today, minutes));
        render();
      });
    });
    root.querySelectorAll('[data-timer-pause]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persist(Become.pauseHabitTimer(state, btn.getAttribute('data-timer-pause')));
        render();
      });
    });
    root.querySelectorAll('[data-timer-resume]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persist(Become.resumeHabitTimer(state, btn.getAttribute('data-timer-resume')));
        render();
      });
    });
    root.querySelectorAll('[data-timer-clear]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persist(Become.clearHabitTimer(state, btn.getAttribute('data-timer-clear')));
        render();
      });
    });
  }

  function scheduleTick() {
    if (habitTick) clearInterval(habitTick);
    const running = Object.values(state.habitTimers || {}).some((t) => t.running);
    if (!running) return;
    habitTick = setInterval(() => {
      const before = JSON.stringify(state.habitTimers);
      const { state: next, completed } = Become.tickHabitTimers(state, Date.now());
      persist(next);
      const after = JSON.stringify(state.habitTimers);
      if (completed.length || before !== after) render();
    }, 1000);
  }

  render();
})();
