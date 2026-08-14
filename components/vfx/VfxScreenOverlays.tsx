import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVfx } from '../../vfx/VfxContext';

export const VfxScreenOverlays: React.FC = () => {
  const { vfx, theme } = useVfx();
  const [showLightning, setShowLightning] = useState(false);

  // Handle Lightning trigger cleanly
  useEffect(() => {
    if (vfx.lightningTrigger > 0) {
      setShowLightning(true);
      const timer = setTimeout(() => setShowLightning(false), 250);
      return () => clearTimeout(timer);
    }
  }, [vfx.lightningTrigger]);

  const sentiment = vfx.sentiment || {
    tone: 'neutral',
    label: 'Atmospheric Storyscape',
    score: 0,
    tensionScore: 0.2,
    palette: {
      accent: theme.primaryColor,
      overlayTint: 'rgba(139, 92, 246, 0.05)',
      auraGlow: theme.auraGlow,
      vignetteStyle: 'radial-gradient(ellipse at center, transparent 50%, rgba(2, 6, 23, 0.7) 100%)',
    }
  };

  // Contextual condition checks based on story location, weather, and genre
  const shouldShowPlants = vfx.showLushPlants && vfx.location !== 'space' && vfx.location !== 'office' && vfx.location !== 'city';
  const shouldShowHills = vfx.showHorizonHills && vfx.location !== 'space' && vfx.location !== 'underwater';
  const shouldShowRiver = vfx.showRiverWater && (vfx.location === 'underwater' || vfx.location === 'forest' || vfx.location === 'default' || vfx.weather === 'rainy' || vfx.weather === 'stormy');

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* 1. Dynamic Sentiment & Mood Atmospheric Color Tint */}
      <motion.div
        key={`sentiment-tint-${sentiment.tone}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        className="absolute inset-0 pointer-events-none mix-blend-color transition-colors duration-1000"
        style={{
          backgroundColor: sentiment.palette.overlayTint || 'rgba(0,0,0,0)',
        }}
      />

      {/* 2. Emotional Mood Vignette */}
      <motion.div
        key={`sentiment-vignette-${sentiment.tone}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: sentiment.palette.vignetteStyle,
        }}
      />

      {/* 3. Specialized Sentiment Overlays */}
      {/* Triumphant / Golden Celestial Rays */}
      {sentiment.tone === 'triumphant' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 inset-x-0 h-96 bg-gradient-to-b from-amber-400/20 via-yellow-300/10 to-transparent pointer-events-none mix-blend-screen"
        />
      )}

      {/* Ominous / Pulse of Dread */}
      {sentiment.tone === 'ominous' && (
        <motion.div
          animate={{ opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-red-950/20 pointer-events-none mix-blend-multiply border-4 border-red-900/30"
        />
      )}

      {/* Fiery Action / Heat Haze */}
      {sentiment.tone === 'fiery_action' && (
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2], y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-orange-600/20 via-red-600/10 to-transparent pointer-events-none mix-blend-screen"
        />
      )}

      {/* Mystical / Arcane Star Shimmer */}
      {sentiment.tone === 'mystical' && (
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-tr from-purple-900/15 via-indigo-900/10 to-violet-900/20 pointer-events-none mix-blend-screen"
        />
      )}

      {/* Melancholic / Rain Haze */}
      {sentiment.tone === 'melancholic' && (
        <div className="absolute inset-0 bg-slate-900/30 pointer-events-none backdrop-blur-[0.5px] mix-blend-luminosity" />
      )}

      {/* 4. Cinematic Lightning Flash (Weather / Climax) */}
      <AnimatePresence>
        {showLightning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-indigo-100/30 mix-blend-screen z-50"
          />
        )}
      </AnimatePresence>

      {/* 5. Lush Plants & Foliage Framing (Corner Vines & Leaf Silhouettes) */}
      {shouldShowPlants && (
        <>
          {/* Top-Left Swaying Foliage */}
          <motion.div 
            animate={{ rotate: [-1, 2.5, -1], y: [0, 3, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-6 -left-6 w-56 h-56 md:w-80 md:h-80 opacity-40 mix-blend-soft-light pointer-events-none text-emerald-900"
          >
            <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full">
              <path d="M 0 0 C 50 20, 100 80, 120 150 C 100 130, 60 110, 0 100 Z" opacity="0.8" />
              <path d="M 0 0 C 80 10, 140 50, 180 100 C 140 90, 90 70, 0 50 Z" opacity="0.6" />
              <path d="M 30 0 C 90 30, 110 90, 100 160 C 80 120, 50 80, 0 80 Z" opacity="0.7" />
            </svg>
          </motion.div>

          {/* Top-Right Swaying Vines */}
          <motion.div 
            animate={{ rotate: [1, -2, 1], y: [0, 4, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-6 -right-6 w-56 h-56 md:w-80 md:h-80 opacity-40 mix-blend-soft-light pointer-events-none text-emerald-950 scale-x-[-1]"
          >
            <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full">
              <path d="M 0 0 C 50 20, 100 80, 120 150 C 100 130, 60 110, 0 100 Z" opacity="0.8" />
              <path d="M 0 0 C 80 10, 140 50, 180 100 C 140 90, 90 70, 0 50 Z" opacity="0.6" />
            </svg>
          </motion.div>
        </>
      )}

      {/* 6. Rolling Horizon Hills & Mountain Silhouettes */}
      {shouldShowHills && (
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 pointer-events-none opacity-45 mix-blend-multiply">
          <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M 0 300 L 0 180 Q 200 120, 400 160 Q 600 80, 800 150 Q 1000 100, 1200 170 L 1200 300 Z"
              fill="rgba(15, 23, 42, 0.7)"
            />
            <path
              d="M 0 300 L 0 210 Q 300 160, 600 220 Q 900 150, 1200 230 L 1200 300 Z"
              fill="rgba(2, 6, 23, 0.9)"
            />
          </svg>
        </div>
      )}

      {/* 7. Serene River & Water Wave Reflections Layer */}
      {shouldShowRiver && (
        <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-cyan-900/30 via-teal-900/15 to-transparent" />
          <motion.div
            animate={{ x: [-20, 20, -20] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-0 inset-x-0 h-12 opacity-40"
          >
            <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full text-cyan-300">
              <path
                d="M 0 30 Q 150 15, 300 30 Q 450 45, 600 30 Q 750 15, 900 30 Q 1050 45, 1200 30 L 1200 60 L 0 60 Z"
                fill="currentColor"
                opacity="0.15"
              />
              <path
                d="M 0 40 Q 200 25, 400 40 Q 600 55, 800 40 Q 1000 25, 1200 40 L 1200 60 L 0 60 Z"
                fill="currentColor"
                opacity="0.25"
              />
            </svg>
          </motion.div>
        </div>
      )}

      {/* 8. Soft Atmospheric Sunlight / Moonlight Volumetric Rays */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-slate-950/40 pointer-events-none" 
      />
    </div>
  );
};
