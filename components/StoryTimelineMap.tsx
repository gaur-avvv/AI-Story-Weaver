import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  GitFork, 
  GitBranch, 
  Download, 
  Compass, 
  Sparkles, 
  ChevronRight, 
  ArrowDown, 
  BookOpen, 
  Check, 
  RotateCcw,
  ExternalLink,
  Layers
} from 'lucide-react';
import { StorySegment } from '../types';
import { buildTimelineDag, exportToTwineHtml, TimelineNode } from '../services/timelineDagService';

interface StoryTimelineMapProps {
  isOpen: boolean;
  onClose: () => void;
  segments: StorySegment[];
  storyTitle?: string;
  onJumpToSegment?: (segmentIndex: number) => void;
}

export const StoryTimelineMap: React.FC<StoryTimelineMapProps> = ({
  isOpen,
  onClose,
  segments,
  storyTitle = 'Current Story',
  onJumpToSegment,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const dagNodes = useMemo(() => {
    return buildTimelineDag(segments);
  }, [segments]);

  const selectedNode = useMemo(() => {
    return dagNodes.find(n => n.id === selectedNodeId) || dagNodes[dagNodes.length - 1] || null;
  }, [dagNodes, selectedNodeId]);

  const handleDownloadTwine = () => {
    const html = exportToTwineHtml(storyTitle, segments);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_CYOA_game.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

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
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Branching Timeline & Decision DAG</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {segments.length} Story Nodes
                </span>
              </div>
              <p className="text-xs text-slate-400">Choose-Your-Own-Adventure narrative path progression & branch mapper</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTwine}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Playable Twine (.html)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Timeline Visual Tree */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-950/60">
            {dagNodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                  <Compass className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white">No Narrative Nodes Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Start weaving a story! Every decision choice and story branch you select will be mapped into this interactive timeline tree.
                </p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6 relative py-4">
                {dagNodes.map((node, idx) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isLast = idx === dagNodes.length - 1;

                  return (
                    <div key={node.id} className="relative">
                      {/* Connecting Line to next node */}
                      {!isLast && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-purple-500/20 -mb-6 z-0" />
                      )}

                      <div 
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`relative z-10 p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-4 ${
                          isSelected 
                            ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)]' 
                            : 'bg-slate-900/60 border-white/10 hover:border-purple-500/40'
                        }`}
                      >
                        {/* Step Marker */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                          isSelected 
                            ? 'bg-purple-600 text-white shadow-lg' 
                            : 'bg-white/5 border border-white/10 text-purple-300'
                        }`}>
                          #{idx + 1}
                        </div>

                        {/* Node Summary */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-sm font-bold text-white truncate">{node.title}</h4>
                            <span className="text-[10px] text-purple-300 font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                              Depth {node.depth}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                            {node.snippet}
                          </p>

                          {/* Choice taken banner */}
                          {node.choiceTaken && (
                            <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-medium bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                              <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                              <span className="truncate">Decision: {node.choiceTaken}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Node Inspector Sidebar */}
          {selectedNode && (
            <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-xl p-5 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Node Details</span>
                  <span className="text-xs text-slate-400 font-mono">Scene #{selectedNode.segmentIndex + 1}</span>
                </div>

                <h3 className="text-base font-bold text-white mb-2">{selectedNode.title}</h3>
                
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto mb-4">
                  {selectedNode.paragraph}
                </div>

                {/* Available Choices at this branch */}
                {selectedNode.availableChoices && selectedNode.availableChoices.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Branch Options ({selectedNode.availableChoices.length})
                    </h5>
                    <div className="space-y-1.5">
                      {selectedNode.availableChoices.map((choice, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-300"
                        >
                          ✦ {choice}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Jump to Scene Button */}
              {onJumpToSegment && (
                <button
                  onClick={() => {
                    onJumpToSegment(selectedNode.segmentIndex);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md mt-4"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Jump to this Chapter
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
