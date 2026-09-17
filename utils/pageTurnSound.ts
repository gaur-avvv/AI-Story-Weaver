/**
 * Synthesized page-turn sound for the storybook flipbook.
 *
 * Real books are audible: a short, dry paper rustle fires every time a sheet
 * turns. Rather than shipping an audio asset, this builds the rustle on the fly
 * with the Web Audio API — a burst of band-passed noise with a fast attack and
 * two amplitude swells, which is what a turning page physically sounds like.
 *
 * Everything is wrapped in try/catch and the AudioContext is created lazily on
 * the first flip (a user gesture), so autoplay policies can never break the
 * reader. The sound can be muted from the book's own toggle, persisted in
 * localStorage.
 */

const SOUND_STORAGE_KEY = 'hic-pageflip-sound';

let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;

/** Read the persisted on/off preference (defaults to on). */
export function isPageTurnSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Persist the on/off preference. */
export function setPageTurnSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* localStorage unavailable — the in-memory toggle still works */
  }
}

function getAudioContext(): AudioContext | null {
  try {
    if (audioContext) return audioContext;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Plays a short paper rustle. Safe to call on every flip: it no-ops when muted,
 * when Web Audio is unavailable, or when a rustle is already in flight.
 */
export function playPageTurnSound(volume = 0.16): void {
  if (!isPageTurnSoundEnabled()) return;

  try {
    const audio = getAudioContext();
    if (!audio) return;

    // Browsers start the context suspended until a gesture resumes it.
    if (audio.state === 'suspended') {
      void audio.resume();
    }

    const now = audio.currentTime;
    // Guard against double-firing (a flip fires once, but drags can retrigger).
    if (now - lastPlayedAt < 0.12) return;
    lastPlayedAt = now;

    const duration = 0.34;
    const frameCount = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, frameCount, audio.sampleRate);
    const samples = buffer.getChannelData(0);

    // Deterministic LCG noise: no Math.random dependency, identical every turn.
    let seed = 1234567;
    for (let i = 0; i < frameCount; i++) {
      const t = i / frameCount;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const noise = seed / 0x3fffffff - 1; // -1 .. 1
      // A single soft swell with a fast decay reads as "paper", not "static".
      const swell = Math.sin(Math.PI * Math.min(1, t * 1.6)) * Math.exp(-2.6 * t);
      samples[i] = noise * swell * 0.5;
    }

    const source = audio.createBufferSource();
    source.buffer = buffer;

    // Papery midrange: band-passed so it never sounds like white noise.
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.8;

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);

    source.start(now);
    source.stop(now + duration);
  } catch {
    /* The rustle is decorative — never let audio break page navigation. */
  }
}