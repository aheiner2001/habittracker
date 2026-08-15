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
      fastHtml = `<section class="section" id="fast-timer">
        <h2>Fast in progress</h2>
        <p><strong>${prog.elapsedHours}h</strong> elapsed · <strong>${prog.remainingHours}h</strong> remaining</p>
      </section>`;
    }

    const summary = (state.weeklySummaries || []).slice(-1)[0];
    const summaryHtml = summary
      ? `<section class="section">
          <h2>Week of ${summary.weekEnd}</h2>
          <p>Avg ${summary.avgCalories} kcal · Habits ${summary.habitPct}%${
            summary.weightDelta != null ? ` · Weight ${summary.weightDelta} lb` : ''
          }</p>
          <p class="tagline">${summary.note}</p>
        </section>`
      : '';

    const adaptiveHtml = state.adaptiveSuggestion
      ? `<section class="section">
          <h2>Target suggestion</h2>
          <p>${state.adaptiveSuggestion.message}</p>
          <button type="button" class="btn btn-primary" data-act="accept-adaptive">Accept</button>
          <button type="button" class="btn" data-act="dismiss-adaptive">Dismiss</button>
        </section>`
      : '';

    const celebrateHtml = celebrate
      ? `<section class="section" id="celebrate">
          <h2>Checkpoint</h2>
          <p>${celebrate.label}</p>
          <button type="button" class="btn" data-act="dismiss-celebrate" data-id="${celebrate.id}">Nice</button>
        </section>`
      : '';

    const { headerHtml, navHtml } = Become.renderShell({ active: 'home' });
    root.innerHTML = `${headerHtml}
      <main>
        <p class="tagline">${Become.formatLongDate()}</p>
        ${celebrateHtml}
        <section class="section">
          <h2>Goal</h2>
          <p>${lost != null && total != null ? `${lost} of ${total} lb` : 'Log weight to track progress'}</p>
        </section>
        <section class="section">
          <h2>Calories</h2>
          <p>${nutrition.calories} / ${target} kcal</p>
          <div class="progress" aria-hidden="true"><div class="progress-fill" style="width:${calPct}%"></div></div>
          ${
            state.settings.proteinTarget
              ? `<p>Protein ${nutrition.protein} / ${state.settings.proteinTarget} g</p>`
              : ''
          }
        </section>
        <section class="section">
          <h2>Habits</h2>
          <ul class="habit-list">
            ${activeHabits
              .map((h) => {
                const done = Become.isHabitDone(state, today, h.id);
                return `<li>
                  <label>
                    <input type="checkbox" data-habit="${h.id}" ${done ? 'checked' : ''} />
                    ${h.name}
                    <span class="tagline"> · ${Become.streakFor(state, h.id, today)} day streak</span>
                  </label>
                </li>`;
              })
              .join('')}
          </ul>
        </section>
        <section class="section">
          <h2>Weight</h2>
          <p>${avg != null ? `Rolling avg ${avg} lb` : 'No average yet'}</p>
        </section>
        ${
          state.settings.showMeasurementsOnHome && state.measurements.length
            ? (() => {
                const latest = state.measurements[state.measurements.length - 1];
                return `<section class="section"><h2>Measurements</h2>
                  <p>Waist ${latest.waist ?? '—'} · Chest ${latest.chest ?? '—'} · Hips ${latest.hips ?? '—'}</p>
                </section>`;
              })()
            : ''
        }
        ${fastHtml}
        ${adaptiveHtml}
        ${summaryHtml}
        <section class="section">
          <h2>Today’s passage</h2>
          <p>${Become.passageForDate(new Date())}</p>
        </section>
      </main>
      ${navHtml}`;

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
        el.querySelector('p').innerHTML = `<strong>${prog.elapsedHours}h</strong> elapsed · <strong>${prog.remainingHours}h</strong> remaining`;
      }, 30000);
    }
  }

  render();
})();
