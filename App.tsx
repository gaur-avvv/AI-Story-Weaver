import React, { useState, useEffect } from 'react';
import { StoryInput } from './components/StoryInput';
import { StoryDisplay } from './components/StoryDisplay';
import { generateStory, generateImage, generateTTSAudio, generateCoverImage, resetApiKeyIndex, setUserApiKey } from './services/geminiService';
import { StorySegment } from './types';
import { DownloadIcon, SettingsIcon } from './components/icons';

// Add type definition for jsPDF from window object
declare global {
  interface Window {
    jspdf: any;
  }
}

function App() {
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [title, setTitle] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSavingPdf, setIsSavingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userApiKeyInput, setUserApiKeyInput] = useState<string>('');
  const [showApiInput, setShowApiInput] = useState<boolean>(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('userApiKey');
    if (savedKey) {
      setUserApiKeyInput(savedKey);
      setUserApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    const keyToSave = userApiKeyInput.trim();
    setUserApiKey(keyToSave);
    localStorage.setItem('userApiKey', keyToSave);
    setShowApiInput(false);
  };

  const handleGenerate = async (prompt: string) => {
    resetApiKeyIndex();
    setIsGenerating(true);
    setError(null);
    setSegments([]);
    setTitle('');
    setInitialPrompt(prompt);

    try {
      const { title: storyTitle, paragraphs } = await generateStory(prompt);
      setTitle(storyTitle);

      const newSegments: StorySegment[] = paragraphs.map((p) => ({
        id: crypto.randomUUID(),
        paragraph: p,
      }));
      setSegments(newSegments);

      for (const segment of newSegments) {
        try {
          setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, isLoadingImage: true, isLoadingAudio: true } : s));

          const imageUrl = await generateImage(`A charming and whimsical illustration for a children's storybook. Scene: ${segment.paragraph}`);
          setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, imageUrl, isLoadingImage: false } : s));

          const audioUrl = await generateTTSAudio(segment.paragraph);
          setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, audioUrl, isLoadingAudio: false } : s));
          
          const currentIndex = newSegments.findIndex(s => s.id === segment.id);
          if (currentIndex < newSegments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second pause
          }

        } catch (e) {
          console.error(`Error processing segment ${segment.id}:`, e);
           const errorMessage = e instanceof Error ? e.message : 'An error occurred generating assets.';
           setError(errorMessage);
           setSegments((prev) => prev.map(s => s.id === segment.id ? { ...s, isLoadingImage: false, isLoadingAudio: false } : s));
           break;
        }
      }

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveAsPdf = async () => {
    if (!title || segments.length === 0) return;
    setIsSavingPdf(true);
    setError(null);

    try {
      const coverPrompt = `A stunning, beautiful, and whimsical book cover illustration for a children's story titled "${title}". The story is about: ${initialPrompt}. Style: vibrant, detailed, digital painting, storybook style.`;
      const coverUrl = await generateCoverImage(coverPrompt);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 60;
      const contentWidth = pageWidth - margin * 2;

      pdf.addImage(coverUrl, 'JPEG', 0, 0, pageWidth, pageHeight);

      pdf.addPage();
      pdf.setFont('Nunito', 'bold');
      pdf.setFontSize(36);
      pdf.text(title, pageWidth / 2, pageHeight / 3, { align: 'center', maxWidth: contentWidth });

      let currentY = margin;
      for (const segment of segments) {
        pdf.addPage();
        currentY = margin;

        if (segment.imageUrl) {
          const imageRatio = 4 / 3;
          const imageHeight = contentWidth / imageRatio;
          pdf.addImage(segment.imageUrl, 'JPEG', margin, currentY, contentWidth, imageHeight);
          currentY += imageHeight + 30;
        }

        pdf.setFont('Nunito', 'normal');
        pdf.setFontSize(14);
        const textLines = pdf.splitTextToSize(segment.paragraph, contentWidth);
        const textBlockHeight = textLines.length * pdf.getLineHeight() * 0.8;
        
        if (currentY + textBlockHeight > pageHeight - margin) {
          // This case is less likely now with one segment per page, but good for safety
          pdf.addPage();
          currentY = margin;
        }
        pdf.text(textLines, margin, currentY);
      }

      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`${safeTitle}_storybook.pdf`);

    } catch (e) {
      console.error("Error saving PDF:", e);
      setError(e instanceof Error ? `Failed to save PDF: ${e.message}` : 'An unknown error occurred while saving the PDF.');
    } finally {
      setIsSavingPdf(false);
    }
  };

  return (
    <div className="bg-[#FFF9F0] min-h-screen flex flex-col items-center font-sans text-amber-900 selection:bg-amber-200">
      <header className="w-full p-6 flex justify-center items-center relative">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">
            AI Story Weaver
          </h1>
          <p className="mt-2 text-lg text-amber-800/80">
            Let's create a magical story together!
          </p>
        </div>
        
        <div className="absolute right-6 top-6 flex items-center gap-4">
          {!isGenerating && segments.length > 0 && (
            <button
              onClick={handleSaveAsPdf}
              disabled={isSavingPdf}
              title="Save as PDF Book"
              className="flex items-center justify-center w-12 h-12 bg-white text-orange-500 rounded-full shadow-md hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
            >
              {isSavingPdf ? <div className="w-5 h-5 border-2 border-t-transparent border-orange-500 rounded-full animate-spin" /> : <DownloadIcon className="w-6 h-6" />}
            </button>
          )}
          <div className="relative">
            <button 
              onClick={() => setShowApiInput(!showApiInput)}
              title="Settings"
              className="flex items-center justify-center w-12 h-12 bg-white text-slate-500 rounded-full shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            {showApiInput && (
              <div className="absolute top-14 right-0 mt-2 flex gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200 w-80">
                <input
                  type="password"
                  value={userApiKeyInput}
                  onChange={(e) => setUserApiKeyInput(e.target.value)}
                  placeholder="Your Google AI API Key"
                  className="flex-grow px-3 py-2 text-sm text-amber-900 bg-white/80 border border-amber-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-md shadow-sm hover:bg-orange-600 active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="w-full max-w-4xl flex-grow flex flex-col p-4">
        {title && <h2 className="text-4xl font-black text-center mb-8 text-amber-800">{title}</h2>}
        
        {segments.length > 0 ? (
          <StoryDisplay segments={segments} />
        ) : (
          <div className="flex-grow flex items-center justify-center">
             {!isGenerating && !error && (
              <p className="text-2xl text-amber-700/60">
                Tell me what your story is about...
              </p>
            )}
          </div>
        )}
        
        {error && <div className="text-red-600 text-center font-bold p-4 bg-red-100 rounded-lg max-w-2xl mx-auto">{error}</div>}
      </main>

      <footer className="w-full p-6 sticky bottom-0 bg-gradient-to-t from-[#FFF9F0] to-transparent">
        <StoryInput onGenerate={handleGenerate} isGenerating={isGenerating} />
      </footer>
    </div>
  );
}

export default App;
