import React, { useState, useRef, useEffect } from 'react';
import type { StorySegment } from '../types';
import { PlayIcon, PauseIcon } from './icons';

interface ParagraphCardProps {
  segment: StorySegment;
}

export const ParagraphCard: React.FC<ParagraphCardProps> = ({ segment }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause',handlePause);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, []);


  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <div className="relative w-full aspect-[4/3] bg-amber-100 rounded-3xl shadow-lg overflow-hidden mb-6">
        {segment.isLoadingImage ? (
           <div className="w-full h-full bg-amber-200 animate-pulse"></div>
        ) : segment.imageUrl ? (
          <img
            src={segment.imageUrl}
            alt="Story illustration"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-amber-200"></div>
        )}
      </div>

      <div className="w-full text-center">
        {segment.audioUrl && (
          <>
            <audio ref={audioRef} src={segment.audioUrl} preload="auto" />
            <button
              onClick={togglePlayPause}
              className="mb-4 w-16 h-16 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all duration-200 disabled:bg-gray-300"
              disabled={segment.isLoadingAudio}
            >
              {segment.isLoadingAudio ? (
                <div className="w-6 h-6 border-4 border-t-transparent border-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <PauseIcon className="w-8 h-8" />
              ) : (
                <PlayIcon className="w-8 h-8 pl-1" />
              )}
            </button>
          </>
        )}
        <p className="text-slate-700 text-2xl leading-relaxed">
          {segment.paragraph}
        </p>
      </div>
    </div>
  );
};
