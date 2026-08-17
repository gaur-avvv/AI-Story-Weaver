import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { 
  VfxState, 
  VfxGenre, 
  VfxTension, 
  VfxWeather, 
  VfxTimeOfDay, 
  VfxLocation, 
  VfxEmotion, 
  VfxProgression, 
  VfxRelationship, 
  VfxPacing, 
  VfxSupernatural, 
  VfxMoralAlignment, 
  VfxTwist,
  GenreThemeConfig,
  StorySentimentAnalysis,
} from './types';
import { analyzeStoryParagraph, DEFAULT_SENTIMENT_PALETTES } from './storyAnalyzer';
import { vfxAudioSynth } from './VfxAudioEffects';
import { globalStoryGraph } from '../services/storyGraphState';

const SENTIMENT_ATMOSPHERES: Record<string, { accentColor: string; bgGradient: string; auraGlow: string }> = {
  determined: {
    accentColor: '#f59e0b',
    bgGradient: 'from-slate-950 via-amber-950/40 to-yellow-950/50',
    auraGlow: 'rgba(245, 158, 11, 0.35)',
  },
  triumphant: {
    accentColor: '#eab308',
    bgGradient: 'from-slate-950 via-yellow-950/40 to-amber-950/50',
    auraGlow: 'rgba(234, 179, 8, 0.35)',
  },
  fearful: {
    accentColor: '#dc2626',
    bgGradient: 'from-slate-950 via-red-950/60 to-black',
    auraGlow: 'rgba(220, 38, 38, 0.35)',
  },
  scared: {
    accentColor: '#ef4444',
    bgGradient: 'from-slate-950 via-red-950/50 to-slate-900',
    auraGlow: 'rgba(239, 68, 68, 0.35)',
  },
  hopeful: {
    accentColor: '#10b981',
    bgGradient: 'from-slate-950 via-emerald-950/30 to-teal-950/40',
    auraGlow: 'rgba(16, 185, 129, 0.3)',
  },
  calm: {
    accentColor: '#14b8a6',
    bgGradient: 'from-slate-950 via-teal-950/30 to-slate-900',
    auraGlow: 'rgba(20, 184, 166, 0.25)',
  },
  grieving: {
    accentColor: '#3b82f6',
    bgGradient: 'from-slate-950 via-slate-900/60 to-blue-950/50',
    auraGlow: 'rgba(59, 130, 246, 0.3)',
  },
  sad: {
    accentColor: '#6366f1',
    bgGradient: 'from-slate-950 via-indigo-950/40 to-slate-900',
    auraGlow: 'rgba(99, 102, 241, 0.3)',
  },
  suspicious: {
    accentColor: '#d97706',
    bgGradient: 'from-slate-950 via-zinc-900/60 to-amber-950/30',
    auraGlow: 'rgba(217, 119, 6, 0.3)',
  },
  furious: {
    accentColor: '#ea580c',
    bgGradient: 'from-slate-950 via-orange-950/50 to-red-950/60',
    auraGlow: 'rgba(234, 88, 12, 0.4)',
  },
  angry: {
    accentColor: '#f97316',
    bgGradient: 'from-slate-950 via-red-950/40 to-orange-950/50',
    auraGlow: 'rgba(249, 115, 22, 0.35)',
  },
  curious: {
    accentColor: '#a855f7',
    bgGradient: 'from-slate-950 via-purple-950/50 to-indigo-950/60',
    auraGlow: 'rgba(168, 85, 247, 0.35)',
  },
  in_love: {
    accentColor: '#ec4899',
    bgGradient: 'from-slate-950 via-pink-950/30 to-rose-950/40',
    auraGlow: 'rgba(236, 72, 153, 0.35)',
  },
};

export const GENRE_THEMES: Record<VfxGenre, GenreThemeConfig> = {
  horror: {
    name: 'Horror / Creeping Dark',
    primaryColor: '#991b1b', // Red-800
    secondaryColor: '#18181b', // Zinc-900
    accentColor: '#dc2626', // Red-600
    bgGradient: 'from-slate-950 via-red-950/40 to-black',
    fontFamily: 'font-serif tracking-tight',
    cardStyle: 'bg-red-950/20 border-red-900/40 shadow-[0_0_30px_rgba(153,27,27,0.3)] backdrop-blur-2xl',
    buttonStyle: 'bg-red-900/60 hover:bg-red-800 border-red-600/50 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.4)]',
    cursorStyle: 'cursor-crosshair',
    borderStyle: 'border-red-800/50',
    auraGlow: 'rgba(220, 38, 38, 0.25)',
  },
  'sci-fi': {
    name: 'Science Fiction / Cyber Matrix',
    primaryColor: '#06b6d4', // Cyan-500
    secondaryColor: '#3b82f6', // Blue-500
    accentColor: '#10b981', // Emerald-500
    bgGradient: 'from-slate-950 via-cyan-950/30 to-slate-900',
    fontFamily: 'font-mono tracking-wide',
    cardStyle: 'bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)] backdrop-blur-2xl',
    buttonStyle: 'bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-400/50 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    cursorStyle: 'cursor-crosshair',
    borderStyle: 'border-cyan-500/40',
    auraGlow: 'rgba(6, 182, 212, 0.25)',
  },
  romance: {
    name: 'Romance / Starlight Dreams',
    primaryColor: '#ec4899', // Pink-500
    secondaryColor: '#f43f5e', // Rose-500
    accentColor: '#fbbf24', // Amber-400
    bgGradient: 'from-slate-950 via-pink-950/30 to-rose-950/40',
    fontFamily: 'font-sans tracking-normal',
    cardStyle: 'bg-pink-950/20 border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.25)] backdrop-blur-2xl rounded-3xl',
    buttonStyle: 'bg-gradient-to-r from-pink-500/30 to-rose-500/30 hover:from-pink-500/50 hover:to-rose-500/50 border-pink-400/40 text-pink-100 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    cursorStyle: 'cursor-pointer',
    borderStyle: 'border-pink-500/30',
    auraGlow: 'rgba(236, 72, 153, 0.25)',
  },
  mystery: {
    name: 'Mystery / Noir Investigation',
    primaryColor: '#d97706', // Amber-600
    secondaryColor: '#475569', // Slate-600
    accentColor: '#ef4444', // Red-500
    bgGradient: 'from-amber-950/30 via-slate-950 to-black',
    fontFamily: 'font-serif tracking-normal',
    cardStyle: 'bg-amber-950/10 border-amber-700/30 shadow-[0_0_25px_rgba(217,119,6,0.15)] backdrop-blur-2xl',
    buttonStyle: 'bg-amber-900/30 hover:bg-amber-900/50 border-amber-600/40 text-amber-100 shadow-md',
    cursorStyle: 'cursor-pointer',
    borderStyle: 'border-amber-700/40',
    auraGlow: 'rgba(217, 119, 6, 0.2)',
  },
  fantasy: {
    name: 'High Fantasy / Arcane Realm',
    primaryColor: '#8b5cf6', // Violet-500
    secondaryColor: '#a855f7', // Purple-500
    accentColor: '#eab308', // Yellow-500
    bgGradient: 'from-slate-950 via-purple-950/40 to-indigo-950/50',
    fontFamily: 'font-sans tracking-wide',
    cardStyle: 'bg-purple-950/20 border-purple-500/30 shadow-[0_0_35px_rgba(139,92,246,0.25)] backdrop-blur-3xl',
    buttonStyle: 'bg-purple-600/30 hover:bg-purple-600/50 border-purple-400/40 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    cursorStyle: 'cursor-pointer',
    borderStyle: 'border-purple-500/40',
    auraGlow: 'rgba(168, 85, 247, 0.3)',
  },
  thriller: {
    name: 'Thriller / High Tension',
    primaryColor: '#ef4444', // Red-500
    secondaryColor: '#0ea5e9', // Sky-500
    accentColor: '#f59e0b', // Amber-500
    bgGradient: 'from-black via-slate-950 to-red-950/30',
    fontFamily: 'font-sans font-bold tracking-wider',
    cardStyle: 'bg-black/80 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)] backdrop-blur-xl',
    buttonStyle: 'bg-red-600/40 hover:bg-red-600/60 border-red-500 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)]',
    cursorStyle: 'cursor-crosshair',
    borderStyle: 'border-red-500/50',
    auraGlow: 'rgba(239, 68, 68, 0.3)',
  },
  comedy: {
    name: 'Comedy / Whimsical Joy',
    primaryColor: '#f59e0b', // Amber-500
    secondaryColor: '#10b981', // Emerald-500
    accentColor: '#3b82f6', // Blue-500
    bgGradient: 'from-slate-950 via-amber-950/20 to-indigo-950/30',
    fontFamily: 'font-sans tracking-wide',
    cardStyle: 'bg-amber-900/10 border-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-2xl rounded-3xl',
    buttonStyle: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 hover:from-amber-500/50 hover:to-yellow-500/50 border-amber-300/50 text-amber-100 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    cursorStyle: 'cursor-pointer',
    borderStyle: 'border-amber-400/40',
    auraGlow: 'rgba(245, 158, 11, 0.25)',
  },
  historical: {
    name: 'Historical / Antique Chronicle',
    primaryColor: '#b45309', // Amber-700
    secondaryColor: '#78350f', // Amber-900
    accentColor: '#fef08a', // Yellow-200
    bgGradient: 'from-stone-950 via-amber-950/30 to-stone-900',
    fontFamily: 'font-serif tracking-normal',
    cardStyle: 'bg-amber-950/15 border-amber-700/40 shadow-[0_0_20px_rgba(180,83,9,0.2)] backdrop-blur-xl',
    buttonStyle: 'bg-amber-800/40 hover:bg-amber-800/60 border-amber-600/50 text-amber-100 font-serif',
    cursorStyle: 'cursor-pointer',
    borderStyle: 'border-amber-800/50',
    auraGlow: 'rgba(180, 83, 9, 0.2)',
  },
  western: {
    name: 'Western / Dusty Frontier',
    primaryColor: '#d97706', // Amber-600
    secondaryColor: '#92400e', // Amber-800
    accentColor: '#14b8a6', // Teal-500
    bgGradient: 'from-stone-950 via-orange-950/40 to-stone-900',
    fontFamily: 'font-serif font-bold tracking-wider',
    cardStyle: 'bg-orange-950/20 border-orange-700/40 shadow-[0_0_25px_rgba(217,119,6,0.2)] backdrop-blur-xl',
    buttonStyle: 'bg-orange-800/40 hover:bg-orange-800/60 border-orange-600 text-orange-100 font-bold',
    cursorStyle: 'cursor-crosshair',
    borderStyle: 'border-orange-700/50',
    auraGlow: 'rgba(217, 119, 6, 0.25)',
  },
  action: {
    name: 'Action / Tactical Combat',
    primaryColor: '#10b981', // Emerald-500
    secondaryColor: '#059669', // Emerald-600
    accentColor: '#f97316', // Orange-500
    bgGradient: 'from-slate-950 via-emerald-950/30 to-black',
    fontFamily: 'font-mono font-bold tracking-widest',
    cardStyle: 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-xl',
    buttonStyle: 'bg-emerald-600/30 hover:bg-emerald-600/50 border-emerald-400 text-emerald-100 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    cursorStyle: 'cursor-crosshair',
    borderStyle: 'border-emerald-500/50',
    auraGlow: 'rgba(16, 185, 129, 0.3)',
  },
};

interface VfxContextType {
  vfx: VfxState;
  theme: GenreThemeConfig;
  setGenre: (g: VfxGenre) => void;
  setTension: (t: VfxTension) => void;
  setWeather: (w: VfxWeather) => void;
  setTimeOfDay: (time: VfxTimeOfDay) => void;
  setLocation: (loc: VfxLocation) => void;
  setEmotion: (emo: VfxEmotion) => void;
  setSupernatural: (sup: VfxSupernatural) => void;
  setTwist: (twist: VfxTwist) => void;
  toggleAutoAnalyze: () => void;
  toggleAudioAtmosphere: () => void;
  toggleFireEmbers: () => void;
  toggleFlowerPetals: () => void;
  toggleLushPlants: () => void;
  toggleHorizonHills: () => void;
  toggleRiverWater: () => void;
  toggleCosmicDust: () => void;
  triggerScreenShake: () => void;
  triggerLightning: () => void;
  triggerTwistEffect: (twist: VfxTwist) => void;
  processParagraphForVfx: (paragraph: string) => void;
  updateVfxState: (partial: Partial<VfxState>) => void;
  // Fallbacks for backward compatibility
  toggleNightVision: () => void;
  toggleThermalVision: () => void;
  triggerJumpScare: () => void;
}

const defaultVfxState: VfxState = {
  genre: 'fantasy',
  tension: 'low',
  weather: 'clear',
  timeOfDay: 'day',
  location: 'default',
  emotion: 'calm',
  progression: 'exposition',
  relationship: 'none',
  pacing: 'medium',
  supernatural: 'none',
  moralAlignment: 'neutral',
  activeTwist: 'none',
  sentiment: {
    tone: 'neutral',
    label: 'Atmospheric Storyscape',
    score: 0,
    tensionScore: 0.2,
    energyScore: 0.3,
    dominantKeywords: [],
    palette: DEFAULT_SENTIMENT_PALETTES.neutral,
  },
  showFireEmbers: false,
  showFlowerPetals: false,
  showLushPlants: false,
  showHorizonHills: false,
  showRiverWater: false,
  showCosmicDust: false,
  isAutoAnalyzeEnabled: true,
  isAudioAtmosphereEnabled: false,
  shakeTrigger: 0,
  lightningTrigger: 0,
};

const VfxContext = createContext<VfxContextType | undefined>(undefined);

export const VfxProvider: React.FC<{ children: ReactNode; initialGenre?: string }> = ({ children, initialGenre }) => {
  const [vfx, setVfx] = useState<VfxState>(() => {
    const validGenre = (initialGenre && initialGenre in GENRE_THEMES) ? (initialGenre as VfxGenre) : 'fantasy';
    return { 
      ...defaultVfxState, 
      genre: validGenre,
    };
  });

  const vfxRef = useRef(vfx);
  vfxRef.current = vfx;
  const lastAnalyzedParagraphRef = useRef<string>('');

  const [dominantSentiment, setDominantSentiment] = useState<string>('neutral');

  // Subscribe to globalStoryGraph to dynamically adjust UI accent color & background atmosphere
  useEffect(() => {
    const updateDominantSentiment = () => {
      const dominant = globalStoryGraph.getDominantSentiment();
      setDominantSentiment(dominant);
    };

    updateDominantSentiment();
    const unsubscribe = globalStoryGraph.subscribe(updateDominantSentiment);
    return unsubscribe;
  }, []);

  // Handle atmosphere audio soundscapes
  useEffect(() => {
    if (vfx.isAudioAtmosphereEnabled) {
      vfxAudioSynth.autoSelectForGenre(vfx.genre, vfx.weather);
    } else {
      vfxAudioSynth.stopSoundscape();
    }
  }, [vfx.isAudioAtmosphereEnabled, vfx.genre, vfx.weather]);

  const updateVfxState = useCallback((partial: Partial<VfxState>) => {
    setVfx(prev => ({ ...prev, ...partial }));
  }, []);

  const setGenre = useCallback((genre: VfxGenre) => {
    updateVfxState({ 
      genre,
      showFlowerPetals: genre === 'fantasy' || genre === 'romance',
      showCosmicDust: genre === 'sci-fi',
      showFireEmbers: genre === 'action' || genre === 'horror' || genre === 'western',
    });
  }, [updateVfxState]);

  const setTension = useCallback((tension: VfxTension) => updateVfxState({ tension }), [updateVfxState]);
  const setWeather = useCallback((weather: VfxWeather) => updateVfxState({ weather }), [updateVfxState]);
  const setTimeOfDay = useCallback((timeOfDay: VfxTimeOfDay) => updateVfxState({ timeOfDay }), [updateVfxState]);
  const setLocation = useCallback((location: VfxLocation) => updateVfxState({ 
    location,
    showLushPlants: location === 'forest' || location === 'default',
    showRiverWater: location === 'underwater' || location === 'forest' || location === 'default',
  }), [updateVfxState]);

  const setEmotion = useCallback((emotion: VfxEmotion) => updateVfxState({ emotion }), [updateVfxState]);
  const setSupernatural = useCallback((supernatural: VfxSupernatural) => updateVfxState({ supernatural }), [updateVfxState]);
  const setTwist = useCallback((activeTwist: VfxTwist) => updateVfxState({ activeTwist }), [updateVfxState]);

  const toggleAutoAnalyze = useCallback(() => setVfx(prev => ({ ...prev, isAutoAnalyzeEnabled: !prev.isAutoAnalyzeEnabled })), []);
  const toggleAudioAtmosphere = useCallback(() => setVfx(prev => ({ ...prev, isAudioAtmosphereEnabled: !prev.isAudioAtmosphereEnabled })), []);
  
  const toggleFireEmbers = useCallback(() => setVfx(prev => ({ ...prev, showFireEmbers: !prev.showFireEmbers })), []);
  const toggleFlowerPetals = useCallback(() => setVfx(prev => ({ ...prev, showFlowerPetals: !prev.showFlowerPetals })), []);
  const toggleLushPlants = useCallback(() => setVfx(prev => ({ ...prev, showLushPlants: !prev.showLushPlants })), []);
  const toggleHorizonHills = useCallback(() => setVfx(prev => ({ ...prev, showHorizonHills: !prev.showHorizonHills })), []);
  const toggleRiverWater = useCallback(() => setVfx(prev => ({ ...prev, showRiverWater: !prev.showRiverWater })), []);
  const toggleCosmicDust = useCallback(() => setVfx(prev => ({ ...prev, showCosmicDust: !prev.showCosmicDust })), []);

  const triggerScreenShake = useCallback(() => setVfx(prev => ({ ...prev, shakeTrigger: prev.shakeTrigger + 1 })), []);
  const triggerLightning = useCallback(() => {
    setVfx(prev => ({ ...prev, lightningTrigger: prev.lightningTrigger + 1 }));
    if (vfxRef.current.isAudioAtmosphereEnabled) vfxAudioSynth.playLightningThunder();
  }, []);
  
  // Backward compatibility stubs
  const toggleNightVision = useCallback(() => {}, []);
  const toggleThermalVision = useCallback(() => {}, []);
  const triggerJumpScare = useCallback(() => {}, []);

  const triggerTwistEffect = useCallback((twist: VfxTwist) => {
    setVfx(prev => ({ ...prev, activeTwist: twist, shakeTrigger: prev.shakeTrigger + 1 }));
    if (vfxRef.current.isAudioAtmosphereEnabled) vfxAudioSynth.playMagicChime();
  }, []);

  const processParagraphForVfx = useCallback((paragraph: string) => {
    if (!vfxRef.current.isAutoAnalyzeEnabled || !paragraph) return;
    if (lastAnalyzedParagraphRef.current === paragraph) return;
    lastAnalyzedParagraphRef.current = paragraph;

    const inferred = analyzeStoryParagraph(paragraph);
    if (Object.keys(inferred).length > 0) {
      updateVfxState(inferred);
      if (inferred.tension === 'climax') {
        triggerScreenShake();
      }
      if (inferred.weather === 'stormy') {
        triggerLightning();
      }
    }
  }, [updateVfxState, triggerScreenShake, triggerLightning]);

  const theme = useMemo(() => {
    const baseTheme = GENRE_THEMES[vfx.genre] || GENRE_THEMES.fantasy;
    const sentimentAtmosphere = SENTIMENT_ATMOSPHERES[dominantSentiment];
    if (sentimentAtmosphere) {
      return {
        ...baseTheme,
        accentColor: sentimentAtmosphere.accentColor,
        bgGradient: sentimentAtmosphere.bgGradient,
        auraGlow: sentimentAtmosphere.auraGlow,
      };
    }
    return baseTheme;
  }, [vfx.genre, dominantSentiment]);

  const value = useMemo(() => ({
    vfx,
    theme,
    setGenre,
    setTension,
    setWeather,
    setTimeOfDay,
    setLocation,
    setEmotion,
    setSupernatural,
    setTwist,
    toggleAutoAnalyze,
    toggleAudioAtmosphere,
    toggleFireEmbers,
    toggleFlowerPetals,
    toggleLushPlants,
    toggleHorizonHills,
    toggleRiverWater,
    toggleCosmicDust,
    triggerScreenShake,
    triggerLightning,
    triggerTwistEffect,
    processParagraphForVfx,
    updateVfxState,
    toggleNightVision,
    toggleThermalVision,
    triggerJumpScare,
  }), [
    vfx,
    theme,
    setGenre,
    setTension,
    setWeather,
    setTimeOfDay,
    setLocation,
    setEmotion,
    setSupernatural,
    setTwist,
    toggleAutoAnalyze,
    toggleAudioAtmosphere,
    toggleFireEmbers,
    toggleFlowerPetals,
    toggleLushPlants,
    toggleHorizonHills,
    toggleRiverWater,
    toggleCosmicDust,
    triggerScreenShake,
    triggerLightning,
    triggerTwistEffect,
    processParagraphForVfx,
    updateVfxState,
    toggleNightVision,
    toggleThermalVision,
    triggerJumpScare,
  ]);

  return (
    <VfxContext.Provider value={value}>
      {children}
    </VfxContext.Provider>
  );
};

export const useVfx = () => {
  const context = useContext(VfxContext);
  if (!context) {
    throw new Error('useVfx must be used within a VfxProvider');
  }
  return context;
};
