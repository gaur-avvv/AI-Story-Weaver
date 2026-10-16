import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { enhancePrompt } from '../services/geminiService';
import { Settings } from '../types';
import { 
  X, 
  Sparkles, 
  Wand2, 
  CornerDownLeft, 
  Mic, 
  Dices, 
  SlidersHorizontal, 
  Layers, 
  BookOpen, 
  Check, 
  Compass, 
  ChevronUp, 
  ChevronDown 
} from 'lucide-react';

interface StoryInputProps {
  onGenerate: (prompt: string, overrides?: Partial<Settings>) => void;
  isGenerating: boolean;
  apiKey: string | null;
  settings: Settings;
  externalPrompt?: string;
  onOpenVoiceModal?: () => void;
  onSurpriseMe?: () => void;
}

const PRESET_IDEAS = [
  {
    title: 'Clockwork Citadel',
    genre: 'steampunk',
    protagonist: 'A disgraced chronomancer racing against a frozen gearwork sun',
    setting: 'A vertical brass metropolis in the grip of perpetual soot and ringing bells',
    tone: 'Auditory-rich, suspenseful, cinematic tension',
  },
  {
    title: 'The Silent Abyss',
    genre: 'sci_fi',
    protagonist: 'A deep-salvage diver who discovers an unrecorded frequency beneath the ocean trench',
    setting: 'A claustrophobic titanium submersible surrounded by bioluminescent Leviathans',
    tone: 'Atmospheric dread, slow-burn mystery, visceral sensory details',
  },
  {
    title: 'Ash & Whispers',
    genre: 'gothic_horror',
    protagonist: 'An antique book restorer hired to examine a ledger bound in petrified cedar',
    setting: 'A decaying coastal manor battered by midnight gales and salt spray',
    tone: 'Brooding noir, psychological suspense, eerie stillness',
  },
  {
    title: 'Starlight Caravan',
    genre: 'fantasy',
    protagonist: 'A nomad beast-caller escorting the last moon-stag across glass dunes',
    setting: 'A shimmering expanse of iridescent sand dunes beneath twin moons',
    tone: 'Lyrical wonder, high stakes, tactile immersion',
  },
];

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
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Dynamic Prompt Builder Fields
  const [builderGenre, setBuilderGenre] = useState(settings.genre || 'fantasy');
  const [builderProtagonist, setBuilderProtagonist] = useState('');
  const [builderSetting, setBuilderSetting] = useState('');
  const [builderTone, setBuilderTone] = useState('');

  useEffect(() => {
    if (typeof externalPrompt === 'string') {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt]);

  useEffect(() => {
    if (settings.genre) {
      setBuilderGenre(settings.genre);
    }
  }, [settings.genre]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim());
      setPrompt('');
      setIsBuilderOpen(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_IDEAS[0]) => {
    setBuilderGenre(preset.genre);
    setBuilderProtagonist(preset.protagonist);
    setBuilderSetting(preset.setting);
    setBuilderTone(preset.tone);
  };

  const constructDynamicPrompt = (): string => {
    const parts = [
      'Write a story with the following parameters:',
      `- Genre: ${builderGenre || 'Fiction'}`,
      builderProtagonist ? `- Protagonist & Conflict: ${builderProtagonist.trim()}` : null,
      builderSetting ? `- Setting & Atmosphere: ${builderSetting.trim()}` : null,
      builderTone ? `- Tone & Style: ${builderTone.trim()}` : null,
      '- Directive: Focus on the opening scene establishing character interiority, sensory immersion, and escalating stakes without unnecessary exposition.'
    ].filter(Boolean);

    return parts.join('\n');
  };

  const handleBuildAndGenerate = () => {
    if (!builderProtagonist && !builderSetting && !prompt) return;
    const constructed = constructDynamicPrompt();
    onGenerate(constructed, { genre: builderGenre });
    setIsBuilderOpen(false);
  };

  const handleInsertIntoBox = () => {
    const constructed = constructDynamicPrompt();
    setPrompt(constructed);
    setIsBuilderOpen(false);
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
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Structured Dynamic Prompt Builder Drawer / Card */}
      <AnimatePresence>
        {isBuilderOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-3 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(168,85,247,0.2)] text-white relative overflow-hidden"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Structured Dynamic Prompt Builder</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase font-semibold">
                      Cinematic
                    </span>
                  </h3>
                  <p className="text-[11px] text-purple-200/70">
                    Formulate structured parameters for deep narrative immersion and third-person POV.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Close builder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="mb-3.5">
              <span className="text-[11px] font-semibold text-purple-200/80 block mb-1.5">
                Quick Story Starters:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IDEAS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 text-xs bg-white/5 hover:bg-purple-600/30 text-purple-200 hover:text-white border border-white/10 hover:border-purple-400/40 rounded-full transition-all"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
              {/* Genre Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Genre
                </label>
                <select
                  value={builderGenre}
                  onChange={(e) => setBuilderGenre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="fantasy">Fantasy & High Lore</option>
                  <option value="sci_fi">Sci-Fi & Cyberpunk</option>
                  <option value="mystery">Mystery & Detective</option>
                  <option value="gothic_horror">Gothic Horror & Dread</option>
                  <option value="adventure">Action & High Adventure</option>
                  <option value="steampunk">Steampunk & Clockwork</option>
                  <option value="historical">Historical Drama</option>
                  <option value="fairy_tale">Fairy Tale & Fable</option>
                  <option value="romance">Drama & Romance</option>
                  <option value="mythological">Mythology & Legends</option>
                </select>
              </div>

              {/* Tone & Style */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Tone & Style
                </label>
                <input
                  type="text"
                  value={builderTone}
                  onChange={(e) => setBuilderTone(e.target.value)}
                  placeholder="e.g. Cinematic Noir, auditory-rich, visceral tension"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Protagonist & Conflict */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Protagonist & Central Conflict
                </label>
                <input
                  type="text"
                  value={builderProtagonist}
                  onChange={(e) => setBuilderProtagonist(e.target.value)}
                  placeholder="e.g. A disgraced cartographer hunting for an island that erased itself from imperial maps"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Setting & Atmosphere */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Setting & Atmosphere
                </label>
                <input
                  type="text"
                  value={builderSetting}
                  onChange={(e) => setBuilderSetting(e.target.value)}
                  placeholder="e.g. A perpetual dusk harbor shrouded in bioluminescent fog and cold slate towers"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Directive Notice */}
            <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-2.5 mb-3.5 text-[11px] text-purple-200/90 flex items-start gap-2">
              <Compass className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Cinematic Directive:</strong> Focuses on third-person observational POV, sensory layering, and escalating stakes without unnecessary exposition.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleInsertIntoBox}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/15"
              >
                Insert into Box
              </button>

              <button
                type="button"
                onClick={handleBuildAndGenerate}
                disabled={isGenerating || (!builderProtagonist && !builderSetting && !prompt)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-[0_4px_16px_rgba(168,85,247,0.4)] disabled:opacity-50 transition-all active:scale-95 border border-white/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Weave Story</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Circular Input Form */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative group">
          {/* Glassmorphic container: backdrop-blur-md, 1px white highlight border, subtle inner glow on focus, rounded-full */}
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-white/30 rounded-full shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-white/10 transition-all duration-300 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/40 focus-within:shadow-[inset_0_0_15px_rgba(255,255,255,0.15),0_0_35px_rgba(168,85,247,0.4)] py-1.5 px-3 sm:px-4">
            
            {/* Builder Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsBuilderOpen(!isBuilderOpen)}
              className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200 mr-2 flex-shrink-0 active:scale-95 ${
                isBuilderOpen
                  ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border-white/15'
              }`}
              title={isBuilderOpen ? "Close Structured Dynamic Prompt Builder" : "Open Structured Dynamic Prompt Builder (Genre, Protagonist, Setting, Tone)"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your story idea, or open the Prompt Builder..."
              disabled={isGenerating}
              className="w-full pr-36 sm:pr-48 py-2 text-sm sm:text-base font-medium text-white bg-transparent placeholder:text-slate-300 focus:outline-none disabled:opacity-50 tracking-wide selection:bg-purple-500 selection:text-white"
            />
            
            <div className="absolute right-2 flex items-center gap-1 sm:gap-1.5">
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
                  className="flex items-center justify-center w-8 h-8 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 hover:text-white border border-purple-400/30 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                  title="Surprise Me (Auto-generate random story instantly)"
                >
                  <Dices className="w-3.5 h-3.5 text-purple-200" />
                </button>
              )}

              {onOpenVoiceModal && (
                <button
                  type="button"
                  onClick={onOpenVoiceModal}
                  disabled={isGenerating}
                  className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-purple-500/35 text-purple-200 hover:text-white border border-white/15 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                  title="Voice-to-Text Input (Speak story prompt)"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              )}

              {prompt.trim().length > 3 && (
                <button
                  type="button"
                  onClick={handleEnhance}
                  disabled={isEnhancing || isGenerating}
                  className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-purple-500/35 text-purple-200 border border-white/15 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                  title="Magic AI Prompt Enhancer"
                >
                  {isEnhancing ? (
                    <div className="w-3.5 h-3.5 border-2 border-t-transparent border-purple-200 rounded-full animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-purple-300" />
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
    </div>
  );
};