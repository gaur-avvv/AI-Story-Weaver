import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Edit2, Check, X, Bookmark, Trash2, Clock, FileText } from 'lucide-react';
import { useVfx } from '../vfx/VfxContext';

interface ChapterDividerProps {
  chapterNumber: number;
  title: string;
  segmentIndex: number;
  isFirstSegment: boolean;
  wordCount?: number;
  readingMinutes?: number;
  sceneCount?: number;
  onUpdateTitle: (newTitle: string) => void;
  onRemoveChapter?: () => void;
}

export const ChapterDivider: React.FC<ChapterDividerProps> = ({
  chapterNumber,
  title,
  segmentIndex,
  isFirstSegment,
  wordCount = 0,
  readingMinutes = 1,
  sceneCount = 1,
  onUpdateTitle,
  onRemoveChapter,
}) => {
  const { theme } = useVfx();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdateTitle(editValue.trim());
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      id={`chapter-section-${segmentIndex}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-3xl mx-auto my-8 pt-4 pb-2"
    >
      <div className="relative rounded-3xl p-6 bg-gradient-to-b from-slate-900/90 to-purple-950/40 border border-purple-500/30 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)] overflow-hidden group">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-48 h-24 bg-purple-500/10 blur-3xl pointer-events-none" />

        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-3 mb-3 border-b border-purple-500/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-200 text-xs font-semibold uppercase tracking-wider">
              <Bookmark className="w-3.5 h-3.5 text-purple-300" />
              Chapter {chapterNumber}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500" />
              {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
            </span>
            {readingMinutes > 0 && (
              <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                ~{readingMinutes} min read
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditing ? (
              <>
                <button
                  onClick={() => {
                    setEditValue(title);
                    setIsEditing(true);
                  }}
                  title="Rename Chapter"
                  className="px-2.5 py-1 text-xs rounded-lg text-purple-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rename</span>
                </button>

                {!isFirstSegment && onRemoveChapter && (
                  <button
                    onClick={onRemoveChapter}
                    title="Merge with previous chapter"
                    className="px-2.5 py-1 text-xs rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Merge</span>
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Chapter Title display or Inline Editor */}
        <div className="py-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder="Enter chapter title..."
                className="flex-grow px-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-400 text-white font-semibold text-lg md:text-xl focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-inner"
              />
              <button
                onClick={handleSave}
                title="Save Title"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex-shrink-0"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditValue(title);
                  setIsEditing(false);
                }}
                title="Cancel"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setEditValue(title);
                setIsEditing(true);
              }}
              className="cursor-pointer group/title flex items-center justify-between"
            >
              <h2 className={`text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-300 tracking-tight ${theme.fontFamily}`}>
                {title}
              </h2>
              <span className="opacity-0 group-hover/title:opacity-100 text-xs text-purple-300/80 font-mono transition-opacity flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> Click to edit
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
