import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayIcon, PauseIcon } from './icons';
import { 
  Volume2, 
  VolumeX, 
  SlidersHorizontal, 
  Sparkles, 
  Wind, 
  CloudRain, 
  Orbit, 
  Ghost, 
  Music, 
  Waves, 
  Mic, 
  Flame, 
  Droplets, 
  Zap, 
  Shield, 
  Clock, 
  Wand2,
  Download,
  Headphones,
  FileAudio,
  Check,
  SkipBack,
  SkipForward,
  Volume1,
  ChevronUp,
  Bird,
  Moon,
  CloudLightning,
  BellRing
} from 'lucide-react';
import type { StorySegment } from '../types';
import { useVfx } from '../vfx/VfxContext';
import { vfxAudioSynth, SoundscapeType } from '../vfx/VfxAudioEffects';
import { downloadFullStoryAudio, downloadSingleSegmentAudio, hasAvailableAudio, countAudioSegments } from '../utils/audioExporter';

/** Formats seconds as m:ss for the storybook time labels. */
const mmss = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface AudioControllerProps {
  segments: StorySegment[];
  activeSegmentIndex?: number;
  autoPlayNarration?: boolean;
  isGenerating?: boolean;
  storyTitle?: string;
  onActiveSegmentChange?: (index: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onAudioProgressUpdate?: (currentTime: number, duration: number, progressRatio: number) => void;
  seekAudioRequest?: { segmentIndex: number; progressRatio: number; timestamp: number } | null;
  /** 'default' renders the classic floating panel; 'storybook' renders the
   *  compact ancient-gold "Storyteller bar" instead. */
  variant?: 'default' | 'storybook';
}

export const AudioController: React.FC<AudioControllerProps> = ({ 
  segments,
  activeSegmentIndex: controlledActiveIndex,
  autoPlayNarration = true,
  isGenerating = false,
  storyTitle = 'novella-story',
  onActiveSegmentChange,
  onPlayStateChange,
  onAudioProgressUpdate,
  seekAudioRequest,
  variant = 'default',
}) => {
  const storybook = variant === 'storybook';
  const { vfx } = useVfx();
  const [internalActiveSegmentIndex, setInternalActiveSegmentIndex] = useState(0);
  const [isWaitingForNextGeneratedSegment, setIsWaitingForNextGeneratedSegment] = useState(false);
  const activeSegmentIndex = controlledActiveIndex !== undefined ? controlledActiveIndex : internalActiveSegmentIndex;

  const setActiveSegmentIndex = (indexOrUpdater: number | ((prev: number) => number)) => {
    const nextIdx = typeof indexOrUpdater === 'function' ? indexOrUpdater(activeSegmentIndex) : indexOrUpdater;
    setInternalActiveSegmentIndex(nextIdx);
    onActiveSegmentChange?.(nextIdx);
  };

  const [isPlaying, setInternalIsPlaying] = useState(false);

  const setIsPlaying = (playingOrUpdater: boolean | ((prev: boolean) => boolean)) => {
    const nextPlaying = typeof playingOrUpdater === 'function' ? playingOrUpdater(isPlaying) : playingOrUpdater;
    setInternalIsPlaying(nextPlaying);
    onPlayStateChange?.(nextPlaying);
  };
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [narrationVolume, setNarrationVolume] = useState(0.85);
  const [ambienceVolume, setAmbienceVolume] = useState(0.35);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [selectedAmbience, setSelectedAmbience] = useState<SoundscapeType>('forest_wind');
  const [isDynamicAutoSelect, setIsDynamicAutoSelect] = useState<boolean>(true);
  const [showAmbiencePanel, setShowAmbiencePanel] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [isExportingSceneAudio, setIsExportingSceneAudio] = useState(false);
  const [audioDownloadMessage, setAudioDownloadMessage] = useState<string | null>(null);
  const [showStorybookVolume, setShowStorybookVolume] = useState(false);
  const [showStorybookExpanded, setShowStorybookExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio API refs for narration visualization
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const activeSegment = segments[activeSegmentIndex];

  // Dynamic Auto-sync background soundscape based on story text, genre, location & weather
  useEffect(() => {
    if (!isDynamicAutoSelect) return;

    const currentText = activeSegment?.paragraph || '';
    const autoType = vfxAudioSynth.determineOptimalSoundscape(
      vfx.genre, 
      currentText, 
      vfx.weather, 
      vfx.location
    );
    
    setSelectedAmbience(autoType);
    
    // Auto-loop ambient soundscape when enabled or during narration playback
    if (vfx.isAudioAtmosphereEnabled || isPlaying) {
      try {
        vfxAudioSynth.playSoundscape(autoType);
      } catch (e) {
        console.warn('Failed to auto-play background ambience soundscape:', e);
      }
    }
  }, [
    activeSegmentIndex, 
    activeSegment?.paragraph, 
    vfx.genre, 
    vfx.weather, 
    vfx.location, 
    vfx.isAudioAtmosphereEnabled, 
    isDynamicAutoSelect,
    isPlaying
  ]);

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

  // Handle play/pause with complete error handling and Web Speech API fallback
  const togglePlayPause = () => {
    setAudioError(null);
    initWebAudio();

    if (isPlaying) {
      setIsWaitingForNextGeneratedSegment(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      try {
        vfxAudioSynth.stopSoundscape();
      } catch (e) {
        console.warn('Error stopping soundscape:', e);
      }
    } else {
      if (activeSegment?.audioUrl) {
        if (audioRef.current) {
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
      } else if (activeSegment?.paragraph && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Native Web Speech API 0-cost TTS Fallback for zero-API / low-end devices
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(activeSegment.paragraph);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = narrationVolume;

        utterance.onstart = () => {
          setIsPlaying(true);
          try {
            vfxAudioSynth.playSoundscape(selectedAmbience);
          } catch {}
        };

        utterance.onboundary = (e) => {
          if (e.name === 'word' && activeSegment.paragraph) {
            const charIndex = e.charIndex;
            const textLen = activeSegment.paragraph.length;
            const ratio = textLen > 0 ? charIndex / textLen : 0;
            const estDuration = activeSegment.paragraph.split(/\s+/).length * 0.4;
            setDuration(estDuration);
            setProgress(ratio * estDuration);
            onAudioProgressUpdate?.(ratio * estDuration, estDuration, ratio);
          }
        };

        utterance.onend = () => {
          handleEnded();
        };

        utterance.onerror = () => {
          setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSelectAmbience = (type: SoundscapeType) => {
    setIsDynamicAutoSelect(false);
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
      const cur = audioRef.current.currentTime || 0;
      const dur = audioRef.current.duration || 0;
      setProgress(cur);
      setDuration(dur);
      const ratio = dur > 0 ? Math.min(1, Math.max(0, cur / dur)) : 0;
      onAudioProgressUpdate?.(cur, dur, ratio);
    }
  };

  // Handle external seek requests (e.g. user clicking on a specific word in story display)
  useEffect(() => {
    if (!seekAudioRequest || !audioRef.current) return;
    
    if (seekAudioRequest.segmentIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(seekAudioRequest.segmentIndex);
    }

    const dur = audioRef.current.duration || duration || 0;
    if (dur > 0) {
      const targetTime = Math.min(dur, Math.max(0, seekAudioRequest.progressRatio * dur));
      audioRef.current.currentTime = targetTime;
      setProgress(targetTime);
      onAudioProgressUpdate?.(targetTime, dur, seekAudioRequest.progressRatio);
      if (!isPlaying) {
        initWebAudio();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [seekAudioRequest]);

  // Auto-advance and play next segment as soon as it is generated
  useEffect(() => {
    if (isWaitingForNextGeneratedSegment && autoPlayNarration) {
      if (segments.length > activeSegmentIndex + 1) {
        setIsWaitingForNextGeneratedSegment(false);
        setActiveSegmentIndex(activeSegmentIndex + 1);
        setIsPlaying(true);
      }
    }
  }, [isWaitingForNextGeneratedSegment, segments.length, activeSegmentIndex, autoPlayNarration]);

  const handleEnded = () => {
    if (autoPlayNarration && activeSegmentIndex < segments.length - 1) {
      const nextIdx = activeSegmentIndex + 1;
      setActiveSegmentIndex(nextIdx);
      setIsPlaying(true);
    } else if (autoPlayNarration && isGenerating) {
      // The current part ended, but the next scene is still generating
      setIsWaitingForNextGeneratedSegment(true);
      setIsPlaying(true);
    } else {
      setIsWaitingForNextGeneratedSegment(false);
      setIsPlaying(false);
      setProgress(0);
      onAudioProgressUpdate?.(0, duration || 0, 0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      const dur = audioRef.current.duration || duration || 0;
      const ratio = dur > 0 ? Math.min(1, Math.max(0, time / dur)) : 0;
      onAudioProgressUpdate?.(time, dur, ratio);
    }
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

  /* ------------------------- Storybook bar helpers ----------------------- */

  const storybookSeekRef = useRef<HTMLDivElement | null>(null);
  const storybookSeekDraggingRef = useRef(false);

  /** Pointer-seek inside the storybook bar: maps a client X position on the
   *  track to a ratio and reuses the exact same seek logic as the default
   *  panel (audioRef.currentTime = ratio * duration + progress state sync). */
  const handleStorybookSeekToClientX = (clientX: number) => {
    const el = storybookSeekRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    const dur = audioRef.current?.duration || duration || 0;
    const time = dur > 0 ? Math.min(dur, Math.max(0, ratio * dur)) : 0;
    setProgress(time);
    if (audioRef.current) audioRef.current.currentTime = time;
    onAudioProgressUpdate?.(time, dur, dur > 0 ? Math.min(1, Math.max(0, time / dur)) : 0);
  };

  const handleStorybookSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore browsers that reject pointer capture.
    }
    storybookSeekDraggingRef.current = true;
    handleStorybookSeekToClientX(e.clientX);
  };

  const handleStorybookSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!storybookSeekDraggingRef.current) return;
    handleStorybookSeekToClientX(e.clientX);
  };

  const handleStorybookSeekPointerEnd = () => {
    storybookSeekDraggingRef.current = false;
  };

  /** Wind-button ambience toggle: switches the current soundscape on/off. */
  const toggleStorybookAmbience = () => {
    if (selectedAmbience !== 'off') {
      setIsDynamicAutoSelect(false);
      setSelectedAmbience('off');
      try {
        vfxAudioSynth.stopSoundscape();
      } catch (e) {
        console.warn('Failed to stop soundscape:', e);
      }
    } else {
      setIsDynamicAutoSelect(false);
      handleSelectAmbience('forest_wind');
    }
  };

  const handleDownloadFullStoryAudio = async () => {
    if (!segments || segments.length === 0) return;
    const hasAudio = hasAvailableAudio(segments);
    if (!hasAudio) {
      setAudioError("No generated voice narration is available to download.");
      return;
    }

    setIsExportingAudio(true);
    setAudioDownloadMessage("Assembling story audio tracks...");
    try {
      const result = await downloadFullStoryAudio(
        segments,
        storyTitle,
        (pct, msg) => {
          setAudioDownloadMessage(`${msg} (${pct}%)`);
        }
      );
      if (!result.success) {
        setAudioError(result.error || "Failed to export story audio.");
      } else {
        setAudioDownloadMessage("Audiobook track downloaded!");
        setTimeout(() => setAudioDownloadMessage(null), 3000);
      }
    } catch (e: any) {
      setAudioError(e.message || "Failed to download audio narration.");
    } finally {
      setIsExportingAudio(false);
    }
  };

  const handleDownloadCurrentSceneAudio = async () => {
    if (!activeSegment?.audioUrl) {
      setAudioError("No narration audio available for the active scene.");
      return;
    }

    setIsExportingSceneAudio(true);
    try {
      await downloadSingleSegmentAudio(activeSegment, activeSegmentIndex, storyTitle);
      setAudioDownloadMessage(`Scene ${activeSegmentIndex + 1} audio downloaded!`);
      setTimeout(() => setAudioDownloadMessage(null), 3000);
    } catch (e: any) {
      setAudioError(e.message || "Failed to download scene audio.");
    } finally {
      setIsExportingSceneAudio(false);
    }
  };

  if (!segments || segments.length === 0) return null;
  const hasAnyAudio = segments.some(s => s.audioUrl || s.isLoadingAudio);
  if (!hasAnyAudio) return null;

  const ambienceList: { type: SoundscapeType; label: string; icon: React.ReactNode }[] = [
    { type: 'forest_wind', label: 'Forest Wind', icon: <Wind className="w-3.5 h-3.5 text-emerald-400" /> },
    { type: 'rain', label: 'Rain & Storm', icon: <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> },
    { type: 'campfire', label: 'Campfire', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { type: 'ocean_waves', label: 'Ocean Waves', icon: <Waves className="w-3.5 h-3.5 text-teal-400" /> },
    { type: 'river_stream', label: 'River Stream', icon: <Droplets className="w-3.5 h-3.5 text-sky-400" /> },
    { type: 'birdsong', label: 'Morning Birds', icon: <Bird className="w-3.5 h-3.5 text-lime-400" /> },
    { type: 'crickets_night', label: 'Crickets at Night', icon: <Moon className="w-3.5 h-3.5 text-indigo-300" /> },
    { type: 'thunderstorm', label: 'Thunderstorm', icon: <CloudLightning className="w-3.5 h-3.5 text-sky-300" /> },
    { type: 'wind_chimes', label: 'Wind Chimes', icon: <BellRing className="w-3.5 h-3.5 text-fuchsia-300" /> },
    { type: 'ethereal_pad', label: 'Ethereal Pad', icon: <Music className="w-3.5 h-3.5 text-purple-400" /> },
    { type: 'space_hum', label: 'Space Hum', icon: <Orbit className="w-3.5 h-3.5 text-blue-400" /> },
    { type: 'cyberpunk_city', label: 'Cyberpunk', icon: <Zap className="w-3.5 h-3.5 text-fuchsia-400" /> },
    { type: 'medieval_tavern', label: 'Tavern / Lute', icon: <Shield className="w-3.5 h-3.5 text-orange-400" /> },
    { type: 'dark_drone', label: 'Dark Drone', icon: <Ghost className="w-3.5 h-3.5 text-rose-400" /> },
    { type: 'mystery_clock', label: 'Mystery Clock', icon: <Clock className="w-3.5 h-3.5 text-yellow-400" /> },
    { type: 'off', label: 'None', icon: <VolumeX className="w-3.5 h-3.5 text-slate-400" /> },
  ];

  return (
    <motion.div
      initial={{ y: 80, opacity: 0, scale: 0.95 }}
      animate={
        storybook
          ? { y: 0, opacity: 1, scale: 1 }
          : {
        y: 0, 
        opacity: 1, 
        scale: isHovered ? 1.025 : 1,
      }
      }
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={
        storybook
          ? 'AudioController fixed bottom-28 left-1/2 -translate-x-1/2 z-40 w-[min(56rem,calc(100%-2rem))] pointer-events-auto'
          : 'AudioController fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto'
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Depth-of-Field Blur Aura Layer */}
      {!storybook && (
      <motion.div
        animate={{
          opacity: isHovered ? 0.75 : 0.25,
          scale: isHovered ? 1.15 : 1.0,
          filter: isHovered ? 'blur(28px)' : 'blur(12px)',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="absolute -inset-2 bg-gradient-to-r from-purple-600/40 via-pink-500/30 to-indigo-600/40 rounded-3xl -z-10 pointer-events-none"
      />
      )}

      <motion.div 
        animate={
          storybook
            ? { backdropFilter: 'blur(24px) saturate(140%)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)' }
            : {
          backdropFilter: isHovered || showAmbiencePanel ? 'blur(28px) saturate(180%) brightness(110%)' : 'blur(12px) saturate(130%)',
          boxShadow: isHovered 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(168, 85, 247, 0.35)' 
            : isPlaying 
              ? `0 12px 32px rgba(0,0,0,0.5), 0 0 ${15 + pulseIntensity * 25}px rgba(168,85,247,${0.2 + pulseIntensity * 0.35})`
              : '0 12px 32px rgba(0,0,0,0.4)',
        }
        }
        transition={{ duration: 0.25 }}
        className={
          storybook
            ? 'relative flex items-center gap-3 rounded-2xl border border-[#d4af37]/40 bg-[rgba(24,18,10,0.85)] px-4 py-3 shadow-2xl backdrop-blur-xl'
            : `relative bg-slate-900/85 border border-white/15 transition-all duration-300 overflow-hidden ${
          isHovered || showAmbiencePanel ? 'rounded-2xl p-3.5 bg-slate-900/95 border-purple-500/40' : 'rounded-full px-4 py-2 bg-slate-950/80 border-white/10'
        }`
        }
      >
        {/* Subtle audio aura fill */}
        {!storybook && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-indigo-500/10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: isPlaying ? 0.4 + pulseIntensity * 0.6 : 0.1 }}
        />
        )}

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

        {/* Storybook "Storyteller bar" — compact ancient-gold glass surface
            reusing the exact same audio state and handlers as the default
            panel (single shared <audio> element, no duplicated logic). */}
        {storybook ? (
        <div className="relative z-10 flex min-w-0 items-center gap-3">
          {/* 1 — Big circular play / pause */}
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={!activeSegment?.audioUrl || activeSegment?.isLoadingAudio}
            title={isPlaying ? 'Pause narration' : 'Play narration'}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 text-slate-900 shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeSegment?.isLoadingAudio ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-slate-900" />
            ) : isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5 pl-0.5" />
            )}
          </button>

          {/* 2 — Prev / next scene skip (same code path as auto-advance) */}
          <button
            type="button"
            onClick={() => jumpToSegment(activeSegmentIndex - 1)}
            disabled={activeSegmentIndex <= 0}
            title="Previous scene"
            className="shrink-0 rounded-full p-1.5 text-[#e8d9a8] transition-colors hover:bg-white/10 hover:text-[#f7efdc] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => jumpToSegment(activeSegmentIndex + 1)}
            disabled={activeSegmentIndex >= segments.length - 1}
            title="Next scene"
            className="shrink-0 rounded-full p-1.5 text-[#e8d9a8] transition-colors hover:bg-white/10 hover:text-[#f7efdc] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* 3 — Scene label / seek slider / time labels */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-xs font-semibold text-[#e8d9a8]">
                Scene {activeSegmentIndex + 1} of {segments.length}
              </span>
              {activeSegment?.chapterTitle ? (
                <span
                  className="min-w-0 truncate text-[11px] text-amber-200/70"
                  title={activeSegment.chapterTitle}
                >
                  {activeSegment.chapterTitle}
                </span>
              ) : null}
            </div>
            <div
              ref={storybookSeekRef}
              aria-label="Seek within scene"
              title="Seek within scene"
              className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/10"
              onPointerDown={handleStorybookSeekPointerDown}
              onPointerMove={handleStorybookSeekPointerMove}
              onPointerUp={handleStorybookSeekPointerEnd}
              onPointerCancel={handleStorybookSeekPointerEnd}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#b08d3e] via-[#d4af37] to-[#f1d27a] transition-[width] duration-100"
                style={{
                  width: `${(duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0) * 100}%`,
                }}
              />
            </div>
            <div className="text-[10px] tabular-nums text-amber-200/60">
              {mmss(progress)} / {mmss(duration)}
            </div>
          </div>

          {/* 4 — Mute / volume popover / ambience toggle */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute narration' : 'Mute narration'}
              className="rounded-full p-1.5 text-[#e8d9a8] transition-colors hover:bg-white/10 hover:text-[#f7efdc]"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStorybookVolume((v) => !v)}
                title="Narration volume"
                className={`rounded-full p-1.5 transition-colors hover:bg-white/10 ${
                  showStorybookVolume ? 'text-[#f7efdc]' : 'text-[#e8d9a8] hover:text-[#f7efdc]'
                }`}
              >
                <Volume1 className="h-4 w-4" />
              </button>
              {showStorybookVolume ? (
                <div className="absolute bottom-full right-0 z-50 mb-3 flex items-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[rgba(24,18,10,0.95)] px-3 py-2 shadow-2xl backdrop-blur-xl">
                  <Volume1 className="h-3.5 w-3.5 shrink-0 text-[#e8d9a8]" />
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
                    className="w-24 cursor-pointer accent-amber-400"
                    title="Narration volume"
                  />
                  <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-amber-200/70">
                    {Math.round((isMuted ? 0 : narrationVolume) * 100)}%
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleStorybookAmbience}
              title={selectedAmbience !== 'off' ? 'Turn off ambience soundscape' : 'Turn on ambience soundscape'}
              className={`rounded-full p-1.5 transition-colors hover:bg-white/10 ${
                selectedAmbience !== 'off' ? 'text-amber-300' : 'text-[#e8d9a8]/60 hover:text-[#f7efdc]'
              }`}
            >
              <Wind className="h-4 w-4" />
            </button>
          </div>

          {/* 5 — Expand chevron: reuses the full default expanded panel */}
          <button
            type="button"
            onClick={() => setShowStorybookExpanded((v) => !v)}
            title={showStorybookExpanded ? 'Hide audio studio' : 'Show audio studio'}
            className="shrink-0 rounded-full p-1.5 text-[#e8d9a8] transition-colors hover:bg-white/10 hover:text-[#f7efdc]"
          >
            <ChevronUp
              className={`h-4 w-4 transition-transform duration-200 ${showStorybookExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        ) : (
        /* Minimalist Compact View (Always Visible) */
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

          {/* Minimal Status Badge & Action Buttons */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <span className="font-mono text-[11px] text-purple-200">
              P{activeSegmentIndex + 1}/{segments.length}
            </span>

            {/* Download Audio Only Quick Button */}
            <button
              onClick={handleDownloadFullStoryAudio}
              disabled={isExportingAudio}
              title="Download Full Story Audio (.wav)"
              className={`p-1.5 rounded-full transition-colors border ${
                isExportingAudio
                  ? 'bg-purple-500/30 text-purple-200 border-purple-400'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              {isExportingAudio ? (
                <div className="w-3.5 h-3.5 border-2 border-t-transparent border-purple-300 rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Toggle Ambience Panel Button */}
            <button
              onClick={() => setShowAmbiencePanel(!showAmbiencePanel)}
              title="Ambience Soundscape & Audio Export Studio"
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
        )}

        {/* Hidden-Until-Hover Expanded Playback Controls */}
        <AnimatePresence>
          {(!storybook && (isHovered || showAmbiencePanel)) || (storybook && showStorybookExpanded) ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={
                storybook
                  ? 'absolute bottom-full right-0 z-50 mb-3 flex max-h-[70vh] w-[26rem] max-w-[calc(100vw-3rem)] flex-col gap-2 overflow-y-auto rounded-2xl border border-[#d4af37]/40 bg-[rgba(24,18,10,0.95)] p-3 shadow-2xl backdrop-blur-xl'
                  : 'pt-3 border-t border-white/10 mt-2 flex flex-col gap-2 relative z-10'
              }
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
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/10 mt-1 flex flex-col gap-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs font-bold text-purple-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Atmospheric Soundscape</span>
                  </div>
                  
                  {/* Dynamic Auto-Select Mode Toggle */}
                  <button
                    onClick={() => {
                      const next = !isDynamicAutoSelect;
                      setIsDynamicAutoSelect(next);
                      if (next) {
                        const autoType = vfxAudioSynth.determineOptimalSoundscape(
                          vfx.genre, 
                          activeSegment?.paragraph || '', 
                          vfx.weather, 
                          vfx.location
                        );
                        setSelectedAmbience(autoType);
                        vfxAudioSynth.playSoundscape(autoType);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border transition-all ${
                      isDynamicAutoSelect 
                        ? 'bg-purple-500/30 text-purple-200 border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                    title="Automatically picks the soundscape based on story mood, setting, and keywords"
                  >
                    <Wand2 className={`w-3 h-3 ${isDynamicAutoSelect ? 'text-purple-300 animate-pulse' : 'text-slate-400'}`} />
                    <span>{isDynamicAutoSelect ? '✨ Auto-Sync ON' : 'Auto-Sync OFF'}</span>
                  </button>
                </div>

                {/* Soundscape Selector Responsive Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                  {ambienceList.map(a => (
                    <button
                      key={a.type}
                      onClick={() => handleSelectAmbience(a.type)}
                      title={a.label}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                        selectedAmbience === a.type
                          ? 'bg-purple-500/30 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="shrink-0">{a.icon}</span>
                      <span className="truncate w-full text-left">{a.label}</span>
                    </button>
                  ))}
                </div>

                {/* Dual Volume Sliders with Value Display */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span className="text-slate-300 text-[10px] whitespace-nowrap">Voice {Math.round(narrationVolume * 100)}%</span>
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
                    <span className="text-slate-300 text-[10px] whitespace-nowrap">Ambience {Math.round(ambienceVolume * 100)}%</span>
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

                {/* Audio Export & Download Section */}
                <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-200/80 font-medium flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-purple-400" />
                      <span>Audiobook & Narration Export</span>
                      <span className="text-[10px] text-purple-300/60 font-mono">
                        ({countAudioSegments(segments)}/{segments.length} voiced)
                      </span>
                    </span>
                    {audioDownloadMessage && (
                      <span className="text-[10px] font-medium text-purple-300 truncate max-w-[200px]">
                        {audioDownloadMessage}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadFullStoryAudio}
                      disabled={isExportingAudio || !hasAvailableAudio(segments)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                        isExportingAudio
                          ? 'bg-purple-600/40 text-purple-200 border-purple-400/50 cursor-wait'
                          : !hasAvailableAudio(segments)
                          ? 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
                          : 'bg-purple-600/30 hover:bg-purple-600/50 text-white border-purple-500/40 hover:border-purple-400 active:scale-[0.98]'
                      }`}
                      title="Stitch and download full narration audiobook (.wav)"
                    >
                      {isExportingAudio ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-t-transparent border-purple-300 rounded-full animate-spin shrink-0" />
                          <span>Assembling Audio...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                          <span>Download Full Audiobook (.wav)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadCurrentSceneAudio}
                      disabled={isExportingSceneAudio || !activeSegment?.audioUrl}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold transition-all shrink-0 ${
                        isExportingSceneAudio
                          ? 'bg-white/10 text-purple-200 border-white/20 cursor-wait'
                          : !activeSegment?.audioUrl
                          ? 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:border-white/20 active:scale-[0.98]'
                      }`}
                      title={`Download Scene ${activeSegmentIndex + 1} narration audio`}
                    >
                      {isExportingSceneAudio ? (
                        <div className="w-3.5 h-3.5 border-2 border-t-transparent border-purple-300 rounded-full animate-spin" />
                      ) : (
                        <FileAudio className="w-3.5 h-3.5 text-purple-300" />
                      )}
                      <span>Scene {activeSegmentIndex + 1}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
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
