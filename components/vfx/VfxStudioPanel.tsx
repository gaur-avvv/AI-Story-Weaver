import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVfx } from '../../vfx/VfxContext';
import { VfxGenre, VfxTension, VfxWeather, VfxTimeOfDay, VfxLocation, VfxEmotion, VfxSupernatural } from '../../vfx/types';
import { 
  X, Sparkles, Wand2, Ghost, Rocket, Heart, Search, Zap, Smile, Scroll, Compass, Shield,
  Sun, CloudRain, Snowflake, CloudFog, CloudLightning, Wind, Sunrise, Sunset, Moon,
  Map, Trees, Building2, Orbit, Waves, Castle, Briefcase, Frown, Flame, AlertCircle,
  Target, Cpu, Star, Volume2, Mountain, Leaf, Sliders, Minus, Flower2, ChevronDown, ChevronRight
} from 'lucide-react';

interface VfxStudioPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VfxStudioPanel: React.FC<VfxStudioPanelProps> = ({ isOpen, onClose }) => {
  const {
    vfx,
    setGenre,
    setTension,
    setWeather,
    setTimeOfDay,
    setLocation,
    setEmotion,
    setSupernatural,
    toggleAutoAnalyze,
    toggleAudioAtmosphere,
    toggleFireEmbers,
    toggleFlowerPetals,
    toggleLushPlants,
    toggleHorizonHills,
    toggleRiverWater,
    toggleCosmicDust,
    triggerLightning,
  } = useVfx();

  // Accordion section states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    genre: true,       // Narrative & Genre open by default
    environment: false,
    emotion: false,
    effects: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  const genresList: { id: VfxGenre; label: string; icon: React.ReactNode }[] = [
    { id: 'fantasy', label: 'High Fantasy', icon: <Wand2 className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'horror', label: 'Horror', icon: <Ghost className="w-3.5 h-3.5 text-red-400" /> },
    { id: 'sci-fi', label: 'Sci-Fi', icon: <Rocket className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'romance', label: 'Romance', icon: <Heart className="w-3.5 h-3.5 text-pink-400" /> },
    { id: 'mystery', label: 'Mystery', icon: <Search className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'thriller', label: 'Thriller', icon: <Zap className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'comedy', label: 'Comedy', icon: <Smile className="w-3.5 h-3.5 text-yellow-400" /> },
    { id: 'historical', label: 'Historical', icon: <Scroll className="w-3.5 h-3.5 text-amber-600" /> },
    { id: 'western', label: 'Western', icon: <Compass className="w-3.5 h-3.5 text-orange-400" /> },
    { id: 'action', label: 'Action', icon: <Shield className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  const tensionsList: { id: VfxTension; label: string }[] = [
    { id: 'low', label: 'Low (Calm)' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'Suspense' },
    { id: 'climax', label: 'Climax' },
  ];

  const weathersList: { id: VfxWeather; label: string; icon: React.ReactNode }[] = [
    { id: 'clear', label: 'Clear', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'rainy', label: 'Rainy', icon: <CloudRain className="w-3.5 h-3.5" /> },
    { id: 'snowy', label: 'Snowy', icon: <Snowflake className="w-3.5 h-3.5" /> },
    { id: 'foggy', label: 'Foggy', icon: <CloudFog className="w-3.5 h-3.5" /> },
    { id: 'stormy', label: 'Stormy', icon: <CloudLightning className="w-3.5 h-3.5" /> },
    { id: 'windy', label: 'Windy', icon: <Wind className="w-3.5 h-3.5" /> },
  ];

  const timesList: { id: VfxTimeOfDay; label: string; icon: React.ReactNode }[] = [
    { id: 'dawn', label: 'Dawn', icon: <Sunrise className="w-3.5 h-3.5" /> },
    { id: 'day', label: 'Day', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'dusk', label: 'Dusk', icon: <Sunset className="w-3.5 h-3.5" /> },
    { id: 'night', label: 'Night', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'midnight', label: 'Midnight', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  const locationsList: { id: VfxLocation; label: string; icon: React.ReactNode }[] = [
    { id: 'default', label: 'Standard', icon: <Map className="w-3.5 h-3.5" /> },
    { id: 'forest', label: 'Forest', icon: <Trees className="w-3.5 h-3.5" /> },
    { id: 'city', label: 'City', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'space', label: 'Space', icon: <Orbit className="w-3.5 h-3.5" /> },
    { id: 'underwater', label: 'Underwater', icon: <Waves className="w-3.5 h-3.5" /> },
    { id: 'desert', label: 'Desert', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'haunted_house', label: 'Haunted Mansion', icon: <Castle className="w-3.5 h-3.5" /> },
    { id: 'office', label: 'Office', icon: <Briefcase className="w-3.5 h-3.5" /> },
  ];

  const emotionsList: { id: VfxEmotion; label: string; icon: React.ReactNode }[] = [
    { id: 'calm', label: 'Calm', icon: <Smile className="w-3.5 h-3.5" /> },
    { id: 'happy', label: 'Happy', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'sad', label: 'Sad', icon: <Frown className="w-3.5 h-3.5" /> },
    { id: 'angry', label: 'Angry', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'scared', label: 'Scared', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: 'in_love', label: 'In Love', icon: <Heart className="w-3.5 h-3.5" /> },
  ];

  const supernaturalsList: { id: VfxSupernatural; label: string; icon: React.ReactNode }[] = [
    { id: 'none', label: 'None', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: 'magic', label: 'Magic', icon: <Wand2 className="w-3.5 h-3.5" /> },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'divine', label: 'Divine Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'cosmic', label: 'Cosmic Power', icon: <Star className="w-3.5 h-3.5" /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="VfxStudioPanel w-full max-w-md h-full bg-slate-950/85 backdrop-blur-2xl border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto"
        >
          {/* Glassmorphism Top Bar Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">VFX Studio</h2>
                <p className="text-xs text-purple-200/60 font-medium">Dynamic Atmosphere Engine</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core AI Story Sync Banner */}
          <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950/60 border border-purple-500/25 rounded-2xl p-3.5 mb-5 flex items-center justify-between backdrop-blur-sm">
            <div>
              <div className="text-xs font-bold text-purple-200">AI Context Sync</div>
              <div className="text-[11px] text-purple-300/60">Auto-aligns VFX with story tone</div>
            </div>
            <button
              onClick={toggleAutoAnalyze}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                vfx.isAutoAnalyzeEnabled
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{vfx.isAutoAnalyzeEnabled ? 'Active' : 'Manual'}</span>
            </button>
          </div>

          {/* Segmented Accordion Controls */}
          <div className="flex-1 space-y-3">
            
            {/* Accordion 1: Narrative & Genre */}
            <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md overflow-hidden">
              <button
                onClick={() => toggleSection('genre')}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-purple-200 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                  <span>Narrative Genre & Tension</span>
                </div>
                {openSections.genre ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {openSections.genre && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3.5 border-t border-white/10 space-y-3 bg-slate-950/40"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {genresList.map(g => (
                        <button
                          key={g.id}
                          onClick={() => setGenre(g.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left text-[11px] font-semibold transition-all ${
                            vfx.genre === g.id
                              ? 'bg-purple-600/40 border-purple-400 text-white shadow-sm'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {g.icon}
                          <span>{g.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <div className="text-[10px] font-bold uppercase text-purple-300/80 mb-1.5">Story Tension</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {tensionsList.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setTension(t.id)}
                            className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                              vfx.tension === t.id
                                ? 'bg-purple-600 text-white border-purple-300'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 2: Environment & Setting */}
            <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md overflow-hidden">
              <button
                onClick={() => toggleSection('environment')}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-cyan-200 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-cyan-400" />
                  <span>Weather, Time & Location</span>
                </div>
                {openSections.environment ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {openSections.environment && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3.5 border-t border-white/10 space-y-3 bg-slate-950/40"
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase text-cyan-300/80 mb-1.5">Weather</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {weathersList.map(w => (
                          <button
                            key={w.id}
                            onClick={() => setWeather(w.id)}
                            className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                              vfx.weather === w.id
                                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            {w.icon}
                            <span>{w.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-indigo-300/80 mb-1.5">Time of Day</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {timesList.map(tm => (
                          <button
                            key={tm.id}
                            onClick={() => setTimeOfDay(tm.id)}
                            className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                              vfx.timeOfDay === tm.id
                                ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            {tm.icon}
                            <span>{tm.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-emerald-300/80 mb-1.5">Location</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {locationsList.map(loc => (
                          <button
                            key={loc.id}
                            onClick={() => setLocation(loc.id)}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                              vfx.location === loc.id
                                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            {loc.icon}
                            <span>{loc.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 3: Emotion & Aura */}
            <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md overflow-hidden">
              <button
                onClick={() => toggleSection('emotion')}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-pink-200 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>Emotion & Energy Aura</span>
                </div>
                {openSections.emotion ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {openSections.emotion && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3.5 border-t border-white/10 space-y-3 bg-slate-950/40"
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase text-pink-300/80 mb-1.5">Character Emotion</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {emotionsList.map(emo => (
                          <button
                            key={emo.id}
                            onClick={() => setEmotion(emo.id)}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                              vfx.emotion === emo.id
                                ? 'bg-pink-500/30 border-pink-400 text-pink-200'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            {emo.icon}
                            <span>{emo.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-amber-300/80 mb-1.5">Supernatural Power</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {supernaturalsList.map(sup => (
                          <button
                            key={sup.id}
                            onClick={() => setSupernatural(sup.id)}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                              vfx.supernatural === sup.id
                                ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            {sup.icon}
                            <span>{sup.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 4: Cinematic Scene Effects */}
            <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md overflow-hidden">
              <button
                onClick={() => toggleSection('effects')}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-amber-200 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Cinematic Scene Effects</span>
                </div>
                {openSections.effects ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {openSections.effects && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3.5 border-t border-white/10 space-y-2 bg-slate-950/40"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={toggleFireEmbers}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          vfx.showFireEmbers ? 'bg-orange-600/30 text-orange-200 border-orange-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span>Fire Embers</span>
                      </button>

                      <button
                        onClick={toggleFlowerPetals}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          vfx.showFlowerPetals ? 'bg-pink-600/30 text-pink-200 border-pink-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Flower2 className="w-3.5 h-3.5 text-pink-400" />
                        <span>Sakura Petals</span>
                      </button>

                      <button
                        onClick={toggleLushPlants}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          vfx.showLushPlants ? 'bg-emerald-600/30 text-emerald-200 border-emerald-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Lush Plants</span>
                      </button>

                      <button
                        onClick={toggleHorizonHills}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          vfx.showHorizonHills ? 'bg-indigo-600/30 text-indigo-200 border-indigo-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Mountain className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Horizon Hills</span>
                      </button>

                      <button
                        onClick={toggleRiverWater}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          vfx.showRiverWater ? 'bg-cyan-600/30 text-cyan-200 border-cyan-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Waves className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Serene River</span>
                      </button>

                      <button
                        onClick={toggleCosmicDust}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          vfx.showCosmicDust ? 'bg-purple-600/30 text-purple-200 border-purple-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 text-purple-400" />
                        <span>Cosmic Dust</span>
                      </button>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={toggleAudioAtmosphere}
                        className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                          vfx.isAudioAtmosphereEnabled ? 'bg-purple-600 text-white border-purple-300' : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Soundscape Synth</span>
                      </button>

                      <button
                        onClick={triggerLightning}
                        className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 rounded-xl text-[11px] font-bold hover:bg-cyan-900/50 transition-colors"
                      >
                        <CloudLightning className="w-3.5 h-3.5" />
                        <span>Lightning Flash</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

