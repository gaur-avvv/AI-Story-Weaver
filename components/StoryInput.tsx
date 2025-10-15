

import React, { useState } from 'react';
import { SparklesIcon } from './icons';

interface StoryInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export const StoryInput: React.FC<StoryInputProps> = ({ onGenerate, isGenerating }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt);
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What magical story shall we create?"
          disabled={isGenerating}
          className="w-full pl-6 pr-40 sm:pr-48 py-4 text-lg text-slate-800 bg-white border-2 border-blue-300 rounded-full shadow-sm focus:outline-none focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all duration-300"
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="absolute inset-y-0 right-0 m-2 flex items-center justify-center h-14 w-36 sm:w-44 bg-yellow-400 text-blue-900 font-black text-lg rounded-full shadow-md hover:bg-yellow-500 active:scale-95 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 transition-all duration-200"
        >
          {isGenerating ? 'Creating...' : <> <SparklesIcon className="w-6 h-6 mr-2" /> Create </>}
        </button>
      </div>
    </form>
  );
};