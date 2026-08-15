# Cooked meal yield + AI import — Design

**Date:** 2026-08-15  
**Status:** Approved for implementation

## Goal

Upgrade the Lifestyle **Cooked** calculator to a full recipe-yield summary (batch macros, per-gram density, serving preview), and add typed AI-friendly JSON import for `foods` and `cookedRecipe`.

## Units

Grams only.

## Calculation

- Net food (g) = cooked total − empty dish (tare)
- Batch totals = sum of ingredient Calories, Protein, Carbs, Fat
- Per gram = each batch total ÷ net food grams
- Serving = per-gram × serving size (g); default serving 200g, editable
- If an ingredient omits a macro, that nutrient still aggregates when any ingredient provides it; otherwise show “—”

## UI (Cooked tool)

1. Raw ingredients — library grams or manual (label + kcal + P/C/F)
2. Dish weights — empty + cooked total (g)
3. Recipe Yield Summary — tare, cooked total, net weight, batch macros, per-gram density, serving size + portion macros
4. Save cooked food → food library (uses net weight + batch macros via existing `addFood`)

## AI JSON import (v1)

Envelope:

```json
{
  "becomeImport": 1,
  "type": "foods" | "cookedRecipe",
  "...": "type-specific"
}
```

### type: `foods`

```json
{
  "becomeImport": 1,
  "type": "foods",
  "foods": [
    { "name": "Eggs", "grams": 100, "calories": 143, "protein": 13, "carbs": 1, "fat": 10 }
  ]
}
```

Merges each item via `addFood` into the library.

### type: `cookedRecipe`

```json
{
  "becomeImport": 1,
  "type": "cookedRecipe",
  "name": "Breakfast casserole",
  "emptyDishG": 850,
  "cookedTotalG": 2100,
  "servingG": 200,
  "ingredients": [
    { "label": "Eggs", "calories": 720, "protein": 60, "carbs": 4, "fat": 48 }
  ]
}
```

Fills the Cooked draft for review; user then saves. Does not auto-save to library.

### UX

- Copy prompt buttons (one per type) with instructions + empty JSON shape
- Paste JSON textarea + Import on Cooked tool and near Meals / settings backup
- Full-state export/import unchanged

## Out of scope (v1)

- oz units
- meal / mealTemplate import types
- Auto-save cookedRecipe without review
