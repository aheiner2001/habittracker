# Cooked Meal Yield + AI Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full cooked-recipe yield (macros + serving) and typed JSON import for `foods` / `cookedRecipe`.

**Architecture:** Extend `computeCookedMeal` for per-gram macros + serving; add `parseBecomeImport` / `applyFoodsImport` in calories (or small import module); upgrade Cooked UI + copy/paste import controls; bump SW cache.

**Tech Stack:** Vanilla JS, existing `Become` modules, `node --test`.

## Global Constraints

- Grams only
- `becomeImport: 1` envelope
- Types: `foods`, `cookedRecipe` only
- cookedRecipe fills draft; foods merge via `addFood`
- Match existing Become UI patterns (panels, form-grid)

---

### Task 1: Extend computeCookedMeal + serving

**Files:** `js/calories.js`, `tests/core.test.js`

- [ ] Write failing tests for protein/carbs/fat per gram and serving macros
- [ ] Implement `proteinPerG`, `carbsPerG`, `fatPerG`, and `servingMacros(servingG)` fields (or compute in return)
- [ ] Run tests — pass

### Task 2: Typed import parser

**Files:** `js/calories.js` (or `js/import.js`), `tests/core.test.js`

- [ ] Failing tests: parse foods, parse cookedRecipe, reject bad JSON / wrong type
- [ ] Implement `parseBecomeImport(text)` → `{ ok, type, data, error }`
- [ ] Implement `importFoods(state, foods)` applying `addFood` for each
- [ ] Run tests — pass

### Task 3: Cooked UI yield summary + macros on manual add

**Files:** `js/lifestyle-page.js`

- [ ] Manual form: carbs + fat fields
- [ ] Serving grams in cookDraft; bind change
- [ ] Render Recipe Yield Summary sections
- [ ] Wire import paste on Cooked tool

### Task 4: Copy prompts + Meals import entry

**Files:** `js/lifestyle-page.js` (and maybe settings)

- [ ] Copy prompt for foods + cookedRecipe
- [ ] Paste/import on Meals tool for foods type
- [ ] cookedRecipe import switches to Cooked tool with draft filled

### Task 5: Cache bump + verify

- [ ] Bump `sw.js` + CSS `?v=`
- [ ] `node --test tests/*.test.js`
- [ ] Commit + push
