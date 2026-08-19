import { DeviceProfile } from './hardwareDetector';

export class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private ambientNoiseNode: ScriptProcessorNode | null = null;
  private environmentFilter: BiquadFilterNode | null = null;
  private isRunning: boolean = false;
  private profile: DeviceProfile;

  constructor(profile: DeviceProfile) {
    this.profile = profile;
  }

  /**
   * Initializes the AudioContext Graph upon user interaction.
   */
  public init() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime); // Safe starter volume profile
    this.masterGain.connect(this.ctx.destination);
    
    this.isRunning = true;
  }

  /**
   * Transitions the audio engine parameters dynamically to reflect 
   * incoming scene sentiment updates.
   */
  public transitionToMood(sentiment: 'tense' | 'calm' | 'mysterious' | 'heroic' | 'dark' | 'whimsical') {
    if (!this.ctx || !this.isRunning || !this.masterGain) {
      this.init();
    }
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Flush active oscillator configurations safely via ramp fades
    this.stopDroneLayers();

    const now = this.ctx.currentTime;

    // Low-End vs High-End Core Tuning Strategy Allocation
    if (this.profile.isLowEnd) {
      // Single voice root chord allocation to protect low-spec CPU threads
      const frequencyMap: Record<string, number> = { 
        calm: 110, 
        tense: 73.42, 
        mysterious: 87.31,
        heroic: 130.81,
        dark: 65.41,
        whimsical: 164.81
      };
      this.createDroneLayer(frequencyMap[sentiment] || 110, 'sine', now, 0.15);
      this.setupEnvironmentTexture(sentiment, now);
    } else {
      // High-End Rich Chord Texturing Framework (Polyphonic Layers + LFOs)
      if (sentiment === 'tense' || sentiment === 'dark') {
        this.createDroneLayer(73.42, 'sawtooth', now, 0.15);  // D2 Root
        this.createDroneLayer(77.78, 'sine', now, 0.2);       // D#2 Dissonant Minor Second
        this.createDroneLayer(110.00, 'triangle', now, 0.1);  // A2 Fifth
      } else if (sentiment === 'mysterious') {
        this.createDroneLayer(87.31, 'sine', now, 0.2);       // F2
        this.createDroneLayer(130.81, 'triangle', now, 0.15); // C3
        this.createDroneLayer(174.61, 'sine', now, 0.1);      // F3
      } else if (sentiment === 'heroic' || sentiment === 'whimsical') {
        this.createDroneLayer(130.81, 'triangle', now, 0.2); // C3
        this.createDroneLayer(164.81, 'sine', now, 0.2);     // E3
        this.createDroneLayer(196.00, 'sine', now, 0.15);    // G3
      } else { 
        // Calm/Peaceful default state
        this.createDroneLayer(110.00, 'sine', now, 0.2);     // A2
        this.createDroneLayer(146.83, 'sine', now, 0.15);    // D3
        this.createDroneLayer(220.00, 'sine', now, 0.1);     // A3
      }
      this.setupEnvironmentTexture(sentiment, now);
    }
  }

  private createDroneLayer(freq: number, type: OscillatorType, startTime: number, customVolume?: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Apply Subtle Slow LFO Pitch Modulations strictly on High-End configurations
    if (!this.profile.isLowEnd) {
      try {
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.2, startTime); // Very slow 0.2Hz movement cycle
        lfoGain.gain.setValueAtTime(1.5, startTime);  // 1.5Hz variance drift bounds
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(startTime);
        this.oscillators.push(lfo);
      } catch {}
    }

    // Smooth volumetric crossfading injection to avoid clicking artifacts
    oscGain.gain.setValueAtTime(0.001, startTime);
    oscGain.gain.linearRampToValueAtTime(customVolume || 0.2, startTime + 2.0);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    
    osc.start(startTime);
    this.oscillators.push(osc);
  }

  /**
   * Procedural Audio Texture Generator
   * Generates white/pink atmospheric rain/wind sounds completely procedurally.
   */
  private setupEnvironmentTexture(sentiment: string, now: number) {
    if (!this.ctx || !this.masterGain) return;

    if (this.ambientNoiseNode) {
      try { this.ambientNoiseNode.disconnect(); } catch {}
    }

    const bufferSize = this.profile.isLowEnd ? 8192 : 4096;
    try {
      this.ambientNoiseNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
      this.environmentFilter = this.ctx.createBiquadFilter();

      this.ambientNoiseNode.onaudioprocess = (e) => {
        const outputBuffer = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          outputBuffer[i] = (Math.random() * 2.0 - 1.0) * 0.05; // Low volume noise texture
        }
      };

      if (sentiment === 'tense' || sentiment === 'dark') {
        this.environmentFilter.type = 'lowpass';
        this.environmentFilter.frequency.setValueAtTime(350, now); // Rumbling low wind
      } else if (sentiment === 'mysterious') {
        this.environmentFilter.type = 'bandpass';
        this.environmentFilter.frequency.setValueAtTime(600, now); // Eerie whistling air
      } else {
        this.environmentFilter.type = 'lowpass';
        this.environmentFilter.frequency.setValueAtTime(1000, now); // Soft ambient air
      }

      this.ambientNoiseNode.connect(this.environmentFilter);
      this.environmentFilter.connect(this.masterGain);
    } catch {}
  }

  private stopDroneLayers() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.oscillators.forEach(osc => {
      try {
        osc.stop(now);
        osc.disconnect();
      } catch {}
    });
    this.oscillators = [];
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  public shutdown() {
    this.stopDroneLayers();
    if (this.ambientNoiseNode) {
      try { this.ambientNoiseNode.disconnect(); } catch {}
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
    this.isRunning = false;
  }
}
