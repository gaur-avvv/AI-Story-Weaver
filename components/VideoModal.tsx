import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, PlayIcon, PauseIcon, DownloadIcon, AudioWaveform } from './icons';
import { StorySegment } from '../types';
import { getMusicForGenre } from '../services/musicService';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: StorySegment[];
  title: string;
  genre?: string; // Add genre prop to determine music
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, segments, title, genre = 'default' }) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSegmentIndex(0);
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

  // Preload next segment assets
  useEffect(() => {
    if (!isOpen) return;
    const nextIndex = currentSegmentIndex + 1;
    if (nextIndex < segments.length) {
        const nextSegment = segments[nextIndex];
        if (nextSegment.imageUrl) {
            const img = new Image();
            img.src = nextSegment.imageUrl;
        }
        if (nextSegment.audioUrl) {
            const audio = new Audio();
            audio.src = nextSegment.audioUrl.startsWith('data:') 
                ? nextSegment.audioUrl 
                : `data:audio/mp3;base64,${nextSegment.audioUrl}`;
        }
    }
  }, [currentSegmentIndex, isOpen, segments]);

  // Handle Playback Logic
  useEffect(() => {
    if (!isOpen) return;

    const currentSegment = segments[currentSegmentIndex];
    if (!currentSegment) return;

    if (isPlaying) {
      // Handle Background Music
      if (musicRef.current && isMusicEnabled) {
        if (musicRef.current.paused) {
            musicRef.current.volume = 0.1; // Low volume for background
            musicRef.current.loop = true;
            musicRef.current.play().catch(e => console.error("Music play failed", e));
        }
      } else if (musicRef.current) {
        musicRef.current.pause();
      }

      if (audioRef.current) {
        // If audio exists, play it
        if (currentSegment.audioUrl) {
           // Check if it's base64 or URL
           const src = currentSegment.audioUrl.startsWith('data:') 
             ? currentSegment.audioUrl 
             : `data:audio/mp3;base64,${currentSegment.audioUrl}`;
           
           if (audioRef.current.src !== src) {
             audioRef.current.src = src;
           }
           audioRef.current.play().catch(e => console.error("Audio play failed", e));
        } else {
          // No audio, just wait a bit then advance (simulated duration)
          const timer = setTimeout(() => {
             handleNext();
          }, 5000); // 5 seconds default
          return () => clearTimeout(timer);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (musicRef.current) {
        musicRef.current.pause();
      }
    }
  }, [currentSegmentIndex, isPlaying, isOpen, segments, isMusicEnabled]);

  const handleAudioEnded = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      if (musicRef.current) {
          musicRef.current.pause();
          musicRef.current.currentTime = 0;
      }
    }
  };

  const handleNext = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      if (musicRef.current) {
          musicRef.current.pause();
          musicRef.current.currentTime = 0;
      }
    }
  };

  const handlePrev = () => {
    if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex(prev => prev - 1);
    }
  };

  const handleExportVideo = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const canvas = exportCanvasRef.current;
      if (!canvas) throw new Error("No canvas");
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No context");

      // Setup MediaRecorder
      const stream = canvas.captureStream(30); // 30 FPS
      const audioDestination = new AudioContext().createMediaStreamDestination();
      const audioCtx = new AudioContext();
      
      // Combine canvas video stream and audio stream
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
      };

      recorder.start();

      // Setup Background Music for Export
      let musicSource: AudioBufferSourceNode | null = null;
      if (isMusicEnabled && genre) {
          try {
              const musicUrl = getMusicForGenre(genre);
              const musicResponse = await fetch(musicUrl);
              const musicArrayBuffer = await musicResponse.arrayBuffer();
              const musicBuffer = await audioCtx.decodeAudioData(musicArrayBuffer);
              
              musicSource = audioCtx.createBufferSource();
              musicSource.buffer = musicBuffer;
              musicSource.loop = true;
              
              // Create gain node for volume control
              const gainNode = audioCtx.createGain();
              gainNode.gain.value = 0.1; // Low volume
              
              musicSource.connect(gainNode);
              gainNode.connect(audioDestination);
              musicSource.start(0);
          } catch (e) {
              console.error("Failed to load music for export", e);
          }
      }

      // Render Loop
      for (let i = 0; i < segments.length; i++) {
        setExportProgress(Math.round(((i) / segments.length) * 100));
        const segment = segments[i];
        
        // Load Image
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = segment.imageUrl || ''; // Handle missing image?
        });

        // Draw Image to Canvas (Cover)
        // Calculate aspect ratio to cover
        const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;
        
        // Simple fade effect simulation for export (hard to do perfect crossfade in canvas loop without complex logic)
        // We will just draw the image for now.
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

        // Draw Text Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - 300, canvas.width, 300);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        
        // Wrap text
        const words = segment.paragraph.split(' ');
        let line = '';
        let y = canvas.height - 250;
        const maxWidth = canvas.width - 100;
        const lineHeight = 40;

        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, canvas.width / 2, y);
            line = words[n] + ' ';
            y += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, canvas.width / 2, y);

        // Handle Audio
        if (segment.audioUrl) {
           try {
             const audioSrc = segment.audioUrl.startsWith('data:') ? segment.audioUrl : `data:audio/mp3;base64,${segment.audioUrl}`;
             const audioResponse = await fetch(audioSrc);
             const arrayBuffer = await audioResponse.arrayBuffer();
             const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
             
             const source = audioCtx.createBufferSource();
             source.buffer = audioBuffer;
             source.connect(audioDestination);
             source.start(0);
             
             // Wait for audio to finish
             await new Promise(resolve => setTimeout(resolve, audioBuffer.duration * 1000));
           } catch (e) {
             console.error(`Failed to process audio for segment ${i}:`, e);
             // Fallback to 5s delay if audio fails
             await new Promise(resolve => setTimeout(resolve, 5000));
           }
        } else {
           // Wait 5 seconds if no audio
           await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      if (musicSource) {
          musicSource.stop();
      }
      recorder.stop();
      setExportProgress(100);

    } catch (e) {
      console.error("Export failed", e);
      setIsExporting(false);
      alert("Failed to export video. Please try again.");
    }
  };

  if (!isOpen) return null;

  const currentSegment = segments[currentSegmentIndex];
  const musicUrl = genre ? getMusicForGenre(genre) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <h3 className="text-white font-bold text-lg drop-shadow-md">{title}</h3>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-grow bg-gray-900 flex items-center justify-center overflow-hidden aspect-video">
           <AnimatePresence mode="popLayout">
             <motion.div 
               key={currentSegmentIndex}
               initial={{ opacity: 0, scale: 1.05 }}
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

           {/* Subtitles */}
           <div className="absolute bottom-0 left-0 right-0 p-8 text-center z-20">
              <motion.p 
                key={`text-${currentSegmentIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white text-xl md:text-2xl font-medium drop-shadow-lg leading-relaxed max-w-3xl mx-auto"
              >
                {currentSegment?.paragraph}
              </motion.p>
           </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all hover:scale-105 active:scale-95"
              >
                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-1" />}
              </button>
              
              <button
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                className={`p-3 rounded-full transition-colors ${isMusicEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}
                title="Toggle Background Music"
              >
                <AudioWaveform className="w-5 h-5" />
              </button>

              <div className="text-gray-400 text-sm font-mono">
                {currentSegmentIndex + 1} / {segments.length}
              </div>
           </div>

           <button 
             onClick={handleExportVideo}
             disabled={isExporting}
             className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
           >
             {isExporting ? (
               <>
                 <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                 <span>Exporting {exportProgress}%</span>
               </>
             ) : (
               <>
                 <DownloadIcon className="w-4 h-4" />
                 <span>Save Video</span>
               </>
             )}
           </button>
        </div>

        {/* Hidden Audio Element for Preview */}
        <audio 
          ref={audioRef} 
          onEnded={handleAudioEnded}
          className="hidden"
        />
        
        {/* Background Music Element */}
        <audio
            ref={musicRef}
            src={musicUrl}
            loop
            className="hidden"
        />

        {/* Hidden Canvas for Export */}
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
