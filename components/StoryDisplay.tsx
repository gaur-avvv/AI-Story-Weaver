import React, { useEffect, useRef } from 'react';
import type { StorySegment } from '../types';
import { ParagraphCard } from './ParagraphCard';
import { ChapterDivider } from './ChapterDivider';
import { SegmentSkeleton } from './SegmentSkeleton';
import { PlotTwistsPanel } from './PlotTwistsPanel';
import { motion } from 'framer-motion';
import { useVfx } from '../vfx/VfxContext';
import { extractChapters, getChapterStats } from '../utils/chapterUtils';
import { Plus, BookOpen, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface StoryDisplayProps {
  segments: StorySegment[];
  onContinue: (choice: string) => void;
  onRebranch: (segmentIndex: number) => void;
  onGenerateNextChapter?: () => void;
  isGenerating: boolean;
  fontFamilyPreference?: 'serif' | 'sans' | 'mono' | 'cinzel' | 'merriweather' | 'lora' | 'outfit' | 'inter' | 'fantasy' | 'handwriting';
  fontSize?: number;
  justifyText?: boolean;
  storyLength?: string;
  activeAudioSegmentIndex?: number;
  isAudioPlaying?: boolean;
  audioProgress?: number;
  onSeekAudioRatio?: (segmentIndex: number, ratio: number) => void;
  onUpdateChapterTitle?: (segmentIndex: number, newTitle: string) => void;
  onRemoveChapter?: (segmentIndex: number) => void;
  onAddChapterAt?: (segmentIndex: number) => void;
  storyTitle?: string;
  genre?: string;
  targetAudience?: string;
  apiKey?: string | null;
  textProvider?: string;
  textModel?: string;
  otherApiKey?: string;
  options?: { customBaseUrl?: string; cloudflareAccountId?: string };
  imageAspectRatio?: string;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
  segments, 
  onContinue, 
  onRebranch, 
  onGenerateNextChapter,
  isGenerating, 
  fontFamilyPreference,
  fontSize,
  justifyText = true,
  storyLength = 'medium',
  activeAudioSegmentIndex,
  isAudioPlaying,
  audioProgress = 0,
  onSeekAudioRatio,
  onUpdateChapterTitle,
  onRemoveChapter,
  onAddChapterAt,
  storyTitle = 'Novella Story',
  genre = 'fantasy',
  targetAudience = 'children',
  apiKey = null,
  textProvider = 'gemini',
  textModel = 'gemini-2.5-flash',
  otherApiKey,
  options,
  imageAspectRatio = '16:9',
}) => {
  const { theme, processParagraphForVfx } = useVfx();
  const endOfStoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfStoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, isGenerating]);

  // Smoothly auto-scroll to the currently playing audio narration segment
  useEffect(() => {
    if (isAudioPlaying && typeof activeAudioSegmentIndex === 'number' && activeAudioSegmentIndex >= 0) {
      const el = document.getElementById(`story-segment-card-${activeAudioSegmentIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isAudioPlaying, activeAudioSegmentIndex]);

  // Background sentiment & VFX analyzer for the active or latest segment
  const activeIdx = (typeof activeAudioSegmentIndex === 'number' && activeAudioSegmentIndex >= 0 && activeAudioSegmentIndex < segments.length)
    ? activeAudioSegmentIndex
    : segments.length - 1;
  const activeSegParagraph = segments[activeIdx]?.paragraph || '';

  useEffect(() => {
    if (activeSegParagraph) {
      processParagraphForVfx(activeSegParagraph);
    }
  }, [activeSegParagraph, processParagraphForVfx]);

  const lastSegment = segments[segments.length - 1];
  const chapters = extractChapters(segments);
  const nextChapterNumber = chapters.length + 1;
  const previousParagraphs = segments.map(s => s.paragraph);

  const lengthDisplayMap: Record<string, string> = {
    'very_short': '1-2 scenes',
    'short': '3-4 scenes',
    'medium': '5-6 scenes',
    'long': '7-8 scenes',
    'very_long': '9-12 scenes',
  };

  const isAnyRetrying = segments.some(s => s.isRetryingImage || s.isRetryingAudio);

  return (
    <div className="w-full flex-grow overflow-y-auto p-2 sm:p-4 md:p-8 story-container">
      {isAnyRetrying && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="max-w-3xl mx-auto mb-6 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center justify-between shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
            <span>
              <strong>Auto-Retrying Media:</strong> Encountered a transient rate-limit or error. Switching to optimized fallback engine...
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            Active Recovery
          </span>
        </motion.div>
      )}

      <div className="space-y-8 pb-12">
        {segments.map((segment, index) => {
          // Check if this segment starts a chapter
          const chapter = chapters.find(c => c.startIndex === index);
          const stats = chapter ? getChapterStats(segments, chapter) : null;

          return (
            <div key={segment.id} className="space-y-6">
              {chapter && (
                <ChapterDivider
                  chapterNumber={chapter.chapterNumber}
                  title={chapter.title}
                  segmentIndex={index}
                  isFirstSegment={index === 0}
                  sceneCount={stats?.sceneCount}
                  wordCount={stats?.totalWords}
                  readingMinutes={stats?.readingMinutes}
                  onUpdateTitle={(newTitle) => {
                    if (onUpdateChapterTitle) {
                      onUpdateChapterTitle(index, newTitle);
                    }
                  }}
                  onRemoveChapter={() => {
                    if (onRemoveChapter) {
                      onRemoveChapter(index);
                    }
                  }}
                />
              )}

              <ParagraphCard 
                segment={segment} 
                index={index}
                fontFamilyPreference={fontFamilyPreference} 
                fontSize={fontSize}
                justifyText={justifyText}
                isAudioActive={isAudioPlaying && activeAudioSegmentIndex === index}
                audioProgress={activeAudioSegmentIndex === index ? audioProgress : 0}
                onSeekWord={(ratio) => onSeekAudioRatio?.(index, ratio)}
                imageAspectRatio={imageAspectRatio}
              />

              {/* Optional inline button to start a chapter right after this segment */}
              {!chapter && index > 0 && onAddChapterAt && !isGenerating && (
                <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity my-2 no-print">
                  <button
                    onClick={() => onAddChapterAt(index)}
                    className="px-3 py-1 rounded-full bg-slate-900/80 hover:bg-purple-900/80 border border-purple-500/30 text-purple-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Split into New Chapter</span>
                  </button>
                </div>
              )}

              {segment.selectedChoice && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-3xl mx-auto flex items-center justify-center no-print"
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
          );
        })}

        {/* Refined Skeleton Loader when a new segment is generating */}
        {isGenerating && (
          <SegmentSkeleton 
            showChoices={false} 
            statusMessage="Weaving the next chapter..." 
          />
        )}
        
        {/* Choices & Recommended Plot Twists & Next Chapter Panel */}
        {!isGenerating && segments.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-3xl mx-auto mt-10 space-y-6 no-print"
          >
            {lastSegment?.choices && !lastSegment.selectedChoice && lastSegment.choices.length > 0 ? (
              <div className="space-y-4">
                <h3 className={`text-xl font-display text-white/90 text-center mb-4 ${theme.fontFamily}`}>What happens next?</h3>
                <div className="flex flex-col gap-3">
                  {lastSegment.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => onContinue(choice)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group hover:scale-[1.01] active:scale-[0.99] choice-button ${theme.buttonStyle}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/70 group-hover:bg-white/20 text-sm transition-colors font-mono font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className={`leading-relaxed choice-text ${theme.fontFamily}`}>{choice}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Recommended Next Plot Twist Feature */}
            <PlotTwistsPanel
              previousParagraphs={previousParagraphs}
              storyTitle={storyTitle}
              genre={genre}
              targetAudience={targetAudience}
              apiKey={apiKey}
              textProvider={textProvider}
              textModel={textModel}
              otherApiKey={otherApiKey}
              options={options}
              onSelectTwist={(promptAction) => onContinue(promptAction)}
              isGeneratingStory={isGenerating}
            />

            {/* Prominent Next Chapter Action */}
            {onGenerateNextChapter && (
              <div className="pt-4 flex flex-col items-center justify-center">
                <button
                  onClick={onGenerateNextChapter}
                  disabled={isGenerating}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-[0_8px_25px_rgba(168,85,247,0.4)] hover:shadow-[0_12px_35px_rgba(168,85,247,0.6)] border border-white/20 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <BookOpen className="w-4 h-4 text-purple-200" />
                  <span>Weave Chapter {nextChapterNumber}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-purple-100 uppercase tracking-wider">
                    {lengthDisplayMap[storyLength] || storyLength}
                  </span>
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                </button>
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  Generates Chapter {nextChapterNumber} matching selected size ({lengthDisplayMap[storyLength] || storyLength})
                </p>
              </div>
            )}
          </motion.div>
        )}
        <div ref={endOfStoryRef} />
      </div>
    </div>
  );
};


