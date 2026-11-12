import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWeeklyDeficit,
  createThoughtRecord,
  getRandomLovingTruth,
  getEatingWindowCountdown,
  breakFastEarlyCompassion
} from '../js/mindfulness.js';

test('calculateWeeklyDeficit calculates weekly balance and gentle redistribution', () => {
  const dailyTarget = 1800;
  const maintenanceCal = 2300; // 500 deficit / day = 3500 weekly deficit goal
  const logs = {
    '2026-11-09': { calories: 1800 }, // deficit 500
    '2026-11-10': { calories: 2200 }, // deficit 100 (400 over target)
    '2026-11-11': { calories: 1700 }  // deficit 600
  };
  const weekDates = [
    '2026-11-09', '2026-11-10', '2026-11-11',
    '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'
  ];

  const result = calculateWeeklyDeficit(dailyTarget, logs, maintenanceCal, weekDates, '2026-11-11');
  assert.equal(result.weeklyGoal, 3500);
  assert.equal(result.weeklyDeficitSoFar, 1200); // 500 + 100 + 600
  assert.equal(result.remainingDeficit, 2300);
  // Remaining days: 4 days (12, 13, 14, 15)
  // Needed average daily deficit: 2300 / 4 = 575/day -> target = 2300 - 575 = 1725 kcal/day
  assert.equal(result.adjustedDailyTarget, 1725);
  assert.ok(result.adjustedDailyTarget >= 1200); // respects safety floor
});

test('createThoughtRecord and getRandomLovingTruth manage cognitive reframes', () => {
  const record = createThoughtRecord(
    'I already ruined today, might as well keep eating.',
    'One meal does not define my week. I feel calm and can start fresh right now.'
  );

  assert.ok(record.id);
  assert.ok(record.tempting.includes('already ruined'));
  assert.ok(record.truth.includes('One meal does not define'));
  assert.equal(record.timesRecalled, 0);

  const picked = getRandomLovingTruth([record]);
  assert.equal(picked.id, record.id);
  assert.equal(getRandomLovingTruth([]), null);
});

test('getEatingWindowCountdown returns correct status and remaining time', () => {
  // Scenario 1: Inside window (e.g. 14:00 with window 12:00-18:00)
  const nowInside = new Date(2026, 10, 12, 14, 15, 0);
  const statusInside = getEatingWindowCountdown('12:00', '18:00', nowInside);
  assert.equal(statusInside.state, 'open');
  assert.equal(statusInside.hoursRemaining, 3);
  assert.equal(statusInside.minutesRemaining, 45);
  assert.ok(statusInside.message.includes('closes in 3h 45m'));

  // Scenario 2: Before window (e.g. 10:00 with window 12:00-18:00)
  const nowBefore = new Date(2026, 10, 12, 10, 0, 0);
  const statusBefore = getEatingWindowCountdown('12:00', '18:00', nowBefore);
  assert.equal(statusBefore.state, 'before');
  assert.equal(statusBefore.hoursRemaining, 2);
  assert.equal(statusBefore.minutesRemaining, 0);
  assert.ok(statusBefore.message.includes('opens in 2h'));

  // Scenario 3: After window (e.g. 20:00 with window 12:00-18:00)
  const nowAfter = new Date(2026, 10, 12, 20, 30, 0);
  const statusAfter = getEatingWindowCountdown('12:00', '18:00', nowAfter);
  assert.equal(statusAfter.state, 'closed');
  assert.ok(statusAfter.message.includes('Water & electrolytes mode'));
});

test('breakFastEarlyCompassion generates shame-free reflection', () => {
  const message = breakFastEarlyCompassion(31.5, 48);
  assert.ok(message.includes('31.5 hours'));
  assert.ok(message.includes('Every hour practiced builds resilience'));
  assert.ok(!message.toLowerCase().includes('fail'));
});
