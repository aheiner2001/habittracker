(function (root) {
  const Become = (root.Become = root.Become || {});

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function addFood(state, { name, grams, calories, protein, carbs, fat }) {
    const g = Number(grams) || 1;
    const food = {
      id: newId('food'),
      name: String(name).trim(),
      calPerG: Number(calories) / g,
      proteinPerG: protein == null || protein === '' ? null : Number(protein) / g,
      carbsPerG: carbs == null || carbs === '' ? null : Number(carbs) / g,
      fatPerG: fat == null || fat === '' ? null : Number(fat) / g,
      defaultGrams: g,
      lastGrams: g,
    };
    return { ...state, foods: [...state.foods, food] };
  }

  function logFood(state, dateKey, { foodId, grams, mealId, note }) {
    const food = state.foods.find((f) => f.id === foodId);
    if (!food) return state;
    const g = Number(grams);
    const foods = state.foods.map((f) =>
      f.id === foodId ? { ...f, lastGrams: g } : f
    );
    const entry = {
      id: newId('log'),
      foodId,
      grams: g,
      mealId: mealId || null,
      note: note || null,
    };
    const day = [...(state.foodLogs[dateKey] || []), entry];
    return {
      ...state,
      foods,
      foodLogs: { ...state.foodLogs, [dateKey]: day },
    };
  }

  function removeFoodLog(state, dateKey, entryId) {
    const day = (state.foodLogs[dateKey] || []).filter((e) => e.id !== entryId);
    const foodLogs = { ...state.foodLogs };
    if (day.length) foodLogs[dateKey] = day;
    else delete foodLogs[dateKey];
    return { ...state, foodLogs };
  }

  function updateFoodLog(state, dateKey, entryId, { foodId, grams, note }) {
    const day = state.foodLogs[dateKey] || [];
    const idx = day.findIndex((e) => e.id === entryId);
    if (idx < 0) return state;
    const g = Number(grams);
    if (!(g > 0)) return state;
    const food = state.foods.find((f) => f.id === foodId);
    if (!food) return state;
    const prev = day[idx];
    const nextEntry = {
      ...prev,
      foodId,
      grams: g,
      note: note == null || note === '' ? null : String(note),
    };
    const nextDay = day.slice();
    nextDay[idx] = nextEntry;
    const foods = state.foods.map((f) =>
      f.id === foodId ? { ...f, lastGrams: g } : f
    );
    return {
      ...state,
      foods,
      foodLogs: { ...state.foodLogs, [dateKey]: nextDay },
    };
  }

  function dayNutrition(state, dateKey) {
    const day = state.foodLogs[dateKey] || [];
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const entry of day) {
      const food = state.foods.find((f) => f.id === entry.foodId);
      if (!food) continue;
      calories += food.calPerG * entry.grams;
      if (food.proteinPerG != null) protein += food.proteinPerG * entry.grams;
      if (food.carbsPerG != null) carbs += food.carbsPerG * entry.grams;
      if (food.fatPerG != null) fat += food.fatPerG * entry.grams;
    }
    return {
      calories: Math.round(calories * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }

  function saveMeal(state, { name, items }) {
    return {
      ...state,
      meals: [
        ...state.meals,
        { id: newId('meal'), name: String(name).trim(), items: items || [] },
      ],
    };
  }

  function logMeal(state, dateKey, mealId) {
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal) return state;
    let next = state;
    for (const item of meal.items) {
      next = logFood(next, dateKey, {
        foodId: item.foodId,
        grams: item.grams,
        mealId,
      });
    }
    return next;
  }

  function saveMealTemplate(state, { name, items }) {
    return {
      ...state,
      mealTemplates: [
        ...state.mealTemplates,
        { id: newId('tmpl'), name: String(name).trim(), items: items || [] },
      ],
    };
  }

  function applyTemplate(state, dateKey, templateId) {
    const tmpl = state.mealTemplates.find((t) => t.id === templateId);
    if (!tmpl) return state;
    let next = state;
    for (const item of tmpl.items) {
      next = logFood(next, dateKey, {
        foodId: item.foodId,
        grams: item.grams,
      });
    }
    return next;
  }

  function frequentFoods(state, limit = 8) {
    const counts = {};
    Object.values(state.foodLogs || {}).forEach((day) => {
      (day || []).forEach((entry) => {
        if (!entry.foodId) return;
        counts[entry.foodId] = (counts[entry.foodId] || 0) + 1;
      });
    });
    const ranked = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => state.foods.find((f) => f.id === id))
      .filter(Boolean);

    if (ranked.length >= limit) return ranked.slice(0, limit);

    const seen = new Set(ranked.map((f) => f.id));
    const rest = state.foods.filter((f) => !seen.has(f.id));
    return [...ranked, ...rest].slice(0, limit);
  }

  /**
   * Cooked-dish density: total raw macros stay constant; cooked net weight shrinks.
   * perGram = totalMacro / (cookedTotalG - emptyDishG)
   */
  function computeCookedMeal({ ingredients, emptyDishG, cookedTotalG, servingG }) {
    const list = ingredients || [];
    const totalCalories = list.reduce((sum, row) => sum + (Number(row.calories) || 0), 0);
    const totalProtein = list.reduce((sum, row) => {
      if (row.protein == null || row.protein === '') return sum;
      return sum + Number(row.protein);
    }, 0);
    const totalCarbs = list.reduce((sum, row) => {
      if (row.carbs == null || row.carbs === '') return sum;
      return sum + Number(row.carbs);
    }, 0);
    const totalFat = list.reduce((sum, row) => {
      if (row.fat == null || row.fat === '') return sum;
      return sum + Number(row.fat);
    }, 0);
    const empty = Number(emptyDishG);
    const cooked = Number(cookedTotalG);
    const netWeightG = cooked - empty;
    const ok =
      list.length > 0 &&
      totalCalories > 0 &&
      Number.isFinite(empty) &&
      Number.isFinite(cooked) &&
      netWeightG > 0;
    const round3 = (n) => Math.round(n * 1000) / 1000;
    const round1 = (n) => Math.round(n * 10) / 10;
    const calPerG = ok ? totalCalories / netWeightG : null;
    const hasProtein = list.some((r) => r.protein != null && r.protein !== '');
    const hasCarbs = list.some((r) => r.carbs != null && r.carbs !== '');
    const hasFat = list.some((r) => r.fat != null && r.fat !== '');
    const proteinPerG = ok && hasProtein ? totalProtein / netWeightG : null;
    const carbsPerG = ok && hasCarbs ? totalCarbs / netWeightG : null;
    const fatPerG = ok && hasFat ? totalFat / netWeightG : null;
    const serve = Number(servingG);
    const servingOk = ok && Number.isFinite(serve) && serve > 0;
    return {
      totalCalories: round1(totalCalories),
      totalProtein: hasProtein ? round1(totalProtein) : null,
      totalCarbs: hasCarbs ? round1(totalCarbs) : null,
      totalFat: hasFat ? round1(totalFat) : null,
      netWeightG: Number.isFinite(netWeightG) ? round1(netWeightG) : null,
      calPerG: calPerG != null ? round3(calPerG) : null,
      proteinPerG: proteinPerG != null ? round3(proteinPerG) : null,
      carbsPerG: carbsPerG != null ? round3(carbsPerG) : null,
      fatPerG: fatPerG != null ? round3(fatPerG) : null,
      servingG: servingOk ? serve : null,
      servingCalories: servingOk ? round1(calPerG * serve) : null,
      servingProtein:
        servingOk && proteinPerG != null ? round1(proteinPerG * serve) : null,
      servingCarbs: servingOk && carbsPerG != null ? round1(carbsPerG * serve) : null,
      servingFat: servingOk && fatPerG != null ? round1(fatPerG * serve) : null,
      ok,
    };
  }

  function saveCookedMealAsFood(state, { name, result }) {
    if (!result || !result.ok || !(result.calPerG > 0)) return state;
    const net = result.netWeightG;
    return addFood(state, {
      name,
      grams: net,
      calories: result.totalCalories,
      protein: result.totalProtein,
      carbs: result.totalCarbs,
      fat: result.totalFat,
    });
  }

  function parseBecomeImport(jsonString) {
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch {
      return { ok: false, error: 'Invalid JSON' };
    }
    if (!data || data.becomeImport !== 1) {
      return { ok: false, error: 'Missing becomeImport: 1' };
    }
    if (data.type === 'foods') {
      const foods = Array.isArray(data.foods) ? data.foods : null;
      if (!foods || !foods.length) {
        return { ok: false, error: 'foods array required' };
      }
      for (const f of foods) {
        if (!f || !String(f.name || '').trim()) {
          return { ok: false, error: 'Each food needs a name' };
        }
        if (!(Number(f.grams) > 0) || !(Number(f.calories) >= 0)) {
          return { ok: false, error: 'Each food needs grams and calories' };
        }
      }
      return { ok: true, type: 'foods', data: { foods } };
    }
    if (data.type === 'cookedRecipe') {
      const ingredients = Array.isArray(data.ingredients) ? data.ingredients : null;
      if (!ingredients || !ingredients.length) {
        return { ok: false, error: 'ingredients array required' };
      }
      for (const row of ingredients) {
        if (!row || !(Number(row.calories) > 0)) {
          return { ok: false, error: 'Each ingredient needs calories' };
        }
      }
      return {
        ok: true,
        type: 'cookedRecipe',
        data: {
          name: data.name ? String(data.name).trim() : '',
          emptyDishG: data.emptyDishG,
          cookedTotalG: data.cookedTotalG,
          servingG: data.servingG,
          ingredients: ingredients.map((row) => ({
            label: String(row.label || 'Ingredient').trim(),
            calories: Number(row.calories),
            protein:
              row.protein == null || row.protein === '' ? null : Number(row.protein),
            carbs: row.carbs == null || row.carbs === '' ? null : Number(row.carbs),
            fat: row.fat == null || row.fat === '' ? null : Number(row.fat),
          })),
        },
      };
    }
    return { ok: false, error: 'Unknown type (use foods or cookedRecipe)' };
  }

  function importFoods(state, foods) {
    let next = state;
    for (const f of foods || []) {
      next = addFood(next, {
        name: f.name,
        grams: f.grams,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      });
    }
    return next;
  }

  const FOODS_IMPORT_PROMPT = `You are helping me import foods into Become (a fitness tracker).
Return ONLY valid JSON (no markdown) matching this exact shape:
{
  "becomeImport": 1,
  "type": "foods",
  "foods": [
    { "name": "Food name", "grams": 100, "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }
  ]
}
Rules: grams are the reference amount for the macros. Use grams only. Omit protein/carbs/fat if unknown (or set null). I may paste a recipe photo or list several foods — include all of them in the foods array.`;

  const COOKED_IMPORT_PROMPT = `You are helping me import a cooked recipe into Become (a fitness tracker).
Return ONLY valid JSON (no markdown) matching this exact shape:
{
  "becomeImport": 1,
  "type": "cookedRecipe",
  "name": "Recipe name",
  "emptyDishG": 0,
  "cookedTotalG": 0,
  "servingG": 200,
  "ingredients": [
    { "label": "Ingredient", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }
  ]
}
Rules: emptyDishG is tare (empty container). cookedTotalG is container + cooked food. Ingredient macros are TOTALS for the amount used in the whole recipe (not per 100g). Use grams only. If tare/cooked weights are unknown, use 0 and I will fill them in. I may paste a recipe photo or describe ingredients — estimate macros from labels when needed.`;

  Object.assign(Become, {
    addFood,
    logFood,
    removeFoodLog,
    updateFoodLog,
    dayNutrition,
    saveMeal,
    logMeal,
    saveMealTemplate,
    applyTemplate,
    frequentFoods,
    computeCookedMeal,
    saveCookedMealAsFood,
    parseBecomeImport,
    importFoods,
    FOODS_IMPORT_PROMPT,
    COOKED_IMPORT_PROMPT,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      addFood,
      logFood,
      removeFoodLog,
      updateFoodLog,
      dayNutrition,
      saveMeal,
      logMeal,
      saveMealTemplate,
      applyTemplate,
      frequentFoods,
      computeCookedMeal,
      saveCookedMealAsFood,
      parseBecomeImport,
      importFoods,
      FOODS_IMPORT_PROMPT,
      COOKED_IMPORT_PROMPT,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
