const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultState, importState } = require('../js/storage.js');

test('defaultState has version 1 and empty collections', () => {
  const s = defaultState();
  assert.equal(s.version, 1);
  assert.equal(s.onboardingComplete, false);
  assert.deepEqual(s.habits, []);
  assert.deepEqual(s.foods, []);
  assert.equal(s.settings.weightAvgWindow, 7);
});

test('importState rejects invalid JSON', () => {
  assert.throws(() => importState('{'), /Invalid JSON/);
});

test('importState rejects wrong version shape', () => {
  assert.throws(() => importState(JSON.stringify({ version: 99 })), /Unsupported/);
});
