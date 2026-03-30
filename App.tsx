import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryInput } from './components/StoryInput';
import { StoryDisplay } from './components/StoryDisplay';
import { generateStory, generateImage, generateTTSAudio, generateCoverImage, setFallbackCallback, FallbackNotification } from './services/geminiService';
import { StorySegment, Settings } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { DownloadIcon, LanguagesIcon, SettingsIcon, ChevronDownIcon, RefreshCwIcon, VideoIcon, ShareIcon } from './components/icons';
import { HeroIllustration } from './components/HeroIllustration';
import { RatingSystem } from './components/RatingSystem';
import { VideoModal } from './components/VideoModal';
import { PublishPlatforms } from './components/PublishPlatforms';

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
  pdfTemplate: 'classic',
  videoTemplate: 'cinematic',
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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isPublishOpen, setIsPublishOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [fallbackNotice, setFallbackNotice] = useState<FallbackNotification | null>(null);

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

    // Register fallback callback
    setFallbackCallback((notification: FallbackNotification) => {
      setFallbackNotice(notification);
      setTimeout(() => setFallbackNotice(null), 6000);
    });
    return () => setFallbackCallback(null);
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

  // Auto-save: persists settings/keys without closing the panel
  const handleAutoSave = (key: string, newSettings: Settings) => {
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

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setIsSettingsOpen(false);
    setError(null);
    setSegments([]);
    setTitle('');
    setInitialPrompt(prompt);

    try {
      const textApiKey = getApiKeyForProvider(settings.textProvider);
      
      const { title: storyTitle, paragraphs } = await generateStory(
        prompt, 
        language, 
        userApiKey, 
        settings.genre, 
        settings.storyLength, 
        settings.textModel,
        settings.textProvider,
        textApiKey || undefined,
        settings.targetAudience
      );
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

          const imageApiKey = getApiKeyForProvider(settings.imageProvider);
          const imageUrl = await generateImage(
            segment.paragraph, 
            userApiKey, 
            settings.imageStyle, 
            settings.imageModel,
            settings.imageProvider,
            imageApiKey || undefined
          );
          
          setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, imageUrl, isLoadingImage: false } : s));
          
          if (settings.generateAudio) {
            const audioApiKey = getApiKeyForProvider(settings.audioProvider);
            const audioUrl = await generateTTSAudio(
              segment.paragraph, 
              userApiKey, 
              settings.voice,
              settings.audioModel,
              settings.audioProvider,
              audioApiKey || undefined
            );
            setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, audioUrl, isLoadingAudio: false } : s));
          }
          
          if (i < newSegments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (e: any) {
           console.error(`Error processing segment ${segment.id}:`, e);
           
           const errorMessage = e?.message || 'Unknown error';
           if (errorMessage.includes('Rate Limit') || errorMessage.includes('429') || errorMessage.includes('quota')) {
             setError(`Rate Limit Exceeded: ${errorMessage}. Stopping further generation to prevent issues.`);
             setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, isLoadingImage: false, isLoadingAudio: false } : s));
             break; // Stop if we hit a rate limit
           }

           // For other errors, we might want to continue or just log it
           setError(`Error generating assets for segment ${i + 1}: ${errorMessage}`);
           setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, isLoadingImage: false, isLoadingAudio: false } : s));
           // We continue to the next segment for non-fatal errors, but maybe we should break for critical ones?
           // For now, let's break to be safe and not spam the user if something is broken.
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
      
      const imageApiKey = getApiKeyForProvider(settings.imageProvider);
      const coverUrl = await generateCoverImage(
        coverPrompt, 
        userApiKey, 
        settings.imageStyle, 
        settings.imageModel,
        settings.imageProvider,
        imageApiKey || undefined
      );

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = settings.pdfMargin;
      const contentWidth = pageWidth - margin * 2;
      const template = settings.pdfTemplate || 'classic';

      const getImageDimensions = (src: string): Promise<{ width: number; height: number; ratio: number }> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, ratio: img.naturalWidth / img.naturalHeight });
          img.onerror = reject;
          img.src = src;
        });
      };

      const sanitizeText = (text: string) => {
        return text
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[^\x00-\xFF]/g, "");
      };

      // Template-specific configurations
      const templateConfig = {
        classic: { titleFont: 'times', bodyFont: 'times', titleSize: 32, bodySize: 14, accentColor: [0, 0, 0] as [number, number, number], bgColor: null as [number, number, number] | null },
        modern: { titleFont: 'helvetica', bodyFont: 'helvetica', titleSize: 36, bodySize: 13, accentColor: [41, 98, 255] as [number, number, number], bgColor: [245, 247, 250] as [number, number, number] },
        minimalist: { titleFont: 'helvetica', bodyFont: 'helvetica', titleSize: 28, bodySize: 12, accentColor: [80, 80, 80] as [number, number, number], bgColor: null as [number, number, number] | null },
        storybook: { titleFont: 'times', bodyFont: 'times', titleSize: 34, bodySize: 15, accentColor: [139, 69, 19] as [number, number, number], bgColor: [255, 253, 240] as [number, number, number] },
        magazine: { titleFont: 'helvetica', bodyFont: 'helvetica', titleSize: 40, bodySize: 12, accentColor: [220, 20, 60] as [number, number, number], bgColor: [250, 250, 250] as [number, number, number] },
      };
      const tpl = templateConfig[template];

      const drawPageBg = () => {
        if (tpl.bgColor) {
          doc.setFillColor(tpl.bgColor[0], tpl.bgColor[1], tpl.bgColor[2]);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
      };

      const drawPageNumber = (num: number) => {
        doc.setFont(tpl.bodyFont, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(150);
        if (template === 'magazine') {
          doc.text(String(num), pageWidth - 40, pageHeight - 20, { align: 'right' });
        } else {
          doc.text(String(num), pageWidth / 2, pageHeight - 20, { align: 'center' });
        }
        doc.setTextColor(0);
      };

      // --- Cover Page ---
      try {
        const coverDims = await getImageDimensions(coverUrl);
        let coverW = pageWidth;
        let coverH = pageWidth / coverDims.ratio;
        if (coverH < pageHeight) { coverH = pageHeight; coverW = pageHeight * coverDims.ratio; }
        const coverX = (pageWidth - coverW) / 2;
        const coverY = (pageHeight - coverH) / 2;
        doc.addImage(coverUrl, 'JPEG', coverX, coverY, coverW, coverH);

        // Template-specific cover overlay
        if (template === 'modern') {
          doc.setFillColor(0, 0, 0);
          doc.setGState(new doc.GState({ opacity: 0.5 }));
          doc.rect(0, pageHeight * 0.6, pageWidth, pageHeight * 0.4, 'F');
          doc.setGState(new doc.GState({ opacity: 1 }));
          doc.setFont(tpl.titleFont, 'bold');
          doc.setFontSize(tpl.titleSize);
          doc.setTextColor(255, 255, 255);
          const coverTitleLines = doc.splitTextToSize(sanitizeText(title), pageWidth - 80);
          doc.text(coverTitleLines, pageWidth / 2, pageHeight * 0.72, { align: 'center' });
          doc.setTextColor(0);
        } else if (template === 'magazine') {
          doc.setFillColor(220, 20, 60);
          doc.setGState(new doc.GState({ opacity: 0.85 }));
          doc.rect(0, 0, pageWidth, 100, 'F');
          doc.setGState(new doc.GState({ opacity: 1 }));
          doc.setFont(tpl.titleFont, 'bold');
          doc.setFontSize(18);
          doc.setTextColor(255, 255, 255);
          doc.text('STORYSPARK MAGAZINE', pageWidth / 2, 55, { align: 'center' });
          doc.setFillColor(0, 0, 0);
          doc.setGState(new doc.GState({ opacity: 0.6 }));
          doc.rect(0, pageHeight - 160, pageWidth, 160, 'F');
          doc.setGState(new doc.GState({ opacity: 1 }));
          doc.setFont(tpl.titleFont, 'bold');
          doc.setFontSize(tpl.titleSize);
          doc.setTextColor(255, 255, 255);
          const coverTitleLines = doc.splitTextToSize(sanitizeText(title), pageWidth - 80);
          doc.text(coverTitleLines, pageWidth / 2, pageHeight - 100, { align: 'center' });
          doc.setTextColor(0);
        }
      } catch (e) {
        console.error("Could not load cover image", e);
        // Fallback: text-only cover
        drawPageBg();
        doc.setFont(tpl.titleFont, 'bold');
        doc.setFontSize(tpl.titleSize + 8);
        doc.setTextColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
        const coverTitleLines = doc.splitTextToSize(sanitizeText(title), contentWidth);
        doc.text(coverTitleLines, pageWidth / 2, pageHeight / 2, { align: 'center' });
        doc.setTextColor(0);
      }

      // --- Title Page ---
      doc.addPage();
      drawPageBg();

      if (template === 'minimalist') {
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight / 2 - 60, pageWidth - margin, pageHeight / 2 - 60);
        doc.setFont(tpl.titleFont, 'bold');
        doc.setFontSize(tpl.titleSize);
        const titleLines = doc.splitTextToSize(sanitizeText(title), contentWidth);
        doc.text(titleLines, pageWidth / 2, pageHeight / 2, { align: 'center' });
        doc.line(margin, pageHeight / 2 + 30, pageWidth - margin, pageHeight / 2 + 30);
        doc.setFont(tpl.bodyFont, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("Generated by StorySpark", pageWidth / 2, pageHeight - margin, { align: 'center' });
        doc.setTextColor(0);
      } else if (template === 'storybook') {
        doc.setDrawColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
        doc.setLineWidth(2);
        doc.rect(margin - 10, margin - 10, contentWidth + 20, pageHeight - margin * 2 + 20);
        doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - margin * 2 + 10);
        doc.setFont(tpl.titleFont, 'bolditalic');
        doc.setFontSize(tpl.titleSize);
        doc.setTextColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
        const titleLines = doc.splitTextToSize(sanitizeText(title), contentWidth - 20);
        doc.text(titleLines, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
        doc.setFont(tpl.bodyFont, 'italic');
        doc.setFontSize(14);
        doc.text("~ A StorySpark Tale ~", pageWidth / 2, pageHeight / 2 + 40, { align: 'center' });
        doc.setTextColor(0);
      } else if (template === 'magazine') {
        doc.setFillColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
        doc.rect(0, 0, pageWidth, 6, 'F');
        doc.setFont(tpl.titleFont, 'bold');
        doc.setFontSize(tpl.titleSize);
        const titleLines = doc.splitTextToSize(sanitizeText(title), contentWidth);
        doc.text(titleLines, pageWidth / 2, pageHeight / 3, { align: 'center' });
        doc.setFont(tpl.bodyFont, 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("A StorySpark Publication", pageWidth / 2, pageHeight / 3 + 50, { align: 'center' });
        doc.setDrawColor(200);
        doc.line(margin + 80, pageHeight / 3 + 65, pageWidth - margin - 80, pageHeight / 3 + 65);
        doc.setTextColor(0);
      } else {
        // Classic & Modern title pages
        doc.setFont(tpl.titleFont, 'bold');
        doc.setFontSize(tpl.titleSize);
        if (template === 'modern') doc.setTextColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
        const titleLines = doc.splitTextToSize(sanitizeText(title), contentWidth);
        const titleBlockHeight = titleLines.length * tpl.titleSize * 1.15;
        doc.text(titleLines, pageWidth / 2, (pageHeight / 2) - (titleBlockHeight / 2), { align: 'center' });
        doc.setTextColor(0);
        doc.setFont(tpl.bodyFont, 'normal');
        doc.setFontSize(12);
        doc.text("Generated by StorySpark", pageWidth / 2, pageHeight - margin, { align: 'center' });
      }

      // --- Story Pages ---
      let pageNumber = 1;
      let currentY = margin;

      for (let si = 0; si < segments.length; si++) {
        const segment = segments[si];
        doc.addPage();
        drawPageBg();
        drawPageNumber(pageNumber++);
        currentY = margin;

        // Template-specific decorations
        if (template === 'storybook') {
          doc.setDrawColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
          doc.setLineWidth(1);
          doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - margin * 2 + 10);
          currentY = margin + 10;
        } else if (template === 'magazine') {
          doc.setFillColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
          doc.rect(0, 0, pageWidth, 4, 'F');
          currentY = margin + 10;
        } else if (template === 'modern') {
          doc.setFillColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
          doc.rect(margin, margin, 3, 30, 'F');
          currentY = margin;
        }

        // Image
        if (segment.imageUrl) {
          try {
            const imgDims = await getImageDimensions(segment.imageUrl);
            let imgW = contentWidth;
            let imgH = contentWidth / imgDims.ratio;
            const maxImgHeight = pageHeight * 0.55;
            if (imgH > maxImgHeight) { imgH = maxImgHeight; imgW = maxImgHeight * imgDims.ratio; }

            if (template === 'magazine' && si % 2 === 1) {
              // Magazine: alternate image positioning (full-bleed)
              doc.addImage(segment.imageUrl, 'JPEG', 0, 0, pageWidth, pageHeight * 0.45);
              currentY = pageHeight * 0.45 + 20;
            } else if (template === 'minimalist') {
              // Minimalist: smaller centered image
              const smallW = contentWidth * 0.7;
              const smallH = smallW / imgDims.ratio;
              const clampedH = Math.min(smallH, maxImgHeight * 0.7);
              const clampedW = clampedH === smallH ? smallW : clampedH * imgDims.ratio;
              doc.addImage(segment.imageUrl, 'JPEG', (pageWidth - clampedW) / 2, currentY, clampedW, clampedH);
              currentY += clampedH + 30;
            } else {
              const imgX = margin + (contentWidth - imgW) / 2;
              doc.addImage(segment.imageUrl, 'JPEG', imgX, currentY, imgW, imgH);
              currentY += imgH + 30;
            }
          } catch (e) {
            console.error("Failed to load segment image", e);
          }
        }

        // Text
        doc.setFont(tpl.bodyFont, 'normal');
        doc.setFontSize(tpl.bodySize);
        const lineHeight = tpl.bodySize * 1.6;
        const textLines = doc.splitTextToSize(sanitizeText(segment.paragraph), contentWidth);

        for (let i = 0; i < textLines.length; i++) {
          if (currentY + lineHeight > pageHeight - 40) {
            doc.addPage();
            drawPageBg();
            drawPageNumber(pageNumber++);
            if (template === 'storybook') {
              doc.setDrawColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
              doc.setLineWidth(1);
              doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - margin * 2 + 10);
            } else if (template === 'magazine') {
              doc.setFillColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
              doc.rect(0, 0, pageWidth, 4, 'F');
            }
            doc.setFont(tpl.bodyFont, 'normal');
            doc.setFontSize(tpl.bodySize);
            currentY = margin;
          }

          if (template === 'minimalist') {
            doc.text(textLines[i], pageWidth / 2, currentY + 10, { align: 'center' });
          } else {
            doc.text(textLines[i], margin, currentY + 10);
          }
          currentY += lineHeight;
        }
      }
      
      // The End
      const endText = template === 'storybook' ? '~ The End ~' : 'The End';
      if (currentY + 50 < pageHeight - 40) {
        doc.setFont(tpl.titleFont, 'italic');
        doc.setFontSize(14);
        if (template !== 'classic') doc.setTextColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
        doc.text(endText, pageWidth / 2, currentY + 40, { align: 'center' });
      } else {
        doc.addPage();
        drawPageBg();
        doc.setFont(tpl.titleFont, 'italic');
        doc.setFontSize(14);
        if (template !== 'classic') doc.setTextColor(tpl.accentColor[0], tpl.accentColor[1], tpl.accentColor[2]);
        doc.text(endText, pageWidth / 2, pageHeight / 2, { align: 'center' });
      }
      doc.setTextColor(0);

      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeTitle}_${template}_ebook.pdf`);

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
                  onClick={() => setIsVideoModalOpen(true)}
                  title="Watch Story Video"
                  className="flex items-center justify-center w-12 h-12 text-blue-600 hover:bg-blue-100/60 rounded-full transition-all duration-200 hover:scale-110 active:scale-100"
                >
                  <VideoIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setIsPublishOpen(!isPublishOpen)}
                  title="Publish & Distribute"
                  className="flex items-center justify-center w-12 h-12 text-blue-600 hover:bg-blue-100/60 rounded-full transition-all duration-200 hover:scale-110 active:scale-100"
                >
                  <ShareIcon className="w-6 h-6" />
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
                    onAutoSave={handleAutoSave}
                    currentApiKey={userApiKey}
                    currentSettings={settings}
                />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPublishOpen && (
            <motion.div
              key="publish-panel"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden mb-8"
            >
              <PublishPlatforms isVisible={true} />
            </motion.div>
          )}
        </AnimatePresence>

        {title && <h2 className="text-4xl sm:text-5xl font-black text-center mb-10 text-blue-900/90">{title}</h2>}
        
        {segments.length > 0 ? (
          <>
            <StoryDisplay segments={segments} />
            {!isGenerating && <RatingSystem onRate={(rating) => console.log(`User rated: ${rating}`)} />}
          </>
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

        {/* Fallback Notification */}
        <AnimatePresence>
          {fallbackNotice && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-300 text-yellow-900 px-6 py-3 rounded-xl shadow-lg text-sm font-medium max-w-md text-center"
            >
              Provider <strong>{fallbackNotice.originalProvider}</strong> failed. Using <strong>{fallbackNotice.fallbackProvider}</strong> as fallback.
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full p-6 sticky bottom-0 bg-gradient-to-t from-[#FFFBF0] to-transparent">
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
          videoTemplate={settings.videoTemplate}
        />
      )}
    </div>
  );
}

export default App;
