/**
 * Mindfulness, Weekly Deficit Smoothing & Fasting Support Engine
 */

export const MIN_CALORIE_SAFETY_FLOOR = 1200;

export function calculateWeeklyDeficit(
  dailyTarget = 1800,
  logs = {},
  maintenanceCal = 2300,
  weekDates = [],
  todayStr = ''
) {
  const weeklyGoal = 7 * (maintenanceCal - dailyTarget);
  let weeklyDeficitSoFar = 0;
  let loggedDaysCount = 0;

  for (const date of weekDates) {
    if (logs[date] && typeof logs[date].calories === 'number') {
      const intake = logs[date].calories;
      weeklyDeficitSoFar += (maintenanceCal - intake);
      loggedDaysCount++;
    }
  }

  const remainingDeficit = weeklyGoal - weeklyDeficitSoFar;
  const todayIdx = weekDates.indexOf(todayStr);
  const remainingDays = todayIdx >= 0 ? Math.max(1, weekDates.length - (todayIdx + 1)) : 1;

  // Gentle adjustment for remaining days
  const neededDailyDeficit = remainingDeficit / remainingDays;
  const rawTarget = Math.round(maintenanceCal - neededDailyDeficit);
  const adjustedDailyTarget = Math.max(MIN_CALORIE_SAFETY_FLOOR, rawTarget);

  return {
    weeklyGoal,
    weeklyDeficitSoFar,
    remainingDeficit,
    remainingDays,
    adjustedDailyTarget,
    isAtSafetyFloor: rawTarget < MIN_CALORIE_SAFETY_FLOOR
  };
}

export function createThoughtRecord(tempting = '', truth = '') {
  return {
    id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tempting: tempting.trim(),
    truth: truth.trim(),
    createdAt: new Date().toISOString(),
    timesRecalled: 0
  };
}

export function getRandomLovingTruth(records = []) {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * records.length);
  const picked = records[index];
  if (picked) {
    picked.timesRecalled = (picked.timesRecalled || 0) + 1;
  }
  return picked;
}

export function getEatingWindowCountdown(openTimeStr = '12:00', closeTimeStr = '18:00', now = new Date()) {
  const [openH, openM] = openTimeStr.split(':').map(Number);
  const [closeH, closeM] = closeTimeStr.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes < openMinutes) {
    const diff = openMinutes - currentMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      state: 'before',
      hoursRemaining: hours,
      minutesRemaining: mins,
      message: `Eating window opens in ${hours > 0 ? `${hours}h ` : ''}${mins}m`
    };
  } else if (currentMinutes <= closeMinutes) {
    const diff = closeMinutes - currentMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      state: 'open',
      hoursRemaining: hours,
      minutesRemaining: mins,
      message: `Eating window active — closes in ${hours > 0 ? `${hours}h ` : ''}${mins}m`
    };
  } else {
    // Past window
    const diffUntilNextOpen = (24 * 60 - currentMinutes) + openMinutes;
    const hours = Math.floor(diffUntilNextOpen / 60);
    const mins = diffUntilNextOpen % 60;
    return {
      state: 'closed',
      hoursRemaining: hours,
      minutesRemaining: mins,
      message: `Fast active: Water & electrolytes mode (Opens in ${hours}h ${mins}m)`
    };
  }
}

export function breakFastEarlyCompassion(elapsedHours = 0, targetHours = 48) {
  const rounded = Math.round(elapsedHours * 10) / 10;
  return `You completed ${rounded} hours of your fast! Every hour practiced builds resilience and metabolic flexibility. Here is what you learned from this session: no shame, pure progress.`;
}
