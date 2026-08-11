import React, { useEffect } from 'react';
import type { StorySegment } from '../types';
import { motion } from 'framer-motion';
import { useVfx } from '../vfx/VfxContext';

interface ParagraphCardProps {
  segment: StorySegment;
}

export const ParagraphCard: React.FC<ParagraphCardProps> = ({ segment }) => {
  const { theme, vfx, processParagraphForVfx } = useVfx();

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
      className={`w-full max-w-3xl mx-auto flex flex-col items-center p-4 sm:p-6 rounded-[2.5rem] transition-all duration-500 group relative overflow-hidden ${theme.cardStyle}`}
      style={{
        boxShadow: `0 16px 40px rgba(0,0,0,0.4), 0 0 30px ${theme.auraGlow}`
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-[2.5rem]" />
      </div>

      {/* Media Frame */}
      <div className={`relative w-full aspect-[4/3] bg-black/40 rounded-[2rem] shadow-[inset_0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden mb-6 border ${theme.borderStyle} z-10`}>
        {segment.isLoadingImage ? (
          <div className="w-full h-full bg-white/5 animate-pulse flex items-center justify-center">
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Generating Visual Scene...</span>
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

      {/* Story Paragraph Content */}
      <div className="w-full text-center px-4 py-2">
        <p className={`text-slate-100 text-xl md:text-2xl leading-relaxed drop-shadow-sm ${theme.fontFamily}`}>
          {segment.paragraph}
        </p>
      </div>
    </motion.div>
  );
};
