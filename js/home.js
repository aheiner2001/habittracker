(function () {
  let state = Become.loadState();
  let fastTimer = null;
  const root = document.getElementById('app');
  const errEl = document.getElementById('storage-error');

  function persist(next) {
    state = next;
    const saved = Become.saveState(state);
    if (errEl) {
      if (saved.ok) {
        errEl.hidden = true;
      } else {
        errEl.hidden = false;
        errEl.textContent = saved.error;
      }
    }
  }

  function render() {
    if (!state.onboardingComplete) {
      root.innerHTML = '';
      const mount = document.createElement('div');
      root.appendChild(mount);
      Become.renderOnboarding(mount, (next) => {
        persist(next);
        render();
      });
      return;
    }

    const today = Become.todayKey();
    state = Become.ensureWeeklySummary(state, today);
    const suggestion = Become.computeAdaptiveSuggestion(state, today);
    if (suggestion && !state.adaptiveSuggestion) {
      state = { ...state, adaptiveSuggestion: suggestion };
      Become.saveState(state);
    }

    const windowDays = state.settings.weightAvgWindow || 7;
    const avg = Become.rollingAverage(state.weights, today, windowDays);
    const checked = Become.checkMilestones(state, avg, today);
    state = checked.state;
    Become.saveState(state);

    const nutrition = Become.dayNutrition(state, today);
    const target = Become.effectiveTarget(state, today);
    const calPct = Math.min(100, Math.round((nutrition.calories / target) * 100));
    const activeHabits = state.habits.filter((h) => h.active);
    const lost = Become.lbsLostFromStart(state, avg);
    const total =
      state.goal.startWeight != null && state.goal.goalWeight != null
        ? Math.round((state.goal.startWeight - state.goal.goalWeight) * 10) / 10
        : null;

    const celebrate = checked.newlyReached.find(
      (m) => !(state.dismissedCelebrations || []).includes(m.id)
    );

    const fast = Become.activeFast(state, new Date());
    let fastHtml = '';
    if (fast) {
      const prog = Become.fastProgress(new Date(), fast);
      fastHtml = `<section class="panel panel-span" id="fast-timer">
        <h2>Fast in progress</h2>
        <p class="metric">${prog.elapsedHours}h <span class="meta">elapsed</span></p>
        <p class="meta">${prog.remainingHours}h remaining</p>
      </section>`;
    }

    const summary = (state.weeklySummaries || []).slice(-1)[0];
    const summaryHtml = summary
      ? `<section class="panel panel-span">
          <h2>Week of ${summary.weekEnd}</h2>
          <p class="metric">${summary.habitPct}%</p>
          <p class="meta">Habits · Avg ${summary.avgCalories} kcal${
            summary.weightDelta != null ? ` · Weight ${summary.weightDelta} lb` : ''
          }</p>
          <p class="tagline">${summary.note}</p>
        </section>`
      : '';

    const adaptiveHtml = state.adaptiveSuggestion
      ? `<section class="panel panel-span">
          <h2>Target suggestion</h2>
          <p class="meta">${state.adaptiveSuggestion.message}</p>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" data-act="accept-adaptive">Accept</button>
            <button type="button" class="btn" data-act="dismiss-adaptive">Dismiss</button>
          </div>
        </section>`
      : '';

    const celebrateHtml = celebrate
      ? `<section class="panel panel-span" id="celebrate">
          <h2>Checkpoint</h2>
          <p class="metric">${celebrate.label}</p>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" data-act="dismiss-celebrate" data-id="${celebrate.id}">Nice</button>
          </div>
        </section>`
      : '';

    const { headerHtml, navHtml } = Become.renderShell({ active: 'home' });
    root.innerHTML = `${headerHtml}
      <main class="stack">
        <div class="dashboard-grid">
          ${celebrateHtml}
          <section class="panel">
            <h2>Goal</h2>
            <p class="metric">${
              lost != null && total != null ? `${lost}` : '—'
            }</p>
            <p class="meta">${
              lost != null && total != null
                ? `of ${total} lb lost`
                : 'Log weight to track'
            }</p>
          </section>
          <section class="panel">
            <h2>Weight</h2>
            <p class="metric">${avg != null ? avg : '—'}</p>
            <p class="meta">${avg != null ? 'lb rolling avg' : 'No average yet'}</p>
          </section>
          <section class="panel panel-span">
            <h2>Calories</h2>
            <p class="metric">${nutrition.calories} <span class="meta">/ ${target}</span></p>
            <div class="progress" aria-hidden="true"><div class="progress-fill" style="width:${calPct}%"></div></div>
            ${
              state.settings.proteinTarget
                ? `<p class="meta" style="margin-top:0.45rem">Protein ${nutrition.protein} / ${state.settings.proteinTarget} g</p>`
                : ''
            }
          </section>
          <section class="panel panel-span">
            <h2>Habits</h2>
            <ul class="habit-list">
              ${activeHabits
                .map((h) => {
                  const done = Become.isHabitDone(state, today, h.id);
                  return `<li>
                    <label>
                      <input type="checkbox" data-habit="${h.id}" ${done ? 'checked' : ''} />
                      <span class="habit-copy">
                        <strong>${h.name}</strong>
                        <span class="meta">${Become.streakFor(state, h.id, today)} day streak</span>
                      </span>
                    </label>
                  </li>`;
                })
                .join('')}
            </ul>
          </section>
          ${
            state.settings.showMeasurementsOnHome && state.measurements.length
              ? (() => {
                  const latest = state.measurements[state.measurements.length - 1];
                  return `<section class="panel panel-span"><h2>Measurements</h2>
                    <p class="meta">Waist ${latest.waist ?? '—'} · Chest ${latest.chest ?? '—'} · Hips ${latest.hips ?? '—'}</p>
                  </section>`;
                })()
              : ''
          }
          ${fastHtml}
          ${adaptiveHtml}
          ${summaryHtml}
          <section class="panel panel-span">
            <h2>Today’s passage</h2>
            <p class="passage">${Become.passageForDate(new Date())}</p>
          </section>
        </div>
      </main>
      ${navHtml}`;

    const dateEl = root.querySelector('#shell-date');
    if (dateEl) dateEl.textContent = Become.formatLongDate();

    root.querySelectorAll('[data-habit]').forEach((input) => {
      input.addEventListener('change', () => {
        persist(Become.toggleHabit(state, today, input.getAttribute('data-habit')));
        render();
      });
    });
    const accept = root.querySelector('[data-act="accept-adaptive"]');
    if (accept) {
      accept.addEventListener('click', () => {
        persist(Become.acceptAdaptive(state));
        render();
      });
    }
    const dismiss = root.querySelector('[data-act="dismiss-adaptive"]');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        persist(Become.dismissAdaptive(state));
        render();
      });
    }
    const nice = root.querySelector('[data-act="dismiss-celebrate"]');
    if (nice) {
      nice.addEventListener('click', () => {
        const id = nice.getAttribute('data-id');
        persist({
          ...state,
          dismissedCelebrations: [...(state.dismissedCelebrations || []), id],
        });
        render();
      });
    }

    if (fastTimer) clearInterval(fastTimer);
    if (fast) {
      fastTimer = setInterval(() => {
        const el = document.getElementById('fast-timer');
        if (!el) return;
        const prog = Become.fastProgress(new Date(), fast);
        el.querySelector('.metric').innerHTML = `${prog.elapsedHours}h <span class="meta">elapsed</span>`;
        const meta = el.querySelectorAll('.meta')[1];
        if (meta) meta.textContent = `${prog.remainingHours}h remaining`;
      }, 30000);
    }
  }

  render();
})();
