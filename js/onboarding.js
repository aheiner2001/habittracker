(function (root) {
  const Become = (root.Become = root.Become || {});

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function completeOnboarding(state, answers) {
    const {
      currentWeight,
      goalWeight,
      calorieTarget,
      proteinTarget,
      habitNames,
    } = answers;
    const habits = (habitNames || [])
      .map((name) => String(name).trim())
      .filter(Boolean)
      .map((name) => ({ id: newId('habit'), name, active: true }));
    const today = Become.todayKey();
    const next = {
      ...state,
      onboardingComplete: true,
      settings: {
        ...state.settings,
        calorieTarget: Number(calorieTarget),
        proteinTarget:
          proteinTarget === '' || proteinTarget == null
            ? null
            : Number(proteinTarget),
      },
      goal: {
        startWeight: Number(currentWeight),
        goalWeight: Number(goalWeight),
        milestones: Become.seedMilestones(
          Number(currentWeight),
          Number(goalWeight)
        ),
      },
      habits,
      weights: [
        ...state.weights.filter((w) => w.date !== today),
        { date: today, lbs: Number(currentWeight) },
      ],
    };
    return next;
  }

  function renderOnboarding(container, onDone) {
    container.innerHTML = `
      <section class="section onboarding">
        <h2>Welcome to Become</h2>
        <p class="tagline">A few numbers so day one isn’t blank.</p>
        <form id="onboarding-form">
          <div class="field">
            <label for="ob-current">Current weight (lb)</label>
            <input id="ob-current" name="currentWeight" type="number" step="0.1" required value="225" />
          </div>
          <div class="field">
            <label for="ob-goal">Goal weight (lb)</label>
            <input id="ob-goal" name="goalWeight" type="number" step="0.1" required value="175" />
          </div>
          <div class="field">
            <label for="ob-cal">Daily calorie target</label>
            <input id="ob-cal" name="calorieTarget" type="number" required value="1800" />
          </div>
          <div class="field">
            <label for="ob-pro">Protein target (g, optional)</label>
            <input id="ob-pro" name="proteinTarget" type="number" placeholder="e.g. 140" />
          </div>
          <div class="field">
            <label for="ob-habits">Starting habits (one per line)</label>
            <textarea id="ob-habits" name="habits" rows="4">20-min workout
Morning outside</textarea>
          </div>
          <button class="btn btn-primary" type="submit">Start</button>
        </form>
      </section>`;

    container.querySelector('#onboarding-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const habitNames = String(fd.get('habits') || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const state = Become.completeOnboarding(Become.loadState(), {
        currentWeight: fd.get('currentWeight'),
        goalWeight: fd.get('goalWeight'),
        calorieTarget: fd.get('calorieTarget'),
        proteinTarget: fd.get('proteinTarget'),
        habitNames,
      });
      const saved = Become.saveState(state);
      onDone(state, saved);
    });
  }

  Object.assign(Become, { completeOnboarding, renderOnboarding });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { completeOnboarding, renderOnboarding };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
