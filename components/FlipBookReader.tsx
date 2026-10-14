import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Volume2, 
  RotateCcw, 
  Sparkles, 
  X, 
  Sun,
  Eye,
  Sliders,
  CheckCircle,
  HelpCircle,
  Layers,
  Feather
} from 'lucide-react';
import { StorySegment } from '../types';
import { extractChapters } from '../utils/chapterUtils';

export interface FlipBookReaderProps {
  segments: StorySegment[];
  storyTitle: string;
  genre?: string;
  targetAudience?: string;
  activeAudioSegmentIndex?: number;
  isAudioPlaying?: boolean;
  audioProgress?: number;
  onContinue: (choice: string) => void;
  onActiveAudioSegmentChange?: (segmentIndex: number) => void;
  onSeekAudioRatio?: (segmentIndex: number, ratio: number) => void;
  onToggleAudioPlay?: () => void;
  fontFamilyPreference?: string;
  fontSize?: number;
  onClose?: () => void;
}

// 4 Tactile Themes
export type TactileTheme = 'antique' | 'ivory' | 'midnight' | 'obsidian';

interface PageProps {
  children: React.ReactNode;
  className?: string;
  isCover?: boolean;
  pageNumber?: number | string;
  totalNumberedPages?: number;
  theme?: TactileTheme;
  isLeftPage?: boolean;
  highContrast?: boolean;
}

// Custom Page component required by react-pageflip to wrap DOM element with forwarded ref
const FlipPage = React.forwardRef<HTMLDivElement, PageProps>(({ 
  children, 
  className = '', 
  isCover = false,
  pageNumber,
  totalNumberedPages,
  theme = 'antique',
  isLeftPage = false,
  highContrast = false,
}, ref) => {
  // Theme color definitions with High-Contrast mode support
  const themeClasses: Record<TactileTheme, string> = {
    antique: highContrast
      ? 'bg-[#fffdf5] text-black border-amber-950/40 selection:bg-amber-900/30'
      : 'bg-[#f4ecd8] text-[#2c1810] border-amber-900/15 selection:bg-amber-800/20',
    ivory: highContrast
      ? 'bg-[#ffffff] text-black border-slate-900/40 selection:bg-purple-900/30'
      : 'bg-[#faf8f3] text-[#1e293b] border-slate-800/10 selection:bg-purple-900/20',
    midnight: highContrast
      ? 'bg-[#060914] text-[#ffffff] border-purple-400/40 selection:bg-purple-500/40'
      : 'bg-[#13182b] text-[#e2e8f0] border-purple-500/20 selection:bg-purple-500/30',
    obsidian: highContrast
      ? 'bg-[#000000] text-[#ffffff] border-amber-400/40 selection:bg-amber-500/40'
      : 'bg-[#0b0e14] text-[#fef08a]/90 border-white/10 selection:bg-amber-500/30',
  };

  return (
    <div
      ref={ref}
      className={`page relative w-full h-full overflow-hidden select-none flex flex-col justify-between ${
        isCover ? 'cover-page shadow-2xl' : `${themeClasses[theme]} ${isLeftPage ? 'page-edge-stack-left' : 'page-edge-stack-right'}`
      } ${className}`}
    >
      {/* Realistic Spine Gutter Shadow (Binding Depth) */}
      {!isCover && (
        <div
          className={`absolute top-0 bottom-0 pointer-events-none z-20 ${
            isLeftPage
              ? 'right-0 w-16 bg-gradient-to-l from-black/30 via-black/12 to-transparent'
              : 'left-0 w-16 bg-gradient-to-r from-black/30 via-black/12 to-transparent'
          }`}
        />
      )}

      {/* Subtle Paper Fiber Texture Overlay */}
      {!isCover && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-25 mix-blend-multiply z-10"
          style={{
            backgroundImage: `radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)`,
            backgroundSize: '14px 14px'
          }}
        />
      )}

      {/* Inner Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col p-6 sm:p-8 md:p-10 justify-between overflow-y-auto">
        {children}
      </div>

      {/* Page Footer Numbering */}
      {!isCover && typeof pageNumber !== 'undefined' && (
        <div className={`relative z-10 px-8 py-3 flex items-center text-[10px] font-mono tracking-widest uppercase opacity-65 ${
          isLeftPage ? 'justify-start' : 'justify-end'
        }`}>
          <span>
            {pageNumber} {totalNumberedPages ? `of ${totalNumberedPages}` : ''}
          </span>
        </div>
      )}
    </div>
  );
});

FlipPage.displayName = 'FlipPage';

export const FlipBookReader: React.FC<FlipBookReaderProps> = ({
  segments,
  storyTitle,
  genre = 'Fantasy',
  targetAudience = 'All Ages',
  activeAudioSegmentIndex = 0,
  isAudioPlaying = false,
  audioProgress = 0,
  onContinue,
  onActiveAudioSegmentChange,
  onSeekAudioRatio,
  onToggleAudioPlay,
  fontFamilyPreference = 'serif',
  fontSize = 18,
  onClose,
}) => {
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [paperTheme, setPaperTheme] = useState<TactileTheme>('antique');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSyncAudioActive, setIsSyncAudioActive] = useState<boolean>(true);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);

  // Synchronized Layouts: Single vs Double page orientation calculation
  // Base dimensions: 1200px wide x 850px high on desktop (600px single page width x 850px height)
  const [pageOrientation, setPageOrientation] = useState<'single' | 'double'>('double');
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 850 });

  // Dynamic book page dimensions calculation based on container viewport & "Wide-Spread" aspect ratio
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const isNarrow = containerWidth < 880;
      
      if (isNarrow) {
        // Single page mode on mobile / tablet portrait
        setPageOrientation('single');
        const targetWidth = Math.min(containerWidth - 32, 540);
        const targetHeight = Math.min(containerHeight - 110, Math.floor(targetWidth * (850 / 600)));
        setDimensions({
          width: Math.max(300, targetWidth),
          height: Math.max(450, targetHeight),
        });
      } else {
        // Wide-Spread Double Page mode on desktop
        // Base width for 2-page spread: 1200px (600px single page) by 850px height
        setPageOrientation('double');
        const availablePageWidth = (containerWidth - 80) / 2;
        const targetWidth = Math.min(availablePageWidth, 600);
        // Maintain 600:850 aspect ratio
        const targetHeight = Math.min(containerHeight - 120, Math.floor(targetWidth * (850 / 600)));
        
        setDimensions({
          width: Math.max(360, targetWidth),
          height: Math.max(500, targetHeight),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keyboard navigation: Left/Right arrows, Spacebar, Home/End, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        flipBookRef.current?.pageFlip()?.flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flipBookRef.current?.pageFlip()?.flipPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        flipBookRef.current?.pageFlip()?.flip(0);
      } else if (e.key === 'End') {
        const total = flipBookRef.current?.pageFlip()?.getPageCount() || 0;
        if (total > 0) flipBookRef.current?.pageFlip()?.flip(total - 1);
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Map Scene Index to Page Number
  const sceneToPageNumber = useCallback((sceneIndex: number) => {
    return 2 + sceneIndex * 2;
  }, []);

  const pageNumberToScene = useCallback((pageIndex: number) => {
    if (pageIndex < 2) return 0;
    const scene = Math.floor((pageIndex - 2) / 2);
    return Math.min(scene, segments.length - 1);
  }, [segments.length]);

  // Synchronize Audio playback -> Book Turn
  useEffect(() => {
    if (!isSyncAudioActive || !flipBookRef.current) return;

    const pageFlip = flipBookRef.current.pageFlip();
    if (!pageFlip) return;

    const targetPage = sceneToPageNumber(activeAudioSegmentIndex);
    const curr = pageFlip.getCurrentPageIndex();

    if (curr !== targetPage && curr + 1 !== targetPage) {
      pageFlip.flip(targetPage);
    }
  }, [activeAudioSegmentIndex, isSyncAudioActive, sceneToPageNumber]);

  // Handle Flip Event from user interaction (dragging corner or clicking)
  const handleFlip = useCallback((e: any) => {
    const newPageIndex = e.data;
    setCurrentPage(newPageIndex);

    const sceneIndex = pageNumberToScene(newPageIndex);
    if (onActiveAudioSegmentChange && isSyncAudioActive) {
      onActiveAudioSegmentChange(sceneIndex);
    }
  }, [pageNumberToScene, onActiveAudioSegmentChange, isSyncAudioActive]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const chapters = useMemo(() => extractChapters(segments), [segments]);
  const totalBookPages = segments.length * 2 + 3;

  // Leather Gutter Background Color Gradients matching each tactile theme
  const leatherGutterGradients: Record<TactileTheme, string> = {
    antique: 'from-[#2d180f] via-[#1c0f0a] to-[#100805]',
    ivory: 'from-[#261f19] via-[#17130f] to-[#0e0c0a]',
    midnight: 'from-[#0b1328] via-[#060a16] to-[#03050c]',
    obsidian: 'from-[#161618] via-[#0d0d0e] to-[#050506]',
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[780px] flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.85)] bg-gradient-to-b ${leatherGutterGradients[paperTheme]} leather-texture transition-all duration-500`}
    >
      {/* Top Floating Control Bar */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/70 backdrop-blur-xl border-b border-white/10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {storyTitle || 'Novella Reader'}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-purple-200/60 font-mono">
              <span>Wide-Spread 1200×850</span>
              <span>•</span>
              <span>Page {currentPage + 1} of {totalBookPages}</span>
              <span>•</span>
              <span className="capitalize">{pageOrientation} View</span>
            </div>
          </div>
        </div>

        {/* Center / Right Control Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Sync Toggle */}
          <button
            onClick={() => setIsSyncAudioActive(!isSyncAudioActive)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isSyncAudioActive
                ? 'bg-purple-600/20 border-purple-400/50 text-purple-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-turn pages with audio narration"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio Sync</span>
            {isSyncAudioActive && <CheckCircle className="w-3 h-3 text-emerald-400" />}
          </button>

          {/* High-Contrast Mode Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2 rounded-xl border transition-all ${
              highContrast
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
            }`}
            title={highContrast ? 'High Contrast Enabled' : 'Enable High Contrast'}
          >
            <Sun className="w-4 h-4" />
          </button>

          {/* 4 Tactile Themes Selector */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={() => setPaperTheme('antique')}
              className={`px-2 py-1 rounded-lg text-[11px] font-serif font-bold transition-all ${
                paperTheme === 'antique'
                  ? 'bg-[#f4ecd8] text-[#2c1810] shadow-md ring-1 ring-amber-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Antique Parchment Theme"
            >
              Antique
            </button>
            <button
              onClick={() => setPaperTheme('ivory')}
              className={`px-2 py-1 rounded-lg text-[11px] font-serif font-bold transition-all ${
                paperTheme === 'ivory'
                  ? 'bg-[#faf8f3] text-[#1e293b] shadow-md ring-1 ring-slate-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ivory Silk Theme"
            >
              Ivory
            </button>
            <button
              onClick={() => setPaperTheme('midnight')}
              className={`px-2 py-1 rounded-lg text-[11px] font-serif font-bold transition-all ${
                paperTheme === 'midnight'
                  ? 'bg-[#13182b] text-purple-200 shadow-md ring-1 ring-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Midnight Scholar Theme"
            >
              Midnight
            </button>
            <button
              onClick={() => setPaperTheme('obsidian')}
              className={`px-2 py-1 rounded-lg text-[11px] font-serif font-bold transition-all ${
                paperTheme === 'obsidian'
                  ? 'bg-[#0b0e14] text-amber-300 shadow-md ring-1 ring-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Obsidian Luxe Theme"
            >
              Obsidian
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
              title="Close Reader"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Book Stage Area with Realistic 3D Surrounding Drop Shadows */}
      <div className="relative flex-grow flex items-center justify-center w-full max-w-[1360px] mx-auto perspective-1000 py-6 px-4">
        {/* Navigation Arrow Left */}
        <button
          onClick={() => flipBookRef.current?.pageFlip()?.flipPrev()}
          className="absolute left-2 sm:left-6 z-30 w-12 h-12 rounded-full bg-slate-950/80 hover:bg-purple-600 border border-white/20 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95 disabled:opacity-30 group"
          title="Previous Page (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* HTMLFlipBook Component with Dynamic Re-calculation */}
        <div className="book-wrapper shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_15px_30px_-5px_rgba(0,0,0,0.7)] rounded-xl relative">
          <HTMLFlipBook
            key={`flipbook-${pageOrientation}-${dimensions.width}x${dimensions.height}`}
            ref={flipBookRef}
            width={dimensions.width}
            height={dimensions.height}
            size="fixed"
            minWidth={320}
            maxWidth={650}
            minHeight={450}
            maxHeight={950}
            drawShadow={true}
            flippingTime={700}
            usePortrait={pageOrientation === 'single'}
            startPage={0}
            startZIndex={0}
            autoSize={true}
            maxShadowOpacity={0.7}
            showCover={true}
            mobileScrollSupport={false}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={20}
            showPageCorners={true}
            disableFlipByClick={false}
            onFlip={handleFlip}
            className="novella-flip-book"
            style={{ margin: '0 auto' }}
          >
            {/* PAGE 0: HARD COVER FRONT */}
            <FlipPage 
              isCover 
              theme={paperTheme} 
              highContrast={highContrast}
              className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border-2 border-amber-500/40"
            >
              <div className="h-full flex flex-col justify-between items-center text-center p-8 border-2 border-amber-500/30 rounded-xl relative overflow-hidden">
                {/* Gold Foil Accent Corners */}
                <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-400/70" />
                <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-400/70" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-400/70" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-400/70" />

                <div className="pt-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300 text-[11px] font-serif tracking-widest uppercase mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{genre.toUpperCase()} EDITION</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 drop-shadow-md leading-tight mt-2">
                    {storyTitle || 'An Untold Novella'}
                  </h1>
                  <p className="text-xs text-purple-200/80 italic mt-3 font-serif">
                    Curated for {targetAudience} readers
                  </p>
                </div>

                {/* Central Emblem or Illustration Thumbnail */}
                <div className="my-6 relative w-40 h-40 rounded-full p-2 bg-gradient-to-tr from-amber-500/40 via-purple-500/30 to-amber-400/40 flex items-center justify-center shadow-xl">
                  {segments[0]?.imageUrl ? (
                    <img
                      src={segments[0].imageUrl}
                      alt="Cover"
                      className="w-full h-full rounded-full object-cover shadow-inner"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-300">
                      <BookOpen className="w-14 h-14 stroke-[1.5]" />
                    </div>
                  )}
                </div>

                <div className="pb-4 space-y-1">
                  <p className="text-[11px] font-mono tracking-widest text-slate-300 uppercase">
                    AI STORYTELLER STUDIO
                  </p>
                  <p className="text-xs text-amber-400 font-serif italic">
                    Drag corner or use arrow keys to open
                  </p>
                </div>
              </div>
            </FlipPage>

            {/* PAGE 1: DEDICATION & TABLE OF CONTENTS */}
            <FlipPage isLeftPage theme={paperTheme} highContrast={highContrast} pageNumber="I">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="border-b border-current pb-2 mb-4 opacity-70">
                    <span className="text-[10px] font-mono tracking-widest uppercase">Table of Contents</span>
                  </div>

                  <h2 className="text-2xl font-serif font-bold mb-4">
                    Story Chapters
                  </h2>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
                    {chapters.map((chap) => (
                      <div
                        key={chap.id}
                        onClick={() => {
                          const target = sceneToPageNumber(chap.startIndex);
                          flipBookRef.current?.pageFlip()?.flip(target);
                        }}
                        className="group flex items-baseline justify-between py-2 border-b border-dashed border-current/20 hover:border-purple-500 cursor-pointer transition-colors"
                      >
                        <span className="text-sm font-serif font-semibold group-hover:text-purple-600 transition-colors">
                          {chap.title}
                        </span>
                        <span className="text-xs font-mono opacity-60">
                          p. {sceneToPageNumber(chap.startIndex)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-current/10 text-xs italic font-serif leading-relaxed">
                  "Every choice forges a universe; every turned page breathes life into destiny."
                </div>
              </div>
            </FlipPage>

            {/* SCENE PAGES: Left (Illustration + Audio controls) & Right (Text + Choices) */}
            {segments.map((seg, idx) => {
              const leftPageNum = sceneToPageNumber(idx);
              const rightPageNum = leftPageNum + 1;
              const isCurrentlyPlayingScene = isAudioPlaying && activeAudioSegmentIndex === idx;

              return [
                // LEFT SPREAD PAGE: Visual Atmosphere, Chapter Banner & Audio Player
                <FlipPage 
                  key={`scene-visual-${seg.id || idx}`}
                  isLeftPage={true}
                  theme={paperTheme}
                  highContrast={highContrast}
                  pageNumber={leftPageNum}
                  totalNumberedPages={segments.length * 2 + 2}
                >
                  <div className="flex flex-col h-full justify-between space-y-4">
                    {/* Scene / Chapter Header */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider opacity-70 mb-2">
                        <span>Chapter {Math.floor(idx / 2) + 1}</span>
                        <span>Scene {idx + 1}</span>
                      </div>

                      {seg.chapterTitle && (
                        <h3 className="text-lg sm:text-xl font-serif font-bold leading-tight mb-2">
                          {seg.chapterTitle}
                        </h3>
                      )}
                    </div>

                    {/* Illustration Frame */}
                    <div className="relative flex-grow w-full max-h-[440px] rounded-2xl overflow-hidden border border-current/15 shadow-lg bg-black/10 flex items-center justify-center">
                      {seg.imageUrl ? (
                        <img
                          src={seg.imageUrl}
                          alt={`Scene ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      ) : (
                        <div className="p-6 text-center opacity-60">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-serif italic">Illustrating chapter atmosphere...</p>
                        </div>
                      )}

                      {/* Floating Play Audio Narration Overlay on Scene */}
                      <button
                        onClick={() => {
                          if (onActiveAudioSegmentChange) onActiveAudioSegmentChange(idx);
                          if (onToggleAudioPlay) onToggleAudioPlay();
                        }}
                        className="absolute bottom-3 right-3 px-3.5 py-2 rounded-full bg-slate-950/85 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl backdrop-blur-md transition-all active:scale-95"
                      >
                        {isCurrentlyPlayingScene ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isCurrentlyPlayingScene ? 'Playing' : 'Listen'}</span>
                      </button>
                    </div>

                    {/* Audio Scrubbing Bar for this scene */}
                    <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-current/15 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono opacity-75">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Volume2 className="w-3.5 h-3.5 text-purple-500" />
                          Narration Track
                        </span>
                        <span>
                          {isCurrentlyPlayingScene ? `${Math.round(audioProgress * 100)}%` : 'Ready'}
                        </span>
                      </div>

                      <div 
                        className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full cursor-pointer relative overflow-hidden"
                        onClick={(e) => {
                          if (!onSeekAudioRatio) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                          onSeekAudioRatio(idx, ratio);
                        }}
                      >
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-150"
                          style={{ width: `${isCurrentlyPlayingScene ? audioProgress * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </FlipPage>,

                // RIGHT SPREAD PAGE: Narrative Text & Choices
                <FlipPage 
                  key={`scene-text-${seg.id || idx}`}
                  isLeftPage={false}
                  theme={paperTheme}
                  highContrast={highContrast}
                  pageNumber={rightPageNum}
                  totalNumberedPages={segments.length * 2 + 2}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Decorative Drop Cap & Typography Scaling */}
                      {seg.paragraph && (
                        <div className="prose max-w-none">
                          <p className="flipbook-body-text font-serif leading-relaxed text-justify first-letter:float-left first-letter:text-4xl first-letter:font-bold first-letter:mr-2.5 first-letter:leading-none first-letter:text-purple-600">
                            {seg.paragraph}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interactive Choices or Continue Trigger */}
                    <div className="pt-6 border-t border-current/15 mt-6">
                      {seg.choices && seg.choices.length > 0 ? (
                        <div className="space-y-2.5">
                          <span className="text-[11px] font-mono uppercase tracking-wider opacity-75 block font-bold">
                            Choose Your Path:
                          </span>
                          <div className="space-y-2">
                            {seg.choices.map((choice, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => {
                                  setSelectedChoiceIndex(cIdx);
                                  onContinue(choice);
                                }}
                                className={`w-full text-left p-3 rounded-xl border transition-all text-xs font-serif leading-snug flex items-start gap-2 ${
                                  selectedChoiceIndex === cIdx
                                    ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                                    : 'bg-black/5 dark:bg-white/5 border-current/15 hover:border-purple-500/50 hover:bg-black/10'
                                }`}
                              >
                                <span className="font-mono text-[10px] opacity-70 mt-0.5">{cIdx + 1}.</span>
                                <span>{choice}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-serif italic opacity-75">
                            Turn page to continue the journey...
                          </span>
                          <button
                            onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md active:scale-95"
                          >
                            <span>Next Chapter</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </FlipPage>
              ];
            })}

            {/* BACK COVER */}
            <FlipPage 
              isCover 
              isLeftPage={true} 
              theme={paperTheme} 
              highContrast={highContrast}
              className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border-2 border-amber-500/40"
            >
              <div className="h-full flex flex-col justify-between items-center text-center p-8 border-2 border-amber-500/30 rounded-xl relative">
                <div className="pt-8">
                  <Sparkles className="w-10 h-10 mx-auto text-amber-400 mb-4" />
                  <h3 className="text-2xl font-serif font-bold text-amber-200">
                    The End of Chapter
                  </h3>
                  <p className="text-xs text-purple-200/80 mt-2 max-w-xs mx-auto leading-relaxed">
                    Every ending is the cradle of another tale. Generate new chapters or export your book as PDF & Audio.
                  </p>
                </div>

                <div className="space-y-2 w-full max-w-xs">
                  <button
                    onClick={() => flipBookRef.current?.pageFlip()?.flip(0)}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return to Cover</span>
                  </button>
                </div>

                <div className="text-[10px] font-mono text-slate-400 pb-4">
                  Crafted with AI Storyteller Studio
                </div>
              </div>
            </FlipPage>
          </HTMLFlipBook>
        </div>

        {/* Navigation Arrow Right */}
        <button
          onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
          className="absolute right-2 sm:right-6 z-30 w-12 h-12 rounded-full bg-slate-950/80 hover:bg-purple-600 border border-white/20 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95 disabled:opacity-30 group"
          title="Next Page (Right Arrow)"
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Footer Navigation Bar */}
      <footer className="relative z-30 flex items-center justify-between px-6 py-3 bg-slate-950/80 backdrop-blur-md border-t border-white/10 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="hidden sm:inline">Use Arrow Keys ← / → to flip</span>
          <span>•</span>
          <span>Click and drag page corners for 3D curl</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => flipBookRef.current?.pageFlip()?.flip(0)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            Cover
          </button>
          <button
            onClick={() => flipBookRef.current?.pageFlip()?.flip(1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            Contents
          </button>
        </div>
      </footer>
    </div>
  );
};
