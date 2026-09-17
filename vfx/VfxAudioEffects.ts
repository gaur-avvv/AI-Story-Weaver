// Web Audio API Procedural Sound Synthesizer for Atmospheric Visual Effects & Soundscapes

export type SoundscapeType = 
  | 'forest_wind' 
  | 'rain' 
  | 'campfire'
  | 'ocean_waves' 
  | 'river_stream'
  | 'birdsong'
  | 'crickets_night'
  | 'thunderstorm'
  | 'wind_chimes'
  | 'ethereal_pad' 
  | 'space_hum' 
  | 'cyberpunk_city'
  | 'medieval_tavern'
  | 'dark_drone' 
  | 'mystery_clock'
  | 'off';

interface ActiveSoundLayer {
  type: SoundscapeType;
  gainNode: GainNode;
  nodes: { stop?: () => void; disconnect?: () => void }[];
}

class AtmosphericAudioSynthesizer {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private activeSoundscape: SoundscapeType = 'off';
  private masterGain: GainNode | null = null;
  private currentVolume = 0.3; // Default ambient volume (0 to 1)

  private activeLayers: ActiveSoundLayer[] = [];

  private initCtx() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (this.audioCtx && !this.masterGain) {
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume * 0.15, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume * 0.15, this.audioCtx.currentTime, 0.1);
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getCurrentSoundscape(): SoundscapeType {
    return this.activeSoundscape;
  }

  public playSoundscape(type: SoundscapeType) {
    this.initCtx();
    if (!this.audioCtx || !this.masterGain) return;

    if (this.activeSoundscape === type && this.isPlaying) return;

    const now = this.audioCtx.currentTime;
    const fadeDuration = 1.5; // Smooth 1.5s crossfade between loops

    // Fade out and cleanup old layers
    this.activeLayers.forEach(layer => {
      try {
        layer.gainNode.gain.cancelScheduledValues(now);
        layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
        layer.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
        
        setTimeout(() => {
          layer.nodes.forEach(node => {
            try {
              if (node.stop) node.stop();
              if (node.disconnect) node.disconnect();
            } catch (e) {}
          });
        }, fadeDuration * 1000 + 100);
      } catch (e) {}
    });

    this.activeLayers = [];

    if (type === 'off') {
      this.activeSoundscape = 'off';
      this.isPlaying = false;
      return;
    }

    this.activeSoundscape = type;
    this.isPlaying = true;

    // Create new layer gain node for smooth fade-in
    const layerGain = this.audioCtx.createGain();
    layerGain.gain.setValueAtTime(0.0001, now);
    layerGain.gain.linearRampToValueAtTime(1.0, now + fadeDuration);
    layerGain.connect(this.masterGain);

    const layerNodes: { stop?: () => void; disconnect?: () => void }[] = [];

    try {
      switch (type) {
        case 'rain':
          this.createRainSoundscape(layerGain, layerNodes);
          break;
        case 'forest_wind':
          this.createForestWindSoundscape(layerGain, layerNodes);
          break;
        case 'campfire':
          this.createCampfireSoundscape(layerGain, layerNodes);
          break;
        case 'ocean_waves':
          this.createOceanWavesSoundscape(layerGain, layerNodes);
          break;
        case 'river_stream':
          this.createRiverStreamSoundscape(layerGain, layerNodes);
          break;
        case 'birdsong':
          this.createBirdsongSoundscape(layerGain, layerNodes);
          break;
        case 'crickets_night':
          this.createCricketsNightSoundscape(layerGain, layerNodes);
          break;
        case 'thunderstorm':
          this.createThunderstormSoundscape(layerGain, layerNodes);
          break;
        case 'wind_chimes':
          this.createWindChimesSoundscape(layerGain, layerNodes);
          break;
        case 'ethereal_pad':
          this.createEtherealPadSoundscape(layerGain, layerNodes);
          break;
        case 'space_hum':
          this.createSpaceHumSoundscape(layerGain, layerNodes);
          break;
        case 'cyberpunk_city':
          this.createCyberpunkCitySoundscape(layerGain, layerNodes);
          break;
        case 'medieval_tavern':
          this.createMedievalTavernSoundscape(layerGain, layerNodes);
          break;
        case 'dark_drone':
          this.createDarkDroneSoundscape(layerGain, layerNodes);
          break;
        case 'mystery_clock':
          this.createMysteryClockSoundscape(layerGain, layerNodes);
          break;
      }
      this.activeLayers.push({ type, gainNode: layerGain, nodes: layerNodes });
    } catch (e) {
      console.warn('Soundscape creation warning:', e);
    }
  }

  public determineOptimalSoundscape(
    genre: string = '',
    text: string = '',
    weather: string = '',
    location: string = ''
  ): SoundscapeType {
    const lowerText = text.toLowerCase();
    const lowerGenre = genre.toLowerCase();
    const lowerWeather = weather.toLowerCase();
    const lowerLocation = location.toLowerCase();

    // Thunderstorm keywords (before the plain-rain check — a storm is more
    // specific and dramatic than steady rain)
    if (lowerText.includes('thunder') || lowerText.includes('lightning') || lowerText.includes('storm') || lowerWeather === 'stormy') {
      return 'thunderstorm';
    }

    // Direct weather overrides
    if (lowerWeather === 'rainy' || lowerText.includes('rain')) {
      return 'rain';
    }

    // Cozy / Campfire keywords
    if (lowerText.includes('campfire') || lowerText.includes('fireplace') || lowerText.includes('hearth') || lowerText.includes('flame') || lowerText.includes('embers') || lowerText.includes('cozy cabin')) {
      return 'campfire';
    }

    // Morning birdsong keywords (explicit bird/nature-morning references)
    if (lowerText.includes('bird') || lowerText.includes('chirp') || lowerText.includes('sparrow') || lowerText.includes('robin') || lowerText.includes('dawn') || lowerLocation === 'garden' || lowerLocation === 'meadow') {
      return 'birdsong';
    }

    // Wind-chime keywords (bells, shrines, temples, festivals)
    if (lowerText.includes('chime') || lowerText.includes('bell') || lowerText.includes('temple') || lowerText.includes('shrine') || lowerText.includes('festival')) {
      return 'wind_chimes';
    }

    // River / Stream keywords
    if (lowerLocation === 'river' || lowerText.includes('river') || lowerText.includes('stream') || lowerText.includes('waterfall') || lowerText.includes('brook') || lowerText.includes('creek')) {
      return 'river_stream';
    }

    // Ocean / Beach keywords
    if (lowerLocation === 'beach' || lowerLocation === 'underwater' || lowerLocation === 'island' || lowerText.includes('ocean') || lowerText.includes('waves') || lowerText.includes('sea') || lowerText.includes('coast') || lowerText.includes('shore')) {
      return 'ocean_waves';
    }

    // Cyberpunk / Futuristic City keywords
    if (lowerGenre.includes('cyberpunk') || lowerText.includes('neon') || lowerText.includes('cyber') || lowerText.includes('skyscraper') || lowerText.includes('hover') || lowerText.includes('megacity') || lowerText.includes('robot')) {
      return 'cyberpunk_city';
    }

    // Space / Sci-Fi
    if (lowerGenre.includes('sci-fi') || lowerLocation === 'space' || lowerText.includes('space') || lowerText.includes('galaxy') || lowerText.includes('starship') || lowerText.includes('orbit') || lowerText.includes('planet')) {
      return 'space_hum';
    }

    // Medieval / Fantasy Tavern
    if (lowerGenre.includes('historical') || lowerText.includes('tavern') || lowerText.includes('inn') || lowerText.includes('castle') || lowerText.includes('kingdom') || lowerText.includes('knight') || lowerText.includes('village') || lowerText.includes('lute')) {
      return 'medieval_tavern';
    }

    // Mystery / Clock Suspense
    if (lowerGenre.includes('mystery') || lowerGenre.includes('detective') || lowerText.includes('clock') || lowerText.includes('ticking') || lowerText.includes('investigate') || lowerText.includes('clue') || lowerText.includes('secret') || lowerText.includes('crystal')) {
      return 'mystery_clock';
    }

    // Horror / Dark Drone
    if (lowerGenre.includes('horror') || lowerGenre.includes('thriller') || lowerText.includes('haunted') || lowerText.includes('shadow') || lowerText.includes('creepy') || lowerText.includes('dungeon') || lowerText.includes('monster') || lowerText.includes('darkness')) {
      return 'dark_drone';
    }

    // Crickets at night (after horror, so dark stories keep their drone; cozy
    // night scenes — bedtime tales, fireflies, owls — get the summer night)
    if (lowerText.includes('cricket') || lowerText.includes('cicada') || lowerText.includes('firefly') || lowerText.includes('owl') || lowerText.includes('summer night') || lowerText.includes('starry') || lowerGenre.includes('bedtime')) {
      return 'crickets_night';
    }

    // Fantasy / Ethereal Pad
    if (lowerGenre.includes('fantasy') || lowerGenre.includes('fairy_tale') || lowerGenre.includes('romance') || lowerGenre.includes('bedtime') || lowerText.includes('magic') || lowerText.includes('fairy') || lowerText.includes('enchant') || lowerText.includes('spell') || lowerText.includes('dream')) {
      return 'ethereal_pad';
    }

    // Forest / Nature Wind default
    return 'forest_wind';
  }

  public autoSelectForGenre(genre: string, weather: string, text: string = '', location: string = '') {
    const optimal = this.determineOptimalSoundscape(genre, text, weather, location);
    this.playSoundscape(optimal);
  }

  public stopSoundscape() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this.activeLayers.forEach(layer => {
      try {
        layer.gainNode.gain.cancelScheduledValues(now);
        layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
        layer.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.5);
        setTimeout(() => {
          layer.nodes.forEach(node => {
            try {
              if (node.stop) node.stop();
              if (node.disconnect) node.disconnect();
            } catch (e) {}
          });
        }, 600);
      } catch (e) {}
    });
    this.activeLayers = [];
    this.isPlaying = false;
    this.activeSoundscape = 'off';
  }

  // --- Individual Soundscape Synthesizers ---

  private createRainSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 2;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);

    noise.connect(filter);
    filter.connect(targetGain);
    noise.start();

    nodesList.push(noise, filter);
  }

  /**
   * Renders a seamlessly-looping mono AudioBuffer of `seconds` length by
   * delegating the sample math to `fill`. Event-based soundscapes (birds,
   * chimes, thunder) bake their randomized event patterns straight into the
   * buffer, so playback is a single looping BufferSource — no timers, and the
   * standard node cleanup path fully tears the layer down.
   */
  private createLoopingAudioBuffer(
    seconds: number,
    fill: (data: Float32Array, sampleRate: number) => void
  ): AudioBuffer | null {
    if (!this.audioCtx) return null;
    const length = Math.max(1, Math.floor(this.audioCtx.sampleRate * seconds));
    const buffer = this.audioCtx.createBuffer(1, length, this.audioCtx.sampleRate);
    fill(buffer.getChannelData(0), this.audioCtx.sampleRate);
    return buffer;
  }

  private createBirdsongSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const seconds = 12;
    const sampleRate = this.audioCtx.sampleRate;
    const buffer = this.createLoopingAudioBuffer(seconds, (data, rate) => {
      const length = data.length;

      // 1) Soft forest-wind bed under the whole loop. The swell completes
      //    whole cycles across the loop so the seam is inaudible.
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        const swell = 0.5 + 0.5 * Math.sin((2 * Math.PI * t * 2) / seconds);
        data[i] = (Math.random() * 2 - 1) * 0.02 * swell;
      }

      // 2) One chirp: a sine whose frequency sweeps up-then-down, with a
      //    bell-shaped amplitude envelope — the classic "tweet" shape.
      const addChirp = (startSec: number, baseFreq: number, sweep: number, dur: number, amp: number) => {
        const start = Math.floor(startSec * rate);
        const durSamples = Math.floor(dur * rate);
        let phase = 0;
        for (let i = 0; i < durSamples; i++) {
          const idx = start + i;
          if (idx >= length) break;
          const p = i / durSamples;
          const freq = baseFreq + sweep * Math.sin(Math.PI * p);
          phase += (2 * Math.PI * freq) / rate;
          const env = Math.sin(Math.PI * p) ** 2;
          data[idx] += Math.sin(phase) * env * amp;
        }
      };

      const rand = (min: number, max: number) => min + Math.random() * (max - min);

      // 3) ~14 phrase events, each 2–5 quick notes, kept clear of the loop seam.
      for (let e = 0; e < 14; e++) {
        let t = rand(0.1, seconds - 1.5);
        const notes = 2 + Math.floor(Math.random() * 4);
        const base = rand(2200, 4300);
        for (let n = 0; n < notes; n++) {
          addChirp(t, base + rand(-150, 150), rand(300, 900), rand(0.05, 0.12), rand(0.05, 0.1));
          t += rand(0.09, 0.2);
        }
      }
    });
    if (!buffer) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(targetGain);
    source.start();
    nodesList.push(source);
  }

  private createCricketsNightSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    // 3s loop; carrier frequencies x 3 and pulse rates x 3 are whole numbers,
    // so every voice loops phase-perfect with no click at the seam.
    const seconds = 3;
    const sampleRate = this.audioCtx.sampleRate;
    const buffer = this.createLoopingAudioBuffer(seconds, (data, rate) => {
      const length = data.length;

      // Very faint still-night pad.
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        data[i] = Math.sin(2 * Math.PI * 110 * t) * 0.008;
      }

      // One cricket: a carrier tone amplitude-gated into fast stridulation
      // pulses, grouped into chirp bursts (0.45s on, 0.55s off — 3 per loop).
      const addCricket = (offsetSec: number, pulseRate: number, carrier: number, amp: number) => {
        for (let i = 0; i < length; i++) {
          const t = i / rate + offsetSec;
          const pulsePhase = (t * pulseRate) % 1;
          const pulse = pulsePhase < 0.55 ? Math.sin(Math.PI * (pulsePhase / 0.55)) : 0;
          const burst = t % 1 < 0.45 ? 1 : 0;
          data[i] += Math.sin(2 * Math.PI * carrier * t) * pulse * burst * amp;
        }
      };

      addCricket(0, 26, 4200, 0.05);
      addCricket(0.13, 31, 4600, 0.038);
      addCricket(0.29, 23, 3900, 0.032);
    });
    if (!buffer) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(targetGain);
    source.start();
    nodesList.push(source);
  }

  private createThunderstormSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const seconds = 20;
    const sampleRate = this.audioCtx.sampleRate;
    const buffer = this.createLoopingAudioBuffer(seconds, (data, rate) => {
      const length = data.length;

      // Steady rain bed: plain white noise reads as rainfall at low level.
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.05;
      }

      // One rumble: brown-ish noise (one-pole low-pass) with a slow attack and
      // long decay — the "distant thunder" shape.
      const addRumble = (startSec: number, durSec: number, amp: number) => {
        const start = Math.floor(startSec * rate);
        const durSamples = Math.floor(durSec * rate);
        let lowpassed = 0;
        for (let i = 0; i < durSamples; i++) {
          const idx = start + i;
          if (idx >= length) break;
          const p = i / durSamples;
          const env = Math.min(1, p / 0.12) * Math.exp(-2.2 * p);
          lowpassed += (Math.random() * 2 - 1 - lowpassed) * 0.02;
          data[idx] += lowpassed * env * amp;
        }
      };

      addRumble(2.5, 3.5, 0.55);
      addRumble(12, 4.5, 0.4);
    });
    if (!buffer) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(targetGain);
    source.start();
    nodesList.push(source);
  }

  private createWindChimesSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const seconds = 12;
    const sampleRate = this.audioCtx.sampleRate;
    const buffer = this.createLoopingAudioBuffer(seconds, (data, rate) => {
      const length = data.length;

      // Gentle breeze bed.
      let breeze = 0;
      for (let i = 0; i < length; i++) {
        breeze += (Math.random() * 2 - 1 - breeze) * 0.008;
        data[i] = breeze * 0.9;
      }

      // One strike: inharmonic bell partials (classic chime ratios) with an
      // exponential decay, like metal tubes struck by the wind.
      const addStrike = (startSec: number, f0: number, amp: number) => {
        const partials = [1, 2.756, 5.404];
        const partialAmps = [1, 0.42, 0.18];
        const dur = 2.2;
        const start = Math.floor(startSec * rate);
        const durSamples = Math.floor(dur * rate);
        for (let i = 0; i < durSamples; i++) {
          const idx = start + i;
          if (idx >= length) break;
          const t = i / rate;
          const env = Math.exp(-2.8 * t);
          let sample = 0;
          for (let p = 0; p < partials.length; p++) {
            sample += Math.sin(2 * Math.PI * f0 * partials[p] * t) * partialAmps[p];
          }
          data[idx] += sample * env * amp;
        }
      };

      // C-pentatonic strike sequence, kept clear of the loop seam.
      const scale = [523.25, 587.33, 698.46, 783.99, 880];
      for (let s = 0; s < 6; s++) {
        const t = 0.6 + s * 1.7 + Math.random() * 0.5;
        if (t > seconds - 2.5) break;
        addStrike(t, scale[Math.floor(Math.random() * scale.length)], 0.09);
      }
    });
    if (!buffer) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(targetGain);
    source.start();
    nodesList.push(source);
  }

  private createForestWindSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 2;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    filter.Q.setValueAtTime(3.0, this.audioCtx.currentTime);

    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.2, this.audioCtx.currentTime);

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(250, this.audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(targetGain);

    lfo.start();
    noise.start();

    nodesList.push(noise, filter, lfo, lfoGain);
  }

  private createSpaceHumSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const osc1 = this.audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, this.audioCtx.currentTime);

    const osc2 = this.audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110.5, this.audioCtx.currentTime);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, this.audioCtx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(targetGain);

    osc1.start();
    osc2.start();

    nodesList.push(osc1, osc2, filter);
  }

  private createDarkDroneSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, this.audioCtx.currentTime);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, this.audioCtx.currentTime);

    osc.connect(filter);
    filter.connect(targetGain);

    osc.start();

    nodesList.push(osc, filter);
  }

  private createEtherealPadSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const freqs = [174.61, 220.00, 261.63, 329.63];
    freqs.forEach(f => {
      const osc = this.audioCtx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.audioCtx!.currentTime);

      const filter = this.audioCtx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.audioCtx!.currentTime);

      osc.connect(filter);
      filter.connect(targetGain);
      osc.start();

      nodesList.push(osc, filter);
    });
  }

  private createOceanWavesSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 2;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.audioCtx.currentTime);

    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, this.audioCtx.currentTime);

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(200, this.audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(targetGain);

    lfo.start();
    noise.start();

    nodesList.push(noise, filter, lfo, lfoGain);
  }

  private createCampfireSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65, this.audioCtx.currentTime);

    const oscFilter = this.audioCtx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(140, this.audioCtx.currentTime);

    const oscGain = this.audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(targetGain);
    osc.start();

    const bufferSize = this.audioCtx.sampleRate * 2;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const r = Math.random();
      data[i] = r > 0.985 ? (Math.random() * 2 - 1) * 0.9 : (Math.random() * 0.08 - 0.04);
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2200, this.audioCtx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, this.audioCtx.currentTime);

    noise.connect(noiseFilter);
    noiseFilter.connect(targetGain);
    noise.start();

    nodesList.push(osc, oscFilter, oscGain, noise, noiseFilter);
  }

  private createRiverStreamSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 2;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter1 = this.audioCtx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    filter1.Q.setValueAtTime(2.0, this.audioCtx.currentTime);

    const filter2 = this.audioCtx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(1200, this.audioCtx.currentTime);

    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.35, this.audioCtx.currentTime);

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(300, this.audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);

    noise.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(targetGain);

    lfo.start();
    noise.start();

    nodesList.push(noise, filter1, filter2, lfo, lfoGain);
  }

  private createCyberpunkCitySoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const subOsc = this.audioCtx.createOscillator();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(55, this.audioCtx.currentTime);

    const subFilter = this.audioCtx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(160, this.audioCtx.currentTime);

    const subGain = this.audioCtx.createGain();
    subGain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(targetGain);
    subOsc.start();

    const sweepOsc = this.audioCtx.createOscillator();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(220, this.audioCtx.currentTime);

    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.audioCtx.currentTime);

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(120, this.audioCtx.currentTime);

    const sweepGain = this.audioCtx.createGain();
    sweepGain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(sweepOsc.frequency);

    sweepOsc.connect(sweepGain);
    sweepGain.connect(targetGain);

    lfo.start();
    sweepOsc.start();

    nodesList.push(subOsc, subFilter, subGain, sweepOsc, sweepGain, lfo, lfoGain);
  }

  private createMedievalTavernSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const freqs = [110, 164.81, 220, 329.63];
    freqs.forEach((freq, idx) => {
      const osc = this.audioCtx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioCtx!.currentTime);

      const filter = this.audioCtx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550 + idx * 80, this.audioCtx!.currentTime);

      const gain = this.audioCtx!.createGain();
      gain.gain.setValueAtTime(0.04 / freqs.length, this.audioCtx!.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(targetGain);

      osc.start();
      nodesList.push(osc, filter, gain);
    });
  }

  private createMysteryClockSoundscape(targetGain: GainNode, nodesList: any[]) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, this.audioCtx.currentTime);

    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(1.0, this.audioCtx.currentTime);

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, this.audioCtx.currentTime);

    osc.connect(filter);
    filter.connect(targetGain);
    osc.start();

    nodesList.push(osc, lfo, lfoGain, filter);
  }

  // --- Interactive One-shot FX ---
  public playFootstepsSFX() {
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      [0, 0.3, 0.6].forEach((delay) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        const filter = this.audioCtx!.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now + delay);
        osc.frequency.exponentialRampToValueAtTime(40, now + delay + 0.12);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now + delay);

        gain.gain.setValueAtTime(0.08, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx!.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
      });
    } catch (e) {}
  }

  public playMagicalHumSFX() {
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.8);
      osc.frequency.exponentialRampToValueAtTime(440, now + 1.5);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.6);
    } catch (e) {}
  }

  public playDoorSlamSFX() {
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      const bufferSize = this.audioCtx.sampleRate * 0.1;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.audioCtx.createBufferSource();
      const noiseGain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      noise.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, now);

      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.audioCtx.destination);

      noise.start(now);
    } catch (e) {}
  }

  public playLightningThunder() {
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, this.audioCtx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 1.4);
    } catch (e) {}
  }

  public playMagicChime() {
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx!.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.06, this.audioCtx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx!.currentTime + idx * 0.08 + 0.7);
        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start(this.audioCtx!.currentTime + idx * 0.08);
        osc.stop(this.audioCtx!.currentTime + idx * 0.08 + 0.7);
      });
    } catch (e) {}
  }

  public triggerContextSFX(genre: string, text?: string) {
    if (!text) {
      if (genre === 'fantasy') this.playMagicalHumSFX();
      else if (genre === 'horror' || genre === 'thriller') this.playDoorSlamSFX();
      else if (genre === 'action' || genre === 'sci-fi') this.playFootstepsSFX();
      return;
    }

    const lower = text.toLowerCase();
    if (lower.includes('step') || lower.includes('walk') || lower.includes('corridor') || lower.includes('path') || lower.includes('tread')) {
      this.playFootstepsSFX();
    } else if (lower.includes('magic') || lower.includes('spell') || lower.includes('glow') || lower.includes('ethereal') || lower.includes('enchant')) {
      this.playMagicalHumSFX();
    } else if (lower.includes('door') || lower.includes('slam') || lower.includes('shut') || lower.includes('lock') || lower.includes('bang')) {
      this.playDoorSlamSFX();
    } else if (lower.includes('thunder') || lower.includes('lightning') || lower.includes('storm') || lower.includes('crash')) {
      this.playLightningThunder();
    } else if (lower.includes('chime') || lower.includes('whisper') || lower.includes('spark') || lower.includes('star')) {
      this.playMagicChime();
    } else {
      if (genre === 'fantasy') this.playMagicChime();
      else if (genre === 'horror') this.playDoorSlamSFX();
      else if (genre === 'sci-fi' || genre === 'mystery') this.playFootstepsSFX();
    }
  }
}

export const vfxAudioSynth = new AtmosphericAudioSynthesizer();

