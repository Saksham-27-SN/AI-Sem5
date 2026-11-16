/**
 * InterviewGenie AI - Audio & Hardware Diagnostic Utilities
 * Web Audio API synthesizer for speaker chime testing & acoustic diagnostics.
 */

/**
 * Plays a pleasant 4-tone harmonic chime (C5 -> E5 -> G5 -> C6)
 * using Web Audio API oscillators and gain envelopes with zero external file dependencies.
 */
export function playSpeakerChime(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) {
        resolve();
        return;
      }

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // Melodic ascending harmonic chime: C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz) -> C6 (1046.50 Hz)
      const notes = [
        { freq: 523.25, time: 0.00, duration: 0.35 },
        { freq: 659.25, time: 0.13, duration: 0.35 },
        { freq: 783.99, time: 0.26, duration: 0.38 },
        { freq: 1046.50, time: 0.40, duration: 0.55 },
      ];

      notes.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Acoustic bell envelope
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.24, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration + 0.05);
      });

      const totalTimeMs = Math.round((0.40 + 0.55 + 0.15) * 1000);
      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') {
            ctx.close();
          }
        } catch {
          // Ignored
        }
        resolve();
      }, totalTimeMs);
    } catch (err) {
      console.warn('AudioContext speaker chime error:', err);
      resolve();
    }
  });
}
