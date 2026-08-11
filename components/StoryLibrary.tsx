import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import type { SavedStory } from '../types';
import { BookText, PlayIcon } from './icons';

export const StoryLibrary: React.FC = () => {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('user-saved-stories');
    if (saved) {
      try {
        setStories(JSON.parse(saved).sort((a: SavedStory, b: SavedStory) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to load stories from local storage");
      }
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = stories.filter(s => s.id !== id);
    setStories(updated);
    try {
      localStorage.setItem('user-saved-stories', JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete story from local storage", err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 pt-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-display font-bold text-white/90 drop-shadow-md">Your Library</h2>
        <Link to="/" className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-xl transition-colors font-medium backdrop-blur-md shadow-sm">
          Create New Story
        </Link>
      </div>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md">
          <BookText className="w-16 h-16 text-purple-300/30 mb-4" />
          <p className="text-xl text-purple-200/60 font-medium">Your library is empty.</p>
          <p className="text-purple-200/40 mt-2">Stories you complete will be saved here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {stories.map(story => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/?load=${story.id}`)}
              className="bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 rounded-[2rem] p-6 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-[0_16px_40px_rgba(168,85,247,0.15)] flex flex-col group relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-overlay">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 rounded-[2.5rem]" />
              </div>
              
              <div className="flex-grow z-10">
                <h3 className="text-xl font-bold font-display text-white mb-2 line-clamp-2">{story.title || "Untitled Story"}</h3>
                <p className="text-sm text-purple-200/60 mb-4">
                  {new Date(story.timestamp).toLocaleDateString()} • {story.segments.length} segment{story.segments.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-slate-300 line-clamp-3 italic opacity-80">
                  "{story.segments[0]?.paragraph.substring(0, 100)}..."
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-6 z-10 border-t border-white/10 pt-4">
                <button 
                  onClick={(e) => handleDelete(story.id, e)}
                  className="text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Delete
                </button>
                <div className="flex items-center gap-1 text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
                  Read <PlayIcon className="w-4 h-4 ml-1" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
