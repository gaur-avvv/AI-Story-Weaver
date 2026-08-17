import React, { useState } from 'react';
import { PlotTwistOption } from '../types';
import { generatePlotTwists } from '../services/geminiService';
import { globalStoryGraph } from '../services/storyGraphState';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Compass, Eye, Flame, Skull, HelpCircle, Zap, RefreshCw } from 'lucide-react';

interface PlotTwistsPanelProps {
  previousParagraphs: string[];
  storyTitle: string;
  genre: string;
  targetAudience: string;
  apiKey: string | null;
  textProvider?: string;
  textModel?: string;
  otherApiKey?: string;
  options?: { customBaseUrl?: string; cloudflareAccountId?: string };
  onSelectTwist: (promptAction: string) => void;
  isGeneratingStory: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; icon: React.ReactNode }> = {
  revelation: { label: 'Shock Revelation', bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', icon: <Eye className="w-4 h-4 text-purple-400" /> },
  supernatural: { label: 'Supernatural Shift', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', icon: <Sparkles className="w-4 h-4 text-cyan-400" /> },
  betrayal: { label: 'Unexpected Betrayal', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-300', icon: <Skull className="w-4 h-4 text-rose-400" /> },
  dramatic_shift: { label: 'Dramatic Catalyst', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', icon: <Flame className="w-4 h-4 text-amber-400" /> },
  mystery: { label: 'Cryptic Mystery', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: <HelpCircle className="w-4 h-4 text-emerald-400" /> },
  action: { label: 'High Stakes Action', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300', icon: <Zap className="w-4 h-4 text-indigo-400" /> },
};

export const PlotTwistsPanel: React.FC<PlotTwistsPanelProps> = ({
  previousParagraphs,
  storyTitle,
  genre,
  targetAudience,
  apiKey,
  textProvider = 'gemini',
  textModel = 'gemini-2.5-flash',
  otherApiKey,
  options,
  onSelectTwist,
  isGeneratingStory,
}) => {
  const [twists, setTwists] = useState<PlotTwistOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const fetchPlotTwists = async () => {
    if (previousParagraphs.length === 0) return;
    setIsLoading(true);
    setError(null);
    setIsOpen(true);

    try {
      const graphContext = globalStoryGraph.getLoreContextForPrompt();
      const result = await generatePlotTwists(
        previousParagraphs,
        storyTitle,
        genre,
        targetAudience,
        apiKey,
        textProvider,
        otherApiKey,
        textModel,
        graphContext,
        options
      );
      setTwists(result);
    } catch (err: any) {
      console.error('Failed to generate plot twists:', err);
      setError(err?.message || 'Failed to analyze trajectory for plot twists.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 no-print">
      {!isOpen ? (
        <div className="flex justify-center">
          <button
            onClick={fetchPlotTwists}
            disabled={isGeneratingStory || previousParagraphs.length === 0}
            className="px-5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-purple-500/30 hover:border-purple-500/60 text-purple-200 text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Compass className="w-4 h-4 text-purple-400 animate-spin-slow" />
            <span>Recommended Next Plot Twists</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] font-mono text-purple-300">
              AI Trajectory
            </span>
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recommended Plot Twists</h3>
                <p className="text-[11px] text-slate-400">
                  Select a thematic trajectory path to pivot the story forward
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPlotTwists}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1"
                title="Refresh Suggestions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <Sparkles className="w-8 h-8 text-purple-400 animate-bounce" />
              <p className="text-xs font-mono text-purple-300">
                Analyzing narrative trajectory & generating 3 plot twist options...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {!isLoading && twists.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {twists.map((twist, idx) => {
                const categoryStyle = CATEGORY_CONFIG[twist.category] || CATEGORY_CONFIG.revelation;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all duration-300 group hover:border-purple-400/50 hover:shadow-xl ${categoryStyle.bg} ${categoryStyle.border}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        {categoryStyle.icon}
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${categoryStyle.text}`}>
                          {categoryStyle.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                        {twist.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                        {twist.description}
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectTwist(twist.promptAction)}
                      disabled={isGeneratingStory}
                      className="w-full py-2 px-3 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 group-hover:bg-purple-500"
                    >
                      <span>Weave Twist</span>
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
