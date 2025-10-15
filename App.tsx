import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryInput } from './components/StoryInput';
import { StoryDisplay } from './components/StoryDisplay';
import { generateStory, generateImage, generateTTSAudio, generateCoverImage } from './services/geminiService';
import { StorySegment, Settings } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { DownloadIcon, LanguagesIcon, SettingsIcon, ChevronDownIcon, RefreshCwIcon } from './components/icons';
import { HeroIllustration } from './components/HeroIllustration';

// Add type definition for jsPDF from window object
declare global {
  interface Window {
    jspdf: any;
  }
}

const defaultSettings: Settings = {
  storyLength: 'medium',
  genre: 'fantasy',
  imageStyle: 'whimsical',
  generateAudio: true,
};

function App() {
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [title, setTitle] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSavingPdf, setIsSavingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('English');
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const languages = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Chinese (Simplified)'];

  useEffect(() => {
    // Load user settings and API key from local storage on startup
    const savedKey = localStorage.getItem('user-gemini-api-key');
    if (savedKey) setUserApiKey(savedKey);
    
    const savedSettings = localStorage.getItem('user-story-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, []);

  const handleSaveSettings = (key: string, newSettings: Settings) => {
    const newKey = key.trim();
    if (newKey) {
      localStorage.setItem('user-gemini-api-key', newKey);
      setUserApiKey(newKey);
    } else {
      localStorage.removeItem('user-gemini-api-key');
      setUserApiKey(null);
    }
    localStorage.setItem('user-story-settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    setIsSettingsOpen(false);
  };

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setIsSettingsOpen(false);
    setError(null);
    setSegments([]);
    setTitle('');
    setInitialPrompt(prompt);

    try {
      const { title: storyTitle, paragraphs } = await generateStory(prompt, language, userApiKey, settings.genre, settings.storyLength);
      setTitle(storyTitle);

      const newSegments: StorySegment[] = paragraphs.map((p) => ({
        id: crypto.randomUUID(),
        paragraph: p,
      }));
      setSegments(newSegments);

      for (let i = 0; i < newSegments.length; i++) {
        const segment = newSegments[i];
        try {
          setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, isLoadingImage: true, isLoadingAudio: settings.generateAudio } : s));

          const imageUrl = await generateImage(segment.paragraph, userApiKey, settings.imageStyle);
          setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, imageUrl, isLoadingImage: false } : s));
          
          if (settings.generateAudio) {
            const audioUrl = await generateTTSAudio(segment.paragraph, userApiKey);
            setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, audioUrl, isLoadingAudio: false } : s));
          }
          
          if (i < newSegments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (e) {
           console.error(`Error processing segment ${segment.id}:`, e);
           setError(`An error occurred while generating assets for a paragraph. The story may be incomplete.`);
           setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, isLoadingImage: false, isLoadingAudio: false } : s));
           break;
        }
      }
    } catch (e) {
      console.error("Story generation failed:", e);
      const friendlyError = e instanceof Error ? e.message : 'An unknown error occurred during story generation.';
      setError(`Error: ${friendlyError} Please check your API key and try again.`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleRegenerate = () => {
    if (initialPrompt && !isGenerating) {
        handleGenerate(initialPrompt);
    }
  };

  const handleSaveAsPdf = async () => {
    if (!title || segments.length === 0) return;
    setIsSavingPdf(true);
    setError(null);

    try {
      const coverPrompt = `A stunning, beautiful book cover illustration for a children's story titled "${title}". The story is about: ${initialPrompt}. The style should be ${settings.imageStyle}, vibrant, detailed, digital painting.`;
      const coverUrl = await generateCoverImage(coverPrompt, userApiKey, settings.imageStyle);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 60;
      const contentWidth = pageWidth - margin * 2;

      pdf.addImage(coverUrl, 'JPEG', 0, 0, pageWidth, pageHeight);

      pdf.addPage();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(36);
      pdf.text(title, pageWidth / 2, pageHeight / 3, { align: 'center', maxWidth: contentWidth });

      for (const segment of segments) {
        pdf.addPage();
        let currentY = margin;

        if (segment.imageUrl) {
          const imageRatio = 4 / 3;
          const imageHeight = contentWidth / imageRatio;
          pdf.addImage(segment.imageUrl, 'JPEG', margin, currentY, contentWidth, imageHeight);
          currentY += imageHeight + 30;
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(14);
        const textLines = pdf.splitTextToSize(segment.paragraph, contentWidth);
        const textBlockHeight = textLines.length * pdf.getLineHeight() * 0.8;
        
        if (currentY + textBlockHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        pdf.text(textLines, margin, currentY);
      }

      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`${safeTitle}_storybook.pdf`);

    } catch (e) {
      console.error("Error saving PDF:", e);
      setError('Failed to save the story as a PDF. An unexpected error occurred while generating the cover image or compiling the file.');
    } finally {
      setIsSavingPdf(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center font-sans bg-[#FFFBF0] text-slate-900 selection:bg-blue-100">
      
      <header className="w-full p-4 sticky top-0 z-10 flex justify-between items-center bg-[#FFFBF0]/80 backdrop-blur-md border-b border-yellow-200/80">
        <div className="text-left">
          <h1 className="text-2xl md:text-4xl font-black text-blue-500" style={{ textShadow: '2px 2px 0px rgba(255, 251, 235, 0.8), 3px 3px 0px rgba(37, 99, 235, 0.15)' }}>
            StorySpark
          </h1>
          <p className="hidden md:block mt-1 text-md text-blue-900/60">
            Ignite your imagination.
          </p>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative flex items-center">
            <LanguagesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none z-10" />
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="pl-10 pr-9 py-2.5 bg-blue-50/50 text-blue-800 font-semibold text-base rounded-full appearance-none focus:outline-none cursor-pointer hover:bg-blue-100/60 transition-colors"
                aria-label="Select story language"
            >
                {languages.map(lang => <option className="bg-white" key={lang} value={lang}>{lang}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
          </div>
          
          <AnimatePresence>
            {!isGenerating && segments.length > 0 && (
              <motion.div 
                className="flex items-center gap-1 sm:gap-2"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={handleRegenerate}
                  title="Regenerate Story"
                  className="flex items-center justify-center w-12 h-12 text-blue-600 hover:bg-blue-100/60 rounded-full transition-all duration-200 hover:scale-110 active:scale-100"
                >
                  <RefreshCwIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={handleSaveAsPdf}
                  disabled={isSavingPdf}
                  title="Save as PDF Book"
                  className="flex items-center justify-center w-12 h-12 text-blue-600 hover:bg-blue-100/60 rounded-full transition-all duration-200 hover:scale-110 active:scale-100"
                >
                  {isSavingPdf ? <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" /> : <DownloadIcon className="w-6 h-6" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Settings"
            className="flex items-center justify-center w-12 h-12 text-blue-600 hover:bg-blue-100/60 rounded-full transition-all duration-200 hover:scale-110 active:scale-100"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
      </header>
      
      <main className="w-full max-w-4xl flex-grow flex flex-col p-4 pt-8">
        <AnimatePresence>
          {isSettingsOpen && (
             <motion.div
                key="settings-panel"
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden mb-8"
             >
                <SettingsPanel
                    onSave={handleSaveSettings}
                    currentApiKey={userApiKey}
                    currentSettings={settings}
                />
            </motion.div>
          )}
        </AnimatePresence>

        {title && <h2 className="text-4xl sm:text-5xl font-black text-center mb-10 text-blue-900/90">{title}</h2>}
        
        {segments.length > 0 ? (
          <StoryDisplay segments={segments} />
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
             {!isGenerating && !error && (
               <>
                 <HeroIllustration className="w-64 h-64 md:w-80 md:h-80 text-yellow-400" />
                 <p className="mt-4 text-2xl text-slate-400">
                   Tell me what your story is about...
                 </p>
               </>
            )}
          </div>
        )}
        
        {error && <div className="text-red-700 text-center font-bold p-4 bg-red-100 rounded-lg max-w-2xl mx-auto border border-red-200">{error}</div>}
      </main>

      <footer className="w-full p-6 sticky bottom-0 bg-gradient-to-t from-[#FFFBF0] to-transparent">
        <StoryInput onGenerate={handleGenerate} isGenerating={isGenerating} />
      </footer>
    </div>
  );
}

export default App;