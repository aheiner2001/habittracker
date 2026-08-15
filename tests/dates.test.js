const test = require('node:test');
const assert = require('node:assert/strict');
const { todayKey, addDays, dayOfYear } = require('../js/dates.js');

test('todayKey formats local YYYY-MM-DD', () => {
  assert.equal(todayKey(new Date(2026, 7, 14)), '2026-08-14');
});

test('addDays crosses months', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
});

test('dayOfYear is stable for a fixed date', () => {
  const n = dayOfYear(new Date(2026, 0, 1));
  assert.equal(n, 1);
});
