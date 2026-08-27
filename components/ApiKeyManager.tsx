import React, { useState, useEffect, useMemo } from 'react';
import { KeyIcon, CheckIcon, AlertTriangleIcon } from './icons';
import { testProviderKey } from '../services/geminiService';
import { Sparkles, ExternalLink, ShieldCheck, Zap, Globe, RefreshCw, Eye, EyeOff, Search, Server, Cpu, Cloud, Info, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { 
  ALL_PROVIDERS, 
  RECOMMENDED_PROVIDERS, 
  IMG_GEN_PROVIDERS,
  CLOUD_PROVIDERS, 
  ROUTER_PROVIDERS, 
  LOCAL_PROVIDERS, 
  EXTENDED_PROVIDERS, 
  ProviderDefinition, 
  ProviderCategory 
} from '../utils/providersCatalog';

export interface ApiKeysPayload {
  gemini?: string;
  openai?: string;
  anthropic?: string;
  deepseek?: string;
  xai?: string;
  mistral?: string;
  minimax?: string;
  kimi?: string;
  alibaba?: string;
  zai?: string;
  cohere?: string;
  inception?: string;
  azureOpenaiApiKey?: string;
  azureOpenaiEndpoint?: string;
  awsBedrockApiKey?: string;
  groq?: string;
  cerebras?: string;
  nvidia?: string;
  together?: string;
  openrouter?: string;
  huggingface?: string;
  fireworks?: string;
  cloudflare?: string;
  cloudflareAccountId?: string;
  siliconflow?: string;
  requesty?: string;
  pollinations?: string;
  fal_ai?: string;
  deepinfra?: string;
  recraft?: string;
  replicate?: string;
  imejis?: string;
  bannerbear?: string;
  placid?: string;
  creatomate?: string;
  cloudinary?: string;
  dynapictures?: string;
  apitemplate?: string;
  renderform?: string;
  templated?: string;
  htmlcsstoimage?: string;
  pictify?: string;
  okzest?: string;
  switchboard?: string;
  robolly?: string;
  abyssale?: string;
  localEndpoint?: string;
  others?: string;
  customBaseUrl?: string;
  extendedApiKeys?: Record<string, string>;
}

interface ApiKeyManagerProps {
  apiKeys: ApiKeysPayload;
  onSave: (field: string, value: string) => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKeys, onSave }) => {
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | 'all'>('recommended');
  const [activeProviderId, setActiveProviderId] = useState<string>('gemini');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [tempKeys, setTempKeys] = useState<ApiKeysPayload>(apiKeys);
  const [testStatus, setTestStatus] = useState<Record<string, { state: 'idle' | 'testing' | 'success' | 'error'; message?: string }>>({});

  useEffect(() => {
    setTempKeys(apiKeys);
  }, [apiKeys]);

  const handleFieldChange = (field: string, value: string) => {
    setTempKeys(prev => ({ ...prev, [field]: value }));
    onSave(field, value);
  };

  const handleExtendedKeyChange = (providerId: string, value: string) => {
    const updated = { ...(tempKeys.extendedApiKeys || {}), [providerId]: value };
    setTempKeys(prev => ({ ...prev, extendedApiKeys: updated }));
    onSave('extendedApiKeys', JSON.stringify(updated));
  };

  const getKeyForProvider = (providerId: string): string => {
    switch (providerId) {
      case 'gemini': 
      case 'gemini_img': return tempKeys.gemini || '';
      case 'openai': 
      case 'openai_dalle': return tempKeys.openai || '';
      case 'anthropic': return tempKeys.anthropic || '';
      case 'deepseek': return tempKeys.deepseek || '';
      case 'xai': return tempKeys.xai || '';
      case 'mistral': return tempKeys.mistral || '';
      case 'minimax': return tempKeys.minimax || '';
      case 'kimi': return tempKeys.kimi || '';
      case 'alibaba': return tempKeys.alibaba || '';
      case 'zai':
      case 'z_ai': return tempKeys.zai || '';
      case 'cohere': return tempKeys.cohere || '';
      case 'inception': return tempKeys.inception || '';
      case 'azure_openai': return tempKeys.azureOpenaiApiKey || '';
      case 'aws_bedrock': return tempKeys.awsBedrockApiKey || '';
      case 'groq': return tempKeys.groq || '';
      case 'cerebras': return tempKeys.cerebras || '';
      case 'nvidia': return tempKeys.nvidia || '';
      case 'together':
      case 'together_img': return tempKeys.together || '';
      case 'openrouter': return tempKeys.openrouter || '';
      case 'huggingface':
      case 'huggingface_img': return tempKeys.huggingface || '';
      case 'fireworks': return tempKeys.fireworks || '';
      case 'cloudflare':
      case 'cloudflare_img': return tempKeys.cloudflare || '';
      case 'siliconflow':
      case 'siliconflow_img': return tempKeys.siliconflow || '';
      case 'requesty': return tempKeys.requesty || '';
      case 'pollinations':
      case 'pollinations_img': return tempKeys.pollinations || '';
      case 'fal_ai': return tempKeys.fal_ai || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['fal_ai']) || '';
      case 'deepinfra':
      case 'deepinfra_img': return tempKeys.deepinfra || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['deepinfra']) || '';
      case 'recraft': return tempKeys.recraft || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['recraft']) || '';
      case 'replicate': return tempKeys.replicate || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['replicate']) || '';
      case 'imejis': return tempKeys.imejis || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['imejis']) || '';
      case 'bannerbear': return tempKeys.bannerbear || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['bannerbear']) || '';
      case 'placid': return tempKeys.placid || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['placid']) || '';
      case 'creatomate': return tempKeys.creatomate || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['creatomate']) || '';
      case 'cloudinary': return tempKeys.cloudinary || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['cloudinary']) || '';
      case 'dynapictures': return tempKeys.dynapictures || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['dynapictures']) || '';
      case 'apitemplate': return tempKeys.apitemplate || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['apitemplate']) || '';
      case 'renderform': return tempKeys.renderform || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['renderform']) || '';
      case 'templated': return tempKeys.templated || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['templated']) || '';
      case 'htmlcsstoimage': return tempKeys.htmlcsstoimage || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['htmlcsstoimage']) || '';
      case 'pictify': return tempKeys.pictify || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['pictify']) || '';
      case 'okzest': return tempKeys.okzest || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['okzest']) || '';
      case 'switchboard': return tempKeys.switchboard || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['switchboard']) || '';
      case 'robolly': return tempKeys.robolly || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['robolly']) || '';
      case 'abyssale': return tempKeys.abyssale || (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys['abyssale']) || '';
      case 'others': return tempKeys.others || '';
      default:
        return (tempKeys.extendedApiKeys && tempKeys.extendedApiKeys[providerId]) || tempKeys.others || '';
    }
  };

  const getFieldKeyName = (providerId: string): string => {
    switch (providerId) {
      case 'gemini':
      case 'gemini_img': return 'geminiApiKey';
      case 'openai':
      case 'openai_dalle': return 'openaiApiKey';
      case 'anthropic': return 'anthropicApiKey';
      case 'deepseek': return 'deepseekApiKey';
      case 'xai': return 'xaiApiKey';
      case 'mistral': return 'mistralApiKey';
      case 'minimax': return 'minimaxApiKey';
      case 'kimi': return 'kimiApiKey';
      case 'alibaba': return 'alibabaApiKey';
      case 'zai':
      case 'z_ai': return 'zaiApiKey';
      case 'cohere': return 'cohereApiKey';
      case 'inception': return 'inceptionApiKey';
      case 'azure_openai': return 'azureOpenaiApiKey';
      case 'aws_bedrock': return 'awsBedrockApiKey';
      case 'groq': return 'groqApiKey';
      case 'cerebras': return 'cerebrasApiKey';
      case 'nvidia': return 'nvidiaApiKey';
      case 'together':
      case 'together_img': return 'togetherApiKey';
      case 'openrouter': return 'openRouterApiKey';
      case 'huggingface':
      case 'huggingface_img': return 'huggingfaceApiKey';
      case 'fireworks': return 'fireworksApiKey';
      case 'cloudflare':
      case 'cloudflare_img': return 'cloudflareApiKey';
      case 'siliconflow':
      case 'siliconflow_img': return 'siliconFlowApiKey';
      case 'requesty': return 'requestyApiKey';
      case 'pollinations':
      case 'pollinations_img': return 'pollinationsApiKey';
      case 'fal_ai': return 'fal_ai';
      case 'deepinfra':
      case 'deepinfra_img': return 'deepinfra';
      case 'recraft': return 'recraft';
      case 'replicate': return 'replicate';
      case 'imejis': return 'imejis';
      case 'bannerbear': return 'bannerbear';
      case 'placid': return 'placid';
      case 'creatomate': return 'creatomate';
      case 'cloudinary': return 'cloudinary';
      case 'dynapictures': return 'dynapictures';
      case 'apitemplate': return 'apitemplate';
      case 'renderform': return 'renderform';
      case 'templated': return 'templated';
      case 'htmlcsstoimage': return 'htmlcsstoimage';
      case 'pictify': return 'pictify';
      case 'okzest': return 'okzest';
      case 'switchboard': return 'switchboard';
      case 'robolly': return 'robolly';
      case 'abyssale': return 'abyssale';
      case 'others': return 'othersApiKey';
      default: return `ext_${providerId}`;
    }
  };

  const handleTest = async (providerId: string) => {
    const key = getKeyForProvider(providerId);
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

  const filteredProviders = useMemo(() => {
    let list: ProviderDefinition[] = [];
    if (selectedCategory === 'all') {
      const seen = new Set<string>();
      list = ALL_PROVIDERS.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    } else if (selectedCategory === 'recommended') {
      list = RECOMMENDED_PROVIDERS;
    } else if (selectedCategory === 'img_gen') {
      list = IMG_GEN_PROVIDERS;
    } else if (selectedCategory === 'cloud') {
      list = CLOUD_PROVIDERS;
    } else if (selectedCategory === 'router') {
      list = ROUTER_PROVIDERS;
    } else if (selectedCategory === 'local') {
      list = LOCAL_PROVIDERS;
    } else if (selectedCategory === 'extended') {
      list = EXTENDED_PROVIDERS;
    }

    // Always sort alphabetically by name
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));

    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [selectedCategory, searchQuery]);

  const activeProvider = useMemo(() => {
    return ALL_PROVIDERS.find(p => p.id === activeProviderId) || RECOMMENDED_PROVIDERS[0];
  }, [activeProviderId]);

  return (
    <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm sm:text-base font-semibold text-white">Universal Model Providers & Credentials</h3>
          </div>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Configure keys, local runners, and direct endpoints for 100+ AI providers. Alphabetically organized with direct API console links.
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Client Encrypted
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <Globe className="w-3.5 h-3.5" /> 100+ Providers
          </span>
        </div>
      </div>

      {/* Category Tabs & Search Filter (Zero Emojis, Image Gen before Cloud LLMs) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-white/5 shrink-0">
            {[
              { id: 'recommended', label: 'Recommended & Free Tiers', icon: <Sparkles className="w-3 h-3" /> },
              { id: 'img_gen', label: 'Image Gen', icon: <ImageIcon className="w-3 h-3" /> },
              { id: 'cloud', label: 'Cloud LLMs', icon: <Cloud className="w-3 h-3" /> },
              { id: 'router', label: 'Routers', icon: <Zap className="w-3 h-3" /> },
              { id: 'local', label: 'Local & WebGPU', icon: <Cpu className="w-3 h-3" /> },
              { id: 'extended', label: 'Extended (72+)', icon: <Server className="w-3 h-3" /> },
              { id: 'all', label: 'All Providers', icon: <Globe className="w-3 h-3" /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(tab.id as any);
                  // If switching to img_gen and active isn't in img_gen, switch active to fal_ai or imejis
                  if (tab.id === 'img_gen') {
                    setActiveProviderId('gemini_img');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search provider (e.g. Gemini, OpenAI, Claude, DeepSeek, fal.ai, Imejis, Cloudflare, Ollama)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Provider Quick Selector Pills (Alphabetically Sorted) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar border-b border-white/5">
        {filteredProviders.map(prov => {
          const isActive = prov.id === activeProviderId;
          const hasKey = !!getKeyForProvider(prov.id);
          return (
            <button
              key={prov.id}
              type="button"
              onClick={() => setActiveProviderId(prov.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shrink-0 transition-all ${
                isActive
                  ? 'bg-purple-600/30 border-purple-500/80 text-white shadow-sm'
                  : hasKey
                  ? 'bg-slate-900 border-emerald-500/30 text-emerald-200 hover:bg-slate-800'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span>{prov.name}</span>
              {hasKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
            </button>
          );
        })}
      </div>

      {/* Active Provider Details Card with Direct Links & Model Performance Labels */}
      {activeProvider && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
                {activeProvider.isImageGen ? <ImageIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white">{activeProvider.name}</h4>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${activeProvider.badgeColor}`}>
                    {activeProvider.badge}
                  </span>
                  {activeProvider.startingPrice && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10">
                      Price: {activeProvider.startingPrice}
                    </span>
                  )}
                  {activeProvider.apiType && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-500/20">
                      API: {activeProvider.apiType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300/80 mt-0.5">{activeProvider.description}</p>
              </div>
            </div>

            {activeProvider.portalUrl && (
              <a
                href={activeProvider.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-xs text-purple-200 font-bold self-start sm:self-auto shrink-0 transition-colors shadow-sm"
              >
                <span>Get API Key / Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {activeProvider.freeTierInfo && (
            <div className="text-[11px] text-emerald-300/90 bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{activeProvider.freeTierInfo}</span>
            </div>
          )}

          {/* Model Catalog Preview with Best Performance and Free Tier Badges */}
          {activeProvider.models && activeProvider.models.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Available Models &amp; Tiers
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {activeProvider.models.map(model => (
                  <div 
                    key={model.id} 
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-white/5 text-xs text-slate-200"
                  >
                    <span className="truncate font-medium">{model.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {model.isBestPerformance && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Best Performance
                        </span>
                      )}
                      {model.isFreeTier && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Free Tier
                        </span>
                      )}
                      {model.recommended && !model.isBestPerformance && !model.isFreeTier && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Key / Endpoint Input */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">
                {activeProvider.requiresKey ? 'API Key / Secret Token' : 'Connection Status / Token'}
              </label>
              {activeProvider.requiresKey && (
                <button
                  type="button"
                  onClick={() => setShowKey(prev => ({ ...prev, [activeProvider.id]: !prev[activeProvider.id] }))}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {showKey[activeProvider.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKey[activeProvider.id] ? 'Hide' : 'Show'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey[activeProvider.id] || !activeProvider.requiresKey ? 'text' : 'password'}
                  value={getKeyForProvider(activeProvider.id)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeProvider.isExtended) {
                      handleExtendedKeyChange(activeProvider.id, val);
                    } else {
                      const field = getFieldKeyName(activeProvider.id);
                      handleFieldChange(field, val);
                    }
                  }}
                  placeholder={activeProvider.keyPlaceholder || 'Enter key...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => handleTest(activeProvider.id)}
                disabled={testStatus[activeProvider.id]?.state === 'testing'}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95"
              >
                {testStatus[activeProvider.id]?.state === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Connection</span>
              </button>
            </div>

            {/* Test Result Message */}
            {testStatus[activeProvider.id] && testStatus[activeProvider.id].state !== 'idle' && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testStatus[activeProvider.id].state === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                  : testStatus[activeProvider.id].state === 'error'
                  ? 'bg-red-950/40 border border-red-500/30 text-red-200'
                  : 'bg-purple-950/30 border border-purple-500/20 text-purple-200'
              }`}>
                {testStatus[activeProvider.id].state === 'success' && <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />}
                {testStatus[activeProvider.id].state === 'error' && <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />}
                <span>{testStatus[activeProvider.id].message || 'Testing connection...'}</span>
              </div>
            )}
          </div>

          {/* Provider Specific Advanced Settings */}
          {activeProvider.id === 'cloudflare' && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">Cloudflare Account ID <span className="text-red-400">*</span></label>
                <span className="text-[10px] text-slate-400">32-character hex ID from dashboard</span>
              </div>
              <input
                type="text"
                value={tempKeys.cloudflareAccountId || ''}
                onChange={(e) => handleFieldChange('cloudflareAccountId', e.target.value)}
                placeholder="e.g. 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
                className="w-full px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Found in your Cloudflare dashboard under <strong>Workers &amp; AI &gt; Overview</strong> or your account URL. Ensure your API Token has <strong>Workers AI:Read/Edit</strong> permissions.
              </p>
            </div>
          )}

          {activeProvider.id === 'azure_openai' && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Azure Deployment Endpoint</label>
              <input
                type="text"
                value={tempKeys.azureOpenaiEndpoint || ''}
                onChange={(e) => handleFieldChange('azureOpenaiEndpoint', e.target.value)}
                placeholder="https://your-resource.openai.azure.com/openai/deployments/your-deployment"
                className="w-full px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {['llamacpp', 'ollama', 'lmstudio', 'jan', 'vllm', 'sglang', 'localai', 'gpt4all', 'local_openai_proxy', 'others'].includes(activeProvider.id) && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">Custom Base URL / Local Port</label>
                <span className="text-[10px] text-slate-400 font-mono">Default: {activeProvider.defaultEndpoint || 'http://localhost:8080/v1'}</span>
              </div>
              <input
                type="text"
                value={tempKeys.customBaseUrl || tempKeys.localEndpoint || ''}
                onChange={(e) => {
                  handleFieldChange('customBaseUrl', e.target.value);
                  handleFieldChange('localEndpoint', e.target.value);
                }}
                placeholder={activeProvider.defaultEndpoint || 'http://localhost:8080/v1'}
                className="w-full px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Image Gen Quick Comparison Matrix when on img_gen tab */}
      {selectedCategory === 'img_gen' && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Image &amp; Template Providers Comparison</h4>
            </div>
            <span className="text-[10px] text-purple-300">Official API Matrix</span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] text-slate-400">
                  <th className="py-2 px-2.5 font-semibold">Provider</th>
                  <th className="py-2 px-2.5 font-semibold">Best For</th>
                  <th className="py-2 px-2.5 font-semibold">Starting Price</th>
                  <th className="py-2 px-2.5 font-semibold">Free Tier</th>
                  <th className="py-2 px-2.5 font-semibold">API Type</th>
                  <th className="py-2 px-2.5 font-semibold">Regions</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {IMG_GEN_PROVIDERS.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2 px-2.5 font-medium flex items-center gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setActiveProviderId(p.id)}
                        className="text-purple-300 hover:text-white font-semibold underline underline-offset-2 decoration-purple-500/50 text-left"
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="py-2 px-2.5 text-slate-300">{p.badge}</td>
                    <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">{p.startingPrice || 'Usage Based'}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-500/20">
                        {p.freeTierInfo || 'Trial'}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-400">{p.apiType || 'REST'}</td>
                    <td className="py-2 px-2.5 text-slate-400">{p.regions || 'Global'}</td>
                    <td className="py-2 px-2.5 text-right">
                      {p.portalUrl && (
                        <a
                          href={p.portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-100 font-semibold"
                        >
                          <span>Get Key</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
