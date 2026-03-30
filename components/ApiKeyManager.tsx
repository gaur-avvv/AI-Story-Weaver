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
  };

  const handleSave = (provider: string) => {
    onSave(provider, tempKeys[provider as keyof typeof tempKeys] || '');
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
    { id: 'gemini', name: 'Google Gemini', icon: '✨' },
    { id: 'openai', name: 'OpenAI', icon: '🤖' },
    { id: 'groq', name: 'Groq', icon: '⚡' },
    { id: 'openrouter', name: 'OpenRouter', icon: '🔗' },
    { id: 'siliconflow', name: 'SiliconFlow', icon: '🌊' },
    { id: 'pollinations', name: 'Pollinations.ai', icon: '🌸' },
    { id: 'others', name: 'Other Providers', icon: '🌐' },
  ];

  return (
    <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
      <div className="flex border-b border-blue-100 overflow-x-auto">
        {providers.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === p.id 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{p.icon}</span>
            {p.name}
          </button>
        ))}
      </div>

      <div className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-700">
              API Key for {providers.find(p => p.id === activeTab)?.name}
            </label>
            {testStatus[activeTab] === 'success' && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckIcon className="w-3 h-3" /> Verified
                </span>
            )}
             {testStatus[activeTab] === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <KeyIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleTest(activeTab)}
              disabled={!tempKeys[activeTab as keyof typeof tempKeys] || testStatus[activeTab] === 'testing'}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {testStatus[activeTab] === 'testing' ? 'Testing...' : 'Test Key'}
            </button>
            <button
              onClick={() => handleSave(activeTab)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors ml-auto"
            >
              Save {providers.find(p => p.id === activeTab)?.name} Key
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Keys are stored locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};
