import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Film, Download, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { videoExportManager, VideoExportState } from '../services/videoExportService';

interface VideoGenerationIndicatorProps {
  onOpenVideoModal?: () => void;
}

export const VideoGenerationIndicator: React.FC<VideoGenerationIndicatorProps> = ({ onOpenVideoModal }) => {
  const [state, setState] = useState<VideoExportState>(videoExportManager.getState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = videoExportManager.subscribe((newState) => {
      setState(newState);
      if (newState.isGenerating) {
        setDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  if (dismissed || (!state.isGenerating && !state.videoUrl && !state.error)) {
    return null;
  }

  const handleDownload = () => {
    if (!state.videoUrl) return;
    const sanitizedTitle = state.storyTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story_reel';
    const a = document.createElement('a');
    a.href = state.videoUrl;
    a.download = `${sanitizedTitle}.${state.format}`;
    a.click();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-full p-4 bg-slate-900/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] text-white"
        style={{
          boxShadow: state.isGenerating
            ? '0 12px 40px rgba(0,0,0,0.6), 0 0 25px rgba(168,85,247,0.35)'
            : '0 12px 40px rgba(0,0,0,0.6), 0 0 25px rgba(34,197,94,0.35)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                state.isGenerating
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : state.error
                  ? 'bg-red-600/30 text-red-300 border border-red-500/40'
                  : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {state.isGenerating ? (
                <Film className="w-5 h-5 animate-pulse" />
              ) : state.error ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  {state.isGenerating ? 'Video Reel In Progress' : state.error ? 'Generation Issue' : 'Video Generated'}
                </span>
                {state.isGenerating && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/30">
                    {state.progress}%
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-100 truncate max-w-[220px]">
                {state.isGenerating ? state.stepName : state.error ? state.error : state.storyTitle || 'Story Reel Video'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar while generating */}
        {state.isGenerating && (
          <div className="mt-3 space-y-1.5">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-full"
                animate={{ width: `${state.progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-purple-200/60">
              <span>Web Worker Background Pipeline</span>
              <span>{state.progress}%</span>
            </div>
          </div>
        )}

        {/* Actions when completed */}
        {!state.isGenerating && state.videoUrl && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download {state.format.toUpperCase()}</span>
            </button>
            {onOpenVideoModal && (
              <button
                onClick={onOpenVideoModal}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-colors"
              >
                <Video className="w-4 h-4 text-purple-300" />
                <span>Preview</span>
              </button>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
