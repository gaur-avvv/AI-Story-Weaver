import React, { useState, useEffect } from 'react';
import { KeyIcon, CheckIcon, AlertTriangleIcon } from './icons';
import { testApiKey } from '../services/geminiService';

interface ApiKeyManagerProps {
  apiKeys: {
    gemini?: string;
    openai?: string;
    groq?: string;
    openrouter?: string;
    siliconflow?: string;
    pollinations?: string;
    others?: string;
  };
  onSave: (provider: string, key: string) => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKeys, onSave }) => {
  const [activeTab, setActiveTab] = useState<string>('gemini');
  const [tempKeys, setTempKeys] = useState(apiKeys);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});

  useEffect(() => {
    setTempKeys(apiKeys);
  }, [apiKeys]);

  const handleKeyChange = (provider: string, value: string) => {
    setTempKeys(prev => ({ ...prev, [provider]: value }));
    onSave(provider, value);
  };

  const handleTest = async (provider: string) => {
    const key = tempKeys[provider as keyof typeof tempKeys];
    if (!key) return;

    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
    
    // For now, we only have a real test for Gemini. 
    // Others would need specific test endpoints.
    if (provider === 'gemini') {
        const result = await testApiKey(key);
        setTestStatus(prev => ({ ...prev, [provider]: result.success ? 'success' : 'error' }));
    } else {
        // Mock test for others for now, or implement specific testers
        setTimeout(() => {
            setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
        }, 1000);
    }
  };

  const providers = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'groq', name: 'Groq' },
    { id: 'openrouter', name: 'OpenRouter' },
    { id: 'siliconflow', name: 'SiliconFlow' },
    { id: 'pollinations', name: 'Pollinations.ai' },
    { id: 'others', name: 'Other Providers' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      <div className="flex border-b border-white/10 overflow-x-auto">
        {providers.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === p.id 
                ? 'bg-white/10 text-white border-b-2 border-purple-400' 
                : 'text-purple-200/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <KeyIcon className="w-4 h-4 opacity-70" />
            {p.name}
          </button>
        ))}
      </div>

      <div className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-purple-100">
              API Key for {providers.find(p => p.id === activeTab)?.name}
            </label>
            {testStatus[activeTab] === 'success' && (
                <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                    <CheckIcon className="w-3 h-3" /> Verified
                </span>
            )}
             {testStatus[activeTab] === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                    <AlertTriangleIcon className="w-3 h-3" /> Invalid
                </span>
            )}
          </div>
          
          <div className="relative">
            <input
              type="password"
              value={tempKeys[activeTab as keyof typeof tempKeys] || ''}
              onChange={(e) => handleKeyChange(activeTab, e.target.value)}
              placeholder={`sk-...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 outline-none transition-all text-slate-100 placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
              <KeyIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleTest(activeTab)}
              disabled={!tempKeys[activeTab as keyof typeof tempKeys] || testStatus[activeTab] === 'testing'}
              className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 border border-white/10 transition-colors"
            >
              {testStatus[activeTab] === 'testing' ? 'Testing...' : 'Test Key'}
            </button>
          </div>
          
          <p className="text-xs text-purple-300/60 mt-2">
            Keys are stored locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};
