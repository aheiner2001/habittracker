(function () {
  let state = Become.loadState();
  let activeTool = sessionStorage.getItem('become-lifestyle-tool') || 'food';
  let settingsOpen = false;
  let logExpanded = false;
  let editingEntryId = null;

  const TOOLS = [
    { id: 'food', label: 'Food' },
    { id: 'weight', label: 'Weight' },
    { id: 'cook', label: 'Cooked' },
    { id: 'meals', label: 'Meals' },
    { id: 'plan', label: 'Plan' },
    { id: 'measure', label: 'Body' },
  ];

  if (!TOOLS.some((t) => t.id === activeTool)) {
    activeTool = 'food';
    sessionStorage.setItem('become-lifestyle-tool', 'food');
  }

  let cookDraft = {
    ingredients: [],
    emptyDishG: '',
    cookedTotalG: '',
    servingG: '200',
    saveName: '',
    importText: '',
    importMsg: '',
  };

  let mealsImportText = '';
  let mealsImportMsg = '';

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

  function setTool(id) {
    activeTool = id;
    sessionStorage.setItem('become-lifestyle-tool', id);
    rememberTool(id);
    settingsOpen = false;
    render();
  }

  function rememberTool(id) {
    try {
      const key = 'become-lifestyle-recent';
      const prev = JSON.parse(sessionStorage.getItem(key) || '[]');
      const next = [id, ...prev.filter((t) => t !== id)].slice(0, 4);
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function recentToolIds() {
    try {
      const known = new Set(TOOLS.map((t) => t.id));
      const recent = JSON.parse(sessionStorage.getItem('become-lifestyle-recent') || '[]').filter(
        (id) => known.has(id)
      );
      sessionStorage.setItem('become-lifestyle-recent', JSON.stringify(recent));
      const pinned = ['food', 'weight'];
      return [...pinned, ...recent.filter((id) => !pinned.includes(id))].slice(0, 5);
    } catch {
      return ['food', 'weight', 'meals'];
    }
  }

  function foodOptions() {
    return state.foods
      .map((f) => `<option value="${f.id}">${f.name}</option>`)
      .join('');
  }

  function dayDashboardHtml(today, nutrition, target, fasting) {
    const remaining = Math.round(target - nutrition.calories);
    const calPct = Math.min(100, Math.round((nutrition.calories / Math.max(target, 1)) * 100));
    const entries = state.foodLogs[today] || [];
    return `
      <section class="panel panel-span day-dash">
        <div class="day-dash-top">
          <div>
            <p class="day-dash-label">Today</p>
            <p class="metric">${Math.round(nutrition.calories)}</p>
            <p class="meta">of ${target} kcal${fasting ? ' · Fasting' : ''}</p>
          </div>
          <div class="day-dash-side">
            <p class="day-dash-remain ${remaining < 0 ? 'is-over' : ''}">
              ${remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
            </p>
            ${
              state.settings.proteinTarget
                ? `<p class="meta">Protein ${Math.round(nutrition.protein)} / ${state.settings.proteinTarget} g</p>`
                : ''
            }
          </div>
        </div>
        <div class="progress" aria-hidden="true"><div class="progress-fill" style="width:${calPct}%"></div></div>
        <button type="button" class="log-toggle" data-act="toggle-log">
          ${entries.length} logged item${entries.length === 1 ? '' : 's'}
          <span>${logExpanded ? 'Hide' : 'Show'}</span>
        </button>
        ${
          logExpanded
            ? `<ul class="log-list">
                ${
                  entries.length
                    ? entries
                        .map((e) => {
                          const food = state.foods.find((f) => f.id === e.foodId);
                          const cals = food ? Math.round(food.calPerG * e.grams) : '?';
                          const note = e.note ? ` · ${e.note}` : '';
                          return `<li class="log-row">
                            <button type="button" class="log-row-main" data-edit-log="${e.id}">
                              <span class="food-quick-name">${food?.name || 'Food'}</span>
                              <span class="food-quick-meta">${e.grams}g · ${cals} kcal${note}</span>
                            </button>
                            <button type="button" class="btn" data-rm-log="${e.id}">Remove</button>
                          </li>`;
                        })
                        .join('')
                    : '<li class="meta">Nothing logged yet.</li>'
                }
              </ul>`
            : ''
        }
      </section>`;
  }

  function toolBarHtml() {
    const recent = recentToolIds();
    const chips = recent
      .map((id) => {
        const tool = TOOLS.find((t) => t.id === id);
        if (!tool) return '';
        return `<button type="button" class="tool-chip ${
          activeTool === id ? 'is-active' : ''
        }" data-tool="${id}">${tool.label}</button>`;
      })
      .join('');
    const more = TOOLS.filter((t) => !recent.includes(t.id));
    return `
      <nav class="tool-bar" aria-label="Lifestyle tools">
        <div class="tool-chips">${chips}</div>
        ${
          more.length
            ? `<details class="tool-more">
                <summary>More</summary>
                <div class="tool-more-menu">
                  ${more
                    .map(
                      (t) =>
                        `<button type="button" class="tool-chip" data-tool="${t.id}">${t.label}</button>`
                    )
                    .join('')}
                </div>
              </details>`
            : ''
        }
      </nav>`;
  }

  function toolPanelHtml(today, fasting, windowDays) {
    if (activeTool === 'food') {
      const frequent = Become.frequentFoods(state, 8);
      const quickHtml = frequent.length
        ? `<div class="food-quick">
            <p class="day-dash-label">Quick picks</p>
            <div class="food-quick-list">
              ${frequent
                .map((f) => {
                  const grams = f.lastGrams || f.defaultGrams || 100;
                  const cals = Math.round((f.calPerG || 0) * grams);
                  return `<button type="button" class="food-quick-chip" data-quick-food="${f.id}" data-quick-grams="${grams}">
                    <span class="food-quick-name">${f.name}</span>
                    <span class="food-quick-meta">${grams}g · ${cals} kcal</span>
                  </button>`;
                })
                .join('')}
            </div>
          </div>`
        : `<p class="meta" style="margin-top:0.65rem">Add foods under Meals to build quick picks.</p>`;

      return `
        <section class="panel panel-span">
          <h2>${fasting ? 'Fasting' : 'Log food'}</h2>
          ${
            fasting
              ? `<p class="meta">Water and electrolytes only during a fast.</p>
                 <div class="btn-row"><button type="button" class="btn btn-primary" data-act="log-water">Log water / electrolytes</button></div>`
              : `<form id="log-food" class="stack" style="margin-top:0.65rem">
                  <div class="form-grid">
                    <div class="field field-span">
                      <label for="log-food-id">Food</label>
                      <select id="log-food-id" name="foodId" required>${foodOptions() || '<option value="">Add a food first</option>'}</select>
                    </div>
                    <div class="field">
                      <label for="log-grams">Grams</label>
                      <input id="log-grams" name="grams" type="number" step="1" inputmode="numeric" required />
                    </div>
                    <div class="field" style="display:flex;align-items:end">
                      <button class="btn btn-primary" type="submit" style="width:100%">Log</button>
                    </div>
                  </div>
                </form>
                ${quickHtml}
                <div class="form-grid" style="margin-top:0.85rem">
                  <div class="field">
                    <label for="apply-tmpl">Template</label>
                    <select id="apply-tmpl">
                      <option value="">Choose…</option>
                      ${state.mealTemplates
                        .map((t) => `<option value="${t.id}">${t.name}</option>`)
                        .join('')}
                    </select>
                  </div>
                  <div class="field" style="display:flex;align-items:end">
                    <button type="button" class="btn" data-act="apply-tmpl" style="width:100%">Apply</button>
                  </div>
                  <div class="field">
                    <label for="log-meal">Saved meal</label>
                    <select id="log-meal">
                      <option value="">Choose…</option>
                      ${state.meals
                        .map((m) => `<option value="${m.id}">${m.name}</option>`)
                        .join('')}
                    </select>
                  </div>
                  <div class="field" style="display:flex;align-items:end">
                    <button type="button" class="btn" data-act="log-meal" style="width:100%">Log meal</button>
                  </div>
                </div>`
          }
        </section>`;
    }

    if (activeTool === 'weight') {
      const avg = Become.rollingAverage(state.weights, today, windowDays);
      return `
        <section class="panel panel-span">
          <h2>Weight</h2>
          <p class="metric">${avg != null ? avg : '—'}</p>
          <p class="meta">${avg != null ? `${windowDays}-day rolling avg` : 'Log this morning’s weigh-in'}</p>
          <form id="log-weight" class="form-grid" style="margin-top:0.75rem">
            <div class="field">
              <label>Today’s weight (lb)</label>
              <input name="lbs" type="number" step="0.1" inputmode="decimal" required />
            </div>
            <div class="field" style="display:flex;align-items:end">
              <button class="btn btn-primary" type="submit" style="width:100%">Log</button>
            </div>
          </form>
          <div class="btn-row">
            <button type="button" class="btn ${windowDays === 7 ? 'btn-primary' : ''}" data-window="7">7-day</button>
            <button type="button" class="btn ${windowDays === 14 ? 'btn-primary' : ''}" data-window="14">14-day</button>
          </div>
          <div id="weight-chart"></div>
        </section>`;
    }

    if (activeTool === 'cook') {
      const result = Become.computeCookedMeal({
        ingredients: cookDraft.ingredients,
        emptyDishG: cookDraft.emptyDishG,
        cookedTotalG: cookDraft.cookedTotalG,
        servingG: cookDraft.servingG || 200,
      });
      const dash = (v, suffix = '') =>
        v == null || v === '' ? '—' : `${v}${suffix}`;
      const ingLine = (row) => {
        const bits = [`${Math.round(row.calories)} kcal`];
        if (row.protein != null) bits.push(`P ${row.protein}g`);
        if (row.carbs != null) bits.push(`C ${row.carbs}g`);
        if (row.fat != null) bits.push(`F ${row.fat}g`);
        return `${row.label} · ${bits.join(' · ')}`;
      };
      return `
        <section class="panel panel-span">
          <h2>Cooked meal calculator</h2>
          <p class="meta">Sum raw ingredient macros, tare the dish, weigh after cooking — get per-gram density and a serving preview (grams only).</p>
        </section>
        <section class="panel panel-span">
          <h2>AI import</h2>
          <p class="meta">Copy a prompt, paste a recipe or photo into any AI, then paste the JSON here.</p>
          <div class="btn-row" style="margin-top:0.55rem">
            <button type="button" class="btn" data-act="copy-cooked-prompt">Copy cooked prompt</button>
            <button type="button" class="btn" data-act="copy-foods-prompt">Copy foods prompt</button>
          </div>
          <form id="cook-import" class="stack" style="margin-top:0.75rem">
            <div class="field">
              <label>Paste JSON</label>
              <textarea name="json" rows="5" placeholder='{"becomeImport":1,"type":"cookedRecipe",...}'>${cookDraft.importText || ''}</textarea>
            </div>
            <button class="btn btn-primary" type="submit">Import JSON</button>
            ${cookDraft.importMsg ? `<p class="meta">${cookDraft.importMsg}</p>` : ''}
          </form>
        </section>
        <section class="panel panel-span">
          <h2>1. Raw ingredients</h2>
          <form id="cook-add-lib" class="stack" style="margin-top:0.55rem">
            <p class="day-dash-label">From library</p>
            <div class="form-grid">
              <div class="field field-span">
                <label>Food</label>
                <select name="foodId">${foodOptions() || '<option value="">Add foods under Meals first</option>'}</select>
              </div>
              <div class="field">
                <label>Raw grams used</label>
                <input name="grams" type="number" step="1" inputmode="numeric" required />
              </div>
              <div class="field" style="display:flex;align-items:end">
                <button class="btn" type="submit" style="width:100%">Add</button>
              </div>
            </div>
          </form>
          <form id="cook-add-manual" class="stack" style="margin-top:0.85rem">
            <p class="day-dash-label">Or enter macros for the amount used</p>
            <div class="form-grid">
              <div class="field field-span"><label>Label</label><input name="label" placeholder="e.g. Cheese" required /></div>
              <div class="field"><label>Calories</label><input name="calories" type="number" required /></div>
              <div class="field"><label>Protein (g)</label><input name="protein" type="number" step="0.1" /></div>
              <div class="field"><label>Carbs (g)</label><input name="carbs" type="number" step="0.1" /></div>
              <div class="field"><label>Fat (g)</label><input name="fat" type="number" step="0.1" /></div>
              <div class="field" style="display:flex;align-items:end">
                <button class="btn" type="submit" style="width:100%">Add</button>
              </div>
            </div>
          </form>
          <ul class="simple-list" style="margin-top:0.75rem">
            ${
              cookDraft.ingredients.length
                ? cookDraft.ingredients
                    .map(
                      (row, i) =>
                        `<li><span>${ingLine(row)}</span>
                        <button type="button" class="btn" data-cook-rm="${i}">Remove</button></li>`
                    )
                    .join('')
                : '<li class="meta">No ingredients yet.</li>'
            }
          </ul>
        </section>
        <section class="panel panel-span">
          <h2>2. Dish weights</h2>
          <div class="form-grid" style="margin-top:0.55rem">
            <div class="field">
              <label>Empty dish / tare (g)</label>
              <input id="cook-empty" type="number" step="0.1" inputmode="decimal" value="${cookDraft.emptyDishG}" />
            </div>
            <div class="field">
              <label>Cooked dish + food (g)</label>
              <input id="cook-total" type="number" step="0.1" inputmode="decimal" value="${cookDraft.cookedTotalG}" />
            </div>
          </div>
          <p class="meta" style="margin-top:0.55rem">Weigh after baking — water loss changes weight, not calories.</p>
        </section>
        <section class="panel panel-span">
          <h2>3. Recipe yield summary</h2>
          ${
            result.ok
              ? `<div class="stack" style="margin-top:0.55rem">
                  <p class="day-dash-label">Yield</p>
                  <ul class="simple-list">
                    <li><span>Empty container (tare)</span><span>${dash(Number(cookDraft.emptyDishG), ' g')}</span></li>
                    <li><span>Total cooked (container + food)</span><span>${dash(Number(cookDraft.cookedTotalG), ' g')}</span></li>
                    <li><span>Net cooked food</span><span>${result.netWeightG} g</span></li>
                  </ul>
                  <p class="day-dash-label" style="margin-top:0.75rem">Total batch macros</p>
                  <ul class="simple-list">
                    <li><span>Calories</span><span>${result.totalCalories} kcal</span></li>
                    <li><span>Protein</span><span>${dash(result.totalProtein, ' g')}</span></li>
                    <li><span>Carbs</span><span>${dash(result.totalCarbs, ' g')}</span></li>
                    <li><span>Fat</span><span>${dash(result.totalFat, ' g')}</span></li>
                  </ul>
                  <p class="day-dash-label" style="margin-top:0.75rem">Per-gram density</p>
                  <ul class="simple-list">
                    <li><span>Calories</span><span>${result.calPerG} kcal/g</span></li>
                    <li><span>Protein</span><span>${dash(result.proteinPerG, ' g/g')}</span></li>
                    <li><span>Carbs</span><span>${dash(result.carbsPerG, ' g/g')}</span></li>
                    <li><span>Fat</span><span>${dash(result.fatPerG, ' g/g')}</span></li>
                  </ul>
                  <div class="field" style="margin-top:0.75rem">
                    <label>Serving size (g)</label>
                    <input id="cook-serving" type="number" step="1" inputmode="numeric" value="${cookDraft.servingG || 200}" />
                  </div>
                  <p class="day-dash-label" style="margin-top:0.55rem">Serving macros (${result.servingG}g)</p>
                  <ul class="simple-list">
                    <li><span>Calories</span><span>${dash(result.servingCalories, ' kcal')}</span></li>
                    <li><span>Protein</span><span>${dash(result.servingProtein, ' g')}</span></li>
                    <li><span>Carbs</span><span>${dash(result.servingCarbs, ' g')}</span></li>
                    <li><span>Fat</span><span>${dash(result.servingFat, ' g')}</span></li>
                  </ul>
                </div>
                <form id="cook-save" class="stack" style="margin-top:0.85rem">
                  <div class="field">
                    <label>Save to food library as</label>
                    <input name="name" required placeholder="Breakfast casserole" value="${cookDraft.saveName || ''}" />
                  </div>
                  <button class="btn btn-primary" type="submit">Save cooked food</button>
                </form>
                <p class="meta">Then log servings by weighing a portion — macros auto-scale.</p>`
              : `<p class="meta" style="margin-top:0.55rem">Add ingredients and both dish weights (cooked total must be heavier than the empty dish).</p>`
          }
        </section>`;
    }

    if (activeTool === 'meals') {
      return `
        <section class="panel panel-span">
          <h2>Add food to library</h2>
          <form id="add-food" class="stack" style="margin-top:0.65rem">
            <div class="form-grid">
              <div class="field field-span"><label>Name</label><input name="name" required /></div>
              <div class="field"><label>Grams</label><input name="grams" type="number" required value="100" /></div>
              <div class="field"><label>Calories</label><input name="calories" type="number" required /></div>
              <div class="field"><label>Protein (g)</label><input name="protein" type="number" /></div>
              <div class="field"><label>Carbs (g)</label><input name="carbs" type="number" /></div>
              <div class="field"><label>Fat (g)</label><input name="fat" type="number" /></div>
            </div>
            <button class="btn btn-primary" type="submit">Save food</button>
          </form>
        </section>
        <section class="panel panel-span">
          <h2>AI import foods</h2>
          <p class="meta">Copy the foods prompt, describe foods (or paste a photo) into AI, then import the JSON.</p>
          <div class="btn-row" style="margin-top:0.55rem">
            <button type="button" class="btn" data-act="copy-foods-prompt">Copy foods prompt</button>
          </div>
          <form id="meals-import" class="stack" style="margin-top:0.75rem">
            <div class="field">
              <label>Paste JSON</label>
              <textarea name="json" rows="5" placeholder='{"becomeImport":1,"type":"foods",...}'>${mealsImportText || ''}</textarea>
            </div>
            <button class="btn btn-primary" type="submit">Import foods</button>
            ${mealsImportMsg ? `<p class="meta">${mealsImportMsg}</p>` : ''}
          </form>
        </section>
        <section class="panel panel-span">
          <h2>Save from today’s log</h2>
          <form id="save-meal" class="stack" style="margin-top:0.55rem">
            <div class="field"><label>Meal name</label><input name="name" required placeholder="Berry smoothie" /></div>
            <button class="btn" type="submit">Save as meal</button>
          </form>
          <form id="save-tmpl" class="stack" style="margin-top:0.85rem">
            <div class="field"><label>Template name</label><input name="name" required placeholder="Light breakfast" /></div>
            <button class="btn" type="submit">Save as template</button>
          </form>
        </section>`;
    }

    if (activeTool === 'plan') {
      return `
        <section class="panel panel-span">
          <h2>Fasting</h2>
          <form id="start-fast-now" class="stack" style="margin-top:0.55rem">
            <p class="day-dash-label">Quick start</p>
            <div class="form-grid">
              <div class="field">
                <label>Duration (hours)</label>
                <input name="hours" type="number" min="1" step="1" value="24" required />
              </div>
              <div class="field" style="display:flex;align-items:end">
                <button class="btn btn-primary" type="submit" style="width:100%">Start fasting now</button>
              </div>
            </div>
          </form>
          <form id="add-fast" class="stack" style="margin-top:0.85rem">
            <p class="day-dash-label">Or schedule</p>
            <div class="form-grid">
              <div class="field"><label>Start</label><input name="start" type="datetime-local" required /></div>
              <div class="field"><label>End</label><input name="end" type="datetime-local" required /></div>
              <div class="field field-span">
                <label>Recurrence</label>
                <select name="recurrence">
                  <option value="none">None</option>
                  <option value="every_other_week">Every other week</option>
                </select>
              </div>
            </div>
            <button class="btn" type="submit">Schedule fast</button>
          </form>
          <ul class="simple-list">${
            state.fasts.length
              ? state.fasts
                  .map(
                    (f) =>
                      `<li><span>${f.start} → ${f.end} (${f.recurrence})</span>
                      <button type="button" class="btn" data-rm-fast="${f.id}">Remove</button></li>`
                  )
                  .join('')
              : '<li class="meta">No fasts scheduled.</li>'
          }</ul>
        </section>
        <section class="panel panel-span">
          <h2>High-calorie event</h2>
          <form id="add-event" class="stack" style="margin-top:0.55rem">
            <div class="form-grid">
              <div class="field"><label>Start date</label><input name="startDate" type="date" required /></div>
              <div class="field"><label>End date</label><input name="endDate" type="date" required /></div>
              <div class="field"><label>Event target (kcal)</label><input name="eventTargetCalories" type="number" required value="2800" /></div>
              <div class="field"><label>Days before</label><input name="preDays" type="number" value="5" min="1" /></div>
            </div>
            <button class="btn btn-primary" type="submit">Plan & redistribute</button>
          </form>
          <ul class="simple-list">${
            state.highCalorieEvents.length
              ? state.highCalorieEvents
                  .map(
                    (e) =>
                      `<li><span>${e.startDate}–${e.endDate} @ ${e.eventTargetCalories} kcal</span>
                      <button type="button" class="btn" data-clear-event="${e.id}">Clear</button></li>`
                  )
                  .join('')
              : '<li class="meta">No high-calorie events.</li>'
          }</ul>
          <p class="meta">Clear removes the event and restores normal calorie targets for those days.</p>
        </section>`;
    }

    if (activeTool === 'measure') {
      return `
        <section class="panel panel-span">
          <h2>Measurements</h2>
          <form id="log-meas" class="stack" style="margin-top:0.55rem">
            <div class="form-grid">
              <div class="field"><label>Waist</label><input name="waist" type="number" step="0.1" /></div>
              <div class="field"><label>Chest</label><input name="chest" type="number" step="0.1" /></div>
              <div class="field"><label>Hips</label><input name="hips" type="number" step="0.1" /></div>
            </div>
            <button class="btn btn-primary" type="submit">Log measurements</button>
          </form>
          <label class="check-row"><input type="checkbox" id="show-meas" ${
            state.settings.showMeasurementsOnHome ? 'checked' : ''
          } /> Show on Home</label>
        </section>`;
    }

    return '';
  }

  function settingsSheetHtml() {
    if (!settingsOpen) return '';
    return `
      <div class="settings-sheet" role="dialog" aria-label="Settings">
        <div class="settings-sheet-inner">
          <div class="settings-sheet-head">
            <h2>Settings</h2>
            <button type="button" class="icon-btn" data-act="close-settings" aria-label="Close">✕</button>
          </div>
          <section class="panel">
            <h2>Targets</h2>
            <form id="settings" class="stack" style="margin-top:0.55rem">
              <div class="form-grid">
                <div class="field"><label>Calorie target</label><input name="calorieTarget" type="number" value="${
                  state.settings.calorieTarget
                }" required /></div>
                <div class="field"><label>Protein (optional)</label><input name="proteinTarget" type="number" value="${
                  state.settings.proteinTarget ?? ''
                }" /></div>
              </div>
              <button class="btn btn-primary" type="submit">Save</button>
            </form>
          </section>
          <section class="panel">
            <h2>Milestones</h2>
            <ul class="simple-list">${(state.goal.milestones || [])
              .map(
                (m) =>
                  `<li><span>${m.label} (${m.lbsFromStart} lb)${
                    m.reachedAt ? ` · ${m.reachedAt}` : ''
                  }</span>
                  <button type="button" class="btn" data-edit-ms="${m.id}">Edit</button></li>`
              )
              .join('')}</ul>
          </section>
          <section class="panel">
            <h2>Backup</h2>
            <div class="btn-row">
              <button type="button" class="btn" data-act="export">Export JSON</button>
            </div>
            <div class="field" style="margin-top:0.75rem">
              <label for="import-file">Import JSON</label>
              <input id="import-file" type="file" accept="application/json,.json" />
            </div>
          </section>
        </div>
      </div>`;
  }

  function editLogSheetHtml(today) {
    if (!editingEntryId) return '';
    const entry = (state.foodLogs[today] || []).find((e) => e.id === editingEntryId);
    if (!entry) return '';
    const food = state.foods.find((f) => f.id === entry.foodId);
    const grams = entry.grams;
    const cals = food ? Math.round(food.calPerG * grams) : 0;
    const protein =
      food && food.proteinPerG != null
        ? Math.round(food.proteinPerG * grams * 10) / 10
        : null;
    return `
      <div class="settings-sheet" role="dialog" aria-label="Edit food log" data-sheet="edit-log">
        <div class="settings-sheet-inner">
          <div class="settings-sheet-head">
            <h2>Edit log</h2>
            <button type="button" class="icon-btn" data-act="close-edit-log" aria-label="Close">✕</button>
          </div>
          <form id="edit-log-form" class="stack">
            <div class="field">
              <label for="edit-food-id">Food</label>
              <select id="edit-food-id" name="foodId" required>${foodOptions()}</select>
            </div>
            <div class="field">
              <label for="edit-grams">Grams</label>
              <input id="edit-grams" name="grams" type="number" step="1" inputmode="numeric" required value="${grams}" />
            </div>
            <div class="field">
              <label for="edit-note">Note (optional)</label>
              <input id="edit-note" name="note" type="text" value="${entry.note || ''}" />
            </div>
            <p class="meta" id="edit-preview">~${cals} kcal${
              protein != null ? ` · ${protein}g protein` : ''
            }</p>
            <p class="meta" id="edit-hint" hidden>Enter a positive gram amount.</p>
            <div class="btn-row">
              <button class="btn btn-primary" type="submit">Save</button>
              <button class="btn" type="button" data-act="close-edit-log">Cancel</button>
              <button class="btn btn-danger" type="button" data-act="delete-edit-log">Delete</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function render() {
    const today = Become.todayKey();
    const { headerHtml, navHtml } = Become.renderShell({
      active: 'lifestyle',
      showSettings: true,
    });
    const nutrition = Become.dayNutrition(state, today);
    const target = Become.effectiveTarget(state, today);
    const fasting = Become.isFastingDay(state, today);
    const windowDays = state.settings.weightAvgWindow || 7;
    const series = Become.rollingSeries(state.weights, windowDays);

    root.innerHTML = `${headerHtml}
      <main class="lifestyle-grid">
        ${dayDashboardHtml(today, nutrition, target, fasting)}
        ${toolBarHtml()}
        ${toolPanelHtml(today, fasting, windowDays)}
      </main>
      ${settingsSheetHtml()}
      ${editLogSheetHtml(today)}
      ${navHtml}`;

    const dateEl = root.querySelector('#shell-date');
    if (dateEl) dateEl.textContent = Become.formatLongDate();

    if (activeTool === 'weight') {
      const chart = root.querySelector('#weight-chart');
      if (chart) Become.renderWeightChart(chart, series, { windowDays });
    }

    bind();
  }

  function bind() {
    const today = Become.todayKey();

    root.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => setTool(btn.getAttribute('data-tool')));
    });

    const openSettings = root.querySelector('[data-act="open-settings"]');
    if (openSettings) {
      openSettings.addEventListener('click', () => {
        editingEntryId = null;
        settingsOpen = true;
        render();
      });
    }
    const closeSettings = root.querySelector('[data-act="close-settings"]');
    if (closeSettings) {
      closeSettings.addEventListener('click', () => {
        settingsOpen = false;
        render();
      });
    }
    root.querySelectorAll('.settings-sheet').forEach((sheet) => {
      sheet.addEventListener('click', (e) => {
        if (e.target !== sheet) return;
        if (sheet.getAttribute('data-sheet') === 'edit-log') editingEntryId = null;
        else settingsOpen = false;
        render();
      });
    });

    root.querySelectorAll('[data-edit-log]').forEach((btn) => {
      btn.addEventListener('click', () => {
        settingsOpen = false;
        editingEntryId = btn.getAttribute('data-edit-log');
        logExpanded = true;
        render();
        const select = root.querySelector('#edit-food-id');
        const entry = (state.foodLogs[today] || []).find((e) => e.id === editingEntryId);
        if (select && entry) select.value = entry.foodId;
      });
    });

    const closeEdit = root.querySelectorAll('[data-act="close-edit-log"]');
    closeEdit.forEach((btn) => {
      btn.addEventListener('click', () => {
        editingEntryId = null;
        render();
      });
    });

    const deleteEdit = root.querySelector('[data-act="delete-edit-log"]');
    if (deleteEdit) {
      deleteEdit.addEventListener('click', () => {
        if (!editingEntryId) return;
        if (!confirm('Delete this log entry?')) return;
        persist(Become.removeFoodLog(state, today, editingEntryId));
        editingEntryId = null;
        render();
      });
    }

    const editForm = root.querySelector('#edit-log-form');
    if (editForm) {
      const foodSelect = editForm.querySelector('[name="foodId"]');
      const gramsInput = editForm.querySelector('[name="grams"]');
      const preview = root.querySelector('#edit-preview');
      const hint = root.querySelector('#edit-hint');
      const updatePreview = () => {
        const food = state.foods.find((f) => f.id === foodSelect.value);
        const g = Number(gramsInput.value);
        if (!food || !(g > 0)) {
          preview.textContent = '—';
          return;
        }
        const cals = Math.round(food.calPerG * g);
        const protein =
          food.proteinPerG != null
            ? Math.round(food.proteinPerG * g * 10) / 10
            : null;
        preview.textContent = `~${cals} kcal${
          protein != null ? ` · ${protein}g protein` : ''
        }`;
      };
      foodSelect.addEventListener('change', () => {
        const food = state.foods.find((f) => f.id === foodSelect.value);
        if (food) gramsInput.value = food.lastGrams || food.defaultGrams;
        updatePreview();
      });
      gramsInput.addEventListener('input', updatePreview);
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const g = Number(fd.get('grams'));
        if (!(g > 0)) {
          if (hint) hint.hidden = false;
          return;
        }
        if (hint) hint.hidden = true;
        persist(
          Become.updateFoodLog(state, today, editingEntryId, {
            foodId: fd.get('foodId'),
            grams: g,
            note: fd.get('note'),
          })
        );
        editingEntryId = null;
        render();
      });
    }

    const toggleLog = root.querySelector('[data-act="toggle-log"]');
    if (toggleLog) {
      toggleLog.addEventListener('click', () => {
        logExpanded = !logExpanded;
        render();
      });
    }

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
        setTool('food');
      });
    }

    const logFood = root.querySelector('#log-food');
    if (logFood) {
      const select = logFood.querySelector('[name="foodId"]');
      const grams = logFood.querySelector('[name="grams"]');
      const syncGrams = () => {
        const food = state.foods.find((f) => f.id === select.value);
        if (food && grams) grams.value = food.lastGrams || food.defaultGrams;
      };
      if (select) {
        select.addEventListener('change', syncGrams);
        syncGrams();
      }
      logFood.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        if (!fd.get('foodId')) return;
        persist(
          Become.logFood(state, today, {
            foodId: fd.get('foodId'),
            grams: fd.get('grams'),
          })
        );
        render();
      });
    }

    root.querySelectorAll('[data-quick-food]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const foodId = btn.getAttribute('data-quick-food');
        const grams = Number(btn.getAttribute('data-quick-grams')) || 100;
        persist(Become.logFood(state, today, { foodId, grams }));
        render();
      });
    });

    const cookEmpty = root.querySelector('#cook-empty');
    const cookTotal = root.querySelector('#cook-total');
    const cookServing = root.querySelector('#cook-serving');
    const syncCookWeights = () => {
      if (cookEmpty) cookDraft.emptyDishG = cookEmpty.value;
      if (cookTotal) cookDraft.cookedTotalG = cookTotal.value;
      if (cookServing) cookDraft.servingG = cookServing.value;
      const nameInput = root.querySelector('#cook-save [name="name"]');
      if (nameInput) cookDraft.saveName = nameInput.value;
      const importTa = root.querySelector('#cook-import [name="json"]');
      if (importTa) cookDraft.importText = importTa.value;
    };

    const cookAddLib = root.querySelector('#cook-add-lib');
    if (cookAddLib) {
      cookAddLib.addEventListener('submit', (e) => {
        e.preventDefault();
        syncCookWeights();
        const fd = new FormData(cookAddLib);
        const foodId = fd.get('foodId');
        const grams = Number(fd.get('grams'));
        const food = state.foods.find((f) => f.id === foodId);
        if (!food || !(grams > 0)) return;
        cookDraft.ingredients.push({
          id: `ing-${Date.now()}`,
          label: `${food.name} (${grams}g)`,
          calories: food.calPerG * grams,
          protein: food.proteinPerG != null ? food.proteinPerG * grams : null,
          carbs: food.carbsPerG != null ? food.carbsPerG * grams : null,
          fat: food.fatPerG != null ? food.fatPerG * grams : null,
        });
        render();
      });
    }

    const cookAddManual = root.querySelector('#cook-add-manual');
    if (cookAddManual) {
      cookAddManual.addEventListener('submit', (e) => {
        e.preventDefault();
        syncCookWeights();
        const fd = new FormData(cookAddManual);
        const calories = Number(fd.get('calories'));
        if (!(calories > 0)) return;
        const opt = (key) => {
          const v = fd.get(key);
          return v === '' || v == null ? null : Number(v);
        };
        cookDraft.ingredients.push({
          id: `ing-${Date.now()}`,
          label: String(fd.get('label') || 'Ingredient').trim(),
          calories,
          protein: opt('protein'),
          carbs: opt('carbs'),
          fat: opt('fat'),
        });
        render();
      });
    }

    root.querySelectorAll('[data-cook-rm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncCookWeights();
        const i = Number(btn.getAttribute('data-cook-rm'));
        cookDraft.ingredients.splice(i, 1);
        render();
      });
    });

    if (cookEmpty) {
      cookEmpty.addEventListener('change', () => {
        cookDraft.emptyDishG = cookEmpty.value;
        render();
      });
    }
    if (cookTotal) {
      cookTotal.addEventListener('change', () => {
        cookDraft.cookedTotalG = cookTotal.value;
        render();
      });
    }
    if (cookServing) {
      cookServing.addEventListener('change', () => {
        cookDraft.servingG = cookServing.value || '200';
        render();
      });
    }

    const cookImport = root.querySelector('#cook-import');
    if (cookImport) {
      cookImport.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = new FormData(cookImport).get('json');
        cookDraft.importText = text;
        const parsed = Become.parseBecomeImport(String(text || ''));
        if (!parsed.ok) {
          cookDraft.importMsg = parsed.error || 'Import failed';
          render();
          return;
        }
        if (parsed.type === 'foods') {
          persist(Become.importFoods(state, parsed.data.foods));
          cookDraft.importMsg = `Imported ${parsed.data.foods.length} food(s) into library.`;
          cookDraft.importText = '';
          render();
          return;
        }
        if (parsed.type === 'cookedRecipe') {
          const d = parsed.data;
          cookDraft.ingredients = d.ingredients.map((row, i) => ({
            id: `ing-${Date.now()}-${i}`,
            ...row,
          }));
          cookDraft.emptyDishG =
            d.emptyDishG == null || d.emptyDishG === '' ? '' : String(d.emptyDishG);
          cookDraft.cookedTotalG =
            d.cookedTotalG == null || d.cookedTotalG === ''
              ? ''
              : String(d.cookedTotalG);
          cookDraft.servingG =
            d.servingG == null || d.servingG === '' ? '200' : String(d.servingG);
          cookDraft.saveName = d.name || '';
          cookDraft.importMsg = 'Recipe loaded — check weights and save when ready.';
          cookDraft.importText = '';
          render();
        }
      });
    }

    const mealsImport = root.querySelector('#meals-import');
    if (mealsImport) {
      mealsImport.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = new FormData(mealsImport).get('json');
        mealsImportText = text;
        const parsed = Become.parseBecomeImport(String(text || ''));
        if (!parsed.ok) {
          mealsImportMsg = parsed.error || 'Import failed';
          render();
          return;
        }
        if (parsed.type === 'foods') {
          persist(Become.importFoods(state, parsed.data.foods));
          mealsImportMsg = `Imported ${parsed.data.foods.length} food(s).`;
          mealsImportText = '';
          render();
          return;
        }
        if (parsed.type === 'cookedRecipe') {
          const d = parsed.data;
          cookDraft.ingredients = d.ingredients.map((row, i) => ({
            id: `ing-${Date.now()}-${i}`,
            ...row,
          }));
          cookDraft.emptyDishG =
            d.emptyDishG == null || d.emptyDishG === '' ? '' : String(d.emptyDishG);
          cookDraft.cookedTotalG =
            d.cookedTotalG == null || d.cookedTotalG === ''
              ? ''
              : String(d.cookedTotalG);
          cookDraft.servingG =
            d.servingG == null || d.servingG === '' ? '200' : String(d.servingG);
          cookDraft.saveName = d.name || '';
          cookDraft.importMsg = 'Recipe loaded from Meals import.';
          mealsImportMsg = 'Opened in Cooked tool.';
          mealsImportText = '';
          setTool('cook');
          return;
        }
        mealsImportMsg = 'Use type foods or cookedRecipe.';
        render();
      });
    }

    async function copyText(text, okMsg) {
      try {
        await navigator.clipboard.writeText(text);
        if (activeTool === 'cook') {
          cookDraft.importMsg = okMsg;
        } else {
          mealsImportMsg = okMsg;
        }
      } catch {
        if (activeTool === 'cook') cookDraft.importMsg = 'Could not copy — select text manually.';
        else mealsImportMsg = 'Could not copy — select text manually.';
      }
      render();
    }

    root.querySelectorAll('[data-act="copy-foods-prompt"]').forEach((btn) => {
      btn.addEventListener('click', () =>
        copyText(Become.FOODS_IMPORT_PROMPT, 'Foods prompt copied.')
      );
    });
    root.querySelectorAll('[data-act="copy-cooked-prompt"]').forEach((btn) => {
      btn.addEventListener('click', () =>
        copyText(Become.COOKED_IMPORT_PROMPT, 'Cooked recipe prompt copied.')
      );
    });

    const cookSave = root.querySelector('#cook-save');
    if (cookSave) {
      cookSave.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = new FormData(cookSave).get('name');
        cookDraft.saveName = name;
        if (cookEmpty) cookDraft.emptyDishG = cookEmpty.value;
        if (cookTotal) cookDraft.cookedTotalG = cookTotal.value;
        if (cookServing) cookDraft.servingG = cookServing.value;
        const result = Become.computeCookedMeal({
          ingredients: cookDraft.ingredients,
          emptyDishG: cookDraft.emptyDishG,
          cookedTotalG: cookDraft.cookedTotalG,
          servingG: cookDraft.servingG || 200,
        });
        if (!result.ok) return;
        persist(Become.saveCookedMealAsFood(state, { name, result }));
        cookDraft = {
          ingredients: [],
          emptyDishG: '',
          cookedTotalG: '',
          servingG: '200',
          saveName: '',
          importText: '',
          importMsg: '',
        };
        setTool('food');
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
        const items = (state.foodLogs[today] || []).map((entry) => ({
          foodId: entry.foodId,
          grams: entry.grams,
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
        const items = (state.foodLogs[today] || []).map((entry) => ({
          foodId: entry.foodId,
          grams: entry.grams,
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

    const startFastNow = root.querySelector('#start-fast-now');
    if (startFastNow) {
      startFastNow.addEventListener('submit', (e) => {
        e.preventDefault();
        const hours = Number(new FormData(startFastNow).get('hours'));
        persist(Become.startFastNow(state, { hours }));
        render();
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

    root.querySelectorAll('[data-rm-fast]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persist(Become.removeFast(state, btn.getAttribute('data-rm-fast')));
        render();
      });
    });

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
          settingsOpen = false;
          render();
        } catch (err) {
          alert(err.message || 'Import failed');
        }
      });
    }
  }

  render();
})();
