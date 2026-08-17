import React, { useEffect, useMemo } from 'react';
import type { StorySegment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVfx } from '../vfx/VfxContext';
import { WandIcon, SparklesIcon } from './icons';
import { Volume2, Sparkles, BookOpen } from 'lucide-react';

interface ParagraphCardProps {
  segment: StorySegment;
  fontFamilyPreference?: 'serif' | 'sans' | 'mono' | 'cinzel' | 'merriweather' | 'lora' | 'outfit' | 'inter' | 'fantasy' | 'handwriting';
  isAudioActive?: boolean;
  audioProgress?: number;
  onSeekWord?: (progressRatio: number) => void;
}

export const ParagraphCard: React.FC<ParagraphCardProps> = ({ 
  segment, 
  fontFamilyPreference, 
  isAudioActive,
  audioProgress = 0,
  onSeekWord,
}) => {
  const { theme, processParagraphForVfx } = useVfx();

  const getFontClass = () => {
    switch (fontFamilyPreference) {
      case 'serif': return 'font-display font-serif';
      case 'cinzel': return 'font-cinzel';
      case 'merriweather': return 'font-merriweather';
      case 'lora': return 'font-lora';
      case 'sans': return 'font-sans';
      case 'outfit': return 'font-outfit';
      case 'inter': return 'font-inter';
      case 'fantasy': return 'font-fantasy';
      case 'handwriting': return 'font-handwriting';
      case 'mono': return 'font-mono';
      default: return theme.fontFamily || 'font-display font-serif';
    }
  };

  const fontClass = getFontClass();

  useEffect(() => {
    if (isAudioActive && segment.paragraph) {
      processParagraphForVfx(segment.paragraph);
    }
  }, [isAudioActive, segment.paragraph, processParagraphForVfx]);

  // Parse paragraph into word tokens and whitespace for precision synchronized highlighting
  const tokens = useMemo(() => {
    if (!segment.paragraph) return [];
    const rawTokens = segment.paragraph.match(/\S+|\s+/g) || [];
    let wordCounter = 0;
    return rawTokens.map((raw, idx) => {
      const isWord = /\S/.test(raw);
      const wIdx = isWord ? wordCounter++ : -1;
      return {
        id: idx,
        text: raw,
        isWord,
        wordIndex: wIdx,
      };
    });
  }, [segment.paragraph]);

  const totalWords = useMemo(() => {
    return tokens.filter(t => t.isWord).length;
  }, [tokens]);

  const activeWordIndex = useMemo(() => {
    if (!isAudioActive || totalWords === 0 || typeof audioProgress !== 'number') {
      return -1;
    }
    return Math.min(totalWords - 1, Math.max(0, Math.floor(audioProgress * totalWords)));
  }, [isAudioActive, totalWords, audioProgress]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isAudioActive ? 1.01 : 1,
      }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.005 }}
      className={`w-full max-w-3xl mx-auto flex flex-col items-center p-4 sm:p-6 rounded-[2.5rem] transition-all duration-500 group relative overflow-hidden paragraph-card-container card-inner-padding ${theme.cardStyle} ${
        isAudioActive ? 'ring-2 ring-purple-400/80 shadow-[0_0_35px_rgba(168,85,247,0.4)]' : ''
      }`}
      style={{
        boxShadow: isAudioActive 
          ? `0 20px 45px rgba(0,0,0,0.5), 0 0 35px rgba(168,85,247,0.45), 0 0 25px ${theme.auraGlow}`
          : `0 16px 40px rgba(0,0,0,0.4), 0 0 30px ${theme.auraGlow}`
      }}
    >
      {/* Active Narration Pulsing Badge with Read-Along Word Tracker */}
      <AnimatePresence>
        {isAudioActive && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-600/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.8)] border border-purple-300/40 backdrop-blur-md"
          >
            <motion.div 
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="relative flex items-center justify-center text-purple-200"
            >
              <Volume2 className="w-4 h-4 text-white" />
              <span className="absolute -inset-1 rounded-full bg-purple-400/40 animate-ping" />
            </motion.div>
            
            <div className="flex items-center gap-0.5 h-3 px-0.5">
              <motion.span 
                animate={{ height: ['4px', '12px', '4px'] }} 
                transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }} 
                className="w-0.5 bg-white rounded-full inline-block" 
              />
              <motion.span 
                animate={{ height: ['8px', '14px', '6px'] }} 
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.1, ease: 'easeInOut' }} 
                className="w-0.5 bg-white rounded-full inline-block" 
              />
              <motion.span 
                animate={{ height: ['4px', '10px', '4px'] }} 
                transition={{ repeat: Infinity, duration: 0.7, delay: 0.2, ease: 'easeInOut' }} 
                className="w-0.5 bg-white rounded-full inline-block" 
              />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide font-sans text-purple-100">
              <span className="uppercase">Narrating</span>
              {totalWords > 0 && activeWordIndex >= 0 && (
                <span className="bg-purple-900/60 px-1.5 py-0.5 rounded-md text-[10px] text-purple-200 border border-purple-400/30">
                  Word {activeWordIndex + 1}/{totalWords}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-[2.5rem]" />
      </div>

      {/* Media Frame with auto-adjusting aspect ratio and optical margins */}
      <div className={`relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[460px] bg-slate-950/60 rounded-2xl sm:rounded-3xl shadow-[inset_0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden mb-5 sm:mb-6 border ${theme.borderStyle} z-10 card-media-frame`}>
        {segment.isLoadingImage ? (
          <div className="w-full h-full bg-slate-950/80 animate-shimmer flex flex-col items-center justify-center p-6 text-center gap-2.5">
            <div className="w-11 h-11 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 animate-pulse">
              <WandIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-purple-200/70 uppercase tracking-widest font-semibold">
              Painting Visual Scene...
            </span>
          </div>
        ) : segment.imageUrl ? (
          <motion.img
            key={segment.imageUrl}
            src={segment.imageUrl}
            alt="Story illustration"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-white/5"></div>
        )}
      </div>

      {/* Audio Loading Skeleton Indicator */}
      {segment.isLoadingAudio && (
        <div className="flex items-center gap-2 px-3.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300 font-mono mb-3 animate-pulse">
          <SparklesIcon className="w-3.5 h-3.5 text-purple-400" />
          <span>Synthesizing voice narration...</span>
        </div>
      )}

      {/* Story Paragraph Content with Word-by-Word Synchronized Highlighting */}
      <div className="w-full text-center px-3 sm:px-6 py-2">
        <p className={`text-slate-100 text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-loose drop-shadow-sm card-paragraph-text ${fontClass}`}>
          {isAudioActive ? (
            tokens.map((token) => {
              if (!token.isWord) {
                return <span key={token.id}>{token.text}</span>;
              }

              const isCurrent = token.wordIndex === activeWordIndex;
              const isPast = token.wordIndex < activeWordIndex;

              return (
                <span
                  key={token.id}
                  onClick={() => onSeekWord?.(token.wordIndex / totalWords)}
                  title="Click to jump narration here"
                  className={`inline-block cursor-pointer rounded-lg transition-all duration-150 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-[0_0_20px_rgba(168,85,247,0.85)] ring-2 ring-purple-300 px-1.5 py-0.5 -my-0.5 scale-105 z-20'
                      : isPast
                      ? 'text-purple-100/95 font-medium hover:text-white hover:underline decoration-purple-400/50 underline-offset-4'
                      : 'text-slate-300/70 hover:text-slate-100'
                  }`}
                >
                  {token.text}
                </span>
              );
            })
          ) : (
            tokens.map((token) => (
              <span key={token.id}>{token.text}</span>
            ))
          )}
        </p>

        {/* Subtle interactive read-along hint during narration */}
        {isAudioActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="mt-3 text-[11px] font-sans text-purple-200/60 flex items-center justify-center gap-1.5 no-print"
          >
            <BookOpen className="w-3 h-3 text-purple-300" />
            <span>Read-Along sync active • Tap any word to jump audio</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

