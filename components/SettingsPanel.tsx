import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyIcon, CheckIcon, AlertTriangleIcon, BookText, Paintbrush, Theater, AudioWaveform, ChevronDownIcon } from './icons';
import { Sparkles, Wand2, Sliders, Eye, Volume2, CloudRain, Zap, HardDrive, Database, Trash2, Download, AlertCircle } from 'lucide-react';
import { testApiKey } from '../services/geminiService';
import type { Settings } from '../types';
import { ApiKeyManager } from './ApiKeyManager';
import { useVfx } from '../vfx/VfxContext';
import { VfxGenre, VfxTension, VfxWeather } from '../vfx/types';
import { getStorageHealth, isCloudSyncEnabled, setCloudSyncEnabled, clearAllCache, downloadStoriesJSON, loadStories, type StorageHealth } from '../services/storageService';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const SettingRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className="text-purple-400">{icon}</div>
      <label className="text-lg font-semibold text-purple-100">{label}</label>
    </div>
    {children}
  </div>
);

const CustomSelect: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}> = ({ value, onChange, children }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className="appearance-none w-48 pl-4 pr-10 py-3 text-md text-right font-semibold text-slate-100 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all cursor-pointer shadow-inner [&>option]:bg-slate-800"
    >
      {children}
    </select>
    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
      <ChevronDownIcon className="w-5 h-5 text-purple-300" />
    </div>
  </div>
);

const CustomToggle: React.FC<{
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange({ target: { checked: !checked } } as any)}
    className={`relative inline-flex items-center h-9 w-16 rounded-full transition-colors duration-300 ${checked ? 'bg-purple-500' : 'bg-white/20 border border-white/10'}`}
  >
    <span className={`inline-block w-7 h-7 transform bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? 'translate-x-8' : 'translate-x-1'}`} />
  </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h3 className="text-sm font-bold uppercase text-purple-300 tracking-wider pb-2 border-b border-white/20">{title}</h3>
);


const textModels = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-3.1-flash-preview', name: 'Gemini 3.1 Flash' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'o1', name: 'o1' },
    { id: 'o3-mini', name: 'o3-mini' },
  ],
  groq: [
    { id: 'llama3-8b-8192', name: 'Llama 3 8B' },
    { id: 'llama3-70b-8192', name: 'Llama 3 70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    { id: 'gemma-7b-it', name: 'Gemma 7B' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  ],
  openrouter: [
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
    { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B' },
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
    { id: 'microsoft/wizardlm-2-8x22b', name: 'WizardLM-2 8x22B' },
  ],
  pollinations: [
    { id: 'openai', name: 'OpenAI (Default)' },
    { id: 'openai-fast', name: 'OpenAI Fast' },
    { id: 'openai-large', name: 'OpenAI Large' },
    { id: 'qwen-coder', name: 'Qwen Coder' },
    { id: 'mistral', name: 'Mistral' },
  ],
  others: [
    { id: 'MiniMaxAI/MiniMax-M2.5', name: 'MiniMax M2.5' },
    { id: 'zai-org/GLM-5', name: 'GLM-5' },
    { id: 'stepfun-ai/Step-3.5-Flash', name: 'Step 3.5 Flash' },
    { id: 'moonshotai/Kimi-K2.5', name: 'Kimi K2.5' },
    { id: 'deepseek-ai/DeepSeek-V3.2', name: 'DeepSeek V3.2' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
    { id: 'Qwen/Qwen3-32B', name: 'Qwen3 32B' },
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B' },
  ],
  siliconflow: [
    { id: 'Qwen/Qwen2-7B-Instruct', name: 'Qwen2 7B' },
    { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B' },
    { id: 'deepseek-ai/DeepSeek-V2-Chat', name: 'DeepSeek V2' },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
  ]
};

const imageModels = {
  gemini: [
    { id: 'gemini-2.5-flash-image', name: 'Nano Banana (Gemini 2.5 Flash Preview Image)' },
    { id: 'gemini-3.1-flash-lite-image', name: 'Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)' },
    { id: 'imagen-4-fast-generate', name: 'Imagen 4 Fast Generate' },
    { id: 'imagen-4-generate', name: 'Imagen 4 Generate' },
    { id: 'imagen-4-ultra-generate', name: 'Imagen 4 Ultra Generate' },
  ],
  openai: [
    { id: 'dall-e-3', name: 'DALL-E 3' },
    { id: 'dall-e-2', name: 'DALL-E 2' },
  ],
  pollinations: [
    { id: 'flux', name: 'Flux (Default)' },
    { id: 'flux-realism', name: 'Flux Realism' },
    { id: 'flux-coda', name: 'Flux Coda' },
    { id: 'flux-3d', name: 'Flux 3D' },
    { id: 'flux-anime', name: 'Flux Anime' },
    { id: 'any-dark', name: 'Any Dark' },
    { id: 'turbo', name: 'Turbo' },
    { id: 'midjourney', name: 'Midjourney Style' },
    { id: 'majicmix', name: 'MajicMix' },
    { id: 'deliberate', name: 'Deliberate' },
    { id: 'dreamshaper', name: 'Dreamshaper' },
    { id: 'kontext', name: 'Kontext' },
    { id: 'nanobanana', name: 'NanoBanana' },
    { id: 'nanobanana-2', name: 'NanoBanana 2' },
    { id: 'nanobanana-pro', name: 'NanoBanana Pro' },
    { id: 'seedream5', name: 'SeeDream 5' },
    { id: 'seedream', name: 'SeeDream' },
    { id: 'seedream-pro', name: 'SeeDream Pro' },
    { id: 'gptimage', name: 'GPT Image' },
    { id: 'gptimage-large', name: 'GPT Image Large' },
    { id: 'zimage', name: 'Z Image' },
    { id: 'klein', name: 'Klein' },
    { id: 'klein-large', name: 'Klein Large' },
    { id: 'imagen-4', name: 'Imagen 4' },
    { id: 'flux-2-dev', name: 'Flux 2 Dev' },
    { id: 'grok-imagine', name: 'Grok Imagine' },
  ],
  siliconflow: [
    { id: 'stabilityai/stable-diffusion-3-medium', name: 'Stable Diffusion 3' },
    { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0' },
    { id: 'black-forest-labs/FLUX.1-schnell', name: 'Flux.1 Schnell' },
    { id: 'black-forest-labs/FLUX.1-dev', name: 'Flux.1 Dev' },
  ]
};

const audioModels = {
  gemini: [
    { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS' },
  ],
  openai: [
    { id: 'tts-1', name: 'TTS-1 (Standard)' },
    { id: 'tts-1-hd', name: 'TTS-1 HD (High Quality)' },
  ],
  pollinations: [
    { id: 'openai-audio', name: 'Pollinations Audio (OpenAI)' },
  ]
};

const audioVoices = {
  gemini: [
    { id: 'Kore', name: 'Kore (Female - Warm)' },
    { id: 'Puck', name: 'Puck (Male - Energetic)' },
    { id: 'Charon', name: 'Charon (Male - Deep)' },
    { id: 'Fenrir', name: 'Fenrir (Male - Intense)' },
    { id: 'Zephyr', name: 'Zephyr (Female - Calm)' },
  ],
  openai: [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male - Soft)' },
    { id: 'fable', name: 'Fable (British - Expressive)' },
    { id: 'onyx', name: 'Onyx (Male - Deep)' },
    { id: 'nova', name: 'Nova (Female - Energetic)' },
    { id: 'shimmer', name: 'Shimmer (Female - Clear)' },
  ],
  pollinations: [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male - Soft)' },
    { id: 'fable', name: 'Fable (British - Expressive)' },
    { id: 'onyx', name: 'Onyx (Male - Deep)' },
    { id: 'nova', name: 'Nova (Female - Energetic)' },
    { id: 'shimmer', name: 'Shimmer (Female - Clear)' },
    { id: 'ash', name: 'Ash' },
    { id: 'ballad', name: 'Ballad' },
    { id: 'coral', name: 'Coral' },
    { id: 'sage', name: 'Sage' },
    { id: 'verse', name: 'Verse' },
    { id: 'rachel', name: 'Rachel' },
    { id: 'domi', name: 'Domi' },
    { id: 'bella', name: 'Bella' },
    { id: 'elli', name: 'Elli' },
    { id: 'charlotte', name: 'Charlotte' },
    { id: 'dorothy', name: 'Dorothy' },
    { id: 'sarah', name: 'Sarah' },
    { id: 'emily', name: 'Emily' },
    { id: 'lily', name: 'Lily' },
    { id: 'matilda', name: 'Matilda' },
    { id: 'adam', name: 'Adam' },
    { id: 'antoni', name: 'Antoni' },
    { id: 'arnold', name: 'Arnold' },
    { id: 'josh', name: 'Josh' },
    { id: 'sam', name: 'Sam' },
    { id: 'daniel', name: 'Daniel' },
    { id: 'charlie', name: 'Charlie' },
    { id: 'james', name: 'James' },
    { id: 'fin', name: 'Fin' },
    { id: 'callum', name: 'Callum' },
    { id: 'liam', name: 'Liam' },
    { id: 'george', name: 'George' },
    { id: 'brian', name: 'Brian' },
    { id: 'bill', name: 'Bill' },
  ]
};

export const SettingsPanel: React.FC<{
  onSave: (key: string, settings: Settings) => void;
  currentApiKey: string | null;
  currentSettings: Settings;
}> = ({ onSave, currentApiKey, currentSettings }) => {
  const { 
    vfx, 
    setGenre, 
    setTension, 
    setWeather, 
    toggleAutoAnalyze, 
    toggleAudioAtmosphere, 
    toggleFireEmbers,
    toggleFlowerPetals,
    toggleLushPlants,
    toggleHorizonHills,
    toggleRiverWater,
    toggleCosmicDust,
    triggerScreenShake, 
    triggerLightning, 
  } = useVfx();
  const [localApiKey, setLocalApiKey] = useState('');
  const [localSettings, setLocalSettings] = useState<Settings>(currentSettings);
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [cloudSync, setCloudSync] = useState(isCloudSyncEnabled());
  const [isClearing, setIsClearing] = useState(false);

  const refreshStorageHealth = async () => {
    const health = await getStorageHealth();
    setStorageHealth(health);
  };

  useEffect(() => {
    refreshStorageHealth();
  }, []);

  const handleToggleCloudSync = (enabled: boolean) => {
    setCloudSyncEnabled(enabled);
    setCloudSync(enabled);
    refreshStorageHealth();
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear cached media and non-essential stories? Your settings will remain intact.')) {
      setIsClearing(true);
      await clearAllCache();
      await refreshStorageHealth();
      setIsClearing(false);
    }
  };

  const handleDownloadBackup = async () => {
    const stories = await loadStories();
    downloadStoriesJSON(stories);
  };
  
  useEffect(() => {
    setLocalApiKey(currentApiKey || '');
    setLocalSettings(currentSettings);
  }, [currentApiKey, currentSettings]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSave = (key: string | null, settings: Settings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onSave(key, settings);
    }, 500);
  };

  // Ensure model is valid when provider changes
  useEffect(() => {
    const validTextModels = textModels[localSettings.textProvider] || [];
    if (!validTextModels.find(m => m.id === localSettings.textModel)) {
      setLocalSettings(prev => {
        const next = { ...prev, textModel: validTextModels[0]?.id || '' };
        triggerAutoSave(localApiKey, next);
        return next;
      });
    }
  }, [localSettings.textProvider]);

  useEffect(() => {
    const validImageModels = imageModels[localSettings.imageProvider] || [];
    if (!validImageModels.find(m => m.id === localSettings.imageModel)) {
      setLocalSettings(prev => {
        const next = { ...prev, imageModel: validImageModels[0]?.id || '' };
        triggerAutoSave(localApiKey, next);
        return next;
      });
    }
  }, [localSettings.imageProvider]);

  useEffect(() => {
    const validAudioModels = audioModels[localSettings.audioProvider] || [];
    if (!validAudioModels.find(m => m.id === localSettings.audioModel)) {
      setLocalSettings(prev => {
        const next = { ...prev, audioModel: validAudioModels[0]?.id || '' };
        triggerAutoSave(localApiKey, next);
        return next;
      });
    }
  }, [localSettings.audioProvider]);

  const handleSettingChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalSettings(prev => {
      const next = {...prev, [field]: newValue};
      triggerAutoSave(localApiKey, next);
      return next;
    });
  };

  const handleToggleChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setLocalSettings(prev => {
      const next = {...prev, [field]: newValue};
      triggerAutoSave(localApiKey, next);
      return next;
    });
  };

  const handleApiKeySave = (provider: string, key: string) => {
    if (provider === 'gemini') {
        setLocalApiKey(key);
        triggerAutoSave(key, localSettings);
    } else {
        let field: keyof Settings;
        if (provider === 'openai') field = 'openaiApiKey';
        else if (provider === 'groq') field = 'groqApiKey';
        else if (provider === 'openrouter') field = 'openRouterApiKey';
        else if (provider === 'siliconflow') field = 'siliconFlowApiKey';
        else if (provider === 'pollinations') field = 'pollinationsApiKey';
        else if (provider === 'others') field = 'othersApiKey';
        else return;

        setLocalSettings(prev => {
            const next = { ...prev, [field]: key };
            triggerAutoSave(localApiKey, next);
            return next;
        });
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] shadow-[0_16px_40px_rgba(0,0,0,0.4)] w-full max-w-3xl mx-auto border border-white/20">
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white drop-shadow-md">Story Options</h2>
      </div>

      <div className="p-6 space-y-8">
        
        {/* API Key Manager Section */}
        <div className="space-y-4">
            <SectionHeader title="API Keys" />
            <ApiKeyManager 
                apiKeys={{
                    gemini: localApiKey,
                    openai: localSettings.openaiApiKey,
                    groq: localSettings.groqApiKey,
                    openrouter: localSettings.openRouterApiKey,
                    siliconflow: localSettings.siliconFlowApiKey,
                    pollinations: localSettings.pollinationsApiKey,
                    others: localSettings.othersApiKey
                }}
                onSave={handleApiKeySave}
            />
        </div>

        <div className="space-y-4">
          <SectionHeader title="Story" />
            <SettingRow icon={<BookText className="w-6 h-6" />} label="Length">
            <CustomSelect value={localSettings.storyLength} onChange={handleSettingChange('storyLength')}>
              <option value="very_short">Very Short</option>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
              <option value="very_long">Very Long</option>
            </CustomSelect>
          </SettingRow>
          <SettingRow icon={<Theater className="w-6 h-6" />} label="Genre">
            <CustomSelect value={localSettings.genre} onChange={handleSettingChange('genre')}>
              <option value="fantasy">Fantasy</option>
              <option value="sci-fi">Sci-Fi</option>
              <option value="mystery">Mystery</option>
              <option value="adventure">Adventure</option>
              <option value="funny">Funny</option>
              <option value="fairy_tale">Fairy Tale</option>
              <option value="educational">Educational</option>
              <option value="bedtime">Bedtime Story</option>
              <option value="fable">Fable</option>
              <option value="superhero">Superhero</option>
              {localSettings.targetAudience === 'adult' && (
                <>
                  <option value="thriller">Thriller</option>
                  <option value="romance">Romance</option>
                  <option value="horror">Horror</option>
                  <option value="historical">Historical Fiction</option>
                  <option value="crime">Crime</option>
                  <option value="drama">Drama</option>
                </>
              )}
            </CustomSelect>
          </SettingRow>
          <SettingRow icon={<BookText className="w-6 h-6" />} label="Audience">
             <CustomSelect value={localSettings.targetAudience} onChange={handleSettingChange('targetAudience')}>
                <option value="children">Children</option>
                <option value="teen">Teen</option>
                <option value="adult">Adult</option>
             </CustomSelect>
          </SettingRow>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Appearance" />
          <SettingRow icon={<Paintbrush className="w-6 h-6" />} label="Image Style">
              <CustomSelect value={localSettings.imageStyle} onChange={handleSettingChange('imageStyle')}>
              <option value="whimsical">Whimsical</option>
              <option value="cartoon">Cartoon</option>
              <option value="realistic">Realistic</option>
              <option value="watercolor">Watercolor</option>
              <option value="3d_render">3D Render</option>
              <option value="pixel_art">Pixel Art</option>
              <option value="anime">Anime</option>
              <option value="oil_painting">Oil Painting</option>
              <option value="noir">Film Noir</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="vintage">Vintage</option>
              <option value="abstract">Abstract</option>
              <option value="disney_animation">Disney Animation</option>
              <option value="pixar_3d">Pixar 3D</option>
              <option value="vintage_disney">Vintage Disney</option>
            </CustomSelect>
          </SettingRow>
          <SettingRow icon={<AudioWaveform className="w-6 h-6" />} label="Narration">
            <div className="flex items-center gap-4">
              <CustomSelect value={localSettings.voice} onChange={handleSettingChange('voice')}>
                {(audioVoices[localSettings.audioProvider] || []).map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </CustomSelect>
              <CustomToggle checked={localSettings.generateAudio} onChange={handleToggleChange('generateAudio')} />
            </div>
          </SettingRow>
          <SettingRow icon={<BookText className="w-6 h-6" />} label="PDF Margin">
             <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={localSettings.pdfMargin} 
                  onChange={(e) => setLocalSettings(prev => ({...prev, pdfMargin: parseInt(e.target.value) }))}
                  className="w-32 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-purple-100 font-semibold w-8 text-right">{localSettings.pdfMargin}</span>
             </div>
          </SettingRow>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Advanced" />
            
            {/* Text Generation Settings */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-purple-300/60 uppercase tracking-wide">Text Generation</h4>
              <SettingRow icon={<BookText className="w-6 h-6" />} label="Provider">
                <CustomSelect value={localSettings.textProvider} onChange={handleSettingChange('textProvider')}>
                  <option value="gemini">Google Gemini</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="siliconflow">SiliconFlow</option>
                  <option value="pollinations">Pollinations.ai</option>
                  <option value="others">Other Models</option>
                </CustomSelect>
              </SettingRow>
              <SettingRow icon={<BookText className="w-6 h-6" />} label="Model">
                <CustomSelect value={localSettings.textModel} onChange={handleSettingChange('textModel')}>
                  {(textModels[localSettings.textProvider] || []).map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </CustomSelect>
              </SettingRow>
            </div>

            {/* Image Generation Settings */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <h4 className="text-sm font-semibold text-purple-300/60 uppercase tracking-wide">Image Generation</h4>
              <SettingRow icon={<Paintbrush className="w-6 h-6" />} label="Provider">
                <CustomSelect value={localSettings.imageProvider} onChange={handleSettingChange('imageProvider')}>
                  <option value="gemini">Google Gemini</option>
                  <option value="pollinations">Pollinations.ai</option>
                  <option value="siliconflow">SiliconFlow</option>
                </CustomSelect>
              </SettingRow>
              <SettingRow icon={<Paintbrush className="w-6 h-6" />} label="Model">
                <CustomSelect value={localSettings.imageModel} onChange={handleSettingChange('imageModel')}>
                  {(imageModels[localSettings.imageProvider] || []).map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </CustomSelect>
              </SettingRow>
            </div>

            {/* Audio Generation Settings */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <h4 className="text-sm font-semibold text-purple-300/60 uppercase tracking-wide">Audio Generation</h4>
              <SettingRow icon={<AudioWaveform className="w-6 h-6" />} label="Provider">
                <CustomSelect value={localSettings.audioProvider} onChange={handleSettingChange('audioProvider')}>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="pollinations">Pollinations.ai</option>
                </CustomSelect>
              </SettingRow>
              <SettingRow icon={<AudioWaveform className="w-6 h-6" />} label="Model">
                <CustomSelect value={localSettings.audioModel} onChange={handleSettingChange('audioModel')}>
                  {(audioModels[localSettings.audioProvider] || []).map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </CustomSelect>
              </SettingRow>
            </div>

            {/* VFX Studio & Atmospheric Systems */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <SectionHeader title="VFX Studio & Atmosphere" />
              
              <SettingRow icon={<Wand2 className="w-6 h-6 text-purple-400" />} label="Narrative Genre">
                <CustomSelect value={vfx.genre} onChange={(e) => setGenre(e.target.value as VfxGenre)}>
                  <option value="fantasy">High Fantasy</option>
                  <option value="sci-fi">Science Fiction</option>
                  <option value="horror">Horror</option>
                  <option value="romance">Romance</option>
                  <option value="mystery">Mystery</option>
                  <option value="thriller">Thriller</option>
                  <option value="comedy">Comedy</option>
                  <option value="historical">Historical</option>
                  <option value="western">Western</option>
                  <option value="action">Action</option>
                </CustomSelect>
              </SettingRow>

              <SettingRow icon={<Zap className="w-6 h-6 text-amber-400" />} label="Dramatic Tension">
                <CustomSelect value={vfx.tension} onChange={(e) => setTension(e.target.value as VfxTension)}>
                  <option value="low">Low (Peaceful)</option>
                  <option value="medium">Medium (Building)</option>
                  <option value="high">High (Climax Approaching)</option>
                  <option value="climax">Climax (Peak Drama)</option>
                </CustomSelect>
              </SettingRow>

              <SettingRow icon={<CloudRain className="w-6 h-6 text-cyan-400" />} label="Weather">
                <CustomSelect value={vfx.weather} onChange={(e) => setWeather(e.target.value as VfxWeather)}>
                  <option value="clear">Clear Sky</option>
                  <option value="rainy">Rainy</option>
                  <option value="stormy">Thunderstorm</option>
                  <option value="snowy">Snowing</option>
                  <option value="foggy">Dense Fog</option>
                  <option value="windy">Windy</option>
                </CustomSelect>
              </SettingRow>

              {/* Cinematic Scene Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                <button
                  onClick={toggleFireEmbers}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    vfx.showFireEmbers
                      ? 'bg-orange-500/20 border-orange-400/50 text-orange-200'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>Fire & Embers</span>
                </button>

                <button
                  onClick={toggleFlowerPetals}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    vfx.showFlowerPetals
                      ? 'bg-pink-500/20 border-pink-400/50 text-pink-200'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>Sakura Petals</span>
                </button>

                <button
                  onClick={toggleLushPlants}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    vfx.showLushPlants
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Lush Plants</span>
                </button>

                <button
                  onClick={toggleHorizonHills}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    vfx.showHorizonHills
                      ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Horizon Hills</span>
                </button>

                <button
                  onClick={toggleRiverWater}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    vfx.showRiverWater
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Serene River</span>
                </button>

                <button
                  onClick={toggleCosmicDust}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    vfx.showCosmicDust
                      ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Cosmic Dust</span>
                </button>
              </div>
            </div>

            {/* Storage Health & Persistence */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <SectionHeader title="Storage Health & Archiving" />

              {/* Cloud Sync Toggle */}
              <SettingRow icon={<Database className="w-6 h-6 text-indigo-400" />} label="Cloud Storage Sync">
                <CustomToggle checked={cloudSync} onChange={(e) => handleToggleCloudSync(e.target.checked)} />
              </SettingRow>

              {/* Storage Health Gauge */}
              {storageHealth && (
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <div className="flex items-center gap-2 text-purple-200">
                      <HardDrive className="w-4 h-4 text-purple-400" />
                      <span>Local Storage Usage ({storageHealth.formattedUsed} / {storageHealth.formattedQuota})</span>
                    </div>
                    <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                      storageHealth.isQuotaWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {storageHealth.percentUsed}%
                    </span>
                  </div>

                  {/* Meter Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        storageHealth.percentUsed >= 80 ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, storageHealth.percentUsed)}%` }}
                    />
                  </div>

                  {/* Warning banner */}
                  {storageHealth.isQuotaWarning && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>Storage is above 80% capacity. Older stories will automatically archive to preserve system responsiveness.</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleClearCache}
                      disabled={isClearing}
                      className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isClearing ? 'Clearing...' : 'Clear Cached Media'}</span>
                    </button>

                    <button
                      onClick={handleDownloadBackup}
                      className="flex-1 py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      <span>Download Backup (.json)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};