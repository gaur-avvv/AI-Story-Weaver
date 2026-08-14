import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, WandIcon } from './icons';
import { useVfx } from '../vfx/VfxContext';

interface SegmentSkeletonProps {
  showChoices?: boolean;
  statusMessage?: string;
}

export const SegmentSkeleton: React.FC<SegmentSkeletonProps> = ({ 
  showChoices = false,
  statusMessage = "Crafting next story chapter..."
}) => {
  const { theme } = useVfx();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className={`w-full max-w-3xl mx-auto flex flex-col items-center p-4 sm:p-6 rounded-[2.5rem] relative overflow-hidden paragraph-card-container ${theme.cardStyle} border border-purple-500/20 shadow-2xl backdrop-blur-xl`}
    >
      {/* Top status indicator pill */}
      <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300 font-mono mb-4 animate-pulse">
        <SparklesIcon className="w-3.5 h-3.5 text-purple-400" />
        <span>{statusMessage}</span>
      </div>

      {/* Shimmering Media Frame Skeleton */}
      <div className="relative w-full aspect-[4/3] bg-slate-950/60 rounded-[2rem] overflow-hidden mb-6 border border-white/10 card-media-frame flex flex-col items-center justify-center animate-shimmer">
        <div className="flex flex-col items-center justify-center p-6 text-center gap-3 z-10">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 animate-bounce">
            <WandIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-purple-200/60">
            Synthesizing Visual Atmosphere
          </p>
        </div>
      </div>

      {/* Shimmering Text Paragraph Skeleton Lines */}
      <div className="w-full space-y-3 px-4 py-2">
        <div className="h-5 bg-white/10 rounded-lg w-full animate-shimmer" />
        <div className="h-5 bg-white/10 rounded-lg w-[94%] animate-shimmer" />
        <div className="h-5 bg-white/10 rounded-lg w-[88%] animate-shimmer" />
        <div className="h-5 bg-white/10 rounded-lg w-[62%] animate-shimmer" />
      </div>

      {/* Optional Choice Buttons Skeleton */}
      {showChoices && (
        <div className="w-full mt-8 space-y-3 pt-4 border-t border-white/10">
          <div className="h-4 bg-white/10 rounded w-1/3 mx-auto mb-4 animate-shimmer" />
          <div className="h-12 bg-white/5 border border-white/10 rounded-xl w-full animate-shimmer" />
          <div className="h-12 bg-white/5 border border-white/10 rounded-xl w-full animate-shimmer" />
        </div>
      )}
    </motion.div>
  );
};
