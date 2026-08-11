// Web Audio Procedural Atmospheric Music Synthesizer
// Generates CORS-proof, offline-ready background music tracks for all genres.

const musicDataUrlCache: Record<string, string> = {};

export async function getProceduralMusicBuffer(
  audioCtx: BaseAudioContext,
  genre: string,
  durationSec = 20
): Promise<AudioBuffer> {
  const sampleRate = audioCtx.sampleRate || 44100;
  const numSamples = Math.floor(sampleRate * durationSec);
  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

  if (!OfflineCtx) {
    return audioCtx.createBuffer(2, Math.max(1, numSamples), sampleRate);
  }

  const offline = new OfflineCtx(2, Math.max(1, numSamples), sampleRate);
  const lowerGenre = (genre || 'default').toLowerCase();

  // Configure musical scale based on genre
  let frequencies = [220, 277.18, 329.63, 440]; // A Major default
  let waveform: OscillatorType = 'sine';
  let tempo = 2.5;

  if (lowerGenre.includes('fantasy') || lowerGenre.includes('fairy')) {
    frequencies = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major pentatonic
    waveform = 'triangle';
    tempo = 2.0;
  } else if (lowerGenre.includes('sci-fi') || lowerGenre.includes('space')) {
    frequencies = [110, 164.81, 220, 329.63]; // Ambient space drone
    waveform = 'sawtooth';
    tempo = 3.0;
  } else if (lowerGenre.includes('horror') || lowerGenre.includes('thriller') || lowerGenre.includes('mystery') || lowerGenre.includes('crime')) {
    frequencies = [92.5, 110.0, 138.59, 185.0]; // Dark minor tension
    waveform = 'sawtooth';
    tempo = 3.5;
  } else if (lowerGenre.includes('adventure') || lowerGenre.includes('superhero')) {
    frequencies = [146.83, 185.00, 220.00, 293.66, 370.00]; // D Major heroic
    waveform = 'triangle';
    tempo = 1.8;
  } else if (lowerGenre.includes('funny') || lowerGenre.includes('fable')) {
    frequencies = [293.66, 369.99, 440.00, 587.33]; // Playful D Major
    waveform = 'sine';
    tempo = 1.2;
  } else if (lowerGenre.includes('bedtime') || lowerGenre.includes('romance') || lowerGenre.includes('educational')) {
    frequencies = [174.61, 220.00, 261.63, 349.23]; // F Major soft lullaby
    waveform = 'sine';
    tempo = 3.0;
  }

  // Generate atmospheric pad
  frequencies.forEach((freq, idx) => {
    const osc = offline.createOscillator();
    const gain = offline.createGain();
    const filter = offline.createBiquadFilter();

    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, 0);

    // Subtle pitch modulation
    const lfo = offline.createOscillator();
    const lfoGain = offline.createGain();
    lfo.frequency.setValueAtTime(0.15 + idx * 0.05, 0);
    lfoGain.gain.setValueAtTime(1.5, 0);
    lfo.connect(osc.frequency);
    lfo.start(0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowerGenre.includes('horror') ? 350 : 700 + idx * 150, 0);

    // Swelling volume envelope
    gain.gain.setValueAtTime(0.01, 0);
    for (let t = 0; t < durationSec; t += tempo) {
      gain.gain.linearRampToValueAtTime(0.06 / frequencies.length, t + tempo * 0.5);
      gain.gain.linearRampToValueAtTime(0.015 / frequencies.length, Math.min(durationSec, t + tempo));
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(offline.destination);

    osc.start(0);
    osc.stop(durationSec);
  });

  // Soft arpeggiated chime layer
  const arpNotes = frequencies.map(f => f * 2);
  for (let t = 0.4; t < durationSec - 0.4; t += 0.9) {
    const noteFreq = arpNotes[Math.floor((t * 1.5) % arpNotes.length)];
    const osc = offline.createOscillator();
    const gain = offline.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(noteFreq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.015, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    osc.connect(gain);
    gain.connect(offline.destination);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  try {
    return await offline.startRendering();
  } catch (err) {
    console.warn("OfflineAudioContext rendering failed, returning blank buffer", err);
    return audioCtx.createBuffer(2, Math.max(1, numSamples), sampleRate);
  }
}

// Convert AudioBuffer to WAV Data URL / Object URL
export function audioBufferToWavDataUrl(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function getMusicDataUrlForGenre(genre: string, durationSec = 15): Promise<string> {
  const key = `${genre}_${durationSec}`;
  if (musicDataUrlCache[key]) {
    return musicDataUrlCache[key];
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const tempCtx = new AudioCtx();
    const buffer = await getProceduralMusicBuffer(tempCtx, genre, durationSec);
    const url = audioBufferToWavDataUrl(buffer);
    musicDataUrlCache[key] = url;
    if (tempCtx.state !== 'closed') {
      tempCtx.close();
    }
    return url;
  } catch (e) {
    console.error("Failed to generate music URL for genre:", e);
    return '';
  }
}

export const getMusicForGenre = (genre: string): string => {
  return musicDataUrlCache[`${genre}_15`] || '';
};
