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
   * Cooked-dish density: total raw calories stay constant; cooked net weight shrinks.
   * calPerG = totalRawCalories / (cookedTotalG - emptyDishG)
   */
  function computeCookedMeal({ ingredients, emptyDishG, cookedTotalG }) {
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
    const calPerG = ok ? totalCalories / netWeightG : null;
    const hasProtein = list.some((r) => r.protein != null && r.protein !== '');
    const hasCarbs = list.some((r) => r.carbs != null && r.carbs !== '');
    const hasFat = list.some((r) => r.fat != null && r.fat !== '');
    return {
      totalCalories: Math.round(totalCalories * 10) / 10,
      totalProtein: hasProtein ? Math.round(totalProtein * 10) / 10 : null,
      totalCarbs: hasCarbs ? Math.round(totalCarbs * 10) / 10 : null,
      totalFat: hasFat ? Math.round(totalFat * 10) / 10 : null,
      netWeightG: Number.isFinite(netWeightG) ? Math.round(netWeightG * 10) / 10 : null,
      calPerG: calPerG != null ? Math.round(calPerG * 1000) / 1000 : null,
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
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
