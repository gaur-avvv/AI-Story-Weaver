import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Keyboard, 
  BookOpen, 
  Volume2, 
  Share2, 
  GitFork, 
  Mic, 
  Languages, 
  Eye, 
  HelpCircle,
  Command
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Audio & Reading' | 'AI Studios';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Space'], description: 'Play or pause continuous voice narration', category: 'Audio & Reading' },
  { keys: ['←', '→'], description: 'Turn flipbook pages forward or backward', category: 'Audio & Reading' },
  { keys: ['Ctrl / ⌘', 'M'], description: 'Toggle voice prompt dictation modal', category: 'AI Studios' },
  { keys: ['Ctrl / ⌘', 'G'], description: 'Toggle Lore & Semantic Knowledge Graph', category: 'AI Studios' },
  { keys: ['Ctrl / ⌘', 'T'], description: 'Toggle CYOA Branching Timeline & Decision DAG', category: 'AI Studios' },
  { keys: ['Ctrl / ⌘', 'B'], description: 'Toggle Bilingual & Dual-Language Learning Studio', category: 'AI Studios' },
  { keys: ['?'], description: 'Open this keyboard shortcuts cheatsheet', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close any active modal or exit focus mode', category: 'Navigation' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const categories = ['AI Studios', 'Audio & Reading', 'Navigation'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl bg-slate-950 border border-purple-500/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Keyboard Shortcuts & Accessibility</h2>
              <p className="text-xs text-slate-400">Global shortcuts for high-speed navigation & hands-free reading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {categories.map(cat => {
            const items = SHORTCUTS.filter(s => s.category === cat);
            return (
              <div key={cat} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400/80">{cat}</h3>
                <div className="space-y-2">
                  {items.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
                    >
                      <span className="text-slate-300 font-medium">{shortcut.description}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {shortcut.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[11px] font-mono font-bold text-purple-200 shadow-sm"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-slate-900/40 text-center text-xs text-slate-400">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-purple-300 font-mono">Esc</kbd> anytime to dismiss overlays.
        </div>
      </motion.div>
    </div>
  );
};
