import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { StoryInput } from './components/StoryInput';
import { StoryDisplay } from './components/StoryDisplay';
import { generateStorySegment, generateImage, generateTTSAudio, generateCoverImage } from './services/geminiService';
import { StorySegment, Settings, SavedStory } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { DownloadIcon, LanguagesIcon, SettingsIcon, ChevronDownIcon, RefreshCwIcon, VideoIcon, BookText } from './components/icons';
import { HeroIllustration } from './components/HeroIllustration';
import { RatingSystem } from './components/RatingSystem';
import { VideoModal } from './components/VideoModal';
import { BackgroundManager } from './components/BackgroundManager';
import { StoryLibrary } from './components/StoryLibrary';
import { AudioController } from './components/AudioController';
import { useToast } from './components/ToastContext';

// VFX Integration System
import { VfxProvider, useVfx } from './vfx/VfxContext';
import { VfxScreenOverlays } from './components/vfx/VfxScreenOverlays';
import { VfxStyleInjector } from './components/vfx/VfxStyleInjector';
import { VfxQuickHud } from './components/vfx/VfxQuickHud';
import { VfxStudioPanel } from './components/vfx/VfxStudioPanel';
import { VfxGenre } from './vfx/types';

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
  pdfMargin: 50,
  targetAudience: 'children',
  
  // Audio Defaults
  audioProvider: 'gemini',
  audioModel: 'gemini-2.5-flash-preview-tts',
  voice: 'Kore',
  
  textProvider: 'gemini',
  textModel: 'gemini-2.5-flash',
  
  imageProvider: 'gemini',
  imageModel: 'gemini-2.5-flash-image',
};

// Helper to safely persist stories without exceeding browser storage quota
function stripBase64Media(storyList: SavedStory[]): SavedStory[] {
  return storyList.map(story => ({
    ...story,
    segments: story.segments.map(s => ({
      ...s,
      audioUrl: s.audioUrl?.startsWith('data:') ? undefined : s.audioUrl,
      imageUrl: s.imageUrl?.startsWith('data:') ? undefined : s.imageUrl,
    }))
  }));
}

function saveStoriesSafely(stories: SavedStory[]): boolean {
  try {
    localStorage.setItem('user-saved-stories', JSON.stringify(stories));
    return true;
  } catch (err) {
    console.warn("Storage quota exceeded, attempting to save trimmed story history...", err);
    try {
      const recentStories = stories.slice(-8);
      localStorage.setItem('user-saved-stories', JSON.stringify(recentStories));
      return true;
    } catch (err2) {
      try {
        const lightweightStories = stripBase64Media(stories.slice(-5));
        localStorage.setItem('user-saved-stories', JSON.stringify(lightweightStories));
        return true;
      } catch (err3) {
        console.error("Unable to save stories to localStorage due to strict quota limits.", err3);
        return false;
      }
    }
  }
}

function StoryCreatorContent() {
  const { vfx, setGenre, triggerScreenShake } = useVfx();
  const { showErrorToast, showWarningToast, showSuccessToast } = useToast();
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [title, setTitle] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSavingPdf, setIsSavingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('English');
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isVfxStudioOpen, setIsVfxStudioOpen] = useState<boolean>(false);
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
        if (parsedSettings.genre) {
          setGenre(parsedSettings.genre as VfxGenre);
        }
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, []);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const loadId = searchParams.get('load');
  const navigate = useNavigate();

  useEffect(() => {
    if (loadId) {
      const saved = localStorage.getItem('user-saved-stories');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const story = parsed.find((s: SavedStory) => s.id === loadId);
          if (story) {
            setSegments(story.segments);
            setTitle(story.title);
            setIsSettingsOpen(false);
          }
        } catch (e) {
          console.error("Failed to load story", e);
        }
      }
      navigate('/', { replace: true });
    }
  }, [loadId, navigate]);

  // Save story whenever segments update and we have a title
  useEffect(() => {
    if (segments.length > 0 && title && !isGenerating) {
      const saved = localStorage.getItem('user-saved-stories');
      let stories: SavedStory[] = [];
      if (saved) {
        try {
          stories = JSON.parse(saved);
        } catch (e) {}
      }
      
      const storyId = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const existingIndex = stories.findIndex(s => s.id === storyId);
      
      const newStory: SavedStory = {
        id: storyId,
        title,
        timestamp: Date.now(),
        segments
      };

      if (existingIndex >= 0) {
        stories[existingIndex] = { ...stories[existingIndex], segments, timestamp: Date.now() };
      } else {
        stories.push(newStory);
      }
      
      const success = saveStoriesSafely(stories);
      if (!success) {
        showWarningToast("Storage quota limit reached. Current story is active in memory but older library items were trimmed.", "Storage Notice");
      }
    }
  }, [segments, title, isGenerating]);

  const handleSaveSettings = (key: string | null, newSettings: Settings) => {
    const newKey = key?.trim() || null;
    if (newKey) {
      localStorage.setItem('user-gemini-api-key', newKey);
      setUserApiKey(newKey);
    } else {
      localStorage.removeItem('user-gemini-api-key');
      setUserApiKey(null);
    }
    localStorage.setItem('user-story-settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    if (newSettings.genre) {
      setGenre(newSettings.genre as VfxGenre);
    }
  };

  const getApiKeyForProvider = (provider: string) => {
    switch (provider) {
      case 'gemini': return userApiKey;
      case 'groq': return settings.groqApiKey;
      case 'openrouter': return settings.openRouterApiKey;
      case 'siliconflow': return settings.siliconFlowApiKey;
      case 'openai': return settings.openaiApiKey;
      case 'pollinations': return settings.pollinationsApiKey;
      case 'others': return settings.othersApiKey;
      default: return undefined;
    }
  };

  const getTargetLength = () => {
    switch (settings.storyLength) {
      case 'very_short': return 2;
      case 'short': return 3;
      case 'medium': return 5;
      case 'long': return 8;
      case 'very_long': return 12;
      default: return 5;
    }
  };

  const processSegmentMedia = async (segmentId: string, paragraph: string) => {
    try {
      setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, isLoadingImage: true, isLoadingAudio: settings.generateAudio } : s));
      
      const imageApiKey = getApiKeyForProvider(settings.imageProvider);
      const imageUrl = await generateImage(
        paragraph, 
        userApiKey, 
        settings.imageStyle, 
        settings.imageModel,
        settings.imageProvider,
        imageApiKey || undefined
      );
      
      setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, imageUrl, isLoadingImage: false } : s));
      
      if (settings.generateAudio) {
        const audioApiKey = getApiKeyForProvider(settings.audioProvider);
        const audioUrl = await generateTTSAudio(
          paragraph, 
          userApiKey, 
          settings.voice,
          settings.audioModel,
          settings.audioProvider,
          audioApiKey || undefined
        );
        setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, audioUrl, isLoadingAudio: false } : s));
      }
    } catch (e: any) {
      console.error(`Error processing media for segment ${segmentId}:`, e);
      showWarningToast("Media generation failed. Story text is available.", "Media Notice");
      setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, isLoadingImage: false, isLoadingAudio: false } : s));
    }
  };

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setIsSettingsOpen(false);
    setError(null);
    setSegments([]);
    setTitle('');
    setInitialPrompt(prompt);

    try {
      const textApiKey = getApiKeyForProvider(settings.textProvider);
      const targetLength = getTargetLength();
      const isLast = targetLength <= 1;
      
      const response = await generateStorySegment(
        prompt, 
        [],
        language, 
        userApiKey, 
        settings.genre, 
        settings.textModel,
        settings.textProvider,
        textApiKey || undefined,
        settings.targetAudience,
        isLast,
        true
      );
      
      if (response.title) {
        setTitle(response.title);
      }

      const newSegment: StorySegment = {
        id: crypto.randomUUID(),
        paragraph: response.paragraph,
        choices: response.choices,
      };
      
      setSegments([newSegment]);
      processSegmentMedia(newSegment.id, newSegment.paragraph);
      
    } catch (e) {
      console.error("Story generation failed:", e);
      const friendlyError = e instanceof Error ? e.message : 'An unknown error occurred during story generation.';
      const msg = `Error: ${friendlyError} Please check your API key and try again.`;
      setError(msg);
      showErrorToast(friendlyError, "Story Generation Failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async (choice: string) => {
    setIsGenerating(true);
    setError(null);
    
    // Set selected choice on the last segment
    setSegments(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1].selectedChoice = choice;
      }
      return updated;
    });

    try {
      const textApiKey = getApiKeyForProvider(settings.textProvider);
      const targetLength = getTargetLength();
      const currentLength = segments.length;
      const isLast = currentLength + 1 >= targetLength;
      const previousParagraphs = segments.map(s => s.paragraph);
      
      const response = await generateStorySegment(
        choice, 
        previousParagraphs,
        language, 
        userApiKey, 
        settings.genre, 
        settings.textModel,
        settings.textProvider,
        textApiKey || undefined,
        settings.targetAudience,
        isLast,
        false
      );

      const newSegment: StorySegment = {
        id: crypto.randomUUID(),
        paragraph: response.paragraph,
        choices: response.choices,
      };
      
      setSegments(prev => [...prev, newSegment]);
      processSegmentMedia(newSegment.id, newSegment.paragraph);
      
    } catch (e) {
      console.error("Story continuation failed:", e);
      const friendlyError = e instanceof Error ? e.message : 'An unknown error occurred during story generation.';
      const msg = `Error: ${friendlyError} Please check your API key and try again.`;
      setError(msg);
      showErrorToast(friendlyError, "Story Continuation Failed");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleRebranch = (segmentIndex: number) => {
    if (isGenerating) return;
    setSegments(prev => {
      const updated = prev.slice(0, segmentIndex + 1);
      if (updated.length > 0) {
        updated[updated.length - 1].selectedChoice = undefined;
      }
      return updated;
    });
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
      
      const imageApiKey = getApiKeyForProvider(settings.imageProvider);
      const coverUrl = await generateCoverImage(
        coverPrompt, 
        userApiKey, 
        settings.imageStyle, 
        settings.imageModel,
        settings.imageProvider,
        imageApiKey || undefined
      );

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.width = '794px';
      container.style.minHeight = '1122px';
      container.style.backgroundColor = '#FFFBF0'; 
      document.body.appendChild(container);

      const renderAndCapture = async (htmlContent: string) => {
          container.innerHTML = htmlContent;
          const images = Array.from(container.getElementsByTagName('img'));
          await Promise.all(images.map(img => new Promise(resolve => {
              if (img.complete) resolve(null);
              else { img.onload = resolve; img.onerror = resolve; }
          })));

          const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#FFFBF0' });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          return { imgData, imgHeight };
      };

      // --- Cover Page ---
      let coverHtml = `
        <div style="position: relative; height: 1122px; width: 794px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <img src="${coverUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%);"></div>
            <div style="position: relative; z-index: 10; padding: 40px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.2); border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); text-align: center; max-width: 80%;">
              <h1 style="font-family: 'Playfair Display', serif; font-size: 64px; color: #ffffff; line-height: 1.2; text-shadow: 0 4px 12px rgba(0,0,0,0.5); margin: 0;">${title}</h1>
            </div>
        </div>
      `;
      const cover = await renderAndCapture(coverHtml);
      doc.addImage(cover.imgData, 'JPEG', 0, 0, imgWidth, cover.imgHeight);

      // --- Story Pages ---
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        doc.addPage();
        
        let pageHtml = `
          <div style="padding: 60px; height: 1122px; width: 794px; box-sizing: border-box; display: flex; flex-direction: column; background: #0f172a; color: #f8fafc;">
              ${segment.imageUrl ? `<div style="text-align: center; margin-bottom: 40px;"><img src="${segment.imageUrl}" style="width: 100%; height: 450px; object-fit: cover; border-radius: 24px; box-shadow: 0 16px 32px rgba(0,0,0,0.4);" crossorigin="anonymous" /></div>` : ''}
              <p style="font-family: 'Playfair Display', serif; font-size: 28px; line-height: 1.8; color: #e2e8f0; text-align: justify; padding: 0 20px;">${segment.paragraph}</p>
              <div style="margin-top: auto; text-align: center; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; color: #64748b; font-weight: bold; letter-spacing: 1px;">- ${i + 1} -</div>
          </div>
        `;
        
        const page = await renderAndCapture(pageHtml);
        doc.addImage(page.imgData, 'JPEG', 0, 0, imgWidth, page.imgHeight);
      }

      // --- The End ---
      doc.addPage();
      let endHtml = `
        <div style="padding: 60px; text-align: center; height: 1122px; width: 794px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #0f172a;">
            <p style="font-family: 'Playfair Display', serif; font-style: italic; font-size: 48px; color: #94a3b8;">The End</p>
        </div>
      `;
      const endPage = await renderAndCapture(endHtml);
      doc.addImage(endPage.imgData, 'JPEG', 0, 0, imgWidth, endPage.imgHeight);

      document.body.removeChild(container);

      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeTitle}_storybook.pdf`);

    } catch (e) {
      console.error("Error saving PDF:", e);
      setError('Failed to save the story as a PDF. An unexpected error occurred while generating the file.');
    } finally {
      setIsSavingPdf(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center font-sans text-slate-100 selection:bg-purple-500/30"
      animate={{
        x: vfx.shakeTrigger > 0 ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
        y: vfx.shakeTrigger > 0 ? [0, 6, -6, 4, -4, 2, -2, 0] : 0,
      }}
      transition={{ duration: 0.4 }}
    >
      <VfxStyleInjector />
      <VfxScreenOverlays />
      <VfxQuickHud onOpenStudio={() => setIsVfxStudioOpen(true)} />
      <VfxStudioPanel isOpen={isVfxStudioOpen} onClose={() => setIsVfxStudioOpen(false)} />

      <BackgroundManager isGenerating={isGenerating} />
      
      <header className="w-full p-4 sticky top-0 z-10 flex flex-col gap-2 bg-white/5 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center w-full">
          <div className="text-left flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300">
                StorySpark
              </h1>
              <p className="hidden md:block mt-1 text-md text-purple-200/60">
                Ignite your imagination.
              </p>
            </div>
            <Link to="/library" className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-purple-200 transition-colors">
              <BookText className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">Library</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative flex items-center">
            <LanguagesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300 pointer-events-none z-10" />
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="pl-10 pr-9 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-base rounded-full appearance-none focus:outline-none cursor-pointer hover:bg-white/20 transition-colors shadow-inner"
                aria-label="Select story language"
            >
                {languages.map(lang => <option className="bg-slate-800 text-white" key={lang} value={lang}>{lang}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none" />
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
                  className="flex items-center justify-center w-12 h-12 text-purple-200 hover:bg-white/20 hover:text-white rounded-full transition-all duration-200 hover:scale-110 active:scale-100 bg-white/5 border border-white/10"
                >
                  <RefreshCwIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  title="Watch Story Video"
                  className="flex items-center justify-center w-12 h-12 text-purple-200 hover:bg-white/20 hover:text-white rounded-full transition-all duration-200 hover:scale-110 active:scale-100 bg-white/5 border border-white/10"
                >
                  <VideoIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={handleSaveAsPdf}
                  disabled={isSavingPdf}
                  title="Save as PDF Book"
                  className="flex items-center justify-center w-12 h-12 text-purple-200 hover:bg-white/20 hover:text-white rounded-full transition-all duration-200 hover:scale-110 active:scale-100 bg-white/5 border border-white/10"
                >
                  {isSavingPdf ? <div className="w-5 h-5 border-2 border-t-transparent border-purple-200 rounded-full animate-spin" /> : <DownloadIcon className="w-6 h-6" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Settings"
            className="flex items-center justify-center w-12 h-12 text-purple-200 hover:bg-white/20 hover:text-white rounded-full transition-all duration-200 hover:scale-110 active:scale-100 bg-white/5 border border-white/10"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
        </div>
        
        {/* Progress Bar */}
        {segments.length > 0 && (
          <div className="w-full max-w-4xl mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (segments.length / getTargetLength()) * 100)}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            />
          </div>
        )}
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

        {title && <h2 className="text-4xl sm:text-5xl font-black text-center mb-10 text-white/90 drop-shadow-md">{title}</h2>}
        
        {segments.length > 0 ? (
          <>
            <StoryDisplay 
              segments={segments} 
              onContinue={handleContinue}
              onRebranch={handleRebranch}
              isGenerating={isGenerating}
            />
            {!isGenerating && (!segments[segments.length - 1]?.choices || segments[segments.length - 1]?.choices?.length === 0) && (
              <RatingSystem onRate={(rating) => console.log(`User rated: ${rating}`)} />
            )}
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
             {!isGenerating && !error && (
               <>
                 <HeroIllustration className="w-64 h-64 md:w-80 md:h-80 text-purple-300/50" />
                 <p className="mt-4 text-2xl text-purple-200/60">
                   Tell me what your story is about...
                 </p>
               </>
            )}
          </div>
        )}
        
        {error && <div className="text-purple-200 text-center font-medium p-4 bg-slate-900/80 backdrop-blur-md rounded-xl max-w-2xl mx-auto border border-purple-500/30 shadow-[0_8px_32px_rgba(88,28,135,0.2)]">{error}</div>}
      </main>

      <AudioController segments={segments} />

      <footer className="w-full p-6 sticky bottom-0 bg-gradient-to-t from-slate-950 to-transparent">
        <StoryInput 
            onGenerate={handleGenerate} 
            isGenerating={isGenerating} 
            apiKey={userApiKey}
            settings={settings}
        />
      </footer>
      
      {isVideoModalOpen && (
        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          segments={segments}
          title={title}
          genre={settings.genre}
        />
      )}
    </motion.div>
  );
}

function StoryCreator() {
  return (
    <VfxProvider>
      <StoryCreatorContent />
    </VfxProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StoryCreator />} />
      <Route path="/library" element={<StoryLibrary />} />
    </Routes>
  );
}
