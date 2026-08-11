import React from 'react';
import { motion } from 'framer-motion';
import { useVfx } from '../../vfx/VfxContext';
import { Sparkles, Sliders, Volume2, VolumeX, Wand2, Ghost, Rocket, Heart, Search, Zap, Smile, Scroll, Compass, Shield, Sun, CloudRain, Snowflake, CloudFog, CloudLightning, Wind, Sunrise, Sunset, Moon } from 'lucide-react';

interface VfxQuickHudProps {
  onOpenStudio: () => void;
}

export const VfxQuickHud: React.FC<VfxQuickHudProps> = ({ onOpenStudio }) => {
  const { vfx, toggleAutoAnalyze, toggleAudioAtmosphere } = useVfx();

  const tensionColors: Record<string, string> = {
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    climax: 'text-red-400 bg-red-500/20 border-red-500/40 animate-pulse',
  };

  const renderGenreIcon = (genre: string) => {
    switch (genre) {
      case 'horror': return <Ghost className="w-3.5 h-3.5 text-red-400" />;
      case 'sci-fi': return <Rocket className="w-3.5 h-3.5 text-cyan-400" />;
      case 'romance': return <Heart className="w-3.5 h-3.5 text-pink-400" />;
      case 'mystery': return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case 'thriller': return <Zap className="w-3.5 h-3.5 text-rose-400" />;
      case 'comedy': return <Smile className="w-3.5 h-3.5 text-yellow-400" />;
      case 'historical': return <Scroll className="w-3.5 h-3.5 text-amber-600" />;
      case 'western': return <Compass className="w-3.5 h-3.5 text-orange-400" />;
      case 'action': return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'fantasy':
      default: return <Wand2 className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-40">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="group flex items-center gap-1.5 p-1 rounded-full bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-xl text-xs transition-all duration-200"
      >
        {/* Genre Pill & Icon */}
        <div 
          onClick={onOpenStudio}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-slate-200 cursor-pointer transition-colors"
          title={`Active Genre: ${vfx.genre}`}
        >
          {renderGenreIcon(vfx.genre)}
          <span className="capitalize font-semibold text-[11px] hidden sm:inline">{vfx.genre}</span>
        </div>

        {/* Minimal Tension Indicator Dot/Badge */}
        <div 
          onClick={onOpenStudio}
          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider cursor-pointer ${tensionColors[vfx.tension]}`}
          title={`Tension Level: ${vfx.tension}`}
        >
          {vfx.tension}
        </div>

        {/* Auto AI Pill Toggle */}
        <button
          onClick={toggleAutoAnalyze}
          title={vfx.isAutoAnalyzeEnabled ? "Auto AI VFX Enabled" : "Manual VFX Mode"}
          className={`p-1 rounded-full border transition-colors ${
            vfx.isAutoAnalyzeEnabled
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          <Sliders className="w-3 h-3" />
        </button>

        {/* Dynamic Studio Trigger Button */}
        <button
          onClick={onOpenStudio}
          title="Open VFX Studio"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-600/80 hover:bg-purple-500 text-white font-bold shadow-sm transition-all ml-0.5 active:scale-95 text-[11px]"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden group-hover:inline transition-all duration-200">VFX Studio</span>
        </button>
      </motion.div>
    </div>
  );
};
