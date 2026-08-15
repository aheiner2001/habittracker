(function (root) {
  const Become = (root.Become = root.Become || {});

  const PASSAGES = [
    'Craving is a wave: it builds, crests, and falls. You don’t have to ride it into the old habit.',
    'Curiosity softens craving. Ask what this urge feels like in the body, without fixing it yet.',
    'Trigger → behavior → reward. Seeing the loop clearly is the first step to changing it.',
    'Excitement isn’t the same as happiness. Notice when you’re chasing a spike instead of ease.',
    'When stress pulls you south, pause. Orientation beats speeding up while lost.',
    'Turning toward an urge—with interest, not force—can drain its enchantment over time.',
    'RAIN: Recognize, Allow, Investigate, Note. A simple surfboard for waves of wanting.',
    'Self-control is a limited tank. Sleep, food, and lower stress help keep System 2 online.',
    'Rumination isn’t problem-solving. Loops that don’t update your map just dig the groove deeper.',
    'Subjective bias wears colored glasses. Checking the data—and your body—helps take them off.',
    'Habits grow from what you reinforce. Each mindful pause is practice at not feeding the old reward.',
    'Awareness means paying attention on purpose, in the present, without judgment—then choosing again.',
  ];

  function passageForDate(d = new Date()) {
    const idx = Become.dayOfYear(d) % PASSAGES.length;
    return PASSAGES[idx];
  }

  Object.assign(Become, { PASSAGES, passageForDate });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PASSAGES, passageForDate };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
