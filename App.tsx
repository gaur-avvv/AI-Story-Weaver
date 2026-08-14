import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { StoryInput } from './components/StoryInput';
import { StoryDisplay } from './components/StoryDisplay';
import { generateStorySegment, generateNextChapter, generateImage, generateTTSAudio, generateCoverImage } from './services/geminiService';
import { StorySegment, Settings, SavedStory } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { DownloadIcon, LanguagesIcon, SettingsIcon, ChevronDownIcon, RefreshCwIcon, VideoIcon, BookText, EyeIcon, Maximize2Icon, Minimize2Icon } from './components/icons';
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

  // Background sentiment & VFX updater: reacts to the active or latest story segment
  useEffect(() => {
    if (segments.length > 0) {
      const activeIndex = (typeof activeAudioSegmentIndex === 'number' && activeAudioSegmentIndex >= 0 && activeAudioSegmentIndex < segments.length)
        ? activeAudioSegmentIndex
        : segments.length - 1;
      const currentSegment = segments[activeIndex] || segments[segments.length - 1];
      if (currentSegment?.paragraph) {
        processParagraphForVfx(currentSegment.paragraph);
      }
    }
  }, [segments, activeAudioSegmentIndex, processParagraphForVfx]);

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

  // Handle Escape key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

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
        undefined,
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
      const newSegments: StorySegment[] = paragraphs.map((para, idx) => ({
        id: crypto.randomUUID(),
        paragraph: para,
        // The first segment of the chapter gets the chapter title/number
        ...(idx === 0 ? { chapterTitle, chapterNumber: nextChapterNumber } : {}),
        // The final segment gets the choices
        ...(idx === paragraphs.length - 1 ? { choices: response.choices } : {})
      }));

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

    let container: HTMLDivElement | null = null;

    try {
      showSuccessToast('Preparing high-quality PDF Storybook...');

      const coverPrompt = `A stunning, beautiful book cover illustration for a children's story titled "${title}". The story is about: ${initialPrompt}. The style should be ${settings.imageStyle}, vibrant, detailed, digital painting.`;
      
      const imageApiKey = getApiKeyForProvider(settings.imageProvider);
      let coverUrl = '';
      try {
        coverUrl = await generateCoverImage(
          coverPrompt, 
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
      } catch (err) {
        console.warn("Cover image generation fallback:", err);
        coverUrl = segments[0]?.imageUrl || '';
      }

      // Helper to process and scale/crop images to precise target dimensions with 0% distortion
      const processImageForPdfCanvas = async (
        rawUrl: string,
        targetWidth: number,
        targetHeight: number,
        fit: 'cover' | 'contain' = 'cover',
        backgroundColor: string = '#0f172a'
      ): Promise<string> => {
        if (!rawUrl) return '';
        
        let srcUrl = rawUrl;
        if (!rawUrl.startsWith('data:')) {
          try {
            const res = await fetch(rawUrl, { mode: 'cors' });
            if (res.ok) {
              const blob = await res.blob();
              srcUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string) || rawUrl);
                reader.onerror = () => resolve(rawUrl);
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            srcUrl = rawUrl;
          }
        }

        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const scaleFactor = 2; // 2x density for ultra-crisp print rendering
              canvas.width = Math.round(targetWidth * scaleFactor);
              canvas.height = Math.round(targetHeight * scaleFactor);
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(srcUrl);
                return;
              }

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              // Fill canvas background
              ctx.fillStyle = backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              const nw = img.naturalWidth || img.width || targetWidth;
              const nh = img.naturalHeight || img.height || targetHeight;

              let drawW: number;
              let drawH: number;
              let drawX: number;
              let drawY: number;

              if (fit === 'cover') {
                const scale = Math.max(canvas.width / nw, canvas.height / nh);
                drawW = nw * scale;
                drawH = nh * scale;
                drawX = (canvas.width - drawW) / 2;
                drawY = (canvas.height - drawH) / 2;
              } else {
                const scale = Math.min(canvas.width / nw, canvas.height / nh);
                drawW = nw * scale;
                drawH = nh * scale;
                drawX = (canvas.width - drawW) / 2;
                drawY = (canvas.height - drawH) / 2;
              }

              ctx.drawImage(img, drawX, drawY, drawW, drawH);
              resolve(canvas.toDataURL('image/jpeg', 0.92));
            } catch (err) {
              console.warn('Canvas image processing fallback:', err);
              resolve(srcUrl);
            }
          };
          img.onerror = () => resolve(srcUrl);
          img.src = srcUrl;
        });
      };

      const coverDataUrl = coverUrl ? await processImageForPdfCanvas(coverUrl, 794, 1122, 'cover') : '';

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      // Safely resolve jsPDF class
      let JsPDFClass: any;
      try {
        const jspdfModule = await import('jspdf');
        JsPDFClass = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default;
      } catch {
        JsPDFClass = window.jspdf?.jsPDF || (window as any).jspdf;
      }

      if (!JsPDFClass) {
        throw new Error("Unable to load PDF generation library.");
      }

      const doc = new JsPDFClass({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Update jsPDF Document Properties and Metadata
      const pdfMetadata = {
        title: title,
        author: 'AI Storyteller',
        subject: `Interactive Illustrated Story: ${title}`,
        keywords: `ai storyteller, illustrated book, ${settings.genre}, ${settings.imageStyle}`,
        creator: 'AI Storyteller Studio',
        creationDate: new Date(),
      };

      if (typeof doc.setDocumentProperties === 'function') {
        doc.setDocumentProperties(pdfMetadata);
      }
      if (typeof doc.setProperties === 'function') {
        doc.setProperties(pdfMetadata);
      }

      const imgWidth = 210;
      
      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '794px';
      container.style.minHeight = '1122px';
      container.style.backgroundColor = '#0f172a'; 
      document.body.appendChild(container);

      // High-quality canvas scaling & JPEG blob compression helper
      const compressCanvasToBlobDataUrl = async (
        sourceCanvas: HTMLCanvasElement, 
        maxWidth: number = 1588, // 2x A4 pixel density for crisp retina printing
        quality: number = 0.88
      ): Promise<string> => {
        let targetCanvas = sourceCanvas;
        if (sourceCanvas.width > maxWidth) {
          const scale = maxWidth / sourceCanvas.width;
          const offscreen = document.createElement('canvas');
          offscreen.width = maxWidth;
          offscreen.height = Math.round(sourceCanvas.height * scale);
          const ctx = offscreen.getContext('2d', { alpha: false });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sourceCanvas, 0, 0, offscreen.width, offscreen.height);
            targetCanvas = offscreen;
          }
        }

        // Convert to high-quality compressed JPEG Blob using native HTML5 Canvas Blob compression
        return new Promise((resolve) => {
          if (targetCanvas.toBlob) {
            targetCanvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(targetCanvas.toDataURL('image/jpeg', quality));
                  return;
                }
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(targetCanvas.toDataURL('image/jpeg', quality));
                reader.readAsDataURL(blob);
              },
              'image/jpeg',
              quality
            );
          } else {
            resolve(targetCanvas.toDataURL('image/jpeg', quality));
          }
        });
      };

      const renderAndCapture = async (htmlContent: string) => {
        if (!container) throw new Error("No container element");
        container.innerHTML = htmlContent;
        const images = Array.from(container.getElementsByTagName('img'));
        await Promise.all(images.map(img => new Promise(resolve => {
            if (img.complete) resolve(null);
            else { img.onload = resolve; img.onerror = resolve; }
        })));

        const canvas = await html2canvas(container, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#0f172a',
          logging: false,
        });

        const imgData = await compressCanvasToBlobDataUrl(canvas, 1588, 0.88);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        return { imgData, imgHeight };
      };

      const pdfFontCss = settings.fontFamilyPreference === 'mono' 
        ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
        : settings.fontFamilyPreference === 'sans'
        ? "'Plus Jakarta Sans', sans-serif"
        : "'Playfair Display', serif";

      // --- Cover Page (Pristine Art without Box/Card Overlay) ---
      let coverHtml = `
        <div style="position: relative; height: 1122px; width: 794px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; background-color: #0f172a; padding: 56px 40px;">
            ${coverDataUrl ? `
              <img src="${coverDataUrl}" style="position: absolute; top: 0; left: 0; width: 794px; height: 1122px; display: block;" />
              <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.6) 28%, rgba(15, 23, 42, 0.1) 50%, rgba(15, 23, 42, 0) 100%);"></div>
            ` : ''}
            <div style="position: relative; z-index: 10; text-align: center; max-width: 88%; margin-bottom: 24px;">
              <h1 style="font-family: ${pdfFontCss}; font-size: 48px; color: #ffffff; line-height: 1.2; margin: 0; font-weight: bold; text-shadow: 0 4px 20px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.9);">${title}</h1>
              <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 600; color: #f1f5f9; margin-top: 14px; letter-spacing: 3px; text-transform: uppercase; text-shadow: 0 2px 10px rgba(0,0,0,0.95);">Created with StorySpark AI</p>
            </div>
        </div>
      `;
      const cover = await renderAndCapture(coverHtml);
      doc.addImage(cover.imgData, 'JPEG', 0, 0, imgWidth, cover.imgHeight);

      // --- Extract Chapters & Map Page Numbers ---
      const chapters = extractChapters(segments);
      const totalPages = segments.length + 3; // 1 (Cover) + 1 (TOC) + segments.length + 1 (The End)

      // Calculate starting page in PDF for each chapter (Story pages start on Page 3)
      const chaptersWithPages = chapters.map((chap) => {
        const stats = getChapterStats(segments, chap);
        return {
          ...chap,
          pdfPageNumber: chap.startIndex + 3,
          stats,
        };
      });

      const totalWords = segments.reduce((sum, s) => sum + s.paragraph.split(/\s+/).filter(Boolean).length, 0);
      const totalReadingMinutes = Math.max(1, Math.ceil(totalWords / 180));

      // --- Page 2: Auto-Generated Table of Contents (TOC) Page ---
      doc.addPage();
      let tocItemsHtml = chaptersWithPages.map((chap) => `
        <div style="display: flex; align-items: baseline; justify-content: space-between; padding: 14px 18px; margin-bottom: 12px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 12px;">
          <div style="display: flex; flex-direction: column; max-width: 72%;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #c084fc; background: rgba(168, 85, 247, 0.2); padding: 3px 8px; border-radius: 6px;">Chapter ${chap.chapterNumber}</span>
              <h3 style="font-family: ${pdfFontCss}; font-size: 20px; font-weight: bold; color: #ffffff; margin: 0;">${chap.title.replace(/^Chapter\s*\d+\s*:\s*/i, '')}</h3>
            </div>
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #94a3b8; font-weight: 500;">
              ${chap.stats.sceneCount} ${chap.stats.sceneCount === 1 ? 'Scene' : 'Scenes'} • ${chap.stats.totalWords} Words • ~${chap.stats.readingMinutes} min read
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="border-bottom: 2px dotted rgba(148, 163, 184, 0.4); width: 60px; height: 1px; margin-bottom: 4px;"></div>
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #e2e8f0; background: rgba(255, 255, 255, 0.08); padding: 4px 10px; border-radius: 8px; white-space: nowrap;">Page ${chap.pdfPageNumber}</span>
          </div>
        </div>
      `).join('');

      let tocHtml = `
        <div style="padding: 50px 56px; height: 1122px; width: 794px; box-sizing: border-box; display: flex; flex-direction: column; background: #0f172a; color: #f8fafc; position: relative;">
          <!-- TOC Header -->
          <div style="text-align: center; margin-bottom: 36px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 24px;">
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: #c084fc; display: block; margin-bottom: 8px;">Story Outline</span>
            <h2 style="font-family: ${pdfFontCss}; font-size: 38px; font-weight: bold; color: #ffffff; margin: 0;">Table of Contents</h2>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; color: #94a3b8; margin-top: 10px;">
              ${chapters.length} ${chapters.length === 1 ? 'Chapter' : 'Chapters'} • ${segments.length} ${segments.length === 1 ? 'Scene' : 'Scenes'} • ~${totalReadingMinutes} Min Total Reading Time
            </p>
          </div>

          <!-- Chapter Section List -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-start;">
            ${tocItemsHtml}
          </div>

          <!-- TOC Summary Box & Footer -->
          <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #64748b; font-weight: 600;">StorySpark AI Illustrated Chronicle</span>
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; color: #64748b; font-weight: bold; letter-spacing: 1.5px;">- Page 2 of ${totalPages} -</span>
          </div>
        </div>
      `;

      const tocPage = await renderAndCapture(tocHtml);
      doc.addImage(tocPage.imgData, 'JPEG', 0, 0, imgWidth, tocPage.imgHeight);

      // --- Story Pages (Grouped into Logical Chapter Sections) ---
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const pageNumber = i + 3;
        doc.addPage();
        
        // Identify which chapter this segment belongs to
        const currentChapter = chapters.slice().reverse().find(c => i >= c.startIndex) || chapters[0];
        const isChapterStart = chapters.some(c => c.startIndex === i);
        const sceneIndexInChapter = (i - currentChapter.startIndex) + 1;

        // Dynamic font size and image height adjustment based on paragraph length and chapter header
        const paraLength = segment.paragraph.length;
        const fontSize = paraLength > 450 ? '17px' : paraLength > 300 ? '20px' : '23px';
        const targetImageWidth = 698;
        const targetImageHeight = isChapterStart 
          ? (paraLength > 350 ? 290 : 330)
          : (paraLength > 350 ? 350 : 390);
        const imageMarginBottom = isChapterStart ? '16px' : '22px';

        const segmentImageDataUrl = segment.imageUrl 
          ? await processImageForPdfCanvas(segment.imageUrl, targetImageWidth, targetImageHeight, 'cover')
          : '';

        let pageHtml = `
          <div style="padding: 36px 48px; height: 1122px; width: 794px; box-sizing: border-box; display: flex; flex-direction: column; background: #0f172a; color: #f8fafc; position: relative;">
              <!-- Running Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: ${isChapterStart ? '14px' : '18px'}; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">
                <span>${title}</span>
                <span>${currentChapter.title} • Scene ${sceneIndexInChapter} of ${currentChapter.segmentCount}</span>
              </div>

              ${isChapterStart ? `
                <!-- Chapter Section Hero Header -->
                <div style="margin-bottom: 18px; padding: 14px 20px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 14px; text-align: center;">
                  <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2.5px; color: #c084fc; display: block; margin-bottom: 3px;">Section • Chapter ${currentChapter.chapterNumber}</span>
                  <h2 style="font-family: ${pdfFontCss}; font-size: 26px; font-weight: bold; color: #ffffff; margin: 0;">${currentChapter.title}</h2>
                </div>
              ` : ''}

              ${segmentImageDataUrl ? `
                <div style="text-align: center; margin-bottom: ${imageMarginBottom}; width: 100%; display: flex; justify-content: center;">
                  <img src="${segmentImageDataUrl}" style="width: ${targetImageWidth}px; height: ${targetImageHeight}px; border-radius: 16px; box-shadow: 0 10px 28px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.12); display: block;" />
                </div>
              ` : ''}

              <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-start;">
                <p style="font-family: ${pdfFontCss}; font-size: ${fontSize}; line-height: 1.75; color: #f1f5f9; text-align: justify; padding: 0 6px; margin: 0;">${segment.paragraph}</p>
              </div>

              <!-- Running Footer -->
              <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #64748b; font-weight: 600;">
                <span>Chapter ${currentChapter.chapterNumber}: ${currentChapter.title.replace(/^Chapter\s*\d+\s*:\s*/i, '')}</span>
                <span style="font-weight: bold; letter-spacing: 1.5px;">- Page ${pageNumber} of ${totalPages} -</span>
              </div>
          </div>
        `;
        
        const page = await renderAndCapture(pageHtml);
        doc.addImage(page.imgData, 'JPEG', 0, 0, imgWidth, page.imgHeight);
      }

      // --- The End ---
      doc.addPage();
      let endHtml = `
        <div style="padding: 60px; text-align: center; height: 1122px; width: 794px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #0f172a;">
            <p style="font-family: ${pdfFontCss}; font-style: italic; font-size: 52px; color: #c084fc; text-shadow: 0 0 24px rgba(192,132,252,0.4); margin-bottom: 12px;">The End</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 600; color: #94a3b8; letter-spacing: 1px;">Crafted with StorySpark AI Multi-Modal Engine</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; color: #64748b; margin-top: 24px;">- Page ${totalPages} of ${totalPages} -</p>
        </div>
      `;
      const endPage = await renderAndCapture(endHtml);
      doc.addImage(endPage.imgData, 'JPEG', 0, 0, imgWidth, endPage.imgHeight);

      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeTitle}_storybook.pdf`);

      showSuccessToast('PDF Storybook exported successfully with metadata!');

    } catch (e) {
      console.error("Error saving PDF:", e);
      showErrorToast('Failed to save the story as a PDF. Please try again.');
      setError('Failed to save the story as a PDF. An unexpected error occurred while generating the file.');
    } finally {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
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
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 border border-white/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-200 to-indigo-200 leading-none">
                    StorySpark
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

              {/* Voice-to-Text Microphone Button in Header */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                title="Speak Story Prompt (Voice-to-Text Dictation • Ctrl+M)"
                className={`flex items-center justify-center gap-1.5 px-3 h-9 rounded-full transition-all duration-200 active:scale-95 border ${
                  isVoiceModalOpen
                    ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                    : 'text-purple-200 hover:bg-purple-600/30 hover:text-white hover:border-purple-400/40 bg-white/5 border-white/10'
                } text-xs font-semibold shadow-sm`}
                aria-label="Voice-to-Text Story Input"
              >
                <Mic className="w-4 h-4 text-purple-300 group-hover:text-white" />
                <span className="hidden lg:inline">Speak Prompt</span>
              </button>

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
