(function () {
  let state = Become.loadState();
  let calendarCursor = Become.startOfMonth(new Date());
  let selectedDateKey = Become.todayKey();
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

  function foodOptions() {
    return state.foods
      .map((f) => `<option value="${f.id}">${f.name}</option>`)
      .join('');
  }

  function render() {
    const today = Become.todayKey();
    const { headerHtml, navHtml } = Become.renderShell({ active: 'lifestyle' });
    const nutrition = Become.dayNutrition(state, today);
    const target = Become.effectiveTarget(state, today);
    const fasting = Become.isFastingDay(state, today);
    const windowDays = state.settings.weightAvgWindow || 7;
    const series = Become.rollingSeries(state.weights, windowDays);

    root.innerHTML = `${headerHtml}
      <main class="lifestyle-grid">
        <section class="panel panel-span">
          <h2>Today’s log</h2>
          <p>${nutrition.calories} / ${target} kcal${fasting ? ' · Fasting day' : ''}</p>
          <ul id="log-list">
            ${(state.foodLogs[today] || [])
              .map((e) => {
                const food = state.foods.find((f) => f.id === e.foodId);
                const cals = food
                  ? Math.round(food.calPerG * e.grams)
                  : '?';
                return `<li>${food?.name || 'Food'} · ${e.grams}g · ${cals} kcal
                  <button type="button" class="btn" data-rm-log="${e.id}">Remove</button></li>`;
              })
              .join('')}
          </ul>
        </section>

        <section class="panel panel-span">
          <h2>${fasting ? 'Fasting note' : 'Log food'}</h2>
          ${
            fasting
              ? `<p class="tagline">Water and electrolytes only during a fast. Normal food logging is paused.</p>
                 <button type="button" class="btn" data-act="log-water">Log water / electrolytes</button>`
              : `<form id="log-food">
                  <div class="field">
                    <label for="log-food-id">Food</label>
                    <select id="log-food-id" name="foodId" required>${foodOptions()}</select>
                  </div>
                  <div class="field">
                    <label for="log-grams">Grams</label>
                    <input id="log-grams" name="grams" type="number" step="1" required />
                  </div>
                  <button class="btn btn-primary" type="submit">Log</button>
                </form>
                <div class="field" style="margin-top:1rem">
                  <label for="apply-tmpl">Apply template</label>
                  <select id="apply-tmpl">
                    <option value="">Choose…</option>
                    ${state.mealTemplates
                      .map((t) => `<option value="${t.id}">${t.name}</option>`)
                      .join('')}
                  </select>
                  <button type="button" class="btn" data-act="apply-tmpl">Apply</button>
                </div>
                <div class="field">
                  <label for="log-meal">Log saved meal</label>
                  <select id="log-meal">
                    <option value="">Choose…</option>
                    ${state.meals
                      .map((m) => `<option value="${m.id}">${m.name}</option>`)
                      .join('')}
                  </select>
                  <button type="button" class="btn" data-act="log-meal">Log meal</button>
                </div>`
          }
        </section>

        <section class="panel panel-span">
          <h2>Add food</h2>
          <form id="add-food">
            <div class="field"><label>Name</label><input name="name" required /></div>
            <div class="field"><label>Grams</label><input name="grams" type="number" required value="100" /></div>
            <div class="field"><label>Calories</label><input name="calories" type="number" required /></div>
            <div class="field"><label>Protein (g, optional)</label><input name="protein" type="number" /></div>
            <div class="field"><label>Carbs (g, optional)</label><input name="carbs" type="number" /></div>
            <div class="field"><label>Fat (g, optional)</label><input name="fat" type="number" /></div>
            <button class="btn btn-primary" type="submit">Save food</button>
          </form>
        </section>

        <section class="panel panel-span">
          <h2>Save meal from today’s log</h2>
          <form id="save-meal">
            <div class="field"><label>Meal name</label><input name="name" required placeholder="Berry smoothie" /></div>
            <button class="btn" type="submit">Save as meal</button>
          </form>
          <form id="save-tmpl" style="margin-top:1rem">
            <div class="field"><label>Template name</label><input name="name" required placeholder="Light breakfast" /></div>
            <button class="btn" type="submit">Save today’s items as template</button>
          </form>
        </section>

        <section class="panel panel-span">
          <h2>Weight</h2>
          <form id="log-weight">
            <div class="field"><label>Today’s weight (lb)</label><input name="lbs" type="number" step="0.1" required /></div>
            <button class="btn btn-primary" type="submit">Log weight</button>
          </form>
          <div class="field">
            <label>Average window</label>
            <button type="button" class="btn ${windowDays === 7 ? 'btn-primary' : ''}" data-window="7">7-day</button>
            <button type="button" class="btn ${windowDays === 14 ? 'btn-primary' : ''}" data-window="14">14-day</button>
          </div>
          <div id="weight-chart"></div>
        </section>

        <section class="panel panel-span">
          <h2>Measurements</h2>
          <form id="log-meas">
            <div class="field"><label>Waist</label><input name="waist" type="number" step="0.1" /></div>
            <div class="field"><label>Chest</label><input name="chest" type="number" step="0.1" /></div>
            <div class="field"><label>Hips</label><input name="hips" type="number" step="0.1" /></div>
            <button class="btn" type="submit">Log measurements</button>
          </form>
          <label><input type="checkbox" id="show-meas" ${
            state.settings.showMeasurementsOnHome ? 'checked' : ''
          } /> Show on Home</label>
        </section>

        <section class="panel panel-span">
          <h2>Calendar</h2>
          <div id="cal-root"></div>
        </section>

        <section class="panel panel-span">
          <h2>Fasting</h2>
          <form id="add-fast">
            <div class="field"><label>Start (local)</label><input name="start" type="datetime-local" required /></div>
            <div class="field"><label>End (local)</label><input name="end" type="datetime-local" required /></div>
            <div class="field">
              <label>Recurrence</label>
              <select name="recurrence">
                <option value="none">None</option>
                <option value="every_other_week">Every other week</option>
              </select>
            </div>
            <button class="btn btn-primary" type="submit">Schedule fast</button>
          </form>
          <ul>${state.fasts
            .map(
              (f) =>
                `<li>${f.start} → ${f.end} (${f.recurrence})</li>`
            )
            .join('')}</ul>
        </section>

        <section class="panel panel-span">
          <h2>High-calorie event</h2>
          <form id="add-event">
            <div class="field"><label>Start date</label><input name="startDate" type="date" required /></div>
            <div class="field"><label>End date</label><input name="endDate" type="date" required /></div>
            <div class="field"><label>Event day target (kcal)</label><input name="eventTargetCalories" type="number" required value="2800" /></div>
            <div class="field"><label>Days before to redistribute</label><input name="preDays" type="number" value="5" min="1" /></div>
            <button class="btn btn-primary" type="submit">Plan & redistribute</button>
          </form>
          <ul>${state.highCalorieEvents
            .map(
              (e) =>
                `<li>${e.startDate}–${e.endDate} @ ${e.eventTargetCalories} kcal
                <button type="button" class="btn" data-clear-event="${e.id}">Clear overrides</button></li>`
            )
            .join('')}</ul>
        </section>

        <section class="panel panel-span">
          <h2>Milestones</h2>
          <ul>${(state.goal.milestones || [])
            .map(
              (m) =>
                `<li>${m.label} (${m.lbsFromStart} lb)${
                  m.reachedAt ? ` · reached ${m.reachedAt}` : ''
                }
                <button type="button" class="btn" data-edit-ms="${m.id}">Edit size</button></li>`
            )
            .join('')}</ul>
        </section>

        <section class="panel panel-span">
          <h2>Settings</h2>
          <form id="settings">
            <div class="field"><label>Calorie target</label><input name="calorieTarget" type="number" value="${
              state.settings.calorieTarget
            }" required /></div>
            <div class="field"><label>Protein target (optional)</label><input name="proteinTarget" type="number" value="${
              state.settings.proteinTarget ?? ''
            }" /></div>
            <button class="btn btn-primary" type="submit">Save settings</button>
          </form>
        </section>

        <section class="panel panel-span">
          <h2>Backup</h2>
          <button type="button" class="btn" data-act="export">Export JSON</button>
          <div class="field">
            <label for="import-file">Import JSON</label>
            <input id="import-file" type="file" accept="application/json,.json" />
          </div>
        </section>
      </main>
      ${navHtml}`;

    const dateEl = root.querySelector('#shell-date');
    if (dateEl) dateEl.textContent = Become.formatLongDate();

    Become.renderWeightChart(root.querySelector('#weight-chart'), series, {
      windowDays,
    });
    Become.renderLifestyleCalendar(root.querySelector('#cal-root'), state, {
      cursor: calendarCursor,
      selectedDateKey,
      onSelect: (key) => {
        selectedDateKey = key;
        render();
      },
      onMonthChange: (d) => {
        calendarCursor = d;
        render();
      },
    });

    bind();
  }

  function bind() {
    const today = Become.todayKey();

    root.querySelectorAll('[data-rm-log]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persist(Become.removeFoodLog(state, today, btn.getAttribute('data-rm-log')));
        render();
      });
    });

    const addFood = root.querySelector('#add-food');
    if (addFood) {
      addFood.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        persist(
          Become.addFood(state, {
            name: fd.get('name'),
            grams: fd.get('grams'),
            calories: fd.get('calories'),
            protein: fd.get('protein'),
            carbs: fd.get('carbs'),
            fat: fd.get('fat'),
          })
        );
        render();
      });
    }

    const logFood = root.querySelector('#log-food');
    if (logFood) {
      const select = logFood.querySelector('[name="foodId"]');
      const grams = logFood.querySelector('[name="grams"]');
      const syncGrams = () => {
        const food = state.foods.find((f) => f.id === select.value);
        if (food) grams.value = food.lastGrams || food.defaultGrams;
      };
      if (select) {
        select.addEventListener('change', syncGrams);
        syncGrams();
      }
      logFood.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        persist(
          Become.logFood(state, today, {
            foodId: fd.get('foodId'),
            grams: fd.get('grams'),
          })
        );
        render();
      });
    }

    const water = root.querySelector('[data-act="log-water"]');
    if (water) {
      water.addEventListener('click', () => {
        let next = state;
        let waterFood = next.foods.find((f) => f.name === 'Water / electrolytes');
        if (!waterFood) {
          next = Become.addFood(next, {
            name: 'Water / electrolytes',
            grams: 1,
            calories: 0,
            protein: 0,
          });
          waterFood = next.foods[next.foods.length - 1];
        }
        persist(
          Become.logFood(next, today, { foodId: waterFood.id, grams: 1, note: 'fast' })
        );
        render();
      });
    }

    const applyTmpl = root.querySelector('[data-act="apply-tmpl"]');
    if (applyTmpl) {
      applyTmpl.addEventListener('click', () => {
        const id = root.querySelector('#apply-tmpl').value;
        if (!id) return;
        persist(Become.applyTemplate(state, today, id));
        render();
      });
    }

    const logMealBtn = root.querySelector('[data-act="log-meal"]');
    if (logMealBtn) {
      logMealBtn.addEventListener('click', () => {
        const id = root.querySelector('#log-meal').value;
        if (!id) return;
        persist(Become.logMeal(state, today, id));
        render();
      });
    }

    const saveMeal = root.querySelector('#save-meal');
    if (saveMeal) {
      saveMeal.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = new FormData(e.target).get('name');
        const items = (state.foodLogs[today] || []).map((e) => ({
          foodId: e.foodId,
          grams: e.grams,
        }));
        persist(Become.saveMeal(state, { name, items }));
        render();
      });
    }

    const saveTmpl = root.querySelector('#save-tmpl');
    if (saveTmpl) {
      saveTmpl.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = new FormData(e.target).get('name');
        const items = (state.foodLogs[today] || []).map((e) => ({
          foodId: e.foodId,
          grams: e.grams,
        }));
        persist(Become.saveMealTemplate(state, { name, items }));
        render();
      });
    }

    const logWeight = root.querySelector('#log-weight');
    if (logWeight) {
      logWeight.addEventListener('submit', (e) => {
        e.preventDefault();
        const lbs = new FormData(e.target).get('lbs');
        persist(Become.upsertWeight(state, today, lbs));
        render();
      });
    }

    root.querySelectorAll('[data-window]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persist({
          ...state,
          settings: {
            ...state.settings,
            weightAvgWindow: Number(btn.getAttribute('data-window')),
          },
        });
        render();
      });
    });

    const logMeas = root.querySelector('#log-meas');
    if (logMeas) {
      logMeas.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        persist(
          Become.upsertMeasurement(state, {
            date: today,
            waist: fd.get('waist'),
            chest: fd.get('chest'),
            hips: fd.get('hips'),
          })
        );
        render();
      });
    }

    const showMeas = root.querySelector('#show-meas');
    if (showMeas) {
      showMeas.addEventListener('change', () => {
        persist({
          ...state,
          settings: {
            ...state.settings,
            showMeasurementsOnHome: showMeas.checked,
          },
        });
      });
    }

    const addFast = root.querySelector('#add-fast');
    if (addFast) {
      addFast.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        persist(
          Become.addFast(state, {
            start: fd.get('start'),
            end: fd.get('end'),
            recurrence: fd.get('recurrence'),
          })
        );
        render();
      });
    }

    const addEvent = root.querySelector('#add-event');
    if (addEvent) {
      addEvent.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        let next = Become.addHighCalorieEvent(state, {
          startDate: fd.get('startDate'),
          endDate: fd.get('endDate'),
          eventTargetCalories: fd.get('eventTargetCalories'),
          preDays: fd.get('preDays'),
        });
        const id = next.highCalorieEvents[next.highCalorieEvents.length - 1].id;
        next = Become.applyRedistribution(next, id);
        persist(next);
        render();
      });
    }

    root.querySelectorAll('[data-clear-event]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persist(Become.clearEventOverrides(state, btn.getAttribute('data-clear-event')));
        render();
      });
    });

    root.querySelectorAll('[data-edit-ms]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-ms');
        const m = state.goal.milestones.find((x) => x.id === id);
        const val = prompt('Pounds from start', m?.lbsFromStart);
        if (val == null) return;
        const lbsFromStart = Number(val);
        const milestones = state.goal.milestones.map((x) =>
          x.id === id
            ? {
                ...x,
                lbsFromStart,
                label:
                  lbsFromStart === 1
                    ? 'Lose your first pound'
                    : `Lose ${lbsFromStart} lb`,
              }
            : x
        );
        persist({ ...state, goal: { ...state.goal, milestones } });
        render();
      });
    });

    const settings = root.querySelector('#settings');
    if (settings) {
      settings.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const protein = fd.get('proteinTarget');
        persist({
          ...state,
          settings: {
            ...state.settings,
            calorieTarget: Number(fd.get('calorieTarget')),
            proteinTarget: protein === '' ? null : Number(protein),
          },
        });
        render();
      });
    }

    const exp = root.querySelector('[data-act="export"]');
    if (exp) {
      exp.addEventListener('click', () => {
        const blob = new Blob([Become.exportState(state)], {
          type: 'application/json',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `become-export-${Become.todayKey()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    const importFile = root.querySelector('#import-file');
    if (importFile) {
      importFile.addEventListener('change', async () => {
        const file = importFile.files?.[0];
        if (!file) return;
        if (!confirm('Replace all local data with this file?')) return;
        try {
          const text = await file.text();
          const next = Become.importState(text);
          persist(next);
          render();
        } catch (err) {
          alert(err.message || 'Import failed');
        }
      });
    }
  }

  render();
})();
