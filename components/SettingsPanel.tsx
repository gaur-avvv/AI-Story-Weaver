import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookText, Paintbrush, Theater, AudioWaveform, ChevronDownIcon } from './icons';
import { 
  Sparkles, Wand2, Sliders, Volume2, CloudRain, Zap, HardDrive, Database, Trash2, Download, AlertCircle, Type, AlignJustify,
  Ghost, Rocket, Heart, Search, Smile, Scroll, Compass, Shield, Check, Activity, SlidersHorizontal, Film, Image as ImageIcon
} from 'lucide-react';
import type { Settings } from '../types';
import { ApiKeyManager } from './ApiKeyManager';
import { useVfx } from '../vfx/VfxContext';
import { VfxGenre, VfxTension, VfxWeather } from '../vfx/types';
import { getStorageHealth, isCloudSyncEnabled, setCloudSyncEnabled, clearAllCache, downloadStoriesJSON, loadStories, type StorageHealth } from '../services/storageService';
import { PROVIDER_OPTIMAL_DEFAULTS } from '../utils/modelPresets';
import { 
  ALL_PROVIDERS, 
  RECOMMENDED_PROVIDERS, 
  CLOUD_PROVIDERS, 
  ROUTER_PROVIDERS, 
  LOCAL_PROVIDERS, 
  EXTENDED_PROVIDERS, 
  getProviderById 
} from '../utils/providersCatalog';

type SettingsTab = 'story' | 'vfx' | 'models' | 'storage';

const SettingRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ icon, label, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-purple-300 flex-shrink-0">
        {icon}
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-100">{label}</label>
        {description && <p className="text-xs text-purple-200/50">{description}</p>}
      </div>
    </div>
    <div className="flex items-center justify-end">
      {children}
    </div>
  </div>
);

const CustomSelect: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ value, onChange, children, className = '' }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className={`appearance-none w-44 sm:w-48 pl-3.5 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-100 bg-slate-950/70 backdrop-blur-md border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all cursor-pointer shadow-inner [&>option]:bg-slate-900 ${className}`}
    >
      {children}
    </select>
    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
      <ChevronDownIcon className="w-4 h-4 text-purple-300/70" />
    </div>
  </div>
);

const CustomToggle: React.FC<{
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange({ target: { checked: !checked } } as any)}
    className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 ${
      checked ? 'bg-purple-600' : 'bg-slate-800 border border-white/10'
    }`}
  >
    <span
      className={`inline-block w-5 h-5 transform bg-white rounded-full shadow-md transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const getTextModelsForProvider = (providerId: string): { id: string; name: string }[] => {
  const meta = getProviderById(providerId);
  if (meta && meta.models && meta.models.length > 0) {
    return meta.models;
  }
  return [{ id: 'default', name: 'Default Model' }];
};

const imageModels: Record<string, { id: string; name: string }[]> = {
  gemini: [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (8K Scene Illustration)' },
    { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image (Ultra Dynamic)' },
    { id: 'gemini-3.1-pro-image', name: 'Gemini 3.1 Pro Image (Studio Masterpiece)' },
    { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash Lite Image (Fast)' },
    { id: 'imagen-4-ultra-generate', name: 'Imagen 4 Ultra Generate (Google Photorealism)' },
    { id: 'imagen-4-generate', name: 'Imagen 4 Generate' },
    { id: 'imagen-4-fast-generate', name: 'Imagen 4 Fast Generate' },
  ],
  pollinations: [
    { id: 'nanobanana-2-lite', name: 'Nano Banana 2 Lite (Fast & Vibrant 100% Free)' },
    { id: 'nanobanana-2', name: 'Nano Banana 2 (HDR Crisp 100% Free)' },
    { id: 'nanobanana-pro', name: 'Nano Banana Pro (Studio Quality 100% Free)' },
    { id: 'nanobanana-ultra', name: 'Nano Banana Ultra (Cinematic 4K 100% Free)' },
    { id: 'nanobanana', name: 'Nano Banana Classic' },
    { id: 'nanobanana-lite', name: 'Nano Banana Lite' },
    { id: 'flux', name: 'Flux.1 (Default Free)' },
    { id: 'flux-realism', name: 'Flux Realism' },
    { id: 'flux-3d', name: 'Flux 3D CGI' },
    { id: 'flux-anime', name: 'Flux Anime' },
    { id: 'turbo', name: 'Turbo (Instant)' },
    { id: 'midjourney', name: 'Midjourney Style' },
    { id: 'seedream-pro', name: 'SeeDream Pro' },
    { id: 'gptimage', name: 'GPT Image' },
    { id: 'gptimage-large', name: 'GPT Image Large' },
  ],
  puter: [
    { id: 'nanobanana-2-lite', name: 'Nano Banana 2 Lite (Puter Free)' },
    { id: 'nanobanana-2', name: 'Nano Banana 2 (Puter Free)' },
    { id: 'nanobanana-pro', name: 'Nano Banana Pro (Puter Free)' },
    { id: 'nanobanana-ultra', name: 'Nano Banana Ultra (Puter Free)' },
    { id: 'nanobanana', name: 'Nano Banana (Puter Free)' },
    { id: 'puter-txt2img', name: 'Puter Free AI Image (Flux / Txt2Img)' },
  ],
  openai: [
    { id: 'dall-e-3', name: 'DALL-E 3 (High Quality)' },
    { id: 'dall-e-2', name: 'DALL-E 2' },
  ],
  zai: [
    { id: 'cogview-3-flash', name: 'CogView-3-Flash (Fast / Free Tier)' },
    { id: 'cogview-3-plus', name: 'CogView-3-Plus (High Resolution)' },
    { id: 'cogview-3', name: 'CogView-3' },
  ],
  huggingface: [
    { id: 'black-forest-labs/FLUX.1-schnell', name: 'Flux.1 Schnell (Hugging Face Free)' },
    { id: 'black-forest-labs/FLUX.1-dev', name: 'Flux.1 Dev' },
    { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0 (Hugging Face)' },
  ],
  cloudflare: [
    { id: '@cf/black-forest-labs/flux-1-schnell', name: 'Flux.1 Schnell (Cloudflare Free)' },
    { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0 (Cloudflare)' },
  ],
  siliconflow: [
    { id: 'black-forest-labs/FLUX.1-schnell', name: 'Flux.1 Schnell (SiliconFlow)' },
    { id: 'black-forest-labs/FLUX.1-dev', name: 'Flux.1 Dev' },
    { id: 'stabilityai/stable-diffusion-3-medium', name: 'Stable Diffusion 3' },
  ],
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
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('story');
  const [localApiKey, setLocalApiKey] = useState('');
  const [localSettings, setLocalSettings] = useState<Settings>(currentSettings);
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [cloudSync, setCloudSync] = useState(isCloudSyncEnabled());
  const [isClearing, setIsClearing] = useState(false);
  const [puterUser, setPuterUser] = useState<any>(null);
  const [isPuterAuthChecking, setIsPuterAuthChecking] = useState(false);

  const checkPuterAuth = async () => {
    if (typeof window !== 'undefined' && (window as any).puter?.auth) {
      try {
        const signedIn = (window as any).puter.auth.isSignedIn();
        if (signedIn) {
          const user = await (window as any).puter.auth.getUser();
          setPuterUser(user);
        } else {
          setPuterUser(null);
        }
      } catch {
        setPuterUser(null);
      }
    }
  };

  const handlePuterSignIn = async () => {
    if (typeof window !== 'undefined' && (window as any).puter?.auth) {
      try {
        setIsPuterAuthChecking(true);
        await (window as any).puter.auth.signIn();
        await checkPuterAuth();
        refreshStorageHealth();
      } catch (err) {
        console.warn("Puter auth failed:", err);
      } finally {
        setIsPuterAuthChecking(false);
      }
    }
  };

  const handlePuterSignOut = async () => {
    if (typeof window !== 'undefined' && (window as any).puter?.auth) {
      try {
        (window as any).puter.auth.signOut();
        setPuterUser(null);
        refreshStorageHealth();
      } catch (err) {
        console.warn("Puter sign out failed:", err);
      }
    }
  };

  const refreshStorageHealth = async () => {
    const health = await getStorageHealth();
    setStorageHealth(health);
  };

  useEffect(() => {
    refreshStorageHealth();
    checkPuterAuth();
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

  // Ensure model is valid and optimal when provider changes
  useEffect(() => {
    const validTextModels = getTextModelsForProvider(localSettings.textProvider);
    const optimalModel = PROVIDER_OPTIMAL_DEFAULTS[localSettings.textProvider]?.textModel;
    const isCurrentValid = validTextModels.some(m => m.id === localSettings.textModel);
    
    if (!isCurrentValid || (optimalModel && !localSettings.textModel)) {
      const selectedModel = (optimalModel && validTextModels.some(m => m.id === optimalModel))
        ? optimalModel 
        : (validTextModels[0]?.id || '');
      setLocalSettings(prev => {
        const next = { ...prev, textModel: selectedModel };
        triggerAutoSave(localApiKey, next);
        return next;
      });
    }
  }, [localSettings.textProvider]);

  useEffect(() => {
    const validImageModels = imageModels[localSettings.imageProvider] || [];
    const optimalModel = PROVIDER_OPTIMAL_DEFAULTS[localSettings.imageProvider]?.imageModel;
    const isCurrentValid = validImageModels.some(m => m.id === localSettings.imageModel);
    
    if (!isCurrentValid || (optimalModel && !localSettings.imageModel)) {
      const selectedModel = (optimalModel && validImageModels.some(m => m.id === optimalModel))
        ? optimalModel 
        : (validImageModels[0]?.id || '');
      setLocalSettings(prev => {
        const next = { ...prev, imageModel: selectedModel };
        triggerAutoSave(localApiKey, next);
        return next;
      });
    }
  }, [localSettings.imageProvider]);

  useEffect(() => {
    const validAudioModels = audioModels[localSettings.audioProvider] || [];
    const optimalModel = PROVIDER_OPTIMAL_DEFAULTS[localSettings.audioProvider]?.audioModel;
    const isCurrentValid = validAudioModels.some(m => m.id === localSettings.audioModel);
    
    if (!isCurrentValid || (optimalModel && !localSettings.audioModel)) {
      const selectedModel = (optimalModel && validAudioModels.some(m => m.id === optimalModel))
        ? optimalModel 
        : (validAudioModels[0]?.id || '');
      setLocalSettings(prev => {
        const next = { ...prev, audioModel: selectedModel };
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

  const handleApiKeySave = (fieldOrProvider: string, value: string) => {
    if (fieldOrProvider === 'gemini' || fieldOrProvider === 'geminiApiKey') {
        setLocalApiKey(value);
        setLocalSettings(prev => ({ ...prev, geminiApiKey: value }));
        triggerAutoSave(value, { ...localSettings, geminiApiKey: value });
    } else if (fieldOrProvider === 'extendedApiKeys') {
        try {
          const parsed = JSON.parse(value);
          setLocalSettings(prev => {
            const next = { ...prev, extendedApiKeys: parsed };
            triggerAutoSave(localApiKey, next);
            return next;
          });
        } catch {
          // ignore parsing error
        }
    } else {
        let field: keyof Settings;
        if (fieldOrProvider === 'openai' || fieldOrProvider === 'openaiApiKey') field = 'openaiApiKey';
        else if (fieldOrProvider === 'anthropic' || fieldOrProvider === 'anthropicApiKey') field = 'anthropicApiKey';
        else if (fieldOrProvider === 'deepseek' || fieldOrProvider === 'deepseekApiKey') field = 'deepseekApiKey';
        else if (fieldOrProvider === 'xai' || fieldOrProvider === 'xaiApiKey') field = 'xaiApiKey';
        else if (fieldOrProvider === 'mistral' || fieldOrProvider === 'mistralApiKey') field = 'mistralApiKey';
        else if (fieldOrProvider === 'minimax' || fieldOrProvider === 'minimaxApiKey') field = 'minimaxApiKey';
        else if (fieldOrProvider === 'kimi' || fieldOrProvider === 'kimiApiKey') field = 'kimiApiKey';
        else if (fieldOrProvider === 'alibaba' || fieldOrProvider === 'alibabaApiKey') field = 'alibabaApiKey';
        else if (fieldOrProvider === 'zai' || fieldOrProvider === 'zaiApiKey' || fieldOrProvider === 'z_ai') field = 'zaiApiKey';
        else if (fieldOrProvider === 'cohere' || fieldOrProvider === 'cohereApiKey') field = 'cohereApiKey';
        else if (fieldOrProvider === 'inception' || fieldOrProvider === 'inceptionApiKey') field = 'inceptionApiKey';
        else if (fieldOrProvider === 'azure_openai' || fieldOrProvider === 'azureOpenaiApiKey') field = 'azureOpenaiApiKey';
        else if (fieldOrProvider === 'azureOpenaiEndpoint') field = 'azureOpenaiEndpoint';
        else if (fieldOrProvider === 'aws_bedrock' || fieldOrProvider === 'awsBedrockApiKey') field = 'awsBedrockApiKey';
        else if (fieldOrProvider === 'groq' || fieldOrProvider === 'groqApiKey') field = 'groqApiKey';
        else if (fieldOrProvider === 'cerebras' || fieldOrProvider === 'cerebrasApiKey') field = 'cerebrasApiKey';
        else if (fieldOrProvider === 'nvidia' || fieldOrProvider === 'nvidiaApiKey') field = 'nvidiaApiKey';
        else if (fieldOrProvider === 'together' || fieldOrProvider === 'togetherApiKey') field = 'togetherApiKey';
        else if (fieldOrProvider === 'openrouter' || fieldOrProvider === 'openRouterApiKey') field = 'openRouterApiKey';
        else if (fieldOrProvider === 'huggingface' || fieldOrProvider === 'huggingfaceApiKey') field = 'huggingfaceApiKey';
        else if (fieldOrProvider === 'fireworks' || fieldOrProvider === 'fireworksApiKey') field = 'fireworksApiKey';
        else if (fieldOrProvider === 'cloudflare' || fieldOrProvider === 'cloudflareApiKey') field = 'cloudflareApiKey';
        else if (fieldOrProvider === 'cloudflareAccountId') field = 'cloudflareAccountId';
        else if (fieldOrProvider === 'siliconflow' || fieldOrProvider === 'siliconFlowApiKey') field = 'siliconFlowApiKey';
        else if (fieldOrProvider === 'requesty' || fieldOrProvider === 'requestyApiKey') field = 'requestyApiKey';
        else if (fieldOrProvider === 'pollinations' || fieldOrProvider === 'pollinationsApiKey') field = 'pollinationsApiKey';
        else if (fieldOrProvider === 'localEndpoint') field = 'localEndpoint';
        else if (fieldOrProvider === 'customBaseUrl') field = 'customBaseUrl';
        else if (fieldOrProvider === 'others' || fieldOrProvider === 'othersApiKey') field = 'othersApiKey';
        else {
          // Store in extendedApiKeys
          setLocalSettings(prev => {
            const ext = { ...(prev.extendedApiKeys || {}), [fieldOrProvider]: value };
            const next = { ...prev, extendedApiKeys: ext };
            triggerAutoSave(localApiKey, next);
            return next;
          });
          return;
        }

        setLocalSettings(prev => {
            const next = { ...prev, [field]: value };
            triggerAutoSave(localApiKey, next);
            return next;
        });
    }
  };

  const renderGenreIcon = (genre: string) => {
    switch (genre) {
      case 'horror': return <Ghost className="w-3.5 h-3.5 text-red-400" />;
      case 'sci-fi': return <Rocket className="w-3.5 h-3.5 text-cyan-400" />;
      case 'romance': return <Heart className="w-3.5 h-3.5 text-pink-400" />;
      case 'mystery': return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case 'thriller': return <Zap className="w-3.5 h-3.5 text-rose-400" />;
      case 'comedy': return <Smile className="w-3.5 h-3.5 text-yellow-400" />;
      case 'historical': return <Scroll className="w-3.5 h-3.5 text-amber-600" />;
      case 'western': return <Compass className="w-3.5 h-3.5 text-orange-400" />;
      case 'action': return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'fantasy':
      default: return <Wand2 className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const tensionBadges: Record<string, { label: string; cls: string }> = {
    low: { label: 'LOW (Calm)', cls: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    medium: { label: 'MEDIUM (Building)', cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    high: { label: 'HIGH (Suspense)', cls: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
    climax: { label: 'CLIMAX (Peak Drama)', cls: 'text-red-400 bg-red-500/25 border-red-500/50 animate-pulse' },
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-3xl mx-auto border border-white/15 overflow-hidden transition-all">
      {/* Settings Top Bar & Tabs */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-none">Studio Settings</h2>
              <p className="text-[11px] text-purple-200/50 mt-0.5">Customize narration, AI providers, and atmospheric effects</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] text-purple-200">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Auto-saved</span>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-white/10">
          {[
            { id: 'story', label: 'Story & Style', icon: <BookText className="w-3.5 h-3.5" /> },
            { id: 'vfx', label: 'Atmosphere & VFX', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'models', label: 'AI & Models', icon: <Wand2 className="w-3.5 h-3.5" /> },
            { id: 'storage', label: 'Storage & Sync', icon: <Database className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`relative flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="active-settings-tab"
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {/* TAB 1: STORY & READING */}
          {activeTab === 'story' && (
            <motion.div
              key="tab-story"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <SettingRow icon={<BookText className="w-4 h-4" />} label="Story Length" description="Target length of the generated storybook">
                  <CustomSelect value={localSettings.storyLength} onChange={handleSettingChange('storyLength')}>
                    <option value="very_short">Very Short (1-2 pages)</option>
                    <option value="short">Short (3-4 pages)</option>
                    <option value="medium">Medium (5-6 pages)</option>
                    <option value="long">Long (7-9 pages)</option>
                    <option value="very_long">Epic (10+ pages)</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<Theater className="w-4 h-4" />} label="Genre Theme" description="Primary narrative tone and worldbuilding theme">
                  <CustomSelect value={localSettings.genre} onChange={handleSettingChange('genre')}>
                    <optgroup label="Fantasy & Mythic">
                      <option value="fantasy">High Fantasy</option>
                      <option value="dark_fantasy">Dark Fantasy & Grimdark</option>
                      <option value="mythological">Mythological Saga</option>
                      <option value="fairy_tale">Fairy Tale & Folklore</option>
                      <option value="fable">Moral Fable</option>
                      <option value="urban_fantasy">Urban Fantasy</option>
                    </optgroup>
                    <optgroup label="Sci-Fi & Speculative">
                      <option value="sci-fi">Hard Science Fiction</option>
                      <option value="cyberpunk">Cyberpunk Dystopia</option>
                      <option value="space_opera">Interstellar Space Opera</option>
                      <option value="steampunk">Victorian Steampunk</option>
                      <option value="time_travel">Time Travel Paradox</option>
                      <option value="post_apocalyptic">Post-Apocalyptic Wasteland</option>
                    </optgroup>
                    <optgroup label="Mystery & Suspense">
                      <option value="mystery">Atmospheric Mystery</option>
                      <option value="crime">Gritty Crime Noir</option>
                      <option value="thriller">High-Tension Thriller</option>
                      <option value="horror">Gothic Horror</option>
                      <option value="cosmic_horror">Lovecraftian Cosmic Horror</option>
                    </optgroup>
                    <optgroup label="Adventure & Realism">
                      <option value="adventure">Grand Adventure Expedition</option>
                      <option value="western">Wild West Frontier</option>
                      <option value="historical">Historical Fiction</option>
                      <option value="drama">Poignant Human Drama</option>
                      <option value="romance">Poetic Romance</option>
                      <option value="superhero">Superhero Comic Lore</option>
                    </optgroup>
                    <optgroup label="Youth & Comfort">
                      <option value="educational">Educational Discovery</option>
                      <option value="bedtime">Soothing Bedtime Lullaby</option>
                      <option value="funny">Playful Comedy & Humor</option>
                    </optgroup>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<BookText className="w-4 h-4" />} label="Target Audience" description="Age appropriateness, prose complexity & themes">
                  <CustomSelect value={localSettings.targetAudience} onChange={handleSettingChange('targetAudience')}>
                    <option value="early_reader">Early Reader (Ages 3-6)</option>
                    <option value="children">Children (Ages 5-10)</option>
                    <option value="middle_grade">Middle Grade (Ages 9-12)</option>
                    <option value="teen">Young Adult / YA (Teens)</option>
                    <option value="adult">Adult Fiction</option>
                    <option value="mature_dark">Mature / Grim Dark (18+)</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<Type className="w-4 h-4 text-purple-400" />} label="Reading Font" description="Typography style for reading paragraphs & PDF">
                  <CustomSelect 
                    value={localSettings.fontFamilyPreference || 'serif'} 
                    onChange={handleSettingChange('fontFamilyPreference')}
                  >
                    <option value="serif">Playfair Display (Storybook Serif)</option>
                    <option value="cinzel">Cinzel (Mythic & Epic Classical)</option>
                    <option value="merriweather">Merriweather (Literary Editorial)</option>
                    <option value="lora">Lora (Contemporary Novelist)</option>
                    <option value="sans">Plus Jakarta Sans (Modern Clean)</option>
                    <option value="outfit">Outfit (Geometric Minimalist)</option>
                    <option value="inter">Inter (Crisp Contemporary)</option>
                    <option value="fantasy">MedievalSharp (Fairytale Fantasy)</option>
                    <option value="handwriting">Caveat (Whimsical Script)</option>
                    <option value="mono">JetBrains Mono (Vintage Typewriter)</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow 
                  icon={<SlidersHorizontal className="w-4 h-4 text-purple-400" />} 
                  label="Story Font Size" 
                  description="Adjust readability text size (persists in story view & PDF export)"
                >
                  <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="14" 
                        max="28" 
                        step="1"
                        value={localSettings.fontSize || 18} 
                        onChange={(e) => {
                          const size = parseInt(e.target.value);
                          setLocalSettings(prev => {
                            const next = { ...prev, fontSize: size };
                            triggerAutoSave(localApiKey, next);
                            return next;
                          });
                        }}
                        className="w-32 sm:w-36 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-200 font-mono text-xs min-w-[58px] text-center font-bold">
                        {localSettings.fontSize || 18}px
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1">
                      {[
                        { size: 14, label: 'Compact' },
                        { size: 18, label: 'Standard' },
                        { size: 22, label: 'Large' },
                        { size: 26, label: 'X-Large' },
                      ].map((preset) => {
                        const active = (localSettings.fontSize || 18) === preset.size;
                        return (
                          <button
                            key={preset.size}
                            type="button"
                            onClick={() => {
                              setLocalSettings(prev => {
                                const next = { ...prev, fontSize: preset.size };
                                triggerAutoSave(localApiKey, next);
                                return next;
                              });
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                              active 
                                ? 'bg-purple-600 border-purple-400 text-white shadow-sm' 
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </SettingRow>

                {/* Live Typography Preview Box */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-purple-950/20 to-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-purple-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Live Readability Preview
                    </span>
                    <span className="text-slate-400 font-mono">
                      {localSettings.fontSize || 18}px • {localSettings.fontFamilyPreference || 'serif'}
                    </span>
                  </div>
                  <p 
                    className={`text-slate-200 transition-all duration-200 leading-relaxed ${
                      localSettings.fontFamilyPreference === 'serif' ? 'font-serif font-display' :
                      localSettings.fontFamilyPreference === 'cinzel' ? 'font-cinzel' :
                      localSettings.fontFamilyPreference === 'merriweather' ? 'font-merriweather' :
                      localSettings.fontFamilyPreference === 'lora' ? 'font-lora' :
                      localSettings.fontFamilyPreference === 'sans' ? 'font-sans' :
                      localSettings.fontFamilyPreference === 'outfit' ? 'font-outfit' :
                      localSettings.fontFamilyPreference === 'inter' ? 'font-inter' :
                      localSettings.fontFamilyPreference === 'fantasy' ? 'font-fantasy' :
                      localSettings.fontFamilyPreference === 'handwriting' ? 'font-handwriting' :
                      localSettings.fontFamilyPreference === 'mono' ? 'font-mono' : 'font-serif'
                    }`}
                    style={{ 
                      fontSize: `${localSettings.fontSize || 18}px`,
                      lineHeight: `${Math.round((localSettings.fontSize || 18) * 1.55)}px`
                    }}
                  >
                    "The ancient observatory hummed with celestial light as forgotten constellations revealed their secrets across the velvet sky."
                  </p>
                </div>

                <SettingRow icon={<Paintbrush className="w-4 h-4" />} label="Artwork Style" description="Visual artistic aesthetic for scene illustrations">
                  <CustomSelect value={localSettings.imageStyle} onChange={handleSettingChange('imageStyle')}>
                    <optgroup label="Storybook & Hand-Drawn">
                      <option value="whimsical">Whimsical Storybook</option>
                      <option value="cartoon">Vibrant Cartoon Animation</option>
                      <option value="watercolor">Soft Textured Watercolor</option>
                      <option value="disney_animation">Classic 2D Disney Animation</option>
                      <option value="vintage_disney">Vintage 1930s Rubber-Hose</option>
                      <option value="paper_cutout">Layered 3D Paper Cutout</option>
                      <option value="claymation">Claymation Stop-Motion</option>
                    </optgroup>
                    <optgroup label="Anime & Modern Digital">
                      <option value="anime">Anime Modern Cel-Shaded</option>
                      <option value="studio_ghibli">Studio Ghibli Scenic Wonder</option>
                      <option value="3d_render">3D Pixar CGI Render</option>
                      <option value="pixel_art">16-bit Retro Pixel Art</option>
                      <option value="concept_art">AAA Game Concept Art</option>
                      <option value="pop_art_comic">Retro Comic Book Pop Art</option>
                    </optgroup>
                    <optgroup label="Cinematic & Atmospheric">
                      <option value="realistic">Photorealistic Cinematic 8K</option>
                      <option value="cinematic_photo">35mm Film Still (Portra Grain)</option>
                      <option value="noir">Dramatic Film Noir Chiaroscuro</option>
                      <option value="cyberpunk">Cyberpunk Neon Synthwave</option>
                      <option value="synthwave_80s">80s Retro Outrun Synthwave</option>
                    </optgroup>
                    <optgroup label="Classical & Fine Art">
                      <option value="oil_painting">Classical Oil Painting Masterpiece</option>
                      <option value="dark_fantasy_oil">Dark Fantasy Oil Painting</option>
                      <option value="ukiyo_e">Japanese Ukiyo-e Woodblock</option>
                      <option value="stained_glass">Gothic Stained Glass Window</option>
                      <option value="gothic_etching">Gothic Antique Book Etching</option>
                      <option value="pencil_sketch">Detailed Graphite Pencil Sketch</option>
                      <option value="sketch">Expressive Charcoal/Ink Sketch</option>
                      <option value="mosaic">Byzantine Sacred Mosaic</option>
                      <option value="vintage">Vintage 1950s Mid-Century</option>
                      <option value="abstract">Surrealist Abstract Fantasy</option>
                    </optgroup>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<ImageIcon className="w-4 h-4 text-purple-400" />} label="Illustration Aspect Ratio" description="Shape & layout dimensions for generated scene artwork (Default: 16:9 Landscape - Best for Web & Video)">
                  <CustomSelect 
                    value={localSettings.imageAspectRatio || '16:9'} 
                    onChange={handleSettingChange('imageAspectRatio' as any)}
                  >
                    <option value="16:9">16:9 Widescreen (Landscape • Best for Web & Cinema)</option>
                    <option value="1:1">1:1 Square (Classic Balanced Square)</option>
                    <option value="4:3">4:3 Standard Photo (Classic Photography)</option>
                    <option value="3:2">3:2 Classic 35mm (Traditional Film Frame)</option>
                    <option value="9:16">9:16 Vertical Story (Mobile Portrait & Reels)</option>
                    <option value="21:9">21:9 Ultra-Wide (Panoramic Cinematic)</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<AudioWaveform className="w-4 h-4" />} label="Narration Audio" description="Synthesize spoken story voice per chapter">
                  <div className="flex items-center gap-2.5">
                    <CustomSelect value={localSettings.voice} onChange={handleSettingChange('voice')}>
                      {(audioVoices[localSettings.audioProvider] || []).map(voice => (
                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                      ))}
                    </CustomSelect>
                    <CustomToggle checked={localSettings.generateAudio} onChange={handleToggleChange('generateAudio')} />
                  </div>
                </SettingRow>

                <SettingRow icon={<AlignJustify className="w-4 h-4 text-purple-400" />} label="Justify Story Text" description="Enable formal book-like full text justification">
                  <CustomToggle checked={localSettings.justifyText !== false} onChange={handleToggleChange('justifyText')} />
                </SettingRow>

                <SettingRow icon={<Volume2 className="w-4 h-4 text-purple-400" />} label="Autoplay Narration" description="Automatically play consecutive scenes as they finish or generate">
                  <CustomToggle checked={localSettings.autoPlayNarration !== false} onChange={handleToggleChange('autoPlayNarration')} />
                </SettingRow>

                <SettingRow icon={<BookText className="w-4 h-4" />} label="PDF Print Margin" description="Export layout page margin size (px)">
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="20" 
                      max="80" 
                      value={localSettings.pdfMargin} 
                      onChange={(e) => setLocalSettings(prev => ({...prev, pdfMargin: parseInt(e.target.value) }))}
                      className="w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="text-purple-200 font-mono text-xs w-6 text-right">{localSettings.pdfMargin}</span>
                  </div>
                </SettingRow>

                <SettingRow icon={<Paintbrush className="w-4 h-4" />} label="PDF Export Theme" description="Color palette theme for exported storybook PDF">
                  <CustomSelect value={localSettings.pdfTheme || 'midnight'} onChange={handleSettingChange('pdfTheme' as any)}>
                    <option value="midnight">Midnight Obsidian (Dark Slate & Violet)</option>
                    <option value="classic_ivory">Classic Ivory (Warm Parchment & Gold)</option>
                    <option value="emerald_parchment">Emerald Arcana (Deep Forest & Mint)</option>
                    <option value="royal_slate">Royal Slate (Charcoal & Amber Gold)</option>
                    <option value="cyberpunk">Cyberpunk Neon (Synthwave Pink & Cyan)</option>
                    <option value="sunset_crimson">Sunset Velvet (Velvet Crimson & Rose)</option>
                    <option value="gothic_noir">Gothic Noir (Obsidian Black & Silver Mist)</option>
                    <option value="sakura_bloom">Sakura Dream (Pastel Rose & Cherry Blossom)</option>
                    <option value="nordic_frost">Nordic Frost (Glacial Ice Blue & Deep Navy)</option>
                    <option value="golden_dynasty">Imperial Dynasty (Deep Maroon & Antique Gold)</option>
                    <option value="celestial_nebula">Celestial Nebula (Deep Cosmic Indigo & Starry Gold)</option>
                    <option value="vintage_botanical">Vintage Botanical (Sage, Olive & Warm Linen)</option>
                  </CustomSelect>
                </SettingRow>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ATMOSPHERE & VFX (INCORPORATES THE FLOATING HUD!) */}
          {activeTab === 'vfx' && (
            <motion.div
              key="tab-vfx"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Integrated Atmosphere Status Bar (The former floating HUD!) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/70 to-indigo-950/40 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold">
                      {renderGenreIcon(vfx.genre)}
                      <span className="capitalize">{vfx.genre} Mood</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${tensionBadges[vfx.tension]?.cls || 'text-slate-300'}`}>
                      {tensionBadges[vfx.tension]?.label || vfx.tension}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleAutoAnalyze}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all ${
                        vfx.isAutoAnalyzeEnabled
                          ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{vfx.isAutoAnalyzeEnabled ? "Auto-AI On" : "Manual"}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-purple-200/60">
                  Dynamic visual atmosphere automatically reacts to story narrative tension, genre tone, and environmental cues.
                </p>
              </div>

              {/* VFX Controls */}
              <div className="space-y-1">
                <SettingRow icon={<Wand2 className="w-4 h-4 text-purple-400" />} label="Active Genre Tone">
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

                <SettingRow icon={<Zap className="w-4 h-4 text-amber-400" />} label="Dramatic Tension">
                  <CustomSelect value={vfx.tension} onChange={(e) => setTension(e.target.value as VfxTension)}>
                    <option value="low">Low (Peaceful & Calm)</option>
                    <option value="medium">Medium (Rising Action)</option>
                    <option value="high">High (Suspense & Danger)</option>
                    <option value="climax">Climax (Peak Drama)</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<CloudRain className="w-4 h-4 text-cyan-400" />} label="Weather Atmosphere">
                  <CustomSelect value={vfx.weather} onChange={(e) => setWeather(e.target.value as VfxWeather)}>
                    <option value="clear">Clear Sky</option>
                    <option value="rainy">Rainy</option>
                    <option value="stormy">Thunderstorm</option>
                    <option value="snowy">Snowing</option>
                    <option value="foggy">Dense Fog</option>
                    <option value="windy">Windy</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<Volume2 className="w-4 h-4 text-pink-400" />} label="Ambient Audio Atmosphere" description="Procedural ambient audio loops (rain, fire, wind)">
                  <CustomToggle checked={vfx.isAudioAtmosphereEnabled} onChange={() => toggleAudioAtmosphere()} />
                </SettingRow>
              </div>

              {/* 6 Atmospheric Particle & Layer Toggles */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block mb-2.5">
                  Dynamic Visual Layers & Particles
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={toggleFireEmbers}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      vfx.showFireEmbers
                        ? 'bg-orange-500/20 border-orange-400/50 text-orange-200 shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>Fire & Embers</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFlowerPetals}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      vfx.showFlowerPetals
                        ? 'bg-pink-500/20 border-pink-400/50 text-pink-200 shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>Sakura Petals</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleLushPlants}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      vfx.showLushPlants
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lush Plants</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleHorizonHills}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      vfx.showHorizonHills
                        ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200 shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Horizon Hills</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleRiverWater}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      vfx.showRiverWater
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Serene River</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCosmicDust}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      vfx.showCosmicDust
                        ? 'bg-purple-500/20 border-purple-400/50 text-purple-200 shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cosmic Dust</span>
                  </button>
                </div>
              </div>

              {/* Quick Interactive Tests */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerScreenShake(6)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-purple-600/20 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Test Screen Shake</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerLightning()}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-cyan-600/20 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Test Lightning Flash</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 3: AI PROVIDERS & MODELS */}
          {activeTab === 'models' && (
            <motion.div
              key="tab-models"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* API Keys Manager */}
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block mb-2.5">
                  API Key Credentials
                </label>
                <ApiKeyManager 
                  apiKeys={{
                    gemini: localApiKey || localSettings.geminiApiKey || '',
                    openai: localSettings.openaiApiKey || '',
                    anthropic: localSettings.anthropicApiKey || '',
                    deepseek: localSettings.deepseekApiKey || '',
                    xai: localSettings.xaiApiKey || '',
                    mistral: localSettings.mistralApiKey || '',
                    minimax: localSettings.minimaxApiKey || '',
                    kimi: localSettings.kimiApiKey || '',
                    alibaba: localSettings.alibabaApiKey || '',
                    zai: localSettings.zaiApiKey || '',
                    cohere: localSettings.cohereApiKey || '',
                    inception: localSettings.inceptionApiKey || '',
                    azure_openai: localSettings.azureOpenaiApiKey || '',
                    azureOpenaiEndpoint: localSettings.azureOpenaiEndpoint || '',
                    aws_bedrock: localSettings.awsBedrockApiKey || '',
                    groq: localSettings.groqApiKey || '',
                    cerebras: localSettings.cerebrasApiKey || '',
                    nvidia: localSettings.nvidiaApiKey || '',
                    together: localSettings.togetherApiKey || '',
                    openrouter: localSettings.openRouterApiKey || '',
                    huggingface: localSettings.huggingfaceApiKey || '',
                    fireworks: localSettings.fireworksApiKey || '',
                    cloudflare: localSettings.cloudflareApiKey || '',
                    cloudflareAccountId: localSettings.cloudflareAccountId || '',
                    siliconflow: localSettings.siliconFlowApiKey || '',
                    requesty: localSettings.requestyApiKey || '',
                    pollinations: localSettings.pollinationsApiKey || '',
                    localEndpoint: localSettings.localEndpoint || '',
                    customBaseUrl: localSettings.customBaseUrl || '',
                    others: localSettings.othersApiKey || '',
                    ...(localSettings.extendedApiKeys || {})
                  }}
                  onSave={handleApiKeySave}
                />
              </div>

              {/* Model Selectors */}
              <div className="space-y-1 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block">
                    Model Routing Configuration
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Default: Google Gemini
                  </span>
                </div>

                {/* Helpful image generation & provider tip banner */}
                <div className="p-3 mb-3 bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-slate-900/60 border border-purple-500/30 rounded-2xl flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-purple-200/90 leading-relaxed">
                    <span className="font-semibold text-white">Pro Tip for Sharp & Vivid Images:</span> For the highest image quality, crystal-clear sharpness, and deep scene context awareness matching your chosen art style, select <strong className="text-purple-300 font-bold">Google AI Studio (Gemini)</strong> as your Image Provider and model, and add your Gemini API Key in credentials.
                  </div>
                </div>

                <SettingRow icon={<BookText className="w-4 h-4" />} label="Text Provider">
                  <CustomSelect value={localSettings.textProvider} onChange={handleSettingChange('textProvider')}>
                    <optgroup label="Recommended & Free Tiers">
                      {RECOMMENDED_PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.badge || 'Recommended'})</option>
                      ))}
                    </optgroup>
                    <optgroup label="High-Speed Cloud LLMs">
                      {CLOUD_PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.badge || 'Cloud'})</option>
                      ))}
                    </optgroup>
                    <optgroup label="High-Throughput Routers">
                      {ROUTER_PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.badge || 'Router'})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Local LLMs & WebGPU">
                      {LOCAL_PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.badge || 'Local'})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Extended Catalog (72+ Providers)">
                      {EXTENDED_PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.badge || 'Extended'})</option>
                      ))}
                    </optgroup>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<BookText className="w-4 h-4" />} label="Text Model">
                  <CustomSelect value={localSettings.textModel} onChange={handleSettingChange('textModel')}>
                    {getTextModelsForProvider(localSettings.textProvider).map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<Paintbrush className="w-4 h-4" />} label="Image Provider">
                  <CustomSelect value={localSettings.imageProvider} onChange={handleSettingChange('imageProvider')}>
                    <option value="cloudflare">Cloudflare Workers AI (Flux.1 Schnell Free)</option>
                    <option value="gemini">Google AI Studio (Gemini 2.5 / 3.1 / Imagen 4)</option>
                    <option value="huggingface">Hugging Face (Flux.1 Schnell Free API)</option>
                    <option value="openai">OpenAI (DALL-E 3)</option>
                    <option value="pollinations">Pollinations.ai (Nano Banana & Flux - 100% Free)</option>
                    <option value="puter">Puter AI Image (Flux / Nano Banana - 100% Free)</option>
                    <option value="siliconflow">SiliconFlow (Flux.1 Schnell / Dev)</option>
                    <option value="zai">Z.AI (CogView-3-Flash Free Tier)</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<Paintbrush className="w-4 h-4" />} label="Image Model">
                  <CustomSelect value={localSettings.imageModel} onChange={handleSettingChange('imageModel')}>
                    {(imageModels[localSettings.imageProvider] || []).map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<ImageIcon className="w-4 h-4 text-purple-400" />} label="Image Aspect Ratio" description="Layout proportion for generated scenes (Default: 16:9 Landscape - Best for Web)">
                  <CustomSelect 
                    value={localSettings.imageAspectRatio || '16:9'} 
                    onChange={handleSettingChange('imageAspectRatio' as any)}
                  >
                    <option value="16:9">16:9 Widescreen (Landscape • Best for Web)</option>
                    <option value="1:1">1:1 Square (Classic Square)</option>
                    <option value="4:3">4:3 Standard (Classic Photo)</option>
                    <option value="3:2">3:2 Traditional (35mm Photo)</option>
                    <option value="9:16">9:16 Vertical (Mobile Story & Reels)</option>
                    <option value="21:9">21:9 Ultra-Wide (Panoramic Cinema)</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<AudioWaveform className="w-4 h-4" />} label="Audio Provider">
                  <CustomSelect value={localSettings.audioProvider} onChange={handleSettingChange('audioProvider')}>
                    <option value="gemini">Google Gemini TTS</option>
                    <option value="openai">OpenAI TTS</option>
                    <option value="pollinations">Pollinations Audio</option>
                  </CustomSelect>
                </SettingRow>

                <SettingRow icon={<AudioWaveform className="w-4 h-4" />} label="Audio Model">
                  <CustomSelect value={localSettings.audioModel} onChange={handleSettingChange('audioModel')}>
                    {(audioModels[localSettings.audioProvider] || []).map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </CustomSelect>
                </SettingRow>
              </div>
            </motion.div>
          )}

          {/* TAB 4: STORAGE & CLOUD SYNC */}
          {activeTab === 'storage' && (
            <motion.div
              key="tab-storage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Puter Cloud Account Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/70 to-purple-950/40 border border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Puter.js Cloud Storage</h4>
                      <p className="text-[11px] text-indigo-200/60">
                        {puterUser ? `Signed in as ${puterUser.username || puterUser.email || 'Puter User'}` : 'Unlimited free cloud storage without API keys'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {puterUser ? (
                      <button
                        type="button"
                        onClick={handlePuterSignOut}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-xs font-semibold text-slate-300 hover:text-rose-200 transition-all"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePuterSignIn}
                        disabled={isPuterAuthChecking}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                      >
                        {isPuterAuthChecking ? 'Connecting...' : 'Connect Puter Cloud'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <SettingRow 
                  icon={<Database className="w-4 h-4 text-indigo-400" />} 
                  label="Cloud Storage Sync" 
                  description="Synchronize storybooks to Puter.js cloud storage"
                >
                  <CustomToggle checked={cloudSync} onChange={(e) => handleToggleCloudSync(e.target.checked)} />
                </SettingRow>

                <SettingRow 
                  icon={<HardDrive className="w-4 h-4 text-purple-400" />} 
                  label="Storage Mode" 
                  description="Where your storybooks are saved"
                >
                  <CustomSelect 
                    value={localSettings.storageProvider || 'hybrid'} 
                    onChange={handleSettingChange('storageProvider')}
                  >
                    <option value="hybrid">Hybrid (Local + Puter Cloud Sync)</option>
                    <option value="puter">Puter Cloud Storage (Primary)</option>
                    <option value="local">Local Browser Storage Only</option>
                  </CustomSelect>
                </SettingRow>
              </div>

              {/* Storage Health Meter */}
              {storageHealth && (
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2 text-purple-200">
                      <HardDrive className="w-4 h-4 text-purple-400" />
                      <span>Browser Storage: {storageHealth.formattedUsed} of {storageHealth.formattedQuota}</span>
                    </div>
                    <span className={`font-mono px-2 py-0.5 rounded-full ${
                      storageHealth.isQuotaWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {storageHealth.percentUsed}% Used
                    </span>
                  </div>

                  {/* Meter Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        storageHealth.percentUsed >= 80 ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, storageHealth.percentUsed)}%` }}
                    />
                  </div>

                  {storageHealth.isQuotaWarning && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-xs text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>Storage is approaching browser capacity. Older stories will automatically archive media to maintain smooth execution.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={isClearing}
                      className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isClearing ? 'Clearing...' : 'Clear Media Cache'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="flex-1 py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      <span>Export JSON Backup</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
