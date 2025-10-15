import React, { useState, useRef, useEffect } from 'react';
import type { StorySegment } from '../types';
import { PlayIcon, PauseIcon } from './icons';

// Helper function to decode base64 string to Uint8Array
function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to decode raw PCM data into an AudioBuffer
async function decodePcmData(
  pcmData: Uint8Array,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const sampleRate = 24000; // Gemini TTS sample rate is 24kHz
  const numChannels = 1; // Mono audio
  
  // The API returns 16-bit PCM, so we need to create an Int16Array view on the buffer
  const pcm16Data = new Int16Array(pcmData.buffer);
  const frameCount = pcm16Data.length / numChannels;

  const audioBuffer = audioContext.createBuffer(
    numChannels,
    frameCount,
    sampleRate
  );

  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    // Normalize the 16-bit sample to a float between -1.0 and 1.0
    channelData[i] = pcm16Data[i] / 32768.0;
  }

  return audioBuffer;
}


interface ParagraphCardProps {
  segment: StorySegment;
}

export const ParagraphCard: React.FC<ParagraphCardProps> = ({ segment }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for Web Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Refs for managing pause/resume state
  const playbackStartTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);

  // Initialize AudioContext once on mount, and clean up on unmount
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Decode audio data when it becomes available or changes
  useEffect(() => {
    // Clean up any ongoing audio playback from previous segment
    if (sourceNodeRef.current) {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
    }
    // Reset state for the new audio
    audioBufferRef.current = null;
    startOffsetRef.current = 0;
    setIsPlaying(false);

    if (segment.audioUrl && !segment.isLoadingAudio && audioContextRef.current) {
        const decode = async () => {
            try {
                // `segment.audioUrl` now contains raw base64 data from the service
                const pcmData = decodeBase64(segment.audioUrl);
                const buffer = await decodePcmData(pcmData, audioContextRef.current!);
                audioBufferRef.current = buffer;
            } catch (error) {
                console.error("Failed to decode audio data:", error);
            }
        };
        decode();
    }
    
    // Cleanup function for when the component unmounts
    return () => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null;
            sourceNodeRef.current.stop();
        }
    };
  }, [segment.audioUrl, segment.isLoadingAudio]);

  const togglePlayPause = () => {
    const audioCtx = audioContextRef.current;
    if (!audioBufferRef.current || !audioCtx) return;

    if (isPlaying) {
        // ---- PAUSE LOGIC ----
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null; // Prevent onended from firing on manual stop
            sourceNodeRef.current.stop();
            // Calculate how much time has passed since playback started and add it to the offset
            startOffsetRef.current += audioCtx.currentTime - playbackStartTimeRef.current;
        }
        setIsPlaying(false);
    } else {
        // ---- PLAY LOGIC ----
        const source = audioCtx.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioCtx.destination);
        
        // If the offset is past the end of the buffer, start from the beginning
        if (startOffsetRef.current >= source.buffer.duration) {
            startOffsetRef.current = 0;
        }

        source.start(0, startOffsetRef.current);

        // Record the time playback started to calculate pause position later
        playbackStartTimeRef.current = audioCtx.currentTime;
        sourceNodeRef.current = source;
        setIsPlaying(true);

        source.onended = () => {
            // This event fires on both natural end and manual `stop()`.
            // We only want to reset if it wasn't manually stopped.
            // The isPlaying state is our flag for this.
            if (isPlaying) { 
                setIsPlaying(false);
                startOffsetRef.current = 0; // Reset to the beginning for the next play
            }
        };
    }
  };


  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center bg-[#FFFEFC] p-4 sm:p-6 rounded-[2rem] shadow-lg">
      <div className="relative w-full aspect-[4/3] bg-yellow-50 rounded-2xl shadow-inner overflow-hidden mb-6">
        {segment.isLoadingImage ? (
           <div className="w-full h-full bg-yellow-100 animate-pulse"></div>
        ) : segment.imageUrl ? (
          <img
            src={segment.imageUrl}
            alt="Story illustration"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-yellow-100"></div>
        )}
      </div>

      <div className="w-full text-center">
        {segment.audioUrl && (
          <button
            onClick={togglePlayPause}
            className="mb-4 w-20 h-20 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all duration-200 disabled:bg-slate-200 disabled:cursor-not-allowed"
            disabled={segment.isLoadingAudio || !audioBufferRef.current}
            aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
          >
            {segment.isLoadingAudio ? (
              <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <PauseIcon className="w-10 h-10" />
            ) : (
              <PlayIcon className="w-10 h-10 pl-1" />
            )}
          </button>
        )}
        <p className="text-slate-700 text-xl md:text-2xl leading-relaxed">
          {segment.paragraph}
        </p>
      </div>
    </div>
  );
};