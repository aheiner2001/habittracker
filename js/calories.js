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

  Object.assign(Become, {
    addFood,
    logFood,
    removeFoodLog,
    dayNutrition,
    saveMeal,
    logMeal,
    saveMealTemplate,
    applyTemplate,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      addFood,
      logFood,
      removeFoodLog,
      dayNutrition,
      saveMeal,
      logMeal,
      saveMealTemplate,
      applyTemplate,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
