

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
          className="w-full pl-6 pr-40 sm:pr-48 py-4 text-lg text-slate-800 bg-white border-2 border-blue-300 rounded-full shadow-sm focus:outline-none focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all duration-300"
        />
        
        <div className="absolute inset-y-0 right-0 m-2 flex items-center gap-2">
            {prompt.trim().length > 3 && (
                <button
                    type="button"
                    onClick={handleEnhance}
                    disabled={isEnhancing || isGenerating}
                    className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-full transition-colors"
                    title="Magic Enhance"
                >
                    {isEnhancing ? (
                        <div className="w-5 h-5 border-2 border-t-transparent border-purple-600 rounded-full animate-spin" />
                    ) : (
                        <WandIcon className="w-5 h-5" />
                    )}
                </button>
            )}

            <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center justify-center h-10 sm:h-12 px-6 bg-yellow-400 text-blue-900 font-black text-lg rounded-full shadow-md hover:bg-yellow-500 active:scale-95 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 transition-all duration-200"
            >
            {isGenerating ? 'Creating...' : <> <SparklesIcon className="w-5 h-5 mr-2" /> Create </>}
            </button>
        </div>
      </div>
    </form>
  );
};