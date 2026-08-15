(function (root) {
  const Become = (root.Become = root.Become || {});

  function effectiveTarget(state, dateKey) {
    if (state.targetOverrides && state.targetOverrides[dateKey] != null) {
      return Number(state.targetOverrides[dateKey]);
    }
    return Number(state.settings.calorieTarget);
  }

  Object.assign(Become, { effectiveTarget });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { effectiveTarget };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
