import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayIcon, PauseIcon, AudioWaveform } from './icons';
import { Volume2, VolumeX, SlidersHorizontal, Sparkles, Wind, CloudRain, Orbit, Ghost, Music, Waves, Mic } from 'lucide-react';
import type { StorySegment } from '../types';
import { useVfx } from '../vfx/VfxContext';
import { vfxAudioSynth, SoundscapeType } from '../vfx/VfxAudioEffects';

interface AudioControllerProps {
  segments: StorySegment[];
}

export const AudioController: React.FC<AudioControllerProps> = ({ segments }) => {
  const { vfx } = useVfx();
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [narrationVolume, setNarrationVolume] = useState(0.85);
  const [ambienceVolume, setAmbienceVolume] = useState(0.35);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [selectedAmbience, setSelectedAmbience] = useState<SoundscapeType>('forest_wind');
  const [showAmbiencePanel, setShowAmbiencePanel] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio API refs for narration visualization
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Auto-sync background soundscape based on story genre, location & weather
  useEffect(() => {
    let autoType: SoundscapeType = 'forest_wind';
    if (vfx.weather === 'rainy' || vfx.weather === 'stormy') {
      autoType = 'rain';
    } else if (vfx.genre === 'sci-fi' || vfx.location === 'space') {
      autoType = 'space_hum';
    } else if (vfx.genre === 'horror' || vfx.genre === 'thriller') {
      autoType = 'dark_drone';
    } else if (vfx.genre === 'fantasy' || vfx.genre === 'romance') {
      autoType = 'ethereal_pad';
    } else if (vfx.location === 'underwater' || vfx.location === 'beach') {
      autoType = 'ocean_waves';
    } else if (vfx.weather === 'windy' || vfx.genre === 'historical' || vfx.genre === 'western') {
      autoType = 'forest_wind';
    }
    
    setSelectedAmbience(autoType);
    
    // Auto-loop ambient soundscape when enabled or during narration playback
    if (vfx.isAudioAtmosphereEnabled || isPlaying) {
      try {
        vfxAudioSynth.playSoundscape(autoType);
      } catch (e) {
        console.warn('Failed to auto-play background ambience soundscape:', e);
      }
    }
  }, [vfx.genre, vfx.weather, vfx.location, vfx.isAudioAtmosphereEnabled]);

  // Adjust soundscape volume dynamically
  useEffect(() => {
    try {
      vfxAudioSynth.setVolume(ambienceVolume);
    } catch (e) {
      console.warn('Error updating ambient volume:', e);
    }
  }, [ambienceVolume]);

  useEffect(() => {
    if (segments.length > 0 && activeSegmentIndex >= segments.length) {
      setActiveSegmentIndex(segments.length - 1);
    }
  }, [segments.length, activeSegmentIndex]);

  const activeSegment = segments[activeSegmentIndex];

  // Initialize Web Audio API safely with error handling
  const initWebAudio = useCallback(() => {
    if (!audioRef.current) return;

    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      try {
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;

        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch (e) {
        console.warn("Web Audio API initialization warning:", e);
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(err => {
        console.warn('Could not resume AudioContext:', err);
      });
    }
  }, []);

  // Sync narration audio source with robust error handling
  useEffect(() => {
    setAudioError(null);
    if (audioRef.current && activeSegment?.audioUrl && !activeSegment.isLoadingAudio) {
      try {
        const src = activeSegment.audioUrl.startsWith('data:') 
          ? activeSegment.audioUrl 
          : `data:audio/mp3;base64,${activeSegment.audioUrl}`;
          
        if (audioRef.current.src !== src) {
          audioRef.current.src = src;
          setProgress(0);
          if (isPlaying) {
            initWebAudio();
            audioRef.current.play().catch(err => {
              console.warn("Autoplay or audio playback prevented:", err);
              setIsPlaying(false);
              setAudioError("Click play to allow browser audio playback");
            });
          }
        }
      } catch (err: any) {
        console.error("Audio src error:", err);
        setAudioError("Unable to load audio track");
        setIsPlaying(false);
      }
    }
  }, [activeSegment, isPlaying, initWebAudio]);

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = narrationVolume;
    }
  }, [narrationVolume]);

  // Context-aware SFX trigger on segment change
  useEffect(() => {
    if (activeSegment?.text) {
      vfxAudioSynth.triggerContextSFX(vfx.genre, activeSegment.text);
    }
  }, [activeSegmentIndex, vfx.genre]);

  // Global Keyboard Navigation & Accessibility Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        if (activeSegmentIndex < segments.length - 1) {
          e.preventDefault();
          jumpToSegment(activeSegmentIndex + 1);
        }
      } else if (e.code === 'ArrowLeft') {
        if (activeSegmentIndex > 0) {
          e.preventDefault();
          jumpToSegment(activeSegmentIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSegmentIndex, segments.length, isPlaying, activeSegment]);

  // Audio Waveform Canvas Animation Loop
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const analyser = analyserRef.current;
    const numBars = 48;
    const barSpacing = 2;
    const totalSpacing = barSpacing * (numBars - 1);
    const barWidth = Math.max(1.5, (width - totalSpacing) / numBars);

    let avgAmplitude = 0;

    if (analyser && isPlaying && !isMuted) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < numBars; i++) {
        const binIndex = Math.floor((i / numBars) * (bufferLength * 0.75));
        const value = dataArray[binIndex] || 0;
        sum += value;

        const percent = value / 255;
        const barHeight = Math.max(2, percent * (height * 0.9));
        const x = i * (barWidth + barSpacing);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y + barHeight, 0, y);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        gradient.addColorStop(0.5, 'rgba(216, 180, 254, 0.95)');
        gradient.addColorStop(1, '#f472b6');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [1.5]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
      avgAmplitude = sum / (numBars * 255);
    } else {
      // Idle ambient wave state
      const time = Date.now() * 0.0025;
      for (let i = 0; i < numBars; i++) {
        const idleVal = 0.12 + Math.sin(time + i * 0.25) * 0.08;
        const barHeight = Math.max(2, idleVal * height);
        const x = i * (barWidth + barSpacing);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = 'rgba(192, 132, 252, 0.3)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [1.5]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    }

    setPulseIntensity(avgAmplitude);

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [isPlaying, isMuted]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      drawWaveform();
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, drawWaveform]);

  // Handle play/pause with complete error handling
  const togglePlayPause = () => {
    if (!audioRef.current || !activeSegment?.audioUrl) return;

    setAudioError(null);
    initWebAudio();

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      try {
        vfxAudioSynth.stopSoundscape();
      } catch (e) {
        console.warn('Error stopping soundscape:', e);
      }
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        try {
          vfxAudioSynth.playSoundscape(selectedAmbience);
        } catch (e) {
          console.warn('Error playing selected ambience soundscape:', e);
        }
      }).catch(e => {
        console.error("Audio playback permission error", e);
        setIsPlaying(false);
        setAudioError("Audio blocked by browser. Click Play again to enable.");
      });
    }
  };

  const handleSelectAmbience = (type: SoundscapeType) => {
    setSelectedAmbience(type);
    try {
      vfxAudioSynth.playSoundscape(type);
    } catch (e) {
      console.warn('Soundscape selection error:', e);
    }
  };

  const handleAudioElementError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error("Media error on audio element:", e);
    setIsPlaying(false);
    setAudioError("Unable to decode or play audio file.");
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    if (activeSegmentIndex < segments.length - 1) {
      setActiveSegmentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setProgress(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const jumpToSegment = (index: number) => {
    if (index === activeSegmentIndex) {
      setProgress(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      if (!isPlaying) togglePlayPause();
    } else {
      setActiveSegmentIndex(index);
      setIsPlaying(true);
      initWebAudio();
    }
  };

  if (!segments || segments.length === 0) return null;
  const hasAnyAudio = segments.some(s => s.audioUrl || s.isLoadingAudio);
  if (!hasAnyAudio) return null;

  const ambienceList: { type: SoundscapeType; label: string; icon: React.ReactNode }[] = [
    { type: 'forest_wind', label: 'Forest Wind', icon: <Wind className="w-3.5 h-3.5 text-emerald-400" /> },
    { type: 'rain', label: 'Rain & Storm', icon: <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> },
    { type: 'space_hum', label: 'Space Hum', icon: <Orbit className="w-3.5 h-3.5 text-blue-400" /> },
    { type: 'dark_drone', label: 'Dark Drone', icon: <Ghost className="w-3.5 h-3.5 text-red-400" /> },
    { type: 'ethereal_pad', label: 'Ethereal Pad', icon: <Music className="w-3.5 h-3.5 text-purple-400" /> },
    { type: 'ocean_waves', label: 'Ocean Waves', icon: <Waves className="w-3.5 h-3.5 text-teal-400" /> },
    { type: 'off', label: 'None', icon: <VolumeX className="w-3.5 h-3.5 text-slate-400" /> },
  ];

  return (
    <motion.div
      initial={{ y: 80, opacity: 0, scale: 0.95 }}
      animate={{ 
        y: 0, 
        opacity: 1, 
        scale: isHovered ? 1.025 : 1,
      }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="AudioController fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Depth-of-Field Blur Aura Layer */}
      <motion.div
        animate={{
          opacity: isHovered ? 0.75 : 0.25,
          scale: isHovered ? 1.15 : 1.0,
          filter: isHovered ? 'blur(28px)' : 'blur(12px)',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="absolute -inset-2 bg-gradient-to-r from-purple-600/40 via-pink-500/30 to-indigo-600/40 rounded-3xl -z-10 pointer-events-none"
      />

      <motion.div 
        animate={{
          backdropFilter: isHovered || showAmbiencePanel ? 'blur(28px) saturate(180%) brightness(110%)' : 'blur(12px) saturate(130%)',
          boxShadow: isHovered 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(168, 85, 247, 0.35)' 
            : isPlaying 
              ? `0 12px 32px rgba(0,0,0,0.5), 0 0 ${15 + pulseIntensity * 25}px rgba(168,85,247,${0.2 + pulseIntensity * 0.35})`
              : '0 12px 32px rgba(0,0,0,0.4)',
        }}
        transition={{ duration: 0.25 }}
        className={`relative bg-slate-900/85 border border-white/15 transition-all duration-300 overflow-hidden ${
          isHovered || showAmbiencePanel ? 'rounded-2xl p-3.5 bg-slate-900/95 border-purple-500/40' : 'rounded-full px-4 py-2 bg-slate-950/80 border-white/10'
        }`}
      >
        {/* Subtle audio aura fill */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-indigo-500/10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: isPlaying ? 0.4 + pulseIntensity * 0.6 : 0.1 }}
        />

        {/* Audio Error Alert Badge */}
        <AnimatePresence>
          {audioError && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-200 text-[10px] font-medium flex items-center justify-between"
            >
              <span>{audioError}</span>
              <button onClick={() => setAudioError(null)} className="text-amber-300 hover:text-white font-bold ml-2">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimalist Compact View (Always Visible) */}
        <div className="flex items-center gap-3 relative z-10">
          {/* Play/Pause Minimal Trigger */}
          <button
            onClick={togglePlayPause}
            disabled={!activeSegment?.audioUrl || activeSegment?.isLoadingAudio}
            className="w-8 h-8 shrink-0 rounded-full bg-purple-600/80 hover:bg-purple-500 text-white shadow-md flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
            style={{
              transform: isPlaying ? `scale(${1 + pulseIntensity * 0.05})` : 'scale(1)',
            }}
          >
            {activeSegment?.isLoadingAudio ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4 pl-0.5" />
            )}
          </button>

          {/* Sleek Prominent Waveform Visualizer */}
          <div className="flex-1 h-6 bg-slate-950/70 rounded-full overflow-hidden border border-white/10 flex items-center px-2">
            <canvas
              ref={canvasRef}
              width={420}
              height={24}
              className="w-full h-full block"
            />
          </div>

          {/* Hover-Exposed Minimalist Volume Control */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 overflow-hidden pl-1 border-l border-white/10"
              >
                <button 
                  onClick={toggleMute}
                  className="text-slate-300 hover:text-white transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-purple-300" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : narrationVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setNarrationVolume(val);
                    if (isMuted && val > 0) setIsMuted(false);
                  }}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400 shrink-0"
                  title="Master Volume"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimal Status Badge */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <span className="font-mono text-[11px] text-purple-200">
              P{activeSegmentIndex + 1}/{segments.length}
            </span>

            {/* Toggle Ambience Panel Button */}
            <button
              onClick={() => setShowAmbiencePanel(!showAmbiencePanel)}
              title="Ambience Soundscape Mixer"
              className={`p-1.5 rounded-full transition-colors border ${
                selectedAmbience !== 'off' 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hidden-Until-Hover Expanded Playback Controls */}
        <AnimatePresence>
          {(isHovered || showAmbiencePanel) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-3 border-t border-white/10 mt-2 flex flex-col gap-2 relative z-10"
            >
              {/* Segment Progress Track */}
              <div className="flex items-center justify-between text-[11px] font-mono text-purple-200/80 px-1">
                <span>Part {activeSegmentIndex + 1}: {Math.floor(progress)}s</span>
                <span>{duration > 0 ? `${Math.floor(duration)}s` : ''}</span>
              </div>

              {/* Minimal Progress Track Scrubber */}
              <div className="relative flex items-center w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 100} 
                  value={progress} 
                  onChange={handleSeek}
                  disabled={!activeSegment?.audioUrl || activeSegment?.isLoadingAudio}
                  className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10"
                />
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-100"
                  style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Segmented Fast Part Jumper */}
              <div className="flex gap-1 h-1.5 w-full pt-1">
                {segments.map((seg, idx) => (
                  <button
                    key={seg.id}
                    onClick={() => jumpToSegment(idx)}
                    title={`Jump to Part ${idx + 1}`}
                    className={`flex-1 h-full rounded-full transition-all ${
                      idx === activeSegmentIndex 
                        ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' 
                        : idx < activeSegmentIndex ? 'bg-white/40' : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>

              {/* Integrated Ambience Mixer Panel */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/10 mt-1 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-200">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Background Soundscape</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-purple-300/60">
                    {selectedAmbience}
                  </span>
                </div>

                {/* Soundscape Selector Pills */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                  {ambienceList.map(a => (
                    <button
                      key={a.type}
                      onClick={() => handleSelectAmbience(a.type)}
                      title={a.label}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        selectedAmbience === a.type
                          ? 'bg-purple-500/30 border-purple-400 text-white shadow-sm'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {a.icon}
                      <span className="mt-0.5 truncate w-full text-center text-[9px]">{a.label}</span>
                    </button>
                  ))}
                </div>

                {/* Dual Volume Sliders */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span className="text-slate-300 text-[10px]">Narration</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={narrationVolume}
                      onChange={(e) => setNarrationVolume(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span className="text-slate-300 text-[10px]">Ambience</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ambienceVolume}
                      onChange={(e) => setAmbienceVolume(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <audio 
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleAudioElementError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </motion.div>
    </motion.div>
  );
};
