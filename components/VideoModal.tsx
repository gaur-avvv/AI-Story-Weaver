import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, PlayIcon, PauseIcon, DownloadIcon, AudioWaveform } from './icons';
import { StorySegment } from '../types';
import { getMusicDataUrlForGenre } from '../services/musicService';
import { videoExportManager, VideoExportState } from '../services/videoExportService';
import { Terminal, ShieldAlert, CheckCircle2, Video } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: StorySegment[];
  title: string;
  genre?: string;
}

// Helper to split text into short, natural lines for subtitle presentation
function splitIntoLines(text: string, maxWordsPerLine = 8): string[] {
  if (!text) return [''];
  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
  const lines: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let currentLine: string[] = [];

    for (const word of words) {
      currentLine.push(word);
      if (currentLine.length >= maxWordsPerLine) {
        lines.push(currentLine.join(' '));
        currentLine = [];
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }
  }

  return lines.length > 0 ? lines : [text];
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, segments, title, genre = 'default' }) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportState, setExportState] = useState<VideoExportState>(videoExportManager.getState());
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [musicUrl, setMusicUrl] = useState<string>('');
  const [transitionEffect, setTransitionEffect] = useState<'kenburns' | 'fade' | 'slide'>('kenburns');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to background video export manager
  useEffect(() => {
    const unsubscribe = videoExportManager.subscribe((newState) => {
      setExportState(newState);
    });
    return unsubscribe;
  }, []);

  const currentSegment = segments[currentSegmentIndex];
  const segmentLines = currentSegment ? splitIntoLines(currentSegment.paragraph || '') : [''];

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [exportState.logs]);

  // Generate background music URL asynchronously when modal opens or genre changes
  useEffect(() => {
    if (isOpen && genre) {
      getMusicDataUrlForGenre(genre, 15).then(url => {
        setMusicUrl(url);
      }).catch(err => {
        console.warn("Failed to generate background music URL:", err);
      });
    }
  }, [isOpen, genre]);

  // Reset playback state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentSegmentIndex(0);
      setCurrentLineIndex(0);
      setAudioCurrentTime(0);
      setAudioDuration(0);
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
    }
  }, [isOpen]);

  // Handle Playback & Line-by-Line Subtitle Timers
  useEffect(() => {
    if (!isOpen || !isPlaying || !currentSegment) return;

    // Handle Background Music
    if (musicRef.current && isMusicEnabled && musicUrl) {
      if (musicRef.current.paused) {
        musicRef.current.volume = 0.12;
        musicRef.current.loop = true;
        musicRef.current.play().catch(() => {});
      }
    } else if (musicRef.current) {
      musicRef.current.pause();
    }

    // Handle Speech Audio Narration
    let fallbackDurationMs = 6000;
    if (audioRef.current) {
      if (currentSegment.audioUrl) {
        const src = currentSegment.audioUrl.startsWith('data:') || currentSegment.audioUrl.startsWith('http') || currentSegment.audioUrl.startsWith('blob:')
          ? currentSegment.audioUrl 
          : `data:audio/mp3;base64,${currentSegment.audioUrl}`;
         
        if (audioRef.current.src !== src) {
          audioRef.current.src = src;
        }
        audioRef.current.play().catch(e => {
          console.warn("Speech audio play prevented or failed:", e);
        });
      } else {
        // No speech audio present: use a timed fallback to advance lines and segments
        const wordsCount = (currentSegment.paragraph || '').split(/\s+/).filter(Boolean).length;
        fallbackDurationMs = Math.max(4000, wordsCount * 300);
        setCurrentLineIndex(0);

        const lineIntervalMs = Math.max(1600, fallbackDurationMs / Math.max(1, segmentLines.length));
        const lineTimer = setInterval(() => {
          setCurrentLineIndex(prev => {
            if (prev < segmentLines.length - 1) return prev + 1;
            return prev;
          });
        }, lineIntervalMs);

        const segmentTimer = setTimeout(() => {
          handleNext();
        }, fallbackDurationMs);

        return () => {
          clearInterval(lineTimer);
          clearTimeout(segmentTimer);
        };
      }
    }
  }, [currentSegmentIndex, isPlaying, isOpen, segments, isMusicEnabled, musicUrl]);

  // Audio timeupdate handler for live subtitle synchronisation
  const handleTimeUpdate = () => {
    if (!audioRef.current || !segmentLines.length) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setAudioCurrentTime(cur);
    if (dur && dur > 0) {
      setAudioDuration(dur);
      const progressRatio = Math.min(0.999, Math.max(0, cur / dur));
      const lineIdx = Math.min(segmentLines.length - 1, Math.floor(progressRatio * segmentLines.length));
      setCurrentLineIndex(lineIdx);
    }
  };

  const handleAudioEnded = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setCurrentLineIndex(0);
      setAudioCurrentTime(0);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setCurrentLineIndex(0);
      setAudioCurrentTime(0);
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
    }
  };

  const handleNext = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setCurrentLineIndex(0);
      setAudioCurrentTime(0);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setCurrentLineIndex(0);
      setAudioCurrentTime(0);
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
    }
  };

  // Video Export Engine with Web Worker Frame Processing running in background
  const handleExportVideo = async (format: 'webm' | 'mp4' = 'webm') => {
    if (exportState.isGenerating) return;
    videoExportManager.startExport({
      segments,
      title,
      genre,
      format,
      transitionEffect,
      isMusicEnabled,
    });
  };

  // Subtitle word tokens and active spoken word index
  const currentLineText = segmentLines[currentLineIndex] || currentSegment?.paragraph || '';
  const currentLineWords = currentLineText.split(/\s+/).filter(Boolean);
  const lineProgress = audioDuration > 0
    ? Math.min(1, Math.max(0, (audioCurrentTime / audioDuration) * segmentLines.length - currentLineIndex))
    : 0;
  const activeWordIdxInLine = Math.min(
    currentLineWords.length - 1,
    Math.max(0, Math.floor(lineProgress * currentLineWords.length))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="relative w-full max-w-4xl bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <h3 className="text-white font-bold text-lg drop-shadow-md truncate max-w-md">{title}</h3>
          <div className="flex items-center gap-2">
            <select
              value={transitionEffect}
              onChange={(e) => setTransitionEffect(e.target.value as any)}
              className="bg-black/50 border border-white/20 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none backdrop-blur-md"
            >
              <option value="kenburns">Ken Burns Pan</option>
              <option value="fade">Smooth Fade</option>
              <option value="slide">Slide Transition</option>
            </select>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-full text-white transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Cinema Viewport */}
        <div className="relative flex-grow bg-black/80 flex items-center justify-center overflow-hidden aspect-video">
           {/* Top-Right Discreet Watermark */}
           <div className="absolute top-16 right-4 z-20 pointer-events-none">
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[11px] font-medium text-white/90 shadow-lg">
               <span className="text-purple-400">✦</span>
               <span>Novellaio</span>
               <span className="text-purple-400">✦</span>
             </div>
           </div>

           <AnimatePresence mode="popLayout">
             <motion.div 
               key={currentSegmentIndex}
               initial={{ opacity: 0, scale: transitionEffect === 'kenburns' ? 1.08 : 1 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.8, ease: "easeInOut" }}
               className="absolute inset-0 w-full h-full overflow-hidden"
             >
               {currentSegment?.imageUrl && (
                 <motion.img 
                   key={`reel-img-${currentSegmentIndex}-${currentSegment.imageUrl}`}
                   src={currentSegment.imageUrl} 
                   alt="Story scene" 
                   className="w-full h-full object-cover origin-center"
                   initial={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
                   animate={{ 
                     opacity: 1, 
                     filter: 'blur(0px)',
                     scale: isPlaying ? [0.98, 1.08, 1.03] : [0.98, 1.04, 1],
                     x: isPlaying ? [0, 8, -6, 0] : [0, 3, 0],
                     y: isPlaying ? [0, -6, 5, 0] : [0, -2, 0],
                   }}
                   transition={{ 
                     opacity: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
                     filter: { duration: 0.8, ease: 'easeOut' },
                     scale: { duration: isPlaying ? 16 : 22, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                     x: { duration: isPlaying ? 16 : 22, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                     y: { duration: isPlaying ? 16 : 22, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                   }}
                 />
               )}
               {/* Atmospheric cinematic vignette & dynamic light flare overlay */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />
               <motion.div 
                 className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent pointer-events-none"
                 animate={{ opacity: isPlaying ? [0.3, 0.7, 0.4] : 0.3 }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               />
             </motion.div>
           </AnimatePresence>

           {/* Subtitle Overlay with Dynamic Karaoke Word Highlighting */}
           <div className="absolute bottom-6 left-0 right-0 p-4 text-center z-20 flex justify-center">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`line-${currentSegmentIndex}-${currentLineIndex}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="bg-slate-950/85 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-purple-500/30 shadow-2xl max-w-xl mx-auto"
                >
                  <p className="text-white text-base md:text-lg font-semibold leading-snug tracking-wide drop-shadow-md flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">
                    {currentLineWords.map((word, wIdx) => {
                      const isWordActive = isPlaying && wIdx === activeWordIdxInLine;
                      return (
                        <span
                          key={wIdx}
                          className={`transition-all duration-150 ${
                            isWordActive
                              ? 'text-yellow-300 font-extrabold scale-110 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]'
                              : 'text-slate-100'
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </p>
                </motion.div>
              </AnimatePresence>
           </div>
        </div>

        {/* Export Real-time Progress Log Panel */}
        {exportState.isGenerating && (
          <div className="p-3 bg-slate-950 border-t border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-purple-300">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>Background Video Pipeline: <strong className="text-white">{exportState.stepName}</strong></span>
              </div>
              <span>{exportState.progress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 transition-all duration-300 rounded-full"
                style={{ width: `${exportState.progress}%` }}
              />
            </div>

            {/* Real-time Detailed Log Messages Terminal */}
            <div 
              ref={logContainerRef}
              className="h-20 bg-slate-900/90 border border-white/10 rounded-xl p-2 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 shadow-inner"
            >
              {exportState.logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-purple-400 font-bold select-none">&gt;</span>
                  <span className={log.includes('complete') || log.includes('successfully') ? 'text-emerald-400 font-semibold' : ''}>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls Bar */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between backdrop-blur-md">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={exportState.isGenerating}
                className="w-11 h-11 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/30 disabled:opacity-50"
              >
                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
              </button>
              
              <button
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                disabled={exportState.isGenerating}
                className={`p-2.5 rounded-full transition-colors border ${isMusicEnabled ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'} disabled:opacity-50`}
                title="Toggle Background Music"
              >
                <AudioWaveform className="w-5 h-5" />
              </button>

              <div className="text-white/60 text-xs font-mono font-bold">
                Segment {currentSegmentIndex + 1} / {segments.length}
              </div>
           </div>

           <div className="flex items-center gap-2.5">
             <button 
               onClick={() => handleExportVideo('webm')}
               disabled={exportState.isGenerating}
               className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors disabled:opacity-50 text-xs font-semibold backdrop-blur-md shadow-md"
             >
               {exportState.isGenerating ? (
                 <>
                   <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                   <span>Exporting {exportState.progress}%</span>
                 </>
               ) : (
                 <>
                   <DownloadIcon className="w-4 h-4" />
                   <span>Save WebM</span>
                 </>
               )}
             </button>
             
             <button 
               onClick={() => handleExportVideo('mp4')}
               disabled={exportState.isGenerating}
               className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 text-xs font-semibold shadow-md"
             >
               {exportState.isGenerating ? (
                 <>
                   <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                   <span>Exporting {exportState.progress}%</span>
                 </>
               ) : (
                 <>
                   <DownloadIcon className="w-4 h-4" />
                   <span>Save MP4</span>
                 </>
               )}
             </button>
           </div>
        </div>

        {/* Hidden Speech Audio Element */}
        <audio 
          ref={audioRef} 
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          className="hidden"
        />
        
        {/* Background Music Element */}
        {musicUrl && (
          <audio
            ref={musicRef}
            src={musicUrl}
            loop
            className="hidden"
          />
        )}

      </div>
    </div>
  );
};
