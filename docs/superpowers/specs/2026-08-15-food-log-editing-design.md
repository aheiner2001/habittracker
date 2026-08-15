# Food Log Editing — Design

**Date:** 2026-08-15  
**Product:** Become  
**Parent:** `docs/superpowers/specs/2026-08-14-become-lifestyle-tracker-design.md`

## Intent

Let the user fix mistakes in logged foods without deleting and re-adding. Full edit of food, grams, and optional note, plus delete — on phone, with low friction.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Edit fields | Food (library), grams, optional note |
| Interaction | Bottom sheet (same pattern as Lifestyle settings) |
| Entry point | Lifestyle day log (expanded list): tap row opens sheet |
| Scope of dates | Today’s Lifestyle day-log only (historical day editing deferred) |
| Home | No editor in this pass |
| Delete | In the edit sheet, with one confirm |
| Live preview | Calories (and protein when available) from food ratios |

## Behavior

1. User expands “logged items” on Lifestyle day dashboard (or is already expanded).
2. Tap a log row → open edit sheet prefilled with that entry’s `foodId`, `grams`, `note`.
3. Changing food resets grams to that food’s `lastGrams` or `defaultGrams` (user can then adjust).
4. Changing grams updates live kcal/protein preview.
5. **Save** → `updateFoodLog`; sheet closes; dashboard/log refresh; food’s `lastGrams` updated.
6. **Delete** → confirm → `removeFoodLog`; sheet closes; refresh.
7. **Cancel** / backdrop tap → discard edits; no write.

Standalone **Remove** on the row may remain as a shortcut, or be removed in favor of sheet Delete only — **recommendation: keep a compact Remove on the row for one-tap delete, and also offer Delete in the sheet.**

## Data & API

Existing log entry shape:

```json
{ "id": "...", "foodId": "...", "grams": 120, "mealId": null, "note": null }
```

New pure helper in `js/calories.js`:

```js
Become.updateFoodLog(state, dateKey, entryId, { foodId, grams, note })
```

- No-op / return state unchanged if entry or food missing.
- `grams` must be a positive number; otherwise leave state unchanged (UI blocks Save).
- Does not change `mealId` (meal-expanded lines stay individual entries).
- Updates matching food’s `lastGrams` to the saved grams.

Reuse: `removeFoodLog`, `dayNutrition`, `effectiveTarget`.

## UI

- Sheet classes: reuse `.settings-sheet` / `.settings-sheet-inner` (or shared `.sheet` alias) for consistency.
- Fields: food `<select>`, grams `<input type="number">`, note `<input>` or short textarea.
- Preview line: `~X kcal` (+ protein if `proteinPerG` set).
- Actions row: Save (primary), Delete (danger text/outline), Cancel.

## Errors

- Empty food library / missing `foodId`: Save disabled.
- Invalid grams (empty, ≤0, non-numeric): Save disabled + short hint.
- Storage write failure: existing storage banner; keep sheet open with in-memory attempt failed message via `saveState` result.

## Testing

- Unit: `updateFoodLog` changes grams/food/note; updates `lastGrams`; ignores unknown `entryId`.
- Manual (phone): log food → expand list → edit grams → save → totals update; switch food → preview updates; delete with confirm; cancel leaves data unchanged; edit a past day’s entry via calendar day context if log is shown for selected day — **v1 editor is tied to today’s Lifestyle dashboard log only** unless calendar day detail later gains a log list. (Lifestyle Food tool logs to today; day dashboard is today.)

Clarification for implementers: **edit applies to today’s log on the Lifestyle dashboard.** Editing historical days is out of scope unless the day dashboard is later bound to `selectedDateKey`; do not invent a past-day log UI in this task.

## Out of scope

- Editing from Home
- Bulk edit / undo stack
- Changing meal template definitions via log edit
- Creating a new food from inside the edit sheet

## Files likely touched

- `js/calories.js` — `updateFoodLog`
- `js/lifestyle-page.js` — sheet UI + bind
- `styles.css` — sheet field polish / danger button if needed
- `tests/core.test.js` or `tests/calories.test.js` — unit coverage
