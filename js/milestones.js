(function (root) {
  const Become = (root.Become = root.Become || {});

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function seedMilestones(startWeight, goalWeight) {
    const totalLoss = Math.round((startWeight - goalWeight) * 10) / 10;
    if (!(totalLoss > 0)) return [];
    const steps = [];
    if (totalLoss >= 1) steps.push(1);
    for (let n = 5; n < totalLoss; n += 5) {
      if (!steps.includes(n)) steps.push(n);
    }
    if (!steps.includes(totalLoss)) steps.push(totalLoss);
    return steps.map((lbsFromStart) => ({
      id: newId(`m-${lbsFromStart}`),
      lbsFromStart,
      label:
        lbsFromStart === 1
          ? 'Lose your first pound'
          : lbsFromStart === totalLoss
            ? 'Reach goal weight'
            : `Lose ${lbsFromStart} lb`,
      reachedAt: null,
    }));
  }

  function lbsLostFromStart(state, avgLbs) {
    if (avgLbs == null || state.goal.startWeight == null) return null;
    return Math.round((state.goal.startWeight - avgLbs) * 10) / 10;
  }

  function checkMilestones(state, avgLbs, todayKey) {
    const lost = lbsLostFromStart(state, avgLbs);
    if (lost == null) return { state, newlyReached: [] };
    const newlyReached = [];
    const milestones = (state.goal.milestones || []).map((m) => {
      if (m.reachedAt || lost < m.lbsFromStart) return m;
      const updated = { ...m, reachedAt: todayKey };
      newlyReached.push(updated);
      return updated;
    });
    return {
      state: { ...state, goal: { ...state.goal, milestones } },
      newlyReached,
    };
  }

  Object.assign(Become, {
    seedMilestones,
    lbsLostFromStart,
    checkMilestones,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { seedMilestones, lbsLostFromStart, checkMilestones };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
