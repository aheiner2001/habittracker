import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevel,
  awardActionXP,
  generateBounceBackQuest,
  calculateForgivingStreak,
  ACTION_XP_MAP,
  INITIAL_RPG_STATE
} from '../js/rpg.js';

test('calculateLevel computes levels and XP progress accurately', () => {
  // 0 XP -> Level 1 (0/100)
  const lvl0 = calculateLevel(0);
  assert.equal(lvl0.level, 1);
  assert.equal(lvl0.currentLevelXP, 0);
  assert.equal(lvl0.nextLevelXP, 100);
  assert.equal(lvl0.progressPct, 0);

  // 99 XP -> Level 1 (99/100)
  const lvl99 = calculateLevel(99);
  assert.equal(lvl99.level, 1);
  assert.equal(lvl99.currentLevelXP, 99);
  assert.equal(lvl99.progressPct, 99);

  // 100 XP -> Level 2 (0/100)
  const lvl100 = calculateLevel(100);
  assert.equal(lvl100.level, 2);
  assert.equal(lvl100.currentLevelXP, 0);
  assert.equal(lvl100.progressPct, 0);

  // 350 XP -> Level 4 (50/100)
  const lvl350 = calculateLevel(350);
  assert.equal(lvl350.level, 4);
  assert.equal(lvl350.currentLevelXP, 50);
  assert.equal(lvl350.progressPct, 50);
});

test('awardActionXP increases XP, levels up, and grants stat points without penalty', () => {
  const state = { ...INITIAL_RPG_STATE };
  assert.equal(state.totalXP, 0);
  assert.equal(state.stats.health, 10);

  const res1 = awardActionXP(state, 'LOG_MEAL');
  assert.equal(res1.xpGained, 15);
  assert.equal(res1.totalXP, 15);
  assert.equal(res1.stats.health, 11);
  assert.equal(res1.levelUp, false);

  // Award enough to level up
  awardActionXP(state, 'WORKOUT'); // +25 -> 40
  awardActionXP(state, 'WORKOUT'); // +25 -> 65
  awardActionXP(state, 'WORKOUT'); // +25 -> 90
  const resLevelUp = awardActionXP(state, 'MEDITATION'); // +20 -> 110, level 2!
  assert.equal(resLevelUp.totalXP, 110);
  assert.equal(resLevelUp.level, 2);
  assert.equal(resLevelUp.levelUp, true);
  assert.equal(resLevelUp.stats.focus, 11);
});

test('generateBounceBackQuest returns compassionate 3-step reset without penalty', () => {
  const quest = generateBounceBackQuest();
  assert.equal(quest.length, 3);
  assert.ok(quest.some(q => q.category === 'nourish'));
  assert.ok(quest.some(q => q.category === 'move'));
  assert.ok(quest.some(q => q.category === 'reflect'));
  assert.ok(quest.every(q => q.done === false));
});

test('calculateForgivingStreak tracks days showing up and return rate', () => {
  // Scenario: User logged on days 1, 2, skipped day 3, returned day 4, skipped 5, 6, returned 7
  const dates = ['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-07'];
  const metrics = calculateForgivingStreak(dates, '2026-11-07');

  assert.equal(metrics.daysShowingUp, 4);
  // Return rate: count of times user returned after a gap (Nov 2->Nov 4 gap of 2 days, Nov 4->Nov 7 gap of 3 days)
  assert.equal(metrics.returnRateCount, 2);
  assert.ok(metrics.showingUpRateText.includes('4 days'));
});
