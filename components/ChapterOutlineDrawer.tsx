import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  X, 
  Plus, 
  Sparkles, 
  ChevronRight, 
  Edit3, 
  Check, 
  Trash2, 
  Clock, 
  Layers, 
  BookmarkCheck,
  Split,
  FileText
} from 'lucide-react';
import { StorySegment, StoryChapter } from '../types';
import { 
  extractChapters, 
  setChapterAtSegment, 
  removeChapterAtSegment, 
  getChapterStats, 
  autoOrganizeChapters 
} from '../utils/chapterUtils';
import { useToast } from './ToastContext';

interface ChapterOutlineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  segments: StorySegment[];
  storyTitle: string;
  genre?: string;
  onUpdateSegments: (newSegments: StorySegment[]) => void;
  onJumpToSegment: (segmentIndex: number) => void;
}

export const ChapterOutlineDrawer: React.FC<ChapterOutlineDrawerProps> = ({
  isOpen,
  onClose,
  segments,
  storyTitle,
  genre = 'Fantasy',
  onUpdateSegments,
  onJumpToSegment,
}) => {
  const { showSuccessToast, showWarningToast } = useToast();
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');

  if (!isOpen) return null;

  const chapters = extractChapters(segments);
  const totalScenes = segments.length;
  const totalWords = segments.reduce((acc, s) => acc + (s.paragraph ? s.paragraph.split(/\s+/).length : 0), 0);
  const totalReadingTime = Math.max(1, Math.ceil(totalWords / 200));

  const handleStartRename = (chapter: StoryChapter) => {
    setEditingChapterId(chapter.id);
    setEditTitleValue(chapter.title);
  };

  const handleSaveRename = (chapter: StoryChapter) => {
    if (editTitleValue.trim()) {
      const updated = setChapterAtSegment(segments, chapter.startIndex, editTitleValue.trim());
      onUpdateSegments(updated);
      showSuccessToast(`Updated ${chapter.title} title.`);
    }
    setEditingChapterId(null);
  };

  const handleAutoOrganize = () => {
    if (segments.length === 0) {
      showWarningToast('Create a story before organizing chapters.');
      return;
    }
    const organized = autoOrganizeChapters(segments, storyTitle, genre);
    onUpdateSegments(organized);
    showSuccessToast(`Auto-structured story into ${extractChapters(organized).length} thematic chapters!`);
  };

  const handleRemoveChapter = (chapter: StoryChapter) => {
    if (chapter.startIndex === 0) {
      showWarningToast('Chapter 1 marks the opening of your book.');
      return;
    }
    const updated = removeChapterAtSegment(segments, chapter.startIndex);
    onUpdateSegments(updated);
    showSuccessToast(`Merged Chapter ${chapter.chapterNumber} into previous chapter.`);
  };

  const handleAddNewChapterAt = (segmentIndex: number) => {
    const nextChapterNumber = chapters.length + 1;
    const defaultTitle = `Chapter ${nextChapterNumber}: New Phase`;
    const updated = setChapterAtSegment(segments, segmentIndex, defaultTitle);
    onUpdateSegments(updated);
    showSuccessToast(`Created new Chapter at Scene #${segmentIndex + 1}!`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-md bg-slate-900/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col h-full z-10 text-white"
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Chapter Outline</h3>
                <p className="text-xs text-slate-400">Table of Contents & Story Structure</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="px-6 py-3.5 bg-slate-950/60 border-b border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Chapters</span>
              <span className="text-purple-300 font-bold text-base">{chapters.length}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Scenes</span>
              <span className="text-white font-bold text-base">{totalScenes}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Reading Time</span>
              <span className="text-emerald-300 font-bold text-base">~{totalReadingTime}m</span>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <button
              onClick={handleAutoOrganize}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
              <span>Smart Auto-Structure</span>
            </button>
          </div>

          {/* Chapter List */}
          <div className="p-6 overflow-y-auto space-y-4 flex-grow">
            {chapters.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-600 stroke-[1.5]" />
                <p className="text-sm">No chapters created yet.</p>
                <p className="text-xs text-slate-500 mt-1">Generate a story to begin organizing chapters.</p>
              </div>
            ) : (
              chapters.map((chapter) => {
                const stats = getChapterStats(segments, chapter);
                const isEditing = editingChapterId === chapter.id;

                return (
                  <div
                    key={chapter.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all group relative"
                  >
                    {/* Chapter Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-mono font-bold">
                          CH {chapter.chapterNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Scenes {chapter.startIndex + 1}–{chapter.startIndex + chapter.segmentCount}
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {!isEditing && (
                          <button
                            onClick={() => handleStartRename(chapter)}
                            title="Rename"
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {chapter.startIndex !== 0 && (
                          <button
                            onClick={() => handleRemoveChapter(chapter)}
                            title="Merge Chapter"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title or Editor */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(chapter);
                            if (e.key === 'Escape') setEditingChapterId(null);
                          }}
                          autoFocus
                          className="flex-grow px-3 py-1.5 rounded-lg bg-slate-950 border border-purple-400 text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-purple-400"
                        />
                        <button
                          onClick={() => handleSaveRename(chapter)}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingChapterId(null)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h4 
                        onClick={() => handleStartRename(chapter)}
                        className="font-bold text-white text-base hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        {chapter.title}
                      </h4>
                    )}

                    {/* Meta stats & Jump button */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {stats.totalWords} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {stats.readingMinutes}m read
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          onJumpToSegment(chapter.startIndex);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Read</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Quick Scene Splitter Helper */}
            {segments.length > 1 && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-purple-400" />
                  Split Scene into New Chapter
                </h5>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {segments.map((seg, idx) => {
                    const isChapterStart = chapters.some(c => c.startIndex === idx);
                    if (isChapterStart) return null;

                    return (
                      <div
                        key={seg.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-white/5 hover:border-purple-500/20 text-xs"
                      >
                        <span className="text-slate-300 truncate max-w-[200px]">
                          Scene {idx + 1}: {seg.paragraph.substring(0, 32)}...
                        </span>
                        <button
                          onClick={() => handleAddNewChapterAt(idx)}
                          className="px-2 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> New Chapter
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
