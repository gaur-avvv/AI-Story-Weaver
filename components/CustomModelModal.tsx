import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Server, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Activity, 
  Layers, 
  Cpu, 
  Plus,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  ModelRegistryService, 
  CustomModelEndpoint, 
  ProviderType, 
  CapabilityType, 
  PROVIDER_DEFAULT_BASE_URLS, 
  PROVIDER_LABELS 
} from '../services/modelRegistry';

interface CustomModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndpointSaved?: (endpoint: CustomModelEndpoint) => void;
}

export const CustomModelModal: React.FC<CustomModelModalProps> = ({
  isOpen,
  onClose,
  onEndpointSaved,
}) => {
  const [endpoints, setEndpoints] = useState<CustomModelEndpoint[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [provider, setProvider] = useState<ProviderType>('openai_compatible');
  const [name, setName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [modelId, setModelId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [capabilities, setCapabilities] = useState<CapabilityType[]>(['text']);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Test Connection State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Refresh endpoints list on mount or changes
  const loadEndpoints = () => {
    setEndpoints(ModelRegistryService.getCustomEndpoints());
  };

  useEffect(() => {
    if (isOpen) {
      loadEndpoints();
      resetForm();
    }
  }, [isOpen]);

  // When provider changes, update default base URL suggestion if not manually set
  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    setBaseUrl(PROVIDER_DEFAULT_BASE_URLS[newProvider] || '');
    setTestResult(null);

    // Provide helpful model ID default
    if (!modelId) {
      if (newProvider === 'openai') setModelId('gpt-4o');
      else if (newProvider === 'anthropic') setModelId('claude-3-7-sonnet');
      else if (newProvider === 'google') setModelId('gemini-2.5-flash');
      else if (newProvider === 'deepseek') setModelId('deepseek-chat');
      else setModelId('llama-3.3-70b-versatile');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setProvider('openai_compatible');
    setName('');
    setBaseUrl(PROVIDER_DEFAULT_BASE_URLS.openai_compatible);
    setModelId('llama-3.3-70b-versatile');
    setApiKey('');
    setCapabilities(['text']);
    setShowApiKey(false);
    setTestResult(null);
  };

  const handleEdit = (endpoint: CustomModelEndpoint) => {
    setEditingId(endpoint.id);
    setProvider(endpoint.provider);
    setName(endpoint.name);
    setBaseUrl(endpoint.baseUrl);
    setModelId(endpoint.modelId);
    setApiKey(endpoint.apiKey);
    setCapabilities(endpoint.capabilities);
    setTestResult(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this custom model endpoint?')) {
      ModelRegistryService.deleteCustomEndpoint(id);
      loadEndpoints();
      if (editingId === id) resetForm();
    }
  };

  const toggleCapability = (cap: CapabilityType) => {
    setCapabilities((prev) => {
      if (prev.includes(cap)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== cap);
      } else {
        return [...prev, cap];
      }
    });
  };

  const handleTestConnection = async () => {
    if (!modelId.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide a Model ID before testing.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await ModelRegistryService.testConnection({
      provider,
      baseUrl: baseUrl.trim(),
      modelId: modelId.trim(),
      apiKey: apiKey.trim(),
    });

    setIsTesting(false);
    setTestResult(result);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId.trim()) {
      alert('Model ID is required.');
      return;
    }

    const defaultName = name.trim() || `${modelId} (${PROVIDER_LABELS[provider].split(' ')[0]})`;

    const saved = ModelRegistryService.saveCustomEndpoint({
      id: editingId || undefined,
      name: defaultName,
      provider,
      baseUrl: baseUrl.trim(),
      modelId: modelId.trim(),
      apiKey: apiKey.trim(),
      capabilities,
    });

    loadEndpoints();
    resetForm();
    if (onEndpointSaved) onEndpointSaved(saved);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-slate-950 border border-purple-500/30 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Custom Model Registry
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  BYOM & Custom Endpoints
                </span>
              </h3>
              <p className="text-xs text-purple-200/60 mt-0.5">
                Register private, local, or self-hosted AI models across Text, Vision, and Audio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-grow">
          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                {editingId ? 'Edit Custom Endpoint' : 'Register New Custom Endpoint'}
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> New Endpoint
                </button>
              )}
            </div>

            {/* Provider Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Provider Protocol / Format
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="openai_compatible">Generic OpenAI-Compatible (Groq, Together, Ollama, vLLM, LMStudio, OpenRouter)</option>
                <option value="openai">OpenAI (Direct API)</option>
                <option value="anthropic">Anthropic (Claude Direct API)</option>
                <option value="google">Google AI Studio (Gemini Direct API)</option>
                <option value="deepseek">DeepSeek (Direct API)</option>
              </select>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Fast Groq Llama 3.3, Local DeepSeek R1"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Base URL & Model ID Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Base URL Endpoint
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.groq.com/openai/v1"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Model ID
                </label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="e.g. llama-3.3-70b-versatile, deepseek-chat"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                />
              </div>
            </div>

            {/* API Key (Masked Input with Toggle) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  API Key / Access Token
                </label>
                <span className="text-[11px] text-slate-500">
                  Leave empty if local server requires no authorization
                </span>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_..., sk-..., or custom auth token"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Capabilities Mapping: Multi-select Checkboxes */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Capabilities Mapping (What does this model support?)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'text' as CapabilityType,
                    label: 'Text Generation',
                    desc: 'Story generation, choices, expansions',
                  },
                  {
                    id: 'image' as CapabilityType,
                    label: 'Vision / Image',
                    desc: 'DALL-E, Stable Diffusion, Flux artwork',
                  },
                  {
                    id: 'audio' as CapabilityType,
                    label: 'Audio Narration',
                    desc: 'TTS speech, voice chapter tracks',
                  },
                ].map((cap) => {
                  const isChecked = capabilities.includes(cap.id);
                  return (
                    <div
                      key={cap.id}
                      onClick={() => toggleCapability(cap.id)}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                        isChecked
                          ? 'bg-purple-600/20 border-purple-500/50 shadow-inner'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                          {cap.label}
                        </span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                            isChecked
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'border-white/20 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">{cap.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test Connection Banner & Button */}
            <div className="pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  <Activity className={`w-3.5 h-3.5 text-purple-400 ${isTesting ? 'animate-pulse' : ''}`} />
                  <span>{isTesting ? 'Testing Ping...' : 'Test Connection'}</span>
                </button>

                <button
                  type="submit"
                  className="flex-grow px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Update Endpoint' : 'Save & Register Model'}</span>
                </button>
              </div>

              {/* Test Connection Result Output */}
              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-grow">
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.latencyMs && (
                      <p className="text-[11px] opacity-75 mt-0.5">Latency: {testResult.latencyMs}ms</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Configured Custom Endpoints List */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Configured Custom Endpoints ({endpoints.length})</span>
            </h4>

            {endpoints.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-slate-500">
                No custom endpoints registered yet. Add one above to mix & match with built-in models.
              </div>
            ) : (
              <div className="space-y-2">
                {endpoints.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{ep.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                          {ep.modelId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="truncate max-w-[220px]">{ep.baseUrl}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {ep.capabilities.map((c) => (
                            <span
                              key={c}
                              className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono uppercase"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEdit(ep)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Edit Endpoint"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ep.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
                        title="Delete Endpoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <span>Changes are saved automatically and available across all studio toolbars.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
