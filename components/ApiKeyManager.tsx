import React, { useState, useEffect } from 'react';
import { KeyIcon, CheckIcon, AlertTriangleIcon } from './icons';
import { testProviderKey } from '../services/geminiService';
import { Sparkles, ExternalLink, ShieldCheck, Zap, Globe, RefreshCw } from 'lucide-react';

export interface ApiKeysPayload {
  gemini?: string;
  openai?: string;
  inception?: string;
  groq?: string;
  openrouter?: string;
  siliconflow?: string;
  pollinations?: string;
  zai?: string;
  cerebras?: string;
  mistral?: string;
  cohere?: string;
  nvidia?: string;
  requesty?: string;
  huggingface?: string;
  cloudflare?: string;
  cloudflareAccountId?: string;
  customBaseUrl?: string;
  others?: string;
}

interface ApiKeyManagerProps {
  apiKeys: ApiKeysPayload;
  onSave: (field: string, value: string) => void;
}

interface ProviderMeta {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  freeTierInfo: string;
  portalUrl: string;
  keyPlaceholder: string;
  requiresKey: boolean;
  needsCustomUrl?: boolean;
  needsAccountId?: boolean;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKeys, onSave }) => {
  const [activeTab, setActiveTab] = useState<string>('gemini');
  const [tempKeys, setTempKeys] = useState<ApiKeysPayload>(apiKeys);
  const [testStatus, setTestStatus] = useState<Record<string, { state: 'idle' | 'testing' | 'success' | 'error'; message?: string }>>({});

  useEffect(() => {
    setTempKeys(apiKeys);
  }, [apiKeys]);

  const handleFieldChange = (field: string, value: string) => {
    setTempKeys(prev => ({ ...prev, [field]: value }));
    onSave(field, value);
  };

  const handleTest = async (providerId: string) => {
    const key = tempKeys[providerId as keyof ApiKeysPayload] || '';
    setTestStatus(prev => ({ ...prev, [providerId]: { state: 'testing' } }));

    const result = await testProviderKey(providerId, key, {
      customBaseUrl: tempKeys.customBaseUrl,
      cloudflareAccountId: tempKeys.cloudflareAccountId,
    });

    setTestStatus(prev => ({
      ...prev,
      [providerId]: {
        state: result.success ? 'success' : 'error',
        message: result.message,
      }
    }));
  };

  const providers: ProviderMeta[] = [
    {
      id: 'gemini',
      name: 'Google AI Studio',
      badge: '1,000 RPD Free',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      description: 'Gemini 2.5 Flash, 2.5 Pro, 3.1 Flash with long context and native multimodal Imagen.',
      freeTierInfo: 'Flash-Lite gives 1,000 RPD; Pro offers 50 RPD on free tier.',
      portalUrl: 'https://aistudio.google.com/app/apikey',
      keyPlaceholder: 'AIzaSy...',
      requiresKey: true,
    },
    {
      id: 'puter',
      name: 'Puter.js',
      badge: '100% Free (No Key)',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Zero-config cloud AI with Claude 3.5/5, GPT-4o, DeepSeek R1, Llama 3.3, and cloud storage.',
      freeTierInfo: 'Free browser-based token pool provided by Puter platform.',
      portalUrl: 'https://puter.com',
      keyPlaceholder: 'No API Key required',
      requiresKey: false,
    },
    {
      id: 'zai',
      name: 'Z.AI (Zhipu AI)',
      badge: 'Free Tier / GLM-4',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      description: 'GLM-4-Flash, GLM-4-Plus, and GLM-4V for high speed reasoning and coding.',
      freeTierInfo: 'GLM-4-Flash provides free token quota with OpenAI compatible format.',
      portalUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
      keyPlaceholder: 'zai-...',
      requiresKey: true,
    },
    {
      id: 'inception',
      name: 'Inception AI',
      badge: '100M Free Tokens',
      badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
      description: 'Official client library for Mercury 2 - the fastest reasoning LLM with OpenAI compatibility.',
      freeTierInfo: 'Every new account includes 100M free tokens.',
      portalUrl: 'https://api.inceptionlabs.ai',
      keyPlaceholder: 'sk_...',
      requiresKey: true,
    },
    {
      id: 'groq',
      name: 'Groq Cloud',
      badge: 'Ultra Fast (1,000 RPD)',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'LPU inference speeds for Llama 3.3 70B, DeepSeek R1 Distill, and Mixtral.',
      freeTierInfo: 'Generous always-free tier up to 1,000 daily requests & 30 RPM.',
      portalUrl: 'https://console.groq.com/keys',
      keyPlaceholder: 'gsk_...',
      requiresKey: true,
    },
    {
      id: 'cerebras',
      name: 'Cerebras Cloud',
      badge: '1,800 tokens/s Free',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      description: 'World fastest inference engine for Llama 3.1 8B/70B and Llama 3.3 70B.',
      freeTierInfo: 'Generous free tier with 30 RPM and instant response times.',
      portalUrl: 'https://cloud.cerebras.ai',
      keyPlaceholder: 'csk-...',
      requiresKey: true,
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      badge: '1 RPS Free Tier',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      description: 'Mistral Large 3, Mistral Small 24B, Ministral 8B, and Codestral.',
      freeTierInfo: 'La Plateforme free tier with 1 RPS throttling and high monthly tokens.',
      portalUrl: 'https://console.mistral.ai/api-keys',
      keyPlaceholder: 'mis_...',
      requiresKey: true,
    },
    {
      id: 'cohere',
      name: 'Cohere',
      badge: 'Trial Free Tier',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      description: 'Command R+, Command R, and Aya Expanse 32B multilingual models.',
      freeTierInfo: 'Free monthly refreshing quota for non-production development.',
      portalUrl: 'https://dashboard.cohere.com/api-keys',
      keyPlaceholder: 'co_...',
      requiresKey: true,
    },
    {
      id: 'nvidia',
      name: 'NVIDIA NIM',
      badge: '40 RPM / 1K Credits',
      badgeColor: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
      description: 'NVIDIA accelerated microservices for Llama 3.3, Nemotron 70B, and DeepSeek.',
      freeTierInfo: 'Includes 1,000 free inference credits on registration + 40 RPM.',
      portalUrl: 'https://build.nvidia.com',
      keyPlaceholder: 'nvapi-...',
      requiresKey: true,
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      badge: 'Free :free Models',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      description: 'Aggregator with dozens of 100% free models (DeepSeek R1, Llama 3.3, Qwen 2.5).',
      freeTierInfo: 'Use :free tag models with free API key with 200 RPD.',
      portalUrl: 'https://openrouter.ai/keys',
      keyPlaceholder: 'sk-or-v1-...',
      requiresKey: true,
    },
    {
      id: 'requesty',
      name: 'Requesty AI',
      badge: '200 RPD Free',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      description: 'Multi-router gateway providing free daily quotas across dozens of leading LLMs.',
      freeTierInfo: '200 free requests per day without credit card requirements.',
      portalUrl: 'https://requesty.ai',
      keyPlaceholder: 'req_...',
      requiresKey: true,
    },
    {
      id: 'huggingface',
      name: 'Hugging Face',
      badge: 'Free Serverless',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      description: 'Free Serverless Inference API covering 100,000+ open-source checkpoints.',
      freeTierInfo: 'Free User Access Token with standard community rate limits.',
      portalUrl: 'https://huggingface.co/settings/tokens',
      keyPlaceholder: 'hf_...',
      requiresKey: true,
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Workers AI',
      badge: '10K Neurons/Day Free',
      badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
      description: 'Serverless AI on Cloudflare global edge network with Llama 3.3 and DeepSeek.',
      freeTierInfo: '10,000 free neurons every day for free Cloudflare accounts.',
      portalUrl: 'https://dash.cloudflare.com/profile/api-tokens',
      keyPlaceholder: 'Cloudflare API Token',
      requiresKey: true,
      needsAccountId: true,
    },
    {
      id: 'pollinations',
      name: 'Pollinations.ai',
      badge: 'Bearer Token & Free',
      badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      description: 'Free & Pro AI text, voice, and Flux / Nano Banana / SeeDream image synthesis. Supports secret token (sk_...) or publishable token (pk_...) from enter.pollinations.ai.',
      freeTierInfo: 'Free public tier works without any key; adding a Bearer token from enter.pollinations.ai unlocks dedicated priority GPUs, private models, and higher rate limits.',
      portalUrl: 'https://enter.pollinations.ai',
      keyPlaceholder: 'sk_... or pk_... (Optional Bearer Token)',
      requiresKey: true,
    },
    {
      id: 'siliconflow',
      name: 'SiliconFlow',
      badge: 'Free Token Tier',
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      description: 'DeepSeek V3, R1, Qwen 2.5, and Flux.1 image generation at high speed.',
      freeTierInfo: 'Free sign-up tokens with sub-second token latencies.',
      portalUrl: 'https://cloud.siliconflow.cn/account/ak',
      keyPlaceholder: 'sk-...',
      requiresKey: true,
    },
    {
      id: 'openai',
      name: 'OpenAI Direct',
      badge: 'BYOK',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Standard OpenAI direct integration for GPT-4o, o3-mini, and DALL-E 3.',
      freeTierInfo: 'Requires active OpenAI account API Key with billing credits.',
      portalUrl: 'https://platform.openai.com/api-keys',
      keyPlaceholder: 'sk-proj-...',
      requiresKey: true,
    },
    {
      id: 'others',
      name: 'Custom Endpoint / Local LLM',
      badge: 'OpenAI-Compatible',
      badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      description: 'Connect Ollama, vLLM, LM Studio, or any custom OpenAI-compatible server.',
      freeTierInfo: 'Self-hosted or proprietary API base URL and token.',
      portalUrl: 'https://ollama.com',
      keyPlaceholder: 'Bearer key or local token',
      requiresKey: true,
      needsCustomUrl: true,
    },
  ];

  const currentProvider = providers.find(p => p.id === activeTab) || providers[0];
  const currentKeyField = activeTab === 'gemini' ? 'gemini' 
    : activeTab === 'openai' ? 'openai'
    : activeTab === 'groq' ? 'groq'
    : activeTab === 'openrouter' ? 'openrouter'
    : activeTab === 'siliconflow' ? 'siliconflow'
    : activeTab === 'pollinations' ? 'pollinations'
    : activeTab === 'zai' ? 'zai'
    : activeTab === 'cerebras' ? 'cerebras'
    : activeTab === 'mistral' ? 'mistral'
    : activeTab === 'cohere' ? 'cohere'
    : activeTab === 'nvidia' ? 'nvidia'
    : activeTab === 'requesty' ? 'requesty'
    : activeTab === 'huggingface' ? 'huggingface'
    : activeTab === 'cloudflare' ? 'cloudflare'
    : 'others';

  const currentKeyValue = (tempKeys as any)[currentKeyField] || '';
  const currentStatus = testStatus[activeTab] || { state: 'idle' };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden shadow-xl">
      {/* Horizontal Scrolling Provider Nav */}
      <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar bg-slate-950/50 p-1.5 gap-1">
        {providers.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === p.id 
                ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-sm' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
            }`}
          >
            <KeyIcon className="w-3.5 h-3.5 opacity-70" />
            <span>{p.name}</span>
            {p.id === 'puter' || p.id === 'pollinations' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ) : (
              (tempKeys as any)[p.id === 'gemini' ? 'gemini' : p.id] ? (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              ) : null
            )}
          </button>
        ))}
      </div>

      {/* Provider Details & Input Form */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Header with info badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">{currentProvider.name}</h4>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${currentProvider.badgeColor}`}>
                {currentProvider.badge}
              </span>
            </div>
            <p className="text-xs text-purple-200/70 mt-1">{currentProvider.description}</p>
          </div>

          <a
            href={currentProvider.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-100 transition-colors self-start sm:self-auto px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <span>Get Free Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Free Tier Callout */}
        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200/80 flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-purple-100">Tier Details: </span>
            {currentProvider.freeTierInfo}
          </div>
        </div>

        {/* Cloudflare Account ID input if applicable */}
        {currentProvider.needsAccountId && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Cloudflare Account ID</span>
              <span className="text-[11px] text-slate-400">Found in Cloudflare Dashboard URL</span>
            </label>
            <input
              type="text"
              value={tempKeys.cloudflareAccountId || ''}
              onChange={(e) => handleFieldChange('cloudflareAccountId', e.target.value)}
              placeholder="e.g. 7d8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950/70 border border-slate-700/60 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 outline-none text-slate-100 placeholder-slate-500 shadow-inner"
            />
          </div>
        )}

        {/* Custom Base URL input if applicable */}
        {currentProvider.needsCustomUrl && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>API Base URL</span>
              <span className="text-[11px] text-slate-400">e.g. http://localhost:11434/v1 or custom host</span>
            </label>
            <input
              type="text"
              value={tempKeys.customBaseUrl || ''}
              onChange={(e) => handleFieldChange('customBaseUrl', e.target.value)}
              placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950/70 border border-slate-700/60 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 outline-none text-slate-100 placeholder-slate-500 shadow-inner"
            />
          </div>
        )}

        {/* Key Input */}
        {currentProvider.requiresKey ? (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-200">
                {currentProvider.id === 'pollinations' ? 'Bearer Token (Optional - Free tier works without token)' : `API Key for ${currentProvider.name}`}
              </label>
              {currentStatus.state === 'success' && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                  <CheckIcon className="w-3.5 h-3.5" /> Verified & Ready
                </span>
              )}
              {currentStatus.state === 'error' && (
                <span className="flex items-center gap-1 text-xs text-rose-400 font-bold">
                  <AlertTriangleIcon className="w-3.5 h-3.5" /> Check Key/Token
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="password"
                value={currentKeyValue}
                onChange={(e) => handleFieldChange(currentKeyField, e.target.value)}
                placeholder={currentProvider.keyPlaceholder}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-950/70 border border-slate-700/60 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 outline-none transition-all text-slate-100 placeholder-slate-500 shadow-inner"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400/60">
                <KeyIcon className="w-3.5 h-3.5" />
              </div>
            </div>

            {currentStatus.message && (
              <p className={`text-[11px] ${currentStatus.state === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {currentStatus.message}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleTest(activeTab)}
                disabled={(activeTab !== 'pollinations' && !currentKeyValue) || currentStatus.state === 'testing'}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                {currentStatus.state === 'testing' ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                    <span>{activeTab === 'pollinations' && !currentKeyValue ? 'Check Free Status' : 'Test & Verify'}</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-slate-400">Stored locally in your browser</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-200">No API Key Needed</p>
              <p className="text-[11px] text-emerald-300/70">
                This provider is completely free and accessible without any configuration.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

