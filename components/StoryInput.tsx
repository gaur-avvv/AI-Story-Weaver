import React, { useState, useEffect } from 'react';
import { enhancePrompt } from '../services/geminiService';
import { Settings } from '../types';
import { X, Sparkles, Wand2, CornerDownLeft, Mic, Dices } from 'lucide-react';

interface StoryInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  apiKey: string | null;
  settings: Settings;
  externalPrompt?: string;
  onOpenVoiceModal?: () => void;
  onSurpriseMe?: () => void;
}

export const StoryInput: React.FC<StoryInputProps> = ({ 
  onGenerate, 
  isGenerating, 
  apiKey, 
  settings,
  externalPrompt,
  onOpenVoiceModal,
  onSurpriseMe,
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
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto px-4">
      <div className="relative group">
        {/* Highly visible glassmorphic container with rounded-full shape */}
        <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-white/30 rounded-full shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-white/10 transition-all duration-300 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/40 focus-within:shadow-[inset_0_0_15px_rgba(255,255,255,0.2),0_0_35px_rgba(168,85,247,0.4)] py-1.5 px-3 sm:px-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your story idea, speak, or click dice for a random story..."
            disabled={isGenerating}
            className="w-full pl-2 pr-40 sm:pr-56 py-2.5 text-sm sm:text-base font-medium text-white bg-transparent placeholder:text-slate-300 focus:outline-none disabled:opacity-50 tracking-wide selection:bg-purple-500 selection:text-white"
          />
          
          <div className="absolute right-2 flex items-center gap-1.5">
            {prompt.trim().length > 0 && !isGenerating && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {onSurpriseMe && !isGenerating && (
              <button
                type="button"
                onClick={onSurpriseMe}
                disabled={isGenerating}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 hover:text-white border border-purple-400/30 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                title="Surprise Me (Auto-generate random story instantly)"
              >
                <Dices className="w-4 h-4 text-purple-200" />
              </button>
            )}

            {onOpenVoiceModal && (
              <button
                type="button"
                onClick={onOpenVoiceModal}
                disabled={isGenerating}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white/10 hover:bg-purple-500/35 text-purple-200 hover:text-white border border-white/15 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
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
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white/10 hover:bg-purple-500/35 text-purple-200 border border-white/15 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                title="Magic AI Prompt Enhancer"
              >
                {isEnhancing ? (
                  <div className="w-3.5 h-3.5 border-2 border-t-transparent border-purple-200 rounded-full animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 text-purple-300" />
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center justify-center h-8 sm:h-9 px-3.5 sm:px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-full shadow-[0_4px_16px_rgba(168,85,247,0.4)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 border border-white/25 gap-1.5"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">Weaving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Create</span>
                  <CornerDownLeft className="w-3 h-3 opacity-75 hidden md:inline" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};