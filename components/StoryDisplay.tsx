import React, { useEffect, useRef } from 'react';
import type { StorySegment } from '../types';
import { ParagraphCard } from './ParagraphCard';
import { motion } from 'framer-motion';
import { useVfx } from '../vfx/VfxContext';

interface StoryDisplayProps {
  segments: StorySegment[];
  onContinue: (choice: string) => void;
  onRebranch: (segmentIndex: number) => void;
  isGenerating: boolean;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ segments, onContinue, onRebranch, isGenerating }) => {
  const { theme, vfx } = useVfx();
  const endOfStoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfStoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments]);

  const lastSegment = segments[segments.length - 1];

  return (
    <div className="w-full flex-grow overflow-y-auto p-4 md:p-8">
      <div className="space-y-8 pb-12">
        {segments.map((segment, index) => (
          <div key={segment.id} className="space-y-6">
            <ParagraphCard segment={segment} />
            {segment.selectedChoice && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl mx-auto flex items-center justify-center"
              >
                <button 
                  onClick={() => onRebranch(index)}
                  disabled={isGenerating}
                  className="px-6 py-3 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/20 hover:border-purple-500/40 transition-all shadow-sm disabled:opacity-50 group flex items-center gap-2 max-w-full"
                >
                  <span className="text-purple-400/70 whitespace-nowrap hidden sm:inline">Chosen Path:</span>
                  <span className="truncate">{segment.selectedChoice}</span>
                  <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-purple-500/20 px-2 py-0.5 rounded ml-2 whitespace-nowrap">Click to rewind</span>
                </button>
              </motion.div>
            )}
          </div>
        ))}
        
        {lastSegment?.choices && !lastSegment.selectedChoice && lastSegment.choices.length > 0 && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="max-w-3xl mx-auto mt-12 space-y-4"
          >
            <h3 className={`text-xl font-display text-white/90 text-center mb-6 ${theme.fontFamily}`}>What happens next?</h3>
            <div className="flex flex-col gap-3">
              {lastSegment.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => onContinue(choice)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group hover:scale-[1.01] active:scale-[0.99] ${theme.buttonStyle}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/70 group-hover:bg-white/20 text-sm transition-colors font-mono font-bold">
                      {index + 1}
                    </span>
                    <span className={`leading-relaxed ${theme.fontFamily}`}>{choice}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        <div ref={endOfStoryRef} />
      </div>
    </div>
  );
};
