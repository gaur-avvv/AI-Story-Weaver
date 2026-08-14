

import React, { useState, useEffect } from 'react';
import { SparklesIcon, WandIcon } from './icons';
import { enhancePrompt } from '../services/geminiService';
import { Settings } from '../types';
import { X, Sparkles, Wand2, CornerDownLeft, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  apiKey: string | null;
  settings: Settings;
  externalPrompt?: string;
  onOpenVoiceModal?: () => void;
}

export const StoryInput: React.FC<StoryInputProps> = ({ 
  onGenerate, 
  isGenerating, 
  apiKey, 
  settings,
  externalPrompt,
  onOpenVoiceModal,
}) => {
  const [prompt, setPrompt] = useState(externalPrompt || '');
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    if (typeof externalPrompt === 'string') {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim());
      setPrompt('');
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const getApiKey = () => {
        switch (settings.textProvider) {
          case 'gemini': return apiKey;
          case 'groq': return settings.groqApiKey;
          case 'openrouter': return settings.openRouterApiKey;
          case 'siliconflow': return settings.siliconFlowApiKey;
          case 'openai': return settings.openaiApiKey;
          case 'pollinations': return settings.pollinationsApiKey;
          case 'zai': return settings.zaiApiKey;
          case 'cerebras': return settings.cerebrasApiKey;
          case 'mistral': return settings.mistralApiKey;
          case 'cohere': return settings.cohereApiKey;
          case 'nvidia': return settings.nvidiaApiKey;
          case 'requesty': return settings.requestyApiKey;
          case 'huggingface': return settings.huggingfaceApiKey;
          case 'cloudflare': return settings.cloudflareApiKey;
          case 'others': return settings.othersApiKey;
          default: return undefined;
        }
      };

      const enhanced = await enhancePrompt(
        prompt, 
        apiKey, 
        settings.textProvider, 
        getApiKey(),
        settings.textModel || 'gemini-2.5-flash',
        {
          customBaseUrl: settings.customBaseUrl,
          cloudflareAccountId: settings.cloudflareAccountId,
        }
      );
      setPrompt(enhanced);
    } catch (error) {
      console.error("Failed to enhance prompt", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-indigo-500/20 rounded-full blur-md opacity-50 group-hover:opacity-80 transition duration-500 pointer-events-none" />
        
        <div className="relative flex items-center bg-slate-900/85 backdrop-blur-2xl border border-white/15 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 focus-within:border-purple-400/50 focus-within:shadow-[0_8px_32px_rgba(168,85,247,0.25)]">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your story idea or click mic to speak..."
            disabled={isGenerating}
            className="w-full pl-6 pr-44 sm:pr-56 py-3.5 sm:py-4 text-base sm:text-lg text-slate-100 bg-transparent placeholder:text-slate-400/70 focus:outline-none disabled:opacity-50"
          />
          
          <div className="absolute right-1.5 sm:right-2 flex items-center gap-1 sm:gap-1.5">
            {prompt.trim().length > 0 && !isGenerating && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-full transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {onOpenVoiceModal && (
              <button
                type="button"
                onClick={onOpenVoiceModal}
                disabled={isGenerating}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white/5 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/30 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                title="Voice-to-Text Input (Speak story prompt)"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {prompt.trim().length > 3 && (
              <button
                type="button"
                onClick={handleEnhance}
                disabled={isEnhancing || isGenerating}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white/5 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                title="Magic AI Prompt Enhancer"
              >
                {isEnhancing ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-purple-300 rounded-full animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center justify-center h-9 sm:h-11 px-4 sm:px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base rounded-full shadow-md hover:shadow-purple-500/30 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 border border-white/20 gap-1.5"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">Weaving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create</span>
                  <CornerDownLeft className="w-3.5 h-3.5 opacity-60 hidden md:inline" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};