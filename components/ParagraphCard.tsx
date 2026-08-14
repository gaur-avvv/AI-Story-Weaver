import React, { useEffect } from 'react';
import type { StorySegment } from '../types';
import { motion } from 'framer-motion';
import { useVfx } from '../vfx/VfxContext';
import { WandIcon, SparklesIcon } from './icons';

interface ParagraphCardProps {
  segment: StorySegment;
  fontFamilyPreference?: 'serif' | 'sans' | 'mono';
}

export const ParagraphCard: React.FC<ParagraphCardProps> = ({ segment, fontFamilyPreference }) => {
  const { theme, processParagraphForVfx } = useVfx();

  const fontClass = fontFamilyPreference === 'serif' 
    ? 'font-display' 
    : fontFamilyPreference === 'mono' 
    ? 'font-mono' 
    : fontFamilyPreference === 'sans' 
    ? 'font-sans' 
    : theme.fontFamily;

  useEffect(() => {
    if (segment.paragraph) {
      processParagraphForVfx(segment.paragraph);
    }
  }, [segment.paragraph]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.005 }}
      className={`w-full max-w-3xl mx-auto flex flex-col items-center p-4 sm:p-6 rounded-[2.5rem] transition-all duration-500 group relative overflow-hidden paragraph-card-container card-inner-padding ${theme.cardStyle}`}
      style={{
        boxShadow: `0 16px 40px rgba(0,0,0,0.4), 0 0 30px ${theme.auraGlow}`
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-[2.5rem]" />
      </div>

      {/* Media Frame with Container Query support */}
      <div className={`relative w-full aspect-[4/3] bg-black/40 rounded-[2rem] shadow-[inset_0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden mb-6 border ${theme.borderStyle} z-10 card-media-frame`}>
        {segment.isLoadingImage ? (
          <div className="w-full h-full bg-slate-950/80 animate-shimmer flex flex-col items-center justify-center p-6 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 animate-pulse">
              <WandIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-purple-200/70 uppercase tracking-widest font-semibold">
              Painting Visual Scene...
            </span>
          </div>
        ) : segment.imageUrl ? (
          <img
            src={segment.imageUrl}
            alt="Story illustration"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-white/5"></div>
        )}
      </div>

      {/* Audio Loading Skeleton Indicator */}
      {segment.isLoadingAudio && (
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300 font-mono mb-3 animate-pulse">
          <SparklesIcon className="w-3.5 h-3.5 text-purple-400" />
          <span>Synthesizing voice narration...</span>
        </div>
      )}

      {/* Story Paragraph Content */}
      <div className="w-full text-center px-4 py-2">
        <p className={`text-slate-100 text-xl md:text-2xl leading-relaxed drop-shadow-sm card-paragraph-text ${fontClass}`}>
          {segment.paragraph}
        </p>
      </div>
    </motion.div>
  );
};

