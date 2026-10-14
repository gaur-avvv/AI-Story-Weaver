import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  Users,
  Search,
  Shield,
  Heart,
  Skull,
  User,
  Compass,
  Key,
  Flame,
  Smile,
  RefreshCw
} from 'lucide-react';
import { StorySegment, StoryChapter } from '../types';
import { 
  extractChapters, 
  setChapterAtSegment, 
  removeChapterAtSegment, 
  getChapterStats, 
  autoOrganizeChapters 
} from '../utils/chapterUtils';
import { parseCharactersFromStoryGraph, ParsedCharacter } from '../utils/characterParser';
import { globalStoryGraph } from '../services/storyGraphState';
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
  const [activeTab, setActiveTab] = useState<'chapters' | 'characters'>('chapters');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [characterSearch, setCharacterSearch] = useState<string>('');
  const [characters, setCharacters] = useState<ParsedCharacter[]>([]);
  const [isRefreshingGraph, setIsRefreshingGraph] = useState<boolean>(false);

  // Sync and parse characters from story graph whenever drawer opens or graph updates
  const refreshCharacters = React.useCallback(() => {
    try {
      const parsed = parseCharactersFromStoryGraph(segments);
      setCharacters(parsed);
    } catch (e) {
      console.warn('Error parsing characters from story graph:', e);
    }
  }, [segments]);

  useEffect(() => {
    if (isOpen) {
      refreshCharacters();
      const unsubscribe = globalStoryGraph.subscribe(() => {
        refreshCharacters();
      });
      return () => unsubscribe();
    }
  }, [isOpen, refreshCharacters]);

  const handleManualScan = () => {
    setIsRefreshingGraph(true);
    setTimeout(() => {
      refreshCharacters();
      setIsRefreshingGraph(false);
      showSuccessToast('Narrative graph refreshed with identified characters!');
    }, 400);
  };

  const chapters = useMemo(() => extractChapters(segments), [segments]);
  const totalScenes = segments.length;
  const totalWords = useMemo(() => 
    segments.reduce((acc, s) => acc + (s.paragraph ? s.paragraph.split(/\s+/).length : 0), 0),
    [segments]
  );
  const totalReadingTime = Math.max(1, Math.ceil(totalWords / 200));

  const filteredCharacters = useMemo(() => {
    const q = characterSearch.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.keyItems.some(i => i.toLowerCase().includes(q)) ||
      c.keyLocations.some(l => l.toLowerCase().includes(q))
    );
  }, [characters, characterSearch]);

  if (!isOpen) return null;

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
          className="relative w-full max-w-lg bg-slate-900/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col h-full z-10 text-white"
        >
          {/* Drawer Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                {activeTab === 'chapters' ? <BookOpen className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">
                  {activeTab === 'chapters' ? 'Chapter Outline' : 'Characters & Lore'}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeTab === 'chapters' ? 'Story Structure & Scene Pacing' : 'Identified Personas from Story Graph'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="px-5 pt-3 pb-2 bg-slate-950/40 border-b border-white/5 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'chapters'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Chapters ({chapters.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('characters')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'characters'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Characters ({characters.length})</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="px-5 py-3 bg-slate-950/60 border-b border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                {activeTab === 'chapters' ? 'Chapters' : 'Cast Size'}
              </span>
              <span className="text-purple-300 font-bold text-base">
                {activeTab === 'chapters' ? chapters.length : characters.length}
              </span>
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

          {/* TAB 1: CHAPTERS OUTLINE */}
          {activeTab === 'chapters' && (
            <>
              {/* Actions Bar */}
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <button
                  onClick={handleAutoOrganize}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
                  <span>Smart Auto-Structure Chapters</span>
                </button>
              </div>

              {/* Chapter List */}
              <div className="p-5 overflow-y-auto space-y-4 flex-grow">
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
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-mono font-bold">
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
            </>
          )}

          {/* TAB 2: CHARACTERS TAB */}
          {activeTab === 'characters' && (
            <div className="flex flex-col flex-grow overflow-hidden">
              {/* Search & Actions Bar */}
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <div className="relative flex-grow">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={characterSearch}
                    onChange={(e) => setCharacterSearch(e.target.value)}
                    placeholder="Filter by name, role, item..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                  />
                  {characterSearch && (
                    <button
                      onClick={() => setCharacterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleManualScan}
                  disabled={isRefreshingGraph}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 hover:text-white transition-colors"
                  title="Re-scan story graph"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingGraph ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Characters List */}
              <div className="p-5 overflow-y-auto space-y-4 flex-grow">
                {filteredCharacters.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-300">
                      {characterSearch ? 'No matching characters found' : 'No characters identified yet'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      {characterSearch
                        ? 'Try searching with a different character name or role.'
                        : 'Characters and their narrative descriptions are parsed automatically as your story evolves.'}
                    </p>
                    {!characterSearch && segments.length > 0 && (
                      <button
                        onClick={handleManualScan}
                        className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Scan Story Graph</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredCharacters.map((char) => {
                    const isProtagonist = char.role === 'Protagonist';
                    const isAntagonist = char.role === 'Antagonist';
                    const isCompanion = char.role === 'Companion';

                    const roleBadgeColor = isProtagonist
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : isAntagonist
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : isCompanion
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

                    const roleIcon = isProtagonist
                      ? <Shield className="w-3 h-3" />
                      : isAntagonist
                      ? <Skull className="w-3 h-3" />
                      : isCompanion
                      ? <Heart className="w-3 h-3" />
                      : <User className="w-3 h-3" />;

                    return (
                      <div
                        key={char.id}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-all space-y-3"
                      >
                        {/* Header: Name, Avatar & Role */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                              isProtagonist
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                : isAntagonist
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                                : isCompanion
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-800 border-white/10 text-slate-300'
                            }`}>
                              {char.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-base leading-tight">
                                {char.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span>Scene {char.firstSeenScene + 1} intro</span>
                                <span aria-hidden="true">·</span>
                                <span>{char.mentionCount} {char.mentionCount === 1 ? 'mention' : 'mentions'}</span>
                              </div>
                            </div>
                          </div>

                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${roleBadgeColor}`}>
                            {roleIcon}
                            <span>{char.role}</span>
                          </span>
                        </div>

                        {/* Narrative Context Description */}
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5">
                          {char.description}
                        </p>

                        {/* Lore Attributes (Mood, Items, Locations) */}
                        <div className="space-y-1.5 text-xs">
                          {char.currentMood && (
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-slate-400 text-[11px]">Current Mood:</span>
                              <span className="font-medium text-purple-300 capitalize">
                                {char.currentMood}
                              </span>
                            </div>
                          )}

                          {char.keyItems.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-300">
                              <Key className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="text-slate-400 text-[11px]">Items:</span>
                              <span className="text-slate-200 font-medium">
                                {char.keyItems.join(', ')}
                              </span>
                            </div>
                          )}

                          {char.keyLocations.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-300">
                              <Compass className="w-3 h-3 text-teal-400 shrink-0" />
                              <span className="text-slate-400 text-[11px]">Locations:</span>
                              <span className="text-slate-200 font-medium">
                                {char.keyLocations.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Active Scenes Links */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Active in Scenes:</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {char.activeScenes.map((sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => {
                                  onJumpToSegment(sIdx);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-purple-600/30 text-purple-200 hover:text-white border border-white/10 text-[11px] font-mono transition-colors"
                                title={`Jump to Scene ${sIdx + 1}`}
                              >
                                #{sIdx + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
