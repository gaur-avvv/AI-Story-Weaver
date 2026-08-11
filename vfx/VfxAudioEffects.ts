// Web Audio API Procedural Sound Synthesizer for Atmospheric Visual Effects & Soundscapes

export type SoundscapeType = 'forest_wind' | 'rain' | 'space_hum' | 'dark_drone' | 'ethereal_pad' | 'ocean_waves' | 'off';

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
        case 'space_hum':
          this.createSpaceHumSoundscape(layerGain, layerNodes);
          break;
        case 'dark_drone':
          this.createDarkDroneSoundscape(layerGain, layerNodes);
          break;
        case 'ethereal_pad':
          this.createEtherealPadSoundscape(layerGain, layerNodes);
          break;
        case 'ocean_waves':
          this.createOceanWavesSoundscape(layerGain, layerNodes);
          break;
      }
      this.activeLayers.push({ type, gainNode: layerGain, nodes: layerNodes });
    } catch (e) {
      console.warn('Soundscape creation warning:', e);
    }
  }

  public autoSelectForGenre(genre: string, weather: string) {
    if (weather === 'rainy' || weather === 'stormy') {
      this.playSoundscape('rain');
    } else if (genre === 'sci-fi') {
      this.playSoundscape('space_hum');
    } else if (genre === 'horror' || genre === 'thriller' || genre === 'crime') {
      this.playSoundscape('dark_drone');
    } else if (genre === 'fantasy' || genre === 'romance' || genre === 'fairy_tale' || genre === 'bedtime') {
      this.playSoundscape('ethereal_pad');
    } else if (genre === 'historical' || genre === 'western' || genre === 'adventure') {
      this.playSoundscape('forest_wind');
    } else {
      this.playSoundscape('forest_wind');
    }
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

