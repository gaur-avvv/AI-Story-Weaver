import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { StoryInput } from './components/StoryInput';
import { StoryDisplay } from './components/StoryDisplay';
import { generateStorySegment, generateNextChapter, generateImage, generateTTSAudio, generateCoverImage } from './services/geminiService';
import { StorySegment, Settings, SavedStory } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { DownloadIcon, LanguagesIcon, SettingsIcon, ChevronDownIcon, RefreshCwIcon, VideoIcon, BookText, EyeIcon, Maximize2Icon, Minimize2Icon, CrystalPrismIcon } from './components/icons';
import { HeroIllustration } from './components/HeroIllustration';
import { RatingSystem } from './components/RatingSystem';
import { VideoModal } from './components/VideoModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { ChapterOutlineDrawer } from './components/ChapterOutlineDrawer';
import { BackgroundManager } from './components/BackgroundManager';
import { StoryLibrary } from './components/StoryLibrary';
import { AudioController } from './components/AudioController';
import { useToast } from './components/ToastContext';
import { Workflow, Bot, Printer, BookOpen, Sparkles, Mic } from 'lucide-react';
import { extractChapters, setChapterAtSegment, removeChapterAtSegment, getChapterStats } from './utils/chapterUtils';
import { AuthCallback } from './components/AuthCallback';
import { VoicePromptModal } from './components/VoicePromptModal';
import { getRandomStarters, getRandomSingleStarter, StoryStarter } from './utils/storyStarters';
import { Shuffle, Dices, Layers } from 'lucide-react';
import { saveStoriesSafelyWithQuotaProtection, compressAndCleanLocalStorage } from './utils/storageManager';
import { generatePdfWithWorker, downloadBlobAsFile } from './utils/pdfGenerator';
import { globalStoryGraph } from './services/storyGraphState';
import { extractTriplesHeuristic } from './services/graphExtractor';
import { useStoryGraphAutoUpdate } from './hooks/useStoryGraphAutoUpdate';

// VFX Integration System
import { VfxProvider, useVfx } from './vfx/VfxContext';
import { VfxScreenOverlays } from './components/vfx/VfxScreenOverlays';
import { VfxStyleInjector } from './components/vfx/VfxStyleInjector';
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
  fontFamilyPreference: 'serif',
  
  // Audio Defaults
  audioProvider: 'gemini',
  audioModel: 'gemini-2.5-flash-preview-tts',
  voice: 'Kore',
  
  textProvider: 'gemini',
  textModel: 'gemini-2.5-flash',
  
  imageProvider: 'gemini',
  imageModel: 'gemini-2.5-flash-image',
};

function saveStoriesSafely(stories: SavedStory[]): boolean {
  return saveStoriesSafelyWithQuotaProtection(stories).success;
}

function StoryCreatorContent() {
  const { vfx, setGenre, triggerScreenShake, processParagraphForVfx } = useVfx();
  const { showErrorToast, showWarningToast, showSuccessToast } = useToast();
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [title, setTitle] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSavingPdf, setIsSavingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('English');
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState<boolean>(false);
  const [isChapterDrawerOpen, setIsChapterDrawerOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [externalPrompt, setExternalPrompt] = useState<string>('');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Auto-update knowledge graph on chapter / segment generation or regeneration
  useStoryGraphAutoUpdate(segments, isGenerating);

  const ingestParagraphIntoGraph = (paragraphText: string, segmentIndex: number) => {
    try {
      const triples = extractTriplesHeuristic(paragraphText);
      globalStoryGraph.ingestParagraphData(triples, paragraphText, segmentIndex);
    } catch (e) {
      console.warn('Graph ingestion failed:', e);
    }
  };
  const [activeAudioSegmentIndex, setActiveAudioSegmentIndex] = useState<number>(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioProgressRatio, setAudioProgressRatio] = useState<number>(0);
  const [seekAudioRequest, setSeekAudioRequest] = useState<{ segmentIndex: number; progressRatio: number; timestamp: number } | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [activeStarters, setActiveStarters] = useState<StoryStarter[]>(() => getRandomStarters(5));
  
  const languages = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Chinese (Simplified)'];

  const handleShuffleStarters = () => {
    setActiveStarters(getRandomStarters(5));
  };

  const handleSurpriseMe = () => {
    const random = getRandomSingleStarter();
    handleGenerate(random.label, {
      genre: random.genre,
      targetAudience: random.audience,
      storyLength: 'short',
    });
  };

  const handleAudioProgressUpdate = (_currentTime: number, _duration: number, progressRatio: number) => {
    setAudioProgressRatio(progressRatio);
  };

  const handleSeekAudioRatio = (segmentIndex: number, ratio: number) => {
    setSeekAudioRequest({
      segmentIndex,
      progressRatio: ratio,
      timestamp: Date.now(),
    });
  };

  // Background sentiment & VFX updater: reacts to the active or latest story segment paragraph
  const activeIdx = (typeof activeAudioSegmentIndex === 'number' && activeAudioSegmentIndex >= 0 && activeAudioSegmentIndex < segments.length)
    ? activeAudioSegmentIndex
    : segments.length - 1;
  const currentParagraph = segments[activeIdx]?.paragraph || '';

  useEffect(() => {
    if (currentParagraph) {
      processParagraphForVfx(currentParagraph);
    }
  }, [currentParagraph, processParagraphForVfx]);

  // Global key listener to cleanly close modals or trigger voice input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isVoiceModalOpen) setIsVoiceModalOpen(false);
        else if (isFocusMode) setIsFocusMode(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isChapterDrawerOpen) setIsChapterDrawerOpen(false);
        else if (isIntegrationsOpen) setIsIntegrationsOpen(false);
        else if (isVideoModalOpen) setIsVideoModalOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsVoiceModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, isSettingsOpen, isChapterDrawerOpen, isIntegrationsOpen, isVideoModalOpen, isVoiceModalOpen]);

  // Global listener for OAuth callbacks (Google & GitHub)
  useEffect(() => {
    const processOAuthPayload = (data: any) => {
      if (data?.type === 'OAUTH_AUTH_SUCCESS' || data?.type === 'OAUTH_SUCCESS') {
        if (data?.provider === 'github') {
          const user = data?.username || localStorage.getItem('storyspark_github_username') || 'GitHub User';
          showSuccessToast(`Successfully connected GitHub account as @${user}!`);
        } else if (data?.provider === 'youtube') {
          const user = data?.username || localStorage.getItem('storyspark_youtube_user') || 'YouTube Channel';
          showSuccessToast(`Successfully connected YouTube channel (${user})!`);
        } else if (data?.provider === 'google') {
          const user = data?.username || localStorage.getItem('storyspark_google_user') || 'Google Account';
          showSuccessToast(`Successfully connected Google Workspace (${user})!`);
        }
      }
    };

    const handleAuthMessage = (event: MessageEvent) => {
      processOAuthPayload(event.data);
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'storyspark_oauth_event' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          processOAuthPayload(parsed);
        } catch (e) {}
      }
    };

    window.addEventListener('message', handleAuthMessage);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  useEffect(() => {
    // Proactively clean LocalStorage quota on boot
    compressAndCleanLocalStorage();

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
  const segmentsFingerprint = segments.map(s => `${s.id}:${s.paragraph.length}:${s.imageUrl ? 1 : 0}:${s.audioUrl ? 1 : 0}`).join('|');
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
      
      const success = saveStoriesSafelyWithQuotaProtection(stories);
      if (!success) {
        showWarningToast("Storage quota limit reached. Current story is active in memory but older library items were trimmed.", "Storage Notice");
      }
    }
  }, [segmentsFingerprint, title, isGenerating]);

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
      case 'zai': return settings.zaiApiKey;
      case 'cerebras': return settings.cerebrasApiKey;
      case 'mistral': return settings.mistralApiKey;
      case 'cohere': return settings.cohereApiKey;
      case 'nvidia': return settings.nvidiaApiKey;
      case 'requesty': return settings.requestyApiKey;
      case 'huggingface': return settings.huggingfaceApiKey;
      case 'cloudflare': return settings.cloudflareApiKey;
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
        imageApiKey || undefined,
        {
          customBaseUrl: settings.customBaseUrl,
          cloudflareAccountId: settings.cloudflareAccountId,
        }
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

  const handleGenerate = async (prompt: string, overrides?: Partial<Settings>) => {
    setIsGenerating(true);
    setIsSettingsOpen(false);
    setError(null);
    setSegments([]);
    setTitle('');
    setInitialPrompt(prompt);

    const activeSettings: Settings = overrides ? { ...settings, ...overrides } : settings;
    if (overrides) {
      setSettings(activeSettings);
      localStorage.setItem('user-story-settings', JSON.stringify(activeSettings));
      if (activeSettings.genre) {
        setGenre(activeSettings.genre as VfxGenre);
      }
    }

    try {
      const textApiKey = getApiKeyForProvider(activeSettings.textProvider);
      const targetLength = activeSettings.storyLength === 'very_short' ? 2 
        : activeSettings.storyLength === 'short' ? 3 
        : activeSettings.storyLength === 'medium' ? 5 
        : activeSettings.storyLength === 'long' ? 8 : 12;
      const isLast = targetLength <= 1;
      
      const graphContext = globalStoryGraph.getLoreContextForPrompt();
      const response = await generateStorySegment(
        prompt, 
        [],
        language, 
        userApiKey, 
        activeSettings.genre, 
        activeSettings.textModel,
        activeSettings.textProvider,
        textApiKey || undefined,
        activeSettings.targetAudience,
        isLast,
        true,
        graphContext,
        {
          customBaseUrl: activeSettings.customBaseUrl,
          cloudflareAccountId: activeSettings.cloudflareAccountId,
        }
      );
      
      if (response.title) {
        setTitle(response.title);
      }

      const newSegment: StorySegment = {
        id: crypto.randomUUID(),
        paragraph: response.paragraph,
        choices: response.choices,
        chapterTitle: 'Chapter 1: The Beginning',
        chapterNumber: 1,
      };
      
      setSegments([newSegment]);
      ingestParagraphIntoGraph(newSegment.paragraph, 0);
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

  const handleUpdateChapterTitle = (segmentIndex: number, newTitle: string) => {
    setSegments(prev => setChapterAtSegment(prev, segmentIndex, newTitle));
  };

  const handleRemoveChapter = (segmentIndex: number) => {
    setSegments(prev => removeChapterAtSegment(prev, segmentIndex));
  };

  const handleAddChapterAt = (segmentIndex: number) => {
    const currentChapters = extractChapters(segments);
    const nextNum = currentChapters.length + 1;
    setSegments(prev => setChapterAtSegment(prev, segmentIndex, `Chapter ${nextNum}: New Horizons`));
    showSuccessToast(`Created Chapter ${nextNum} at scene #${segmentIndex + 1}!`);
  };

  const handleJumpToSegment = (segmentIndex: number) => {
    const el = document.getElementById(`chapter-section-${segmentIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      
      const graphContext = globalStoryGraph.getLoreContextForPrompt();
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
        false,
        graphContext,
        {
          customBaseUrl: settings.customBaseUrl,
          cloudflareAccountId: settings.cloudflareAccountId,
        }
      );

      const newSegment: StorySegment = {
        id: crypto.randomUUID(),
        paragraph: response.paragraph,
        choices: response.choices,
      };
      
      setSegments(prev => [...prev, newSegment]);
      ingestParagraphIntoGraph(newSegment.paragraph, currentLength);
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

  const handleGenerateNextChapter = async () => {
    if (isGenerating || segments.length === 0) return;
    setIsGenerating(true);
    setError(null);

    const currentChapters = extractChapters(segments);
    const nextChapterNumber = currentChapters.length + 1;
    const previousParagraphs = segments.map(s => s.paragraph);

    try {
      showSuccessToast(`Weaving Chapter ${nextChapterNumber} matching ${settings.storyLength} size...`);
      const textApiKey = getApiKeyForProvider(settings.textProvider);
      
      const graphContext = globalStoryGraph.getLoreContextForPrompt();
      const response = await generateNextChapter(
        previousParagraphs,
        title || 'My Epic Story',
        nextChapterNumber,
        language,
        userApiKey,
        settings.genre,
        settings.storyLength,
        settings.textModel,
        settings.textProvider,
        textApiKey || undefined,
        settings.targetAudience,
        graphContext,
        {
          customBaseUrl: settings.customBaseUrl,
          cloudflareAccountId: settings.cloudflareAccountId,
        }
      );

      const chapterTitle = response.chapterTitle || `Chapter ${nextChapterNumber}: The Journey Continues`;
      const paragraphs = Array.isArray(response.paragraphs) && response.paragraphs.length > 0 
        ? response.paragraphs 
        : ["The story presses forward into uncharted territory with new mysteries ahead."];

      // Convert paragraphs into story segments
      const currentCount = segments.length;
      const newSegments: StorySegment[] = paragraphs.map((para, idx) => {
        ingestParagraphIntoGraph(para, currentCount + idx);
        return {
          id: crypto.randomUUID(),
          paragraph: para,
          // The first segment of the chapter gets the chapter title/number
          ...(idx === 0 ? { chapterTitle, chapterNumber: nextChapterNumber } : {}),
          // The final segment gets the choices
          ...(idx === paragraphs.length - 1 ? { choices: response.choices } : {})
        };
      });

      // Mark the previous last segment's choice as advancing
      setSegments(prev => {
        const updated = [...prev];
        if (updated.length > 0 && !updated[updated.length - 1].selectedChoice) {
          updated[updated.length - 1].selectedChoice = `Begin ${chapterTitle}`;
        }
        return [...updated, ...newSegments];
      });

      // Kick off image & audio generation for all new chapter scenes
      for (const seg of newSegments) {
        processSegmentMedia(seg.id, seg.paragraph);
      }

      showSuccessToast(`Chapter ${nextChapterNumber} woven successfully!`);

    } catch (e: any) {
      console.error("Next chapter generation failed:", e);
      const friendlyError = e instanceof Error ? e.message : 'An unknown error occurred while generating the next chapter.';
      setError(`Error: ${friendlyError}`);
      showErrorToast(friendlyError, "Chapter Generation Failed");
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
      showSuccessToast('Generating PDF Storybook using background Web Worker...');

      const pdfBlob = await generatePdfWithWorker({
        title,
        genre: settings.genre || 'Story',
        audience: settings.targetAudience || 'General',
        segments,
        pdfMargin: settings.pdfMargin || 20,
        pdfTheme: 'classic_ivory',
        onProgress: (progress, message) => {
          if (progress === 100) {
            showSuccessToast('PDF Storybook generated successfully!');
          }
        }
      });

      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      downloadBlobAsFile(pdfBlob, `${sanitizedTitle}.pdf`);

      showSuccessToast('PDF Storybook exported successfully!');

    } catch (e) {
      console.error("Error saving PDF:", e);
      showErrorToast('Failed to save the story as a PDF. Please try again.');
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
      <div className="no-print">
        <VfxStyleInjector />
        <VfxScreenOverlays />
        <BackgroundManager isGenerating={isGenerating} />
      </div>

      {/* Floating Exit Focus Mode control when in Focus Mode */}
      <AnimatePresence>
        {isFocusMode && (
          <motion.button
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            onClick={() => setIsFocusMode(false)}
            className="no-print fixed top-6 right-6 z-50 px-4 py-2 bg-slate-900/90 hover:bg-purple-600 text-white font-semibold text-xs rounded-full border border-purple-400/40 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-2 group transition-all"
            title="Press Esc or click to exit Focus Mode"
          >
            <Minimize2Icon className="w-4 h-4 text-purple-300 group-hover:text-white" />
            <span>Exit Focus Mode</span>
            <kbd className="hidden sm:inline bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-purple-200 font-mono">Esc</kbd>
          </motion.button>
        )}
      </AnimatePresence>
      
      {!isFocusMode && (
        <header className="no-print w-full px-4 sm:px-6 py-3 sticky top-0 z-20 flex flex-col gap-2 bg-slate-950/75 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-center w-full max-w-6xl mx-auto">
            <div className="text-left flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-900/80 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/30">
                  <CrystalPrismIcon className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-200 to-indigo-200 leading-none">
                    Novellaio
                  </h1>
                  <p className="hidden md:block text-[11px] font-medium text-purple-200/50 mt-0.5">
                    AI Interactive Story Studio
                  </p>
                </div>
              </div>
              <Link 
                to="/library" 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-purple-200 text-xs font-semibold transition-all duration-200 ml-2"
                title="Open Saved Stories Library"
              >
                <BookText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Library</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="relative flex items-center">
                <LanguagesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none z-10" />
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="pl-8 pr-7 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs rounded-full appearance-none focus:outline-none cursor-pointer transition-colors shadow-inner"
                    aria-label="Select story language"
                >
                    {languages.map(lang => <option className="bg-slate-900 text-white" key={lang} value={lang}>{lang}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-300 pointer-events-none" />
              </div>
              
              <AnimatePresence>
                {!isGenerating && segments.length > 0 && (
                  <motion.div 
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={handleRegenerate}
                      title="Regenerate Story"
                      className="flex items-center justify-center w-9 h-9 text-purple-200 hover:bg-purple-600/30 hover:text-white rounded-full transition-all duration-200 active:scale-95 bg-white/5 border border-white/10"
                    >
                      <RefreshCwIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsVideoModalOpen(true)}
                      title="Story Video Reel Studio"
                      className="flex items-center justify-center w-9 h-9 text-purple-200 hover:bg-purple-600/30 hover:text-white rounded-full transition-all duration-200 active:scale-95 bg-white/5 border border-white/10"
                    >
                      <VideoIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSaveAsPdf}
                      disabled={isSavingPdf}
                      title="Export PDF Storybook"
                      className="flex items-center justify-center w-9 h-9 text-purple-200 hover:bg-purple-600/30 hover:text-white rounded-full transition-all duration-200 active:scale-95 bg-white/5 border border-white/10"
                    >
                      {isSavingPdf ? <div className="w-4 h-4 border-2 border-t-transparent border-purple-200 rounded-full animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => window.print()}
                      title="Print Storybook"
                      className="flex items-center justify-center w-9 h-9 text-purple-200 hover:bg-purple-600/30 hover:text-white rounded-full transition-all duration-200 active:scale-95 bg-white/5 border border-white/10"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chapter Management & TOC Button */}
              {segments.length > 0 && (
                <button
                  onClick={() => setIsChapterDrawerOpen(true)}
                  title="Chapter Outline & Table of Contents"
                  className="flex items-center justify-center gap-1.5 px-3 h-9 text-purple-200 hover:bg-purple-600/30 hover:text-white hover:border-purple-400/40 rounded-full transition-all duration-200 bg-white/5 border border-white/10 text-xs font-semibold shadow-sm"
                >
                  <BookOpen className="w-4 h-4 text-purple-300" />
                  <span className="hidden md:inline">
                    Chapters ({extractChapters(segments).length})
                  </span>
                </button>
              )}



              {/* Integrations & Agents Hub Button */}
              <button
                onClick={() => setIsIntegrationsOpen(true)}
                title="Integrations, OAuth, MCP & ADK Agents Studio"
                className="flex items-center justify-center gap-1.5 px-3 h-9 text-purple-200 hover:bg-purple-600/30 hover:text-white hover:border-purple-400/40 rounded-full transition-all duration-200 bg-white/5 border border-white/10 text-xs font-semibold shadow-sm"
              >
                <Workflow className="w-4 h-4 text-purple-300" />
                <span className="hidden md:inline">Agents & MCP</span>
              </button>

              {/* Focus Mode Header Toggle */}
              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                title={isFocusMode ? "Exit Focus Mode" : "Focus Mode (Distraction-Free Reading)"}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 active:scale-95 border ${
                  isFocusMode 
                    ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]' 
                    : 'text-purple-200 hover:bg-white/15 hover:text-white bg-white/5 border-white/10'
                }`}
              >
                <EyeIcon className="w-4 h-4" />
              </button>

              {/* Settings Button with active state styling */}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                title={isSettingsOpen ? "Close Settings" : "Open Settings"}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 active:scale-95 border ${
                  isSettingsOpen 
                    ? 'bg-purple-600/80 text-white border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.4)]' 
                    : 'text-purple-200 hover:bg-white/15 hover:text-white bg-white/5 border-white/10'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {segments.length > 0 && (
            <div className="w-full max-w-4xl mx-auto h-1 bg-white/10 rounded-full overflow-hidden mt-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (segments.length / getTargetLength()) * 100)}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              />
            </div>
          )}
        </header>
      )}
      
      <main className={`w-full max-w-4xl flex-grow flex flex-col p-4 transition-all duration-500 ${isFocusMode ? 'pt-12 sm:pt-16 pb-16' : 'pt-6'}`}>
        <AnimatePresence>
          {!isFocusMode && isSettingsOpen && (
             <motion.div
                key="settings-panel"
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="no-print overflow-hidden mb-8"
             >
                <SettingsPanel
                    onSave={handleSaveSettings}
                    currentApiKey={userApiKey}
                    currentSettings={settings}
                />
            </motion.div>
          )}
        </AnimatePresence>

        {title && <h2 className={`font-black text-center text-white/90 drop-shadow-md transition-all duration-500 ${isFocusMode ? 'text-5xl sm:text-6xl mb-12 tracking-wide font-display' : 'text-3xl sm:text-4xl mb-8 font-display'}`}>{title}</h2>}
        
        {segments.length > 0 ? (
          <>
            <StoryDisplay 
              segments={segments} 
              onContinue={handleContinue}
              onRebranch={handleRebranch}
              onGenerateNextChapter={handleGenerateNextChapter}
              storyLength={settings.storyLength}
              isGenerating={isGenerating}
              fontFamilyPreference={settings.fontFamilyPreference}
              activeAudioSegmentIndex={activeAudioSegmentIndex}
              isAudioPlaying={isAudioPlaying}
              audioProgress={audioProgressRatio}
              onSeekAudioRatio={handleSeekAudioRatio}
              onUpdateChapterTitle={handleUpdateChapterTitle}
              onRemoveChapter={handleRemoveChapter}
              onAddChapterAt={handleAddChapterAt}
              storyTitle={title || 'Novella Story'}
              genre={settings.genre}
              targetAudience={settings.targetAudience}
              apiKey={userApiKey}
              textProvider={settings.textProvider}
              textModel={settings.textModel}
              otherApiKey={getApiKeyForProvider(settings.textProvider)}
              options={{
                customBaseUrl: settings.customBaseUrl,
                cloudflareAccountId: settings.cloudflareAccountId,
              }}
            />
            {!isFocusMode && !isGenerating && (!segments[segments.length - 1]?.choices || segments[segments.length - 1]?.choices?.length === 0) && (
              <div className="no-print">
                <RatingSystem onRate={(rating) => console.log(`User rated: ${rating}`)} />
              </div>
            )}
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-8 max-w-2xl mx-auto">
             {!isGenerating && !error && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                 className="flex flex-col items-center"
               >
                 <HeroIllustration className="w-48 h-48 sm:w-60 sm:h-60 text-purple-300/60 mb-4" />
                 <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-300">
                   What story shall we weave today?
                 </h2>
                 <p className="mt-2 text-sm sm:text-base text-purple-200/60 max-w-md">
                   Type your own story premise below, or tap one of the story starters to begin instantly.
                 </p>

                 {/* Dynamic Story Starters with Random Genres, Audiences & Short Length */}
                 <div className="flex flex-col items-center gap-3 mt-6 max-w-2xl w-full">
                   <div className="flex flex-wrap justify-center items-center gap-2">
                     {activeStarters.map((starter, i) => (
                       <button
                         key={`${starter.label}-${i}`}
                         onClick={() => handleGenerate(starter.label, {
                           genre: starter.genre,
                           targetAudience: starter.audience,
                           storyLength: 'short',
                         })}
                         className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-purple-600/30 hover:border-purple-400/50 text-purple-200 hover:text-white border border-white/10 text-xs font-medium backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                         title={`Start Short Story: ${starter.genre.replace('_', ' ').toUpperCase()} • ${starter.audience.toUpperCase()} audience`}
                       >
                         <span className="font-semibold text-white/90">{starter.label}</span>
                         <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/20 group-hover:bg-purple-500/40 group-hover:text-white transition-colors">
                           {starter.genre.replace('_', ' ')} • {starter.audience}
                         </span>
                       </button>
                     ))}
                   </div>

                   {/* Quick Shuffle & Surprise Me Controls */}
                   <div className="flex items-center justify-center gap-2.5 mt-1">
                     <button
                       type="button"
                       onClick={handleShuffleStarters}
                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-purple-300 hover:text-white border border-white/10 text-xs font-semibold transition-all duration-200 active:scale-95"
                       title="Shuffle fresh random topics with random genres and audiences"
                     >
                       <Shuffle className="w-3.5 h-3.5" />
                       <span>Shuffle Topics</span>
                     </button>

                     <button
                       type="button"
                       onClick={handleSurpriseMe}
                       className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600/70 to-indigo-600/70 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/40 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                       title="Instantly generate a completely random short story"
                     >
                       <Dices className="w-3.5 h-3.5 text-purple-200" />
                       <span>Surprise Me (Short)</span>
                     </button>
                   </div>
                 </div>
               </motion.div>
            )}
          </div>
        )}
        
        {error && <div className="text-purple-200 text-center font-medium p-4 bg-slate-900/80 backdrop-blur-md rounded-xl max-w-2xl mx-auto border border-purple-500/30 shadow-[0_8px_32px_rgba(88,28,135,0.2)]">{error}</div>}
      </main>

      {!isFocusMode && (
        <div className="no-print">
          <AudioController 
            segments={segments} 
            activeSegmentIndex={activeAudioSegmentIndex}
            onActiveSegmentChange={setActiveAudioSegmentIndex}
            onPlayStateChange={setIsAudioPlaying}
            onAudioProgressUpdate={handleAudioProgressUpdate}
            seekAudioRequest={seekAudioRequest}
          />
        </div>
      )}

      {!isFocusMode && (
        <footer className="no-print w-full p-6 sticky bottom-0 bg-gradient-to-t from-slate-950 to-transparent">
          <StoryInput 
              onGenerate={handleGenerate} 
              isGenerating={isGenerating} 
              apiKey={userApiKey}
              settings={settings}
              externalPrompt={externalPrompt}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          />
        </footer>
      )}
      
      <VoicePromptModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onWeaveStory={(spokenPrompt) => {
          setExternalPrompt(spokenPrompt);
          handleGenerate(spokenPrompt);
        }}
        onSetPrompt={(spokenPrompt) => {
          setExternalPrompt(spokenPrompt);
          showSuccessToast('Spoken voice prompt inserted into story input!');
        }}
        currentLanguage={language}
        isGenerating={isGenerating}
      />

      {isVideoModalOpen && (
        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          segments={segments}
          title={title}
          genre={settings.genre}
        />
      )}

      {isIntegrationsOpen && (
        <IntegrationsModal
          isOpen={isIntegrationsOpen}
          onClose={() => setIsIntegrationsOpen(false)}
          segments={segments}
          title={title}
          settings={settings}
          onUpdateSegments={setSegments}
          onOpenVideoModal={() => setIsVideoModalOpen(true)}
        />
      )}

      <ChapterOutlineDrawer
        isOpen={isChapterDrawerOpen}
        onClose={() => setIsChapterDrawerOpen(false)}
        segments={segments}
        storyTitle={title || 'Untitled Story'}
        genre={settings.genre}
        onUpdateSegments={setSegments}
        onJumpToSegment={handleJumpToSegment}
      />
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
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  );
}
