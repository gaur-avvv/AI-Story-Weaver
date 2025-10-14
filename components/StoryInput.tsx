import React, { useState } from 'react';
import { MagicWandIcon } from './icons';

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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What magical story shall we create?"
          disabled={isGenerating}
          className="w-full pl-6 pr-48 py-4 text-xl text-amber-900 bg-white border-4 border-amber-300 rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-amber-400/50 transition-all duration-300"
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="absolute inset-y-0 right-0 m-2 flex items-center justify-center h-14 w-40 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold text-lg rounded-full shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-transform duration-200"
        >
          {isGenerating ? 'Creating...' : <> <MagicWandIcon className="w-6 h-6 mr-2" /> Create </>}
        </button>
      </div>
    </form>
  );
};
