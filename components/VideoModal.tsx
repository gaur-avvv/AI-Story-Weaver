import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, PlayIcon, PauseIcon, DownloadIcon, AudioWaveform } from './icons';
import { StorySegment } from '../types';
import { getMusicDataUrlForGenre, getProceduralMusicBuffer } from '../services/musicService';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [musicUrl, setMusicUrl] = useState<string>('');
  const [transitionEffect, setTransitionEffect] = useState<'kenburns' | 'fade' | 'slide'>('kenburns');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentSegment = segments[currentSegmentIndex];
  const segmentLines = currentSegment ? splitIntoLines(currentSegment.paragraph || '') : [''];

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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentSegmentIndex(0);
      setCurrentLineIndex(0);
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
    let audioDurationMs = 6000;
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
      }
    }

    // Line-by-Line progression timer
    const wordsCount = (currentSegment.paragraph || '').split(/\s+/).filter(Boolean).length;
    audioDurationMs = Math.max(4000, wordsCount * 320);

    const lineIntervalMs = Math.max(1800, audioDurationMs / Math.max(1, segmentLines.length));
    setCurrentLineIndex(0);

    const lineTimer = setInterval(() => {
      setCurrentLineIndex(prev => {
        if (prev < segmentLines.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, lineIntervalMs);

    return () => {
      clearInterval(lineTimer);
    };
  }, [currentSegmentIndex, isPlaying, isOpen, segments, isMusicEnabled, musicUrl]);

  const handleAudioEnded = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setCurrentLineIndex(0);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setCurrentLineIndex(0);
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
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setCurrentLineIndex(0);
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
    }
  };

  // Fixed & Enhanced Video Export Engine
  const handleExportVideo = async (format: 'webm' | 'mp4' = 'webm') => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const canvas = exportCanvasRef.current;
      if (!canvas) throw new Error("No export canvas element");
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No 2D context");

      // Web Audio Context for synchronous export stream mixing
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const audioDestination = audioCtx.createMediaStreamDestination();
      
      const canvasStream = canvas.captureStream(30);
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        if (format === 'mp4') {
          try {
            setExportProgress(92);
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { fetchFile } = await import('@ffmpeg/util');
            const ffmpeg = new FFmpeg();
            
            ffmpeg.on('progress', ({ progress }) => {
              setExportProgress(92 + Math.round(progress * 8));
            });

            await ffmpeg.load({
              coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
              wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
            });
            
            await ffmpeg.writeFile('input.webm', await fetchFile(blob));
            await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'copy', '-c:a', 'aac', 'output.mp4']);
            
            const mp4Data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
            const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
            
            const url = URL.createObjectURL(mp4Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            console.warn("FFmpeg conversion fallback to WebM:", err);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsExporting(false);
        if (audioCtx.state !== 'closed') audioCtx.close();
      };

      recorder.start();

      // Background Music Layer for Export
      let musicSource: AudioBufferSourceNode | null = null;
      if (isMusicEnabled) {
        try {
          const musicBuffer = await getProceduralMusicBuffer(audioCtx, genre, 30);
          musicSource = audioCtx.createBufferSource();
          musicSource.buffer = musicBuffer;
          musicSource.loop = true;
          
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 0.08;
          
          musicSource.connect(gainNode);
          gainNode.connect(audioDestination);
          musicSource.start(0);
        } catch (e) {
          console.warn("Background music render skipped:", e);
        }
      }

      // Render Each Story Segment to Canvas
      for (let i = 0; i < segments.length; i++) {
        setExportProgress(Math.round(((i) / segments.length) * (format === 'mp4' ? 90 : 98)));
        const segment = segments[i];
        
        // Load Segment Image
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = () => resolve(null);
          if (segment.imageUrl) img.src = segment.imageUrl;
          else resolve(null);
        });

        // Speech Audio Decoding & Buffer Source
        let durationMs = 6000;
        let audioSource: AudioBufferSourceNode | null = null;
        if (segment.audioUrl) {
          try {
            let audioSrc = segment.audioUrl;
            if (!audioSrc.startsWith('data:') && !audioSrc.startsWith('http') && !audioSrc.startsWith('blob:')) {
              audioSrc = `data:audio/mp3;base64,${segment.audioUrl}`;
            }
            const response = await fetch(audioSrc);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            durationMs = Math.max(3500, audioBuffer.duration * 1000);
            audioSource = audioCtx.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(audioDestination);
          } catch (e) {
            console.warn(`Speech audio decode fallback for segment ${i}:`, e);
            const words = (segment.paragraph || '').split(/\s+/).filter(Boolean).length;
            durationMs = Math.max(4000, words * 320);
          }
        } else {
          const words = (segment.paragraph || '').split(/\s+/).filter(Boolean).length;
          durationMs = Math.max(4000, words * 320);
        }

        const lines = splitIntoLines(segment.paragraph || '', 8);

        if (audioSource) {
          try { audioSource.start(0); } catch (e) {}
        }

        // Segment Frame Loop
        await new Promise(resolve => {
          let start: number | null = null;
          function drawFrame(now: number) {
            if (!start) start = now;
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / durationMs);

            if (elapsed >= durationMs) {
              resolve(null);
              return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Render Background / Image with Ken Burns / Transition Pan
            if (img.complete && img.naturalWidth > 0) {
              const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
              const baseWidth = img.width * ratio;
              const baseHeight = img.height * ratio;
              
              let zoom = 1 + (progress * 0.08);
              let panX = (canvas.width - baseWidth) / 2 - (progress * 20);
              let panY = (canvas.height - baseHeight) / 2;

              if (transitionEffect === 'slide') {
                panX += (1 - Math.min(1, elapsed / 500)) * 100;
              }

              const currentWidth = baseWidth * zoom;
              const currentHeight = baseHeight * zoom;

              ctx.drawImage(img, panX, panY, currentWidth, currentHeight);
            } else {
              const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#0f172a');
              gradient.addColorStop(0.5, '#1e1b4b');
              gradient.addColorStop(1, '#020617');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Vignette Gradient at Bottom
            const botGrad = ctx.createLinearGradient(0, canvas.height - 180, 0, canvas.height);
            botGrad.addColorStop(0, 'rgba(0,0,0,0)');
            botGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = botGrad;
            ctx.fillRect(0, canvas.height - 180, canvas.width, 180);

            // Active Line Calculation (Line-by-Line Subtitle Rendering)
            const activeLineIdx = Math.min(lines.length - 1, Math.floor(progress * lines.length));
            const currentTextLine = lines[activeLineIdx] || '';

            // Subtitle Box
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const boxWidth = Math.min(canvas.width - 120, ctx.measureText(currentTextLine).width + 80);
            const boxHeight = 64;
            const boxX = (canvas.width - boxWidth) / 2;
            const boxY = canvas.height - boxHeight - 40;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 6;
            ctx.fillText(currentTextLine, canvas.width / 2, boxY + boxHeight / 2);
            ctx.shadowBlur = 0;

            requestAnimationFrame(drawFrame);
          }
          requestAnimationFrame(drawFrame);
        });
      }

      if (musicSource) {
        try { musicSource.stop(); } catch (e) {}
      }
      recorder.stop();
      setExportProgress(100);

    } catch (e) {
      console.error("Export error:", e);
      setIsExporting(false);
      alert("Video export encountered an issue. Please try again.");
    }
  };

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
           <AnimatePresence mode="popLayout">
             <motion.div 
               key={currentSegmentIndex}
               initial={{ opacity: 0, scale: transitionEffect === 'kenburns' ? 1.08 : 1 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.8, ease: "easeInOut" }}
               className="absolute inset-0 w-full h-full"
             >
               {currentSegment?.imageUrl && (
                 <img 
                   src={currentSegment.imageUrl} 
                   alt="Story scene" 
                   className="w-full h-full object-cover"
                 />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
             </motion.div>
           </AnimatePresence>

           {/* Line-by-Line Subtitle Overlay */}
           <div className="absolute bottom-6 left-0 right-0 p-4 text-center z-20 flex justify-center">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`line-${currentSegmentIndex}-${currentLineIndex}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="bg-slate-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-2xl max-w-xl mx-auto"
                >
                  <p className="text-white text-base md:text-lg font-semibold leading-snug tracking-wide drop-shadow-md">
                    {segmentLines[currentLineIndex] || currentSegment?.paragraph}
                  </p>
                </motion.div>
              </AnimatePresence>
           </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between backdrop-blur-md">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-11 h-11 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/30"
              >
                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
              </button>
              
              <button
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                className={`p-2.5 rounded-full transition-colors border ${isMusicEnabled ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
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
               disabled={isExporting}
               className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors disabled:opacity-50 text-xs font-semibold backdrop-blur-md shadow-md"
             >
               {isExporting ? (
                 <>
                   <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                   <span>Exporting {exportProgress}%</span>
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
               disabled={isExporting}
               className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 text-xs font-semibold shadow-md"
             >
               {isExporting ? (
                 <>
                   <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                   <span>Exporting...</span>
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

        {/* Hidden Canvas for Video Rendering & Export */}
        <canvas 
          ref={exportCanvasRef}
          width={1280}
          height={720}
          className="hidden"
        />

      </div>
    </div>
  );
};
