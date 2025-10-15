import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyIcon, CheckIcon, AlertTriangleIcon, BookText, Paintbrush, Theater, AudioWaveform, ChevronDownIcon } from './icons';
import { testApiKey } from '../services/geminiService';
import type { Settings } from '../types';

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


export const SettingsPanel: React.FC<{
  onSave: (key: string, settings: Settings) => void;
  currentApiKey: string | null;
  currentSettings: Settings;
}> = ({ onSave, currentApiKey, currentSettings }) => {
  const [localApiKey, setLocalApiKey] = useState('');
  const [localSettings, setLocalSettings] = useState<Settings>(currentSettings);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    setLocalApiKey(currentApiKey || '');
    setLocalSettings(currentSettings);
    setTestStatus('idle');
    setTestMessage('');
  }, [currentApiKey, currentSettings]);

  const handleSave = () => {
    onSave(localApiKey, localSettings);
  };
  
  const handleTestKey = async () => {
    if (!localApiKey.trim()) {
      setTestStatus('error');
      setTestMessage('API Key cannot be empty.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('');
    const result = await testApiKey(localApiKey.trim());
    setTestStatus(result.success ? 'success' : 'error');
    setTestMessage(result.message);
  };
  
  const handleSettingChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalSettings(prev => ({...prev, [field]: e.target.value }));
  };

  const handleToggleChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSettings(prev => ({...prev, [field]: e.target.checked }));
  };

  const statusIcon = () => {
    switch (testStatus) {
      case 'testing':
        return <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />;
      case 'success':
        return <CheckIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <KeyIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const linkText = "You can find or create a key at the Google AI Studio.";
  const messageParts = testMessage.split(linkText);
  const mainMessage = messageParts[0];
  const hasLink = messageParts.length > 1;

  return (
    <div className="bg-[#FFFDF7] rounded-2xl shadow-lg w-full max-w-3xl mx-auto border-2 border-yellow-100">
      <div className="flex justify-between items-center p-6 border-b-2 border-yellow-100">
        <h2 className="text-2xl font-bold text-blue-900">Story Options</h2>
      </div>

      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <SectionHeader title="Story" />
            <SettingRow icon={<BookText className="w-6 h-6" />} label="Length">
            <CustomSelect value={localSettings.storyLength} onChange={handleSettingChange('storyLength')}>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </CustomSelect>
          </SettingRow>
          <SettingRow icon={<Theater className="w-6 h-6" />} label="Genre">
            <CustomSelect value={localSettings.genre} onChange={handleSettingChange('genre')}>
              <option value="fantasy">Fantasy</option>
              <option value="sci-fi">Sci-Fi</option>
              <option value="mystery">Mystery</option>
              <option value="adventure">Adventure</option>
              <option value="funny">Funny</option>
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
            </CustomSelect>
          </SettingRow>
          <SettingRow icon={<AudioWaveform className="w-6 h-6" />} label="Narration">
            <CustomToggle checked={localSettings.generateAudio} onChange={handleToggleChange('generateAudio')} />
          </SettingRow>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Advanced" />
            <div>
            <label htmlFor="api-key" className="block text-md font-semibold text-blue-900/80 mb-2">
              Your Gemini API Key
            </label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                {statusIcon()}
              </div>
              <input
                id="api-key"
                type="password"
                value={localApiKey}
                onChange={(e) => {
                  setLocalApiKey(e.target.value);
                  setTestStatus('idle');
                  setTestMessage('');
                }}
                placeholder="Enter your API Key here"
                className="w-full pl-12 pr-4 py-3 text-md text-blue-900 bg-white border-2 border-blue-200 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-500 transition-colors"
              />
            </div>
            <AnimatePresence>
              {testMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className={`mt-2 text-sm text-center font-medium overflow-hidden`}
                >
                  <div className={`p-2 rounded-md ${testStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {mainMessage}
                    {hasLink && (
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:opacity-80">
                        {linkText}
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3 pt-2">
              <button
              onClick={handleTestKey}
              disabled={testStatus === 'testing' || !localApiKey}
              className="w-full flex-1 h-12 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-full hover:bg-blue-200 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Key'}
            </button>
            <p className="flex-1 text-xs text-slate-500">
              Your key is saved securely in your browser's local storage.
            </p>
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