import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyIcon, CheckIcon, AlertTriangleIcon, BookText, Paintbrush, Theater, AudioWaveform, ChevronDownIcon } from './icons';
import { testApiKey } from '../services/geminiService';
import type { Settings } from '../types';
import { ApiKeyManager } from './ApiKeyManager';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const SettingRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className="text-blue-500">{icon}</div>
      <label className="text-lg font-semibold text-blue-900/80">{label}</label>
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
      className="appearance-none w-48 pl-4 pr-10 py-3 text-md text-right font-semibold text-blue-900 bg-blue-100/60 border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-colors cursor-pointer"
    >
      {children}
    </select>
    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
      <ChevronDownIcon className="w-5 h-5 text-blue-600" />
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
    className={`relative inline-flex items-center h-9 w-16 rounded-full transition-colors duration-300 ${checked ? 'bg-yellow-400' : 'bg-blue-200'}`}
  >
    <span className={`inline-block w-7 h-7 transform bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? 'translate-x-8' : 'translate-x-1'}`} />
  </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h3 className="text-sm font-bold uppercase text-yellow-600/80 tracking-wider pb-2 border-b-2 border-yellow-200/80">{title}</h3>
);


const textModels = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)' },
  ],
  groq: [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
    { id: 'qwen/qwen3-32b', name: 'Qwen3 32B' },
  ],
  openrouter: [
    { id: 'openai/gpt-oss-120b:free', name: 'GPT OSS 120B (Free)' },
    { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B (Free)' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
    { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B (Free)' },
    { id: 'minimax/minimax-m2.5:free', name: 'MiniMax M2.5 (Free)' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B (Free)' },
    { id: 'stepfun/step-3.5-flash:free', name: 'Step 3.5 Flash (Free)' },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (Free)' },
    { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
    { id: 'openai/gpt-5.4', name: 'GPT-5.4' },
    { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
    { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2' },
  ],
  pollinations: [
    { id: 'openai', name: 'GPT-5 Mini (Default)' },
    { id: 'openai-fast', name: 'GPT-5 Nano (Fast)' },
    { id: 'openai-large', name: 'GPT-5.2 (Powerful)' },
    { id: 'qwen-coder', name: 'Qwen3 Coder 30B' },
    { id: 'mistral', name: 'Mistral Small 3.2 24B' },
    { id: 'deepseek', name: 'DeepSeek V3.2' },
    { id: 'gemini', name: 'Gemini 3 Flash' },
    { id: 'gemini-fast', name: 'Gemini 2.5 Flash Lite' },
    { id: 'claude-fast', name: 'Claude Haiku 4.5' },
    { id: 'claude', name: 'Claude Sonnet 4.6' },
    { id: 'kimi', name: 'Kimi K2.5' },
    { id: 'glm', name: 'GLM-5' },
    { id: 'minimax', name: 'MiniMax M2.5' },
    { id: 'nova-fast', name: 'Amazon Nova Micro' },
  ],
  others: [
    { id: 'MiniMaxAI/MiniMax-M2.5', name: 'MiniMax M2.5' },
    { id: 'zai-org/GLM-4.6', name: 'GLM 4.6' },
    { id: 'stepfun-ai/Step-3.5-Flash', name: 'Step 3.5 Flash' },
    { id: 'deepseek-ai/DeepSeek-V3.2', name: 'DeepSeek V3.2' },
    { id: 'Qwen/Qwen3-32B', name: 'Qwen3 32B' },
    { id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct', name: 'Qwen3 Coder 480B' },
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B' },
  ],
  siliconflow: [
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B' },
    { id: 'Qwen/Qwen3-32B', name: 'Qwen3 32B' },
    { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', name: 'Qwen3 235B' },
    { id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct', name: 'Qwen3 Coder 480B' },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
    { id: 'deepseek-ai/DeepSeek-V3.2', name: 'DeepSeek V3.2' },
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
    { id: 'MiniMaxAI/MiniMax-M2.5', name: 'MiniMax M2.5' },
    { id: 'zai-org/GLM-4.6', name: 'GLM 4.6' },
    { id: 'stepfun-ai/Step-3.5-Flash', name: 'Step 3.5 Flash' },
  ]
};

const imageModels = {
  gemini: [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
    { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image (Preview)' },
  ],
  pollinations: [
    { id: 'flux', name: 'Flux Schnell (Default)' },
    { id: 'zimage', name: 'Z-Image Turbo' },
    { id: 'kontext', name: 'FLUX.1 Kontext' },
    { id: 'nanobanana', name: 'NanoBanana (Gemini 2.5)' },
    { id: 'nanobanana-2', name: 'NanoBanana 2 (Gemini 3.1)' },
    { id: 'nanobanana-pro', name: 'NanoBanana Pro (Gemini 3 Pro)' },
    { id: 'seedream5', name: 'SeeDream 5.0 Lite' },
    { id: 'gptimage', name: 'GPT Image 1 Mini' },
    { id: 'gptimage-large', name: 'GPT Image 1.5' },
    { id: 'klein', name: 'FLUX.2 Klein 4B' },
    { id: 'grok-imagine', name: 'Grok Imagine' },
    { id: 'grok-imagine-pro', name: 'Grok Imagine Pro' },
    { id: 'qwen-image', name: 'Qwen Image Plus' },
    { id: 'nova-canvas', name: 'Amazon Nova Canvas' },
    { id: 'p-image', name: 'Pruna p-image' },
  ],
  siliconflow: [
    { id: 'stabilityai/stable-diffusion-3-medium', name: 'Stable Diffusion 3' },
    { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0' },
    { id: 'black-forest-labs/FLUX.1-schnell', name: 'Flux.1 Schnell' },
    { id: 'black-forest-labs/FLUX.1-dev', name: 'Flux.1 Dev' },
    { id: 'Qwen/Qwen-Image', name: 'Qwen Image 20B' },
  ]
};

const audioModels = {
  gemini: [
    { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS' },
    { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro TTS' },
  ],
  openai: [
    { id: 'tts-1', name: 'TTS-1 (Standard)' },
    { id: 'tts-1-hd', name: 'TTS-1 HD (High Quality)' },
  ],
  pollinations: [
    { id: 'elevenlabs', name: 'ElevenLabs v3 TTS' },
    { id: 'openai-audio', name: 'OpenAI Audio' },
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
  onAutoSave?: (key: string, settings: Settings) => void;
  currentApiKey: string | null;
  currentSettings: Settings;
}> = ({ onSave, onAutoSave, currentApiKey, currentSettings }) => {
  const [localApiKey, setLocalApiKey] = useState('');
  const [localSettings, setLocalSettings] = useState<Settings>(currentSettings);
  
  useEffect(() => {
    setLocalApiKey(currentApiKey || '');
    setLocalSettings(currentSettings);
  }, [currentApiKey, currentSettings]);

  // Ensure model is valid when provider changes
  useEffect(() => {
    const validTextModels = textModels[localSettings.textProvider] || [];
    if (!validTextModels.find(m => m.id === localSettings.textModel)) {
      setLocalSettings(prev => ({ ...prev, textModel: validTextModels[0]?.id || '' }));
    }
  }, [localSettings.textProvider]);

  useEffect(() => {
    const validImageModels = imageModels[localSettings.imageProvider] || [];
    if (!validImageModels.find(m => m.id === localSettings.imageModel)) {
      setLocalSettings(prev => ({ ...prev, imageModel: validImageModels[0]?.id || '' }));
    }
  }, [localSettings.imageProvider]);

  useEffect(() => {
    const validAudioModels = audioModels[localSettings.audioProvider] || [];
    if (!validAudioModels.find(m => m.id === localSettings.audioModel)) {
      setLocalSettings(prev => ({ ...prev, audioModel: validAudioModels[0]?.id || '' }));
    }
  }, [localSettings.audioProvider]);

  const handleSave = () => {
    onSave(localApiKey, localSettings);
  };
  
  const handleSettingChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = {...localSettings, [field]: e.target.value };
    setLocalSettings(updated);
    if (onAutoSave) {
      onAutoSave(localApiKey, updated);
    }
  };

  const handleToggleChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = {...localSettings, [field]: e.target.checked };
    setLocalSettings(updated);
    if (onAutoSave) {
      onAutoSave(localApiKey, updated);
    }
  };

  const handleApiKeySave = (provider: string, key: string) => {
    let updatedKey = localApiKey;
    let updatedSettings = localSettings;

    if (provider === 'gemini') {
        updatedKey = key;
        setLocalApiKey(key);
    } else if (provider === 'openai') {
        updatedSettings = { ...localSettings, openaiApiKey: key };
        setLocalSettings(updatedSettings);
    } else if (provider === 'groq') {
        updatedSettings = { ...localSettings, groqApiKey: key };
        setLocalSettings(updatedSettings);
    } else if (provider === 'openrouter') {
        updatedSettings = { ...localSettings, openRouterApiKey: key };
        setLocalSettings(updatedSettings);
    } else if (provider === 'siliconflow') {
        updatedSettings = { ...localSettings, siliconFlowApiKey: key };
        setLocalSettings(updatedSettings);
    } else if (provider === 'pollinations') {
        updatedSettings = { ...localSettings, pollinationsApiKey: key };
        setLocalSettings(updatedSettings);
    } else if (provider === 'others') {
        updatedSettings = { ...localSettings, othersApiKey: key };
        setLocalSettings(updatedSettings);
    }

    // Auto-save immediately
    if (onAutoSave) {
      onAutoSave(updatedKey, updatedSettings);
    }
  };

  return (
    <div className="bg-[#FFFDF7] rounded-2xl shadow-lg w-full max-w-3xl mx-auto border-2 border-yellow-100">
      <div className="flex justify-between items-center p-6 border-b-2 border-yellow-100">
        <h2 className="text-2xl font-bold text-blue-900">Story Options</h2>
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
          <SettingRow icon={<BookText className="w-6 h-6" />} label="PDF Template">
            <CustomSelect value={localSettings.pdfTemplate || 'classic'} onChange={handleSettingChange('pdfTemplate')}>
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="minimalist">Minimalist</option>
              <option value="storybook">Storybook</option>
              <option value="magazine">Magazine</option>
            </CustomSelect>
          </SettingRow>
          <SettingRow icon={<BookText className="w-6 h-6" />} label="PDF Margin">
             <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={localSettings.pdfMargin} 
                  onChange={(e) => {
                    const updated = {...localSettings, pdfMargin: parseInt(e.target.value) };
                    setLocalSettings(updated);
                    if (onAutoSave) { onAutoSave(localApiKey, updated); }
                  }}
                  className="w-32 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-blue-900 font-semibold w-8 text-right">{localSettings.pdfMargin}</span>
             </div>
          </SettingRow>
          <SettingRow icon={<Theater className="w-6 h-6" />} label="Video Template">
            <CustomSelect value={localSettings.videoTemplate || 'cinematic'} onChange={handleSettingChange('videoTemplate')}>
              <option value="cinematic">Cinematic (16:9)</option>
              <option value="slideshow">Slideshow (16:9)</option>
              <option value="kenburns">Ken Burns (16:9)</option>
              <option value="documentary">Documentary (16:9)</option>
              <option value="social">Social Media (9:16)</option>
            </CustomSelect>
          </SettingRow>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Advanced" />
            
            {/* Text Generation Settings */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-900/60 uppercase tracking-wide">Text Generation</h4>
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
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-blue-900/60 uppercase tracking-wide">Image Generation</h4>
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
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-blue-900/60 uppercase tracking-wide">Audio Generation</h4>
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
        </div>
      </div>

      <div className="p-6 bg-yellow-50/50 border-t-2 border-yellow-100">
          <button
            onClick={handleSave}
            className="w-full h-14 bg-yellow-400 text-blue-900 font-black text-lg rounded-full shadow-lg hover:bg-yellow-500 active:scale-95 transition-all duration-200"
          >
            Save Settings
          </button>
      </div>
    </div>
  );
};
