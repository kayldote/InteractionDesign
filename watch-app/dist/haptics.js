// Figma describes pulse counts/rhythms, not milliseconds. Keep short/long
// timing consistent across cues. Strength changes duration, not motor amplitude.
const Haptics = (() => {
  const SHORT = 70, LONG = 280, GAP = 110;
  const rhythm = (...durations) => durations.flatMap((duration, i) => i ? [GAP, duration] : [duration]);
  const pulses = count => rhythm(...Array.from({ length: count }, () => SHORT));
  // First two follow Figma's examples; the remaining routes extend that scheme.
  const routes = [rhythm(LONG, SHORT, SHORT), rhythm(LONG, LONG, SHORT), rhythm(SHORT, LONG, SHORT), rhythm(SHORT, SHORT, LONG)];
  const cue = (pattern, label) => ({ pattern, label });

  function option(page, index, label = '') {
    if (index < 0) return cue([SHORT], 'Back: one short pulse');
    if (page === 'routes') return cue(routes[index] || [SHORT], `Route rhythm: ${describe(routes[index] || [SHORT])}`);
    if (label === 'Accessibility info') return cue([LONG], 'Accessibility information: one long pulse');
    if (page === 'leave' && index === 0) return cue(pulses(2), 'Continue navigation: two short pulses');
    if ((page === 'access' && index === 0) || (['rate', 'volume', 'vibration'].includes(page) && index === 0)) {
      return cue([SHORT], 'Repeat or test: one short pulse');
    }
    return cue(pulses(index + 1), `Option ${index + 1}: ${index + 1} short pulse${index ? 's' : ''}`);
  }

  function entry(page, index, label) {
    if (page === 'directions') return cue(pulses(3), 'Approaching turn: three short pulses');
    if (page === 'reached') return cue(rhythm(LONG, SHORT, SHORT), 'Stop reached: one long, two short pulses');
    if (page === 'accessError') return cue(rhythm(LONG, LONG), 'Accessibility information unavailable: two long pulses');
    return option(page, index, label);
  }

  function describe(pattern) {
    return pattern.filter((_, i) => i % 2 === 0).map(duration => duration === LONG ? 'long' : 'short').join(', ');
  }

  return { option, entry };
})();
