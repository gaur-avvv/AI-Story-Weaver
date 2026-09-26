import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Languages, 
  Sparkles, 
  Download, 
  BookOpen, 
  Volume2, 
  Check, 
  RefreshCw, 
  Globe, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { StorySegment } from '../types';
import { translateStoryContent } from '../services/geminiService';
import { useToast } from './ToastContext';

interface BilingualStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: StorySegment[];
  storyTitle?: string;
  userApiKey?: string | null;
}

const SUPPORTED_LANGUAGES = [
  'Spanish',
  'French',
  'German',
  'Hindi',
  'Japanese',
  'Chinese (Simplified)',
  'Italian',
  'Portuguese',
  'Arabic',
  'Russian',
];

export const BilingualStoryModal: React.FC<BilingualStoryModalProps> = ({
  isOpen,
  onClose,
  segments,
  storyTitle = 'Current Story',
  userApiKey,
}) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [targetLanguage, setTargetLanguage] = useState<string>('Spanish');
  const [translatedMap, setTranslatedMap] = useState<Record<string, { paragraph: string; title?: string }>>({});
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const [isTranslatingAll, setIsTranslatingAll] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTranslateSegment = async (index: number) => {
    const seg = segments[index];
    if (!seg || !seg.paragraph) return;

    setTranslatingIndex(index);
    try {
      const res = await translateStoryContent(
        seg.chapterTitle || 'Scene',
        [seg],
        targetLanguage,
        userApiKey || null
      );
      const translatedSeg = res.segments[0];
      setTranslatedMap(prev => ({
        ...prev,
        [seg.id]: {
          paragraph: translatedSeg?.paragraph || seg.paragraph,
          title: translatedSeg?.chapterTitle || res.title || seg.chapterTitle,
        }
      }));
      showSuccessToast(`Scene ${index + 1} translated to ${targetLanguage}!`);
    } catch (err: any) {
      showErrorToast(`Failed to translate scene: ${err?.message || err}`);
    } finally {
      setTranslatingIndex(null);
    }
  };

  const handleTranslateAll = async () => {
    if (segments.length === 0) return;
    setIsTranslatingAll(true);

    try {
      const res = await translateStoryContent(
        'Story',
        segments,
        targetLanguage,
        userApiKey || null
      );
      const newMap: Record<string, { paragraph: string; title?: string }> = {};
      res.segments.forEach((transSeg, idx) => {
        const originalSeg = segments[idx];
        if (originalSeg) {
          newMap[originalSeg.id] = {
            paragraph: transSeg.paragraph || originalSeg.paragraph,
            title: transSeg.chapterTitle || originalSeg.chapterTitle,
          };
        }
      });
      setTranslatedMap(prev => ({ ...prev, ...newMap }));
      showSuccessToast(`All ${segments.length} scenes translated to ${targetLanguage}!`);
    } catch (err: any) {
      showErrorToast(`Translation error: ${err?.message || err}`);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl h-[88vh] bg-slate-950 border border-purple-500/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Bilingual & Dual-Language Learning Studio</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Side-by-Side Reading
                </span>
              </div>
              <p className="text-xs text-slate-400">Compare parallel translations paragraph-by-paragraph for language acquisition</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Target Language Select */}
            <div className="relative">
              <select
                value={targetLanguage}
                onChange={e => setTargetLanguage(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold bg-slate-900 border border-white/15 rounded-xl text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTranslateAll}
              disabled={isTranslatingAll || segments.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
            >
              {isTranslatingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  Translate All
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-white/10 bg-slate-900/30 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Original Text (English)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Parallel Translation ({targetLanguage})
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/60">
          {segments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              No story segments available to translate. Generate a story first!
            </div>
          ) : (
            segments.map((seg, idx) => {
              const trans = translatedMap[seg.id];
              const isBusy = translatingIndex === idx;

              return (
                <div 
                  key={seg.id}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10"
                >
                  {/* Left Column: Original */}
                  <div className="space-y-2 pr-0 md:pr-4 md:border-r md:border-white/10">
                    <div className="flex items-center justify-between text-[11px] text-purple-300 font-semibold">
                      <span>Chapter {seg.chapterNumber || (idx + 1)}: {seg.chapterTitle || `Scene ${idx + 1}`}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-serif">
                      {seg.paragraph}
                    </p>
                  </div>

                  {/* Right Column: Translated */}
                  <div className="space-y-2 pl-0 md:pl-2">
                    <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                      <span>
                        {trans?.title || (seg.chapterTitle ? `${seg.chapterTitle} (${targetLanguage})` : `Scene ${idx + 1}`)}
                      </span>
                      {!trans && (
                        <button
                          onClick={() => handleTranslateSegment(idx)}
                          disabled={isBusy || isTranslatingAll}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold transition-colors flex items-center gap-1"
                        >
                          {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Translate
                        </button>
                      )}
                    </div>

                    {trans ? (
                      <p className="text-xs text-emerald-100 leading-relaxed font-serif">
                        {trans.paragraph}
                      </p>
                    ) : (
                      <div className="h-20 flex items-center justify-center border border-dashed border-white/10 rounded-xl text-slate-500 text-xs italic">
                        Click "Translate" to generate parallel text.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
