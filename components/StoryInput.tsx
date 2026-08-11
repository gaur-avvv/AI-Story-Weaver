

import React, { useState } from 'react';
import { SparklesIcon, WandIcon } from './icons';
import { enhancePrompt } from '../services/geminiService';
import { Settings } from '../types';

interface StoryInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  apiKey: string | null;
  settings: Settings;
}

export const StoryInput: React.FC<StoryInputProps> = ({ onGenerate, isGenerating, apiKey, settings }) => {
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt);
      setPrompt('');
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
        const textApiKey = settings.textProvider === 'gemini' ? apiKey : 
                           settings.textProvider === 'groq' ? settings.groqApiKey :
                           settings.textProvider === 'openrouter' ? settings.openRouterApiKey :
                           settings.textProvider === 'siliconflow' ? settings.siliconFlowApiKey :
                           settings.textProvider === 'pollinations' ? settings.pollinationsApiKey :
                           settings.textProvider === 'others' ? settings.othersApiKey : undefined;

        const enhanced = await enhancePrompt(
            prompt, 
            apiKey, 
            settings.textProvider, 
            textApiKey,
            settings.textModel || 'gemini-2.5-flash'
        );
        setPrompt(enhanced);
    } catch (error) {
        console.error("Failed to enhance prompt", error);
        // Optional: show error toast
    } finally {
        setIsEnhancing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What magical story shall we create?"
          disabled={isGenerating}
          className="w-full pl-6 pr-40 sm:pr-48 py-4 text-lg text-slate-100 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all duration-300"
        />
        
        <div className="absolute inset-y-0 right-0 m-2 flex items-center gap-2">
            {prompt.trim().length > 3 && (
                <button
                    type="button"
                    onClick={handleEnhance}
                    disabled={isEnhancing || isGenerating}
                    className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/10 text-purple-300 hover:bg-white/20 border border-white/10 rounded-full transition-colors backdrop-blur-md"
                    title="Magic Enhance"
                >
                    {isEnhancing ? (
                        <div className="w-5 h-5 border-2 border-t-transparent border-purple-300 rounded-full animate-spin" />
                    ) : (
                        <WandIcon className="w-5 h-5" />
                    )}
                </button>
            )}

            <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center justify-center h-10 sm:h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg rounded-full shadow-lg hover:shadow-purple-500/50 active:scale-95 disabled:opacity-50 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-400 transition-all duration-200 border border-white/20"
            >
            {isGenerating ? 'Creating...' : <> <SparklesIcon className="w-5 h-5 mr-2" /> Create </>}
            </button>
        </div>
      </div>
    </form>
  );
};