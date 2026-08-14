import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Sparkles, X, RotateCcw, ArrowRight, Volume2, 
  Check, AlertCircle, Radio, Wand2, Compass
} from 'lucide-react';

interface VoicePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWeaveStory: (prompt: string) => void;
  onSetPrompt: (prompt: string) => void;
  currentLanguage: string;
  isGenerating: boolean;
}

const LANGUAGE_CODE_MAP: Record<string, string> = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Hindi': 'hi-IN',
  'Japanese': 'ja-JP',
  'Chinese (Simplified)': 'zh-CN',
};

export const VoicePromptModal: React.FC<VoicePromptModalProps> = ({
  isOpen,
  onClose,
  onWeaveStory,
  onSetPrompt,
  currentLanguage,
  isGenerating,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [selectedLang, setSelectedLang] = useState(LANGUAGE_CODE_MAP[currentLanguage] || 'en-US');

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync language selection when currentLanguage changes
  useEffect(() => {
    if (LANGUAGE_CODE_MAP[currentLanguage]) {
      setSelectedLang(LANGUAGE_CODE_MAP[currentLanguage]);
    }
  }, [currentLanguage]);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMsg('Voice-to-text is not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  // Initialize and manage Speech Recognition lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      return;
    }

    // Auto-start listening when modal opens if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      startListening();
    }

    return () => {
      stopListening();
    };
  }, [isOpen, selectedLang]);

  const startListening = () => {
    setErrorMsg(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMsg('Speech recognition is not supported in this browser environment.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript + ' ';
          } else {
            interimStr += item[0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => {
            const trimmedPrev = prev.trim();
            const trimmedFinal = finalStr.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedFinal}` : trimmedFinal;
          });
        }
        setInterimTranscript(interimStr);

        // Reset silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setErrorMsg('Microphone access was denied. Please allow microphone permissions in your browser settings.');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Keep listening or give gentle indicator
        } else if (event.error !== 'aborted') {
          setErrorMsg(`Voice input error (${event.error}). Please try again.`);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setErrorMsg('Could not initialize microphone. Please check your browser permissions.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClear = () => {
    setTranscript('');
    setInterimTranscript('');
    setErrorMsg(null);
  };

  const fullPromptText = (transcript + (interimTranscript ? ` ${interimTranscript}` : '')).trim();

  const handleWeave = () => {
    if (!fullPromptText || isGenerating) return;
    stopListening();
    onWeaveStory(fullPromptText);
    onClose();
  };

  const handleSendToInput = () => {
    if (!fullPromptText) return;
    stopListening();
    onSetPrompt(fullPromptText);
    onClose();
  };

  const promptIdeas = [
    'A brave steampunk squirrel searching for the Golden Acorn in a floating clockwork city.',
    'A mysterious lighthouse keeper whose lantern illuminates gateways to forgotten planets.',
    'A magical library where ancient storybook characters escape into the real world at midnight.',
    'A young cybernetic alchemist crafting stars in a neon-drenched Tokyo alley.',
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-slate-900/95 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col gap-5 text-slate-100 overflow-hidden"
        >
          {/* Ambient background glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse' 
                  : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              }`}>
                {isListening ? <Radio className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2">
                  Voice Story Prompt
                  {isListening && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      Listening
                    </span>
                  )}
                </h2>
                <p className="text-xs text-purple-200/60 mt-0.5">
                  Speak naturally to describe characters, setting, or plot premise
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Close Voice Input"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio Waveform & Mic State Indicator */}
          <div className="flex flex-col items-center justify-center py-4 bg-slate-950/60 rounded-2xl border border-white/10 relative overflow-hidden">
            {/* Pulsing visual circles */}
            <div className="relative flex items-center justify-center mb-3">
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="absolute w-24 h-24 rounded-full bg-rose-500/20 border border-rose-500/40"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
                    className="absolute w-24 h-24 rounded-full bg-purple-500/15 border border-purple-500/30"
                  />
                </>
              )}

              <button
                type="button"
                onClick={toggleListening}
                className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl ${
                  isListening
                    ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-rose-500/30 scale-105'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white hover:scale-105 shadow-purple-500/30 hover:brightness-110'
                }`}
                title={isListening ? 'Click to pause listening' : 'Click to start speaking'}
              >
                {isListening ? (
                  <Mic className="w-7 h-7 animate-bounce" />
                ) : (
                  <MicOff className="w-7 h-7 opacity-80" />
                )}
              </button>
            </div>

            {/* Dynamic Waveform Bar Animation */}
            <div className="flex items-center gap-1.5 h-6">
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 35, 75].map((heightPct, idx) => (
                <motion.div
                  key={idx}
                  className={`w-1 rounded-full ${isListening ? 'bg-gradient-to-t from-purple-500 to-rose-400' : 'bg-white/20'}`}
                  animate={{
                    height: isListening ? [`${Math.max(15, heightPct * 0.2)}%`, `${heightPct}%`, `${Math.max(20, heightPct * 0.4)}%`] : '20%',
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + (idx % 4) * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            <p className="text-xs text-purple-200/70 mt-3 font-medium">
              {isListening ? 'Listening to your voice... Speak your story premise' : 'Microphone paused. Tap to resume speaking'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Spoken Text Display Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-purple-200/60">
              <span className="font-semibold text-slate-300">Spoken Story Premise</span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="bg-white/5 border border-white/10 text-purple-200 rounded-lg px-2 py-0.5 text-[11px] focus:outline-none cursor-pointer"
                  title="Speech recognition language"
                >
                  <option value="en-US" className="bg-slate-900 text-white">English (US)</option>
                  <option value="es-ES" className="bg-slate-900 text-white">Spanish (Español)</option>
                  <option value="fr-FR" className="bg-slate-900 text-white">French (Français)</option>
                  <option value="de-DE" className="bg-slate-900 text-white">German (Deutsch)</option>
                  <option value="hi-IN" className="bg-slate-900 text-white">Hindi (हिन्दी)</option>
                  <option value="ja-JP" className="bg-slate-900 text-white">Japanese (日本語)</option>
                  <option value="zh-CN" className="bg-slate-900 text-white">Chinese (中文)</option>
                </select>

                {fullPromptText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative min-h-[90px] max-h-[140px] p-3.5 bg-slate-950/80 border border-white/10 rounded-2xl overflow-y-auto text-sm text-slate-100 font-sans leading-relaxed focus-within:border-purple-400/40">
              {transcript || interimTranscript ? (
                <>
                  <span className="text-white">{transcript}</span>
                  {interimTranscript && (
                    <span className="text-purple-300/70 italic ml-1 font-light animate-pulse">
                      {interimTranscript}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-500 italic text-xs">
                  Your spoken words will appear here in real time as you speak...
                </span>
              )}
            </div>
          </div>

          {/* Quick Idea Starters */}
          {!fullPromptText && (
            <div className="space-y-1.5">
              <span className="text-[11px] text-purple-200/50 flex items-center gap-1 font-medium">
                <Compass className="w-3 h-3 text-purple-400" />
                <span>Or click an idea to speak or try:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {promptIdeas.slice(0, 2).map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript(idea);
                      setInterimTranscript('');
                    }}
                    className="text-left text-[11px] text-purple-200/70 hover:text-white bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-400/30 rounded-xl px-2.5 py-1.5 transition-all line-clamp-1"
                  >
                    "{idea}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleSendToInput}
              disabled={!fullPromptText}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Insert into Input Box</span>
            </button>

            <button
              type="button"
              onClick={handleWeave}
              disabled={!fullPromptText || isGenerating}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  <span>Weaving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Weave Spoken Story</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
