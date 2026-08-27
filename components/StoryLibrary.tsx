import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import type { SavedStory } from '../types';
import { BookText, PlayIcon } from './icons';
import { 
  ArrowLeft, Sparkles, Trash2, Search, Calendar, BookOpen, Layers, 
  Cloud, CloudOff, CheckSquare, Square, Download, RefreshCw, AlertCircle,
  ArrowUpDown, ArrowUp, ArrowDown, X, Clock, ArrowDownAZ, ArrowUpAZ, Filter,
  Headphones
} from 'lucide-react';
import { 
  loadStories, 
  deleteStory, 
  deleteStoriesBatch, 
  getStorageHealth, 
  downloadStoriesJSON,
  isCloudSyncEnabled,
  type StorageHealth 
} from '../services/storageService';
import { downloadFullStoryAudio, hasAvailableAudio } from '../utils/audioExporter';

type SortOption = 'recent' | 'alphabetical';
type SortDirection = 'asc' | 'desc';

export const StoryLibrary: React.FC = () => {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingAudioStoryId, setDownloadingAudioStoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; title?: string; isBatch?: boolean; count?: number } | null>(null);
  const navigate = useNavigate();

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const loaded = await loadStories();
      setStories(loaded);
    } catch (e) {
      console.error("Failed to load stories:", e);
    } finally {
      setIsLoading(false);
    }
    getStorageHealth().then(setStorageHealth);
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const openDeleteSingleModal = (story: SavedStory, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({
      id: story.id,
      title: story.title || 'Untitled Adventure',
      isBatch: false,
    });
  };

  const openDeleteBatchModal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedIds.size === 0) return;
    setDeleteTarget({
      isBatch: true,
      count: selectedIds.size,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.isBatch) {
        const idsArray = Array.from(selectedIds) as string[];
        await deleteStoriesBatch(idsArray);
        setStories(prev => prev.filter(s => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
      } else if (deleteTarget.id) {
        const targetId = deleteTarget.id;
        await deleteStory(targetId);
        setStories(prev => prev.filter(s => s.id !== targetId));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
      const health = await getStorageHealth();
      setStorageHealth(health);
    } catch (err) {
      console.error("Failed to delete story:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadAudioFromLibrary = async (story: SavedStory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasAvailableAudio(story.segments)) return;
    setDownloadingAudioStoryId(story.id);
    try {
      await downloadFullStoryAudio(story.segments, story.title || 'novella-audiobook');
    } catch (err) {
      console.error('Failed to download audio from library:', err);
    } finally {
      setDownloadingAudioStoryId(null);
    }
  };

  const filteredAndSortedStories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    const filtered = stories.filter(story => {
      if (!query) return true;
      const titleMatch = (story.title || 'Untitled Adventure').toLowerCase().includes(query);
      const snippetMatch = story.segments.some(s => s.paragraph.toLowerCase().includes(query));
      return titleMatch || snippetMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'alphabetical') {
        const titleA = (a.title || 'Untitled Adventure').toLowerCase();
        const titleB = (b.title || 'Untitled Adventure').toLowerCase();
        const cmp = titleA.localeCompare(titleB);
        return sortDirection === 'asc' ? cmp : -cmp;
      } else {
        // 'recent'
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }
    });
  }, [stories, searchQuery, sortBy, sortDirection]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedStories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedStories.map(s => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Delete ${count} selected stor${count > 1 ? 'ies' : 'y'} permanently?`)) return;

    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds) as string[];
      await deleteStoriesBatch(idsArray);
      setStories(prev => prev.filter(s => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      const health = await getStorageHealth();
      setStorageHealth(health);
    } catch (err) {
      console.error("Failed to batch delete stories:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportSelected = () => {
    const toExport = stories.filter(s => selectedIds.has(s.id));
    if (toExport.length > 0) {
      downloadStoriesJSON(toExport);
    } else {
      downloadStoriesJSON(stories);
    }
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 selection:bg-purple-500/30">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 hover:text-white transition-all active:scale-95 shadow-sm"
              title="Back to Story Creator"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-white">Your Story Library</h1>
              </div>
              <p className="text-xs text-purple-200/50 mt-0.5">
                {stories.length} saved storybook{stories.length !== 1 ? 's' : ''} with offline & Puter cloud sync
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {storageHealth && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-purple-200">
                <span className={`w-2 h-2 rounded-full ${isCloudSyncEnabled() ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span>{storageHealth.formattedUsed} used</span>
              </div>
            )}
            <button
              type="button"
              onClick={fetchStories}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 hover:text-white transition-all"
              title="Refresh Library"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link 
              to="/" 
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Story</span>
            </Link>
          </div>
        </header>

        {/* Toolbar: Search, Sorting Controls, Select All, Batch Actions */}
        {stories.length > 0 && (
          <div className="space-y-3 bg-slate-900/40 p-3.5 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search input with clear button and indicator */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/50" />
                <input 
                  type="text" 
                  placeholder="Search stories by title or content snippet..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-purple-200/30 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/30 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/10"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sorting UI Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/10">
                  <span className="text-[11px] text-purple-200/50 px-2 font-medium flex items-center gap-1">
                    <Filter className="w-3 h-3 text-purple-300" />
                    <span>Sort:</span>
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy !== 'recent') {
                        setSortBy('recent');
                        setSortDirection('desc');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      sortBy === 'recent' 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'text-purple-200/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Recently Created</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy !== 'alphabetical') {
                        setSortBy('alphabetical');
                        setSortDirection('asc');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      sortBy === 'alphabetical' 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'text-purple-200/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ArrowDownAZ className="w-3 h-3" />
                    <span>Alphabetical</span>
                  </button>
                </div>

                {/* Sort Order Direction Toggle */}
                <button
                  type="button"
                  onClick={toggleSortDirection}
                  title={`Current order: ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}. Click to reverse.`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/60 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-purple-200 transition-all"
                >
                  {sortDirection === 'asc' ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 text-purple-300" />
                      <span className="hidden sm:inline">Ascending</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 text-purple-300" />
                      <span className="hidden sm:inline">Descending</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selection & Batch Actions sub-bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
              <div className="flex items-center gap-2 text-purple-200/60 text-[11px]">
                <span>
                  Showing {filteredAndSortedStories.length} of {stories.length} stories
                </span>
                {searchQuery && (
                  <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">
                    Filtered by: "{searchQuery}"
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-slate-200 transition-all"
                >
                  {selectedIds.size > 0 && selectedIds.size === filteredAndSortedStories.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{selectedIds.size > 0 ? `Select All (${selectedIds.size})` : 'Select All'}</span>
                </button>

                {selectedIds.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => openDeleteBatchModal()}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-200 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete ({selectedIds.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportSelected}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs font-semibold text-purple-200 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      <span>Export ({selectedIds.size})</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Story Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-purple-300">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-sm">Loading your storybooks...</span>
          </div>
        ) : stories.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center p-12 sm:p-16 bg-slate-900/40 border border-white/10 rounded-3xl backdrop-blur-xl text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-300">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Your library is currently empty</h3>
              <p className="text-xs text-purple-200/60 mt-1 max-w-sm">
                Stories you create and weave will automatically appear here with full offline caching and Puter cloud sync.
              </p>
            </div>
            <Link 
              to="/" 
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Your First Adventure</span>
            </Link>
          </motion.div>
        ) : filteredAndSortedStories.length === 0 ? (
          <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 text-xs text-purple-200/60">
            No stories matching "{searchQuery}". Try a different keyword or clear search.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <AnimatePresence>
              {filteredAndSortedStories.map(story => {
                const isSelected = selectedIds.has(story.id);
                return (
                  <motion.div
                    key={story.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/?load=${story.id}`)}
                    className={`group relative bg-slate-900/60 hover:bg-slate-900/90 border ${
                      isSelected ? 'border-purple-500 bg-purple-950/20' : 'border-white/10 hover:border-purple-500/40'
                    } rounded-3xl p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between overflow-hidden`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelect(story.id, e)}
                            className="p-1 text-slate-400 hover:text-purple-300 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                            )}
                          </button>

                          <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-300/70 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                            <Layers className="w-3 h-3" />
                            <span>{story.segments.length} Scene{story.segments.length !== 1 ? 's' : ''}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {story.cloudSynced ? (
                            <span title="Synced with Puter Cloud" className="flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                              <Cloud className="w-2.5 h-2.5 text-indigo-400" />
                              <span>Cloud</span>
                            </span>
                          ) : (
                            <span title="Stored Locally" className="flex items-center gap-1 text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                              <CloudOff className="w-2.5 h-2.5 text-slate-500" />
                              <span>Local</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(story.timestamp).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>

                      {/* Story Cover Image or First Scene Image */}
                      {(story.coverImageUrl || story.segments[0]?.imageUrl) && (
                        <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 my-2">
                          <img 
                            src={story.coverImageUrl || story.segments[0]?.imageUrl} 
                            alt={story.title || "Story scene"} 
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div>
                        <h3 className="text-base font-bold font-display text-white group-hover:text-purple-200 transition-colors line-clamp-2">
                          {story.title || "Untitled Adventure"}
                        </h3>
                        <p className="text-xs text-slate-300/80 line-clamp-3 mt-2 font-serif italic leading-relaxed">
                          "{story.segments[0]?.paragraph.substring(0, 120)}..."
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={(e) => openDeleteSingleModal(story, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-95"
                          title="Delete Story"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {hasAvailableAudio(story.segments) && (
                          <button
                            type="button"
                            onClick={(e) => handleDownloadAudioFromLibrary(story, e)}
                            disabled={downloadingAudioStoryId === story.id}
                            className="p-1.5 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/20 rounded-lg transition-colors active:scale-95 flex items-center gap-1 text-[11px]"
                            title="Download Audio Only (.wav narration)"
                          >
                            {downloadingAudioStoryId === story.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-300" />
                            ) : (
                              <Headphones className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">Audio</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 group-hover:text-purple-100 transition-colors">
                        <span>Read Story</span>
                        <PlayIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* In-App Delete Confirmation Modal (100% reliable inside iframe/preview) */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-purple-950/40 text-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {deleteTarget.isBatch 
                      ? `Delete ${deleteTarget.count} Selected Stories?` 
                      : 'Delete Saved Story?'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {deleteTarget.isBatch 
                      ? 'These stories will be permanently removed from local storage and cloud sync.' 
                      : `"${deleteTarget.title}" will be permanently removed.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
