// Web Audio is unlocked by the explicit sound toggle (required on mobile).
const RhythmAudio = (() => {
  let context;
  const active = new Set();
  function stop() {
    for (const oscillator of active) {
      try { oscillator.stop(); } catch {}
      oscillator.disconnect();
    }
    active.clear();
  }
  async function unlock() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      if (!context || context.state === 'closed') context = new AudioContext();
      await context.resume();
      return context.state === 'running';
    } catch { return false; }
  }
  function play(pattern, volume, strength) {
    stop();
    if (document.hidden) return 'Rhythm sounds paused while the page is hidden.';
    if (!strength) return 'Rhythm length is Off.';
    if (!context || context.state !== 'running') return 'Tap Enable rhythm sounds to activate audio.';
    const level = Math.max(0, Math.min(1, Number(volume) || 0));
    if (!level) return 'Rhythm volume is muted. Increase Volume level in Audio settings.';
    const scale = [0, .65, 1, 1.4][strength] || 1;
    let start = context.currentTime + .01;
    try {
      pattern.forEach((duration, i) => {
        const seconds = duration * (i % 2 ? 1 : scale) / 1000;
        if (i % 2 === 0) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = 660;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(level * .18, start + .005);
          gain.gain.setValueAtTime(level * .18, start + seconds - .01);
          gain.gain.linearRampToValueAtTime(0, start + seconds);
          oscillator.connect(gain);
          gain.connect(context.destination);
          active.add(oscillator);
          oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
          oscillator.start(start);
          oscillator.stop(start + seconds);
        }
        start += seconds;
      });
      return 'Playing rhythm sounds.';
    } catch {
      stop();
      return 'Audio could not play. Try enabling rhythm sounds again.';
    }
  }
  return { unlock, play, stop };
})();
