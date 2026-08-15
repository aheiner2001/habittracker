const test = require('node:test');
const assert = require('node:assert/strict');
const { seedMilestones, checkMilestones } = require('../js/milestones.js');
const { streakFor } = require('../js/habits.js');
const { addDays } = require('../js/dates.js');
const { rollingAverage } = require('../js/weight.js');
require('../js/dates.js'); // ensure Become.addDays for weight if needed
const { defaultState } = require('../js/storage.js');
const { addFood, logFood, dayNutrition, updateFoodLog } = require('../js/calories.js');
const { applyRedistribution, addHighCalorieEvent } = require('../js/events.js');
const BecomeDates = require('../js/dates.js');

// Wire Become helpers for modules that expect global Become
global.Become = Object.assign(global.Become || {}, BecomeDates, require('../js/weight.js'));

test('seedMilestones includes 1lb then steps toward goal', () => {
  const ms = seedMilestones(225, 175);
  assert.equal(ms[0].lbsFromStart, 1);
  const last = ms[ms.length - 1];
  assert.equal(last.lbsFromStart, 50);
  assert.ok(ms.some((m) => m.lbsFromStart === 5));
});

test('checkMilestones marks reached when avg shows loss', () => {
  let state = defaultState();
  state.goal.startWeight = 225;
  state.goal.milestones = seedMilestones(225, 175);
  const { newlyReached, state: next } = checkMilestones(state, 220, '2026-08-14');
  assert.ok(newlyReached.some((m) => m.lbsFromStart === 5));
  assert.ok(next.goal.milestones.find((m) => m.lbsFromStart === 5).reachedAt);
});

test('streak counts consecutive days', () => {
  global.Become = Object.assign(global.Become || {}, BecomeDates, require('../js/habits.js'));
  const today = '2026-08-14';
  const state = {
    habits: [{ id: 'h1', name: 'Workout', active: true }],
    habitCompletions: {
      [addDays(today, -2)]: { h1: true },
      [addDays(today, -1)]: { h1: true },
      [today]: { h1: true },
    },
  };
  assert.equal(streakFor(state, 'h1', today), 3);
});

test('rollingAverage averages available days in window', () => {
  const weights = [
    { date: '2026-08-10', lbs: 220 },
    { date: '2026-08-11', lbs: 218 },
    { date: '2026-08-12', lbs: 219 },
  ];
  assert.equal(rollingAverage(weights, '2026-08-12', 7), 219);
});

test('logging scales calories from calPerG', () => {
  let state = defaultState();
  state = addFood(state, { name: 'Oats', grams: 100, calories: 380, protein: 13 });
  const id = state.foods[0].id;
  state = logFood(state, '2026-08-14', { foodId: id, grams: 50 });
  const day = dayNutrition(state, '2026-08-14');
  assert.equal(day.calories, 190);
  assert.equal(day.protein, 6.5);
});

test('updateFoodLog changes grams and lastGrams', () => {
  let state = defaultState();
  state = addFood(state, { name: 'Oats', grams: 100, calories: 380, protein: 13 });
  const foodId = state.foods[0].id;
  state = logFood(state, '2026-08-14', { foodId, grams: 50 });
  const entryId = state.foodLogs['2026-08-14'][0].id;
  state = updateFoodLog(state, '2026-08-14', entryId, {
    foodId,
    grams: 100,
    note: 'oops',
  });
  assert.equal(state.foodLogs['2026-08-14'][0].grams, 100);
  assert.equal(state.foodLogs['2026-08-14'][0].note, 'oops');
  assert.equal(state.foods[0].lastGrams, 100);
  assert.equal(dayNutrition(state, '2026-08-14').calories, 380);
});

test('computeCookedMeal uses net cooked weight for cal per gram', () => {
  const { computeCookedMeal } = require('../js/calories.js');
  const result = computeCookedMeal({
    ingredients: [
      { label: 'A', calories: 6000, protein: 400, carbs: 100, fat: 200 },
      { label: 'B', calories: 4000, protein: 100, carbs: 50, fat: 50 },
    ],
    emptyDishG: 500,
    cookedTotalG: 1500,
    servingG: 200,
  });
  assert.equal(result.totalCalories, 10000);
  assert.equal(result.totalProtein, 500);
  assert.equal(result.totalCarbs, 150);
  assert.equal(result.totalFat, 250);
  assert.equal(result.netWeightG, 1000);
  assert.equal(result.calPerG, 10);
  assert.equal(result.proteinPerG, 0.5);
  assert.equal(result.carbsPerG, 0.15);
  assert.equal(result.fatPerG, 0.25);
  assert.equal(result.servingG, 200);
  assert.equal(result.servingCalories, 2000);
  assert.equal(result.servingProtein, 100);
  assert.equal(result.servingCarbs, 30);
  assert.equal(result.servingFat, 50);
  assert.equal(result.ok, true);
});

test('parseBecomeImport accepts foods and cookedRecipe', () => {
  const { parseBecomeImport, importFoods } = require('../js/calories.js');
  const { defaultState } = require('../js/storage.js');
  const foodsPayload = parseBecomeImport(
    JSON.stringify({
      becomeImport: 1,
      type: 'foods',
      foods: [{ name: 'Eggs', grams: 100, calories: 143, protein: 13, carbs: 1, fat: 10 }],
    })
  );
  assert.equal(foodsPayload.ok, true);
  assert.equal(foodsPayload.type, 'foods');
  assert.equal(foodsPayload.data.foods.length, 1);
  let state = importFoods(defaultState(), foodsPayload.data.foods);
  assert.equal(state.foods.length, 1);
  assert.equal(state.foods[0].name, 'Eggs');

  const cooked = parseBecomeImport(
    JSON.stringify({
      becomeImport: 1,
      type: 'cookedRecipe',
      name: 'Casserole',
      emptyDishG: 500,
      cookedTotalG: 1500,
      servingG: 200,
      ingredients: [{ label: 'Eggs', calories: 720, protein: 60, carbs: 4, fat: 48 }],
    })
  );
  assert.equal(cooked.ok, true);
  assert.equal(cooked.type, 'cookedRecipe');
  assert.equal(cooked.data.ingredients.length, 1);
  assert.equal(cooked.data.emptyDishG, 500);

  const bad = parseBecomeImport('{"type":"foods"}');
  assert.equal(bad.ok, false);
});

test('habit timer completes and marks done', () => {
  global.Become = Object.assign(global.Become || {}, BecomeDates, require('../js/habits.js'));
  const {
    addHabit,
    startHabitTimer,
    tickHabitTimers,
    isHabitDone,
  } = require('../js/habits.js');
  let state = defaultState();
  state = addHabit(state, { name: 'Workout', timed: true, defaultMinutes: 20 });
  const id = state.habits[0].id;
  const now = Date.now();
  state = startHabitTimer(state, id, '2026-08-14', 1, now);
  state.habitTimers[id].remainingMs = 500;
  state.habitTimers[id].updatedAt = now;
  const { state: next, completed } = tickHabitTimers(state, now + 1000);
  assert.equal(completed.length, 1);
  assert.equal(isHabitDone(next, '2026-08-14', id), true);
  assert.equal(next.habitTimers[id], undefined);
});

test('redistribution spreads surplus across preDays', () => {
  global.Become = Object.assign(global.Become || {}, BecomeDates);
  let state = defaultState();
  state.settings.calorieTarget = 1800;
  state = addHighCalorieEvent(state, {
    startDate: '2026-08-20',
    endDate: '2026-08-20',
    eventTargetCalories: 2800,
    preDays: 5,
  });
  const id = state.highCalorieEvents[0].id;
  state = applyRedistribution(state, id);
  assert.equal(state.targetOverrides['2026-08-20'], 2800);
  assert.equal(state.targetOverrides['2026-08-19'], 1600);
  assert.equal(state.targetOverrides['2026-08-15'], 1600);
});
