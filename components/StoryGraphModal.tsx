import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  ShieldAlert, 
  CheckCircle2, 
  User, 
  MapPin, 
  Package, 
  Users, 
  Flame, 
  Layers, 
  Activity, 
  Share2, 
  ChevronRight, 
  Info,
  Maximize2,
  Sparkles,
  FileJson
} from 'lucide-react';
import { globalStoryGraph } from '../services/storyGraphState';
import { GraphNode, GraphEdge, EntityType } from '../types';

interface StoryGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyTitle?: string;
  onJumpToSegment?: (segmentIndex: number) => void;
}

type TabMode = 'graph' | 'audit' | 'timeline';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const TYPE_CONFIG: Record<EntityType, {
  label: string;
  color: string;
  glow: string;
  border: string;
  bg: string;
  text: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  character: {
    label: 'Character',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    border: 'border-purple-500/40',
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: User,
  },
  location: {
    label: 'Location',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: MapPin,
  },
  item: {
    label: 'Item / Artifact',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Package,
  },
  faction: {
    label: 'Faction',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
    border: 'border-blue-500/40',
    bg: 'bg-blue-950/40',
    text: 'text-blue-300',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: Users,
  },
  event: {
    label: 'Event',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.4)',
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: Flame,
  },
};

export const StoryGraphModal: React.FC<StoryGraphModalProps> = ({
  isOpen,
  onClose,
  storyTitle = 'Current Story',
  onJumpToSegment,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('graph');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [simPositions, setSimPositions] = useState<Record<string, { x: number; y: number }>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync graph state on mount and subscribe to live changes
  useEffect(() => {
    if (!isOpen) return;

    const refreshData = () => {
      const gNodes = globalStoryGraph.getNodes();
      const gEdges = globalStoryGraph.getEdges();
      setNodes([...gNodes]);
      setEdges([...gEdges]);
    };

    refreshData();
    const unsubscribe = globalStoryGraph.subscribe(refreshData);
    return () => unsubscribe();
  }, [isOpen]);

  // Initialize or update circular / force-like positions
  useEffect(() => {
    if (nodes.length === 0) return;

    setSimPositions(prev => {
      const next: Record<string, { x: number; y: number }> = { ...prev };
      const width = 800;
      const height = 550;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 80;

      nodes.forEach((node, idx) => {
        if (!next[node.id]) {
          const angle = (idx / nodes.length) * 2 * Math.PI;
          const jitter = (idx % 2 === 0 ? 0.85 : 1.15);
          next[node.id] = {
            x: centerX + Math.cos(angle) * radius * jitter,
            y: centerY + Math.sin(angle) * radius * jitter,
          };
        }
      });
      return next;
    });
  }, [nodes]);

  // Selected node details
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Connected edges for the selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
  }, [edges, selectedNodeId]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const matchesType = filterType === 'all' || n.type === filterType;
      const matchesSearch = !searchQuery.trim() || n.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [nodes, filterType, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  // Edges whose endpoints are both currently visible, so a type/search filter never
  // leaves relationship lines pointing at hidden nodes.
  const filteredEdges = useMemo(() => {
    return edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Canvas pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-canvas-bg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggedNodeId && svgRef.current) {
      // Convert browser-pixel coordinates into the SVG's 800x550 viewBox space first,
      // since the container can render at any responsive size other than 800x550.
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      const svgX = (e.clientX - rect.left) * (viewBox.width / rect.width);
      const svgY = (e.clientY - rect.top) * (viewBox.height / rect.height);
      const rawX = (svgX - pan.x) / zoom;
      const rawY = (svgY - pan.y) / zoom;
      setSimPositions(prev => ({
        ...prev,
        [draggedNodeId]: { x: rawX, y: rawY },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggedNodeId(null);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  // Export graph as JSON
  const handleExportJson = () => {
    const data = {
      storyTitle,
      exportDate: new Date().toISOString(),
      nodes,
      edges,
      inconsistencyAudit: globalStoryGraph.getInconsistencyAudit(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_knowledge_graph.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Narrative consistency audit analysis
  const auditReport = useMemo(() => {
    return globalStoryGraph.getInconsistencyAudit();
  }, [nodes, edges]);

  const auditItems = useMemo(() => {
    if (!auditReport) return [];
    return auditReport.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, ''));
  }, [auditReport]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-6xl h-[90vh] bg-slate-950 border border-purple-500/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Lore & Semantic Knowledge Graph</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {nodes.length} Entities • {edges.length} Relations
                </span>
              </div>
              <p className="text-xs text-slate-400">Interactive narrative continuity map & character sentiment intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs font-medium">
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'graph' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Network Graph
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'timeline' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Character Arcs
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'audit' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Continuity Audit
                {auditItems.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[10px] flex items-center justify-center font-bold">
                    {auditItems.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={handleExportJson}
              title="Export Knowledge Graph JSON"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <FileJson className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {activeTab === 'graph' && (
            <>
              {/* Graph Main Canvas Area */}
              <div 
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="flex-1 relative bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
              >
                {/* Canvas Background Grid */}
                <div 
                  id="graph-canvas-bg"
                  className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25" 
                />

                {/* Top Control Toolbar */}
                <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                  {/* Search and Filters */}
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search entities..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-48 sm:w-56 pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          filterType === 'all' ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({nodes.length})
                      </button>
                      {(['character', 'location', 'item', 'faction', 'event'] as EntityType[]).map(type => {
                        const count = nodes.filter(n => n.type === type).length;
                        if (count === 0) return null;
                        const config = TYPE_CONFIG[type];
                        return (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                              filterType === type ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                            <span className="capitalize">{type}</span> ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto">
                    <button
                      onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-slate-400 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3 bg-white/10" />
                    <button
                      onClick={handleResetView}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                      title="Reset View"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* SVG Graph View */}
                {nodes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-semibold text-white">No Lore Entities Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      As your story generates, characters, ancient items, and locations will be automatically analyzed and mapped here into a live semantic knowledge graph.
                    </p>
                  </div>
                ) : (
                  <svg
                    ref={svgRef}
                    className="w-full h-full"
                    viewBox="0 0 800 550"
                  >
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="7"
                        markerHeight="5"
                        refX="18"
                        refY="2.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 7 2.5, 0 5" fill="#94a3b8" opacity="0.6" />
                      </marker>
                      <marker
                        id="arrowhead-selected"
                        markerWidth="8"
                        markerHeight="6"
                        refX="20"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 8 3, 0 6" fill="#c084fc" />
                      </marker>
                    </defs>

                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                      {/* Relationship Edges */}
                      {filteredEdges.map(edge => {
                        const srcPos = simPositions[edge.source];
                        const tgtPos = simPositions[edge.target];
                        if (!srcPos || !tgtPos) return null;

                        const isConnectedToSelected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
                        const isDimmed = selectedNodeId && !isConnectedToSelected;

                        const midX = (srcPos.x + tgtPos.x) / 2;
                        const midY = (srcPos.y + tgtPos.y) / 2;

                        return (
                          <g key={edge.id} className="transition-opacity duration-200" opacity={isDimmed ? 0.15 : 1}>
                            <line
                              x1={srcPos.x}
                              y1={srcPos.y}
                              x2={tgtPos.x}
                              y2={tgtPos.y}
                              stroke={isConnectedToSelected ? '#c084fc' : '#475569'}
                              strokeWidth={isConnectedToSelected ? 2.5 : 1.2}
                              strokeDasharray={isConnectedToSelected ? undefined : '3,3'}
                              markerEnd={isConnectedToSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                            />
                            {/* Edge Relationship Label */}
                            <g transform={`translate(${midX}, ${midY})`}>
                              <rect
                                x="-45"
                                y="-9"
                                width="90"
                                height="18"
                                rx="5"
                                fill="#090d16"
                                stroke={isConnectedToSelected ? '#c084fc' : '#334155'}
                                strokeWidth="0.8"
                              />
                              <text
                                textAnchor="middle"
                                dy="3.5"
                                fill={isConnectedToSelected ? '#e9d5ff' : '#94a3b8'}
                                fontSize="9"
                                fontWeight="bold"
                                letterSpacing="0.05em"
                              >
                                {edge.relationship.replace(/_/g, ' ')}
                              </text>
                            </g>
                          </g>
                        );
                      })}

                      {/* Entity Nodes */}
                      {filteredNodes.map(node => {
                        const pos = simPositions[node.id] || { x: 400, y: 275 };
                        const config = TYPE_CONFIG[node.type] || TYPE_CONFIG.character;
                        const isSelected = node.id === selectedNodeId;
                        const isConnected = selectedNodeId && connectedEdges.some(e => e.source === node.id || e.target === node.id);
                        const isDimmed = selectedNodeId && !isSelected && !isConnected;

                        return (
                          <g
                            key={node.id}
                            transform={`translate(${pos.x}, ${pos.y})`}
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                            }}
                            onMouseDown={e => {
                              e.stopPropagation();
                              setDraggedNodeId(node.id);
                            }}
                            className="cursor-pointer transition-opacity duration-200"
                            opacity={isDimmed ? 0.25 : 1}
                          >
                            {/* Outer Glow Halo */}
                            {isSelected && (
                              <circle
                                r="32"
                                fill="none"
                                stroke={config.color}
                                strokeWidth="2"
                                strokeDasharray="4,4"
                                className="animate-spin"
                                style={{ animationDuration: '8s' }}
                              />
                            )}

                            {/* Node Background Disc */}
                            <circle
                              r={isSelected ? 22 : 18}
                              fill="#090d16"
                              stroke={isSelected ? '#ffffff' : config.color}
                              strokeWidth={isSelected ? 2.5 : 1.8}
                              className="transition-all duration-200 hover:scale-110"
                              style={{
                                filter: isSelected ? `drop-shadow(0 0 12px ${config.glow})` : undefined,
                              }}
                            />

                            {/* Entity Type Initial Badge */}
                            <text
                              textAnchor="middle"
                              dy="4"
                              fill={isSelected ? '#ffffff' : config.color}
                              fontSize="12"
                              fontWeight="bold"
                            >
                              {node.name.slice(0, 1).toUpperCase()}
                            </text>

                            {/* Node Label Text */}
                            <g transform="translate(0, 30)">
                              <rect
                                x={-(node.name.length * 3.8) - 8}
                                y="-10"
                                width={node.name.length * 7.6 + 16}
                                height="19"
                                rx="6"
                                fill="#0f172a"
                                stroke={isSelected ? config.color : 'rgba(255,255,255,0.1)'}
                                strokeWidth="1"
                              />
                              <text
                                textAnchor="middle"
                                dy="3.5"
                                fill="#f8fafc"
                                fontSize="10.5"
                                fontWeight={isSelected ? 'bold' : 'normal'}
                              >
                                {node.name}
                              </text>
                            </g>

                            {/* Mention Count Badge */}
                            {node.mentionCount > 1 && (
                              <g transform="translate(14, -14)">
                                <circle r="7" fill={config.color} />
                                <text
                                  textAnchor="middle"
                                  dy="3"
                                  fill="#ffffff"
                                  fontSize="8.5"
                                  fontWeight="bold"
                                >
                                  {node.mentionCount}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                )}
              </div>

              {/* Entity Inspector Side Panel */}
              <AnimatePresence>
                {selectedNode && (
                  <motion.div
                    initial={{ x: 320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 320, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-80 border-l border-white/10 bg-slate-900/90 backdrop-blur-xl p-5 flex flex-col overflow-y-auto"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: TYPE_CONFIG[selectedNode.type]?.color }} 
                        />
                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                          {selectedNode.type}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedNodeId(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Entity Name & Current State */}
                    <div className="py-4">
                      <h3 className="text-xl font-bold text-white">{selectedNode.name}</h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs rounded-md bg-white/5 border border-white/10 text-slate-300">
                          Mentions: {selectedNode.mentionCount}
                        </span>
                        {selectedNode.currentEmotion && (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                            Mood: {selectedNode.currentEmotion}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Emotional Arc (If Character) */}
                    {selectedNode.type === 'character' && selectedNode.emotionalTrend && selectedNode.emotionalTrend.length > 0 && (
                      <div className="mb-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20">
                        <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <Activity className="w-3.5 h-3.5" />
                          Emotional Sentiment Arc
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {selectedNode.emotionalTrend.map((trend, i) => (
                            <React.Fragment key={i}>
                              <span className="px-2 py-0.5 rounded bg-purple-900/50 border border-purple-400/30 text-purple-200">
                                {trend.sentiment}
                              </span>
                              {i < (selectedNode.emotionalTrend?.length || 0) - 1 && (
                                <ChevronRight className="w-3 h-3 text-purple-400/60" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Relationships */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Relationships ({connectedEdges.length})
                      </h4>
                      {connectedEdges.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No direct connections mapped yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {connectedEdges.map(edge => {
                            const isSource = edge.source === selectedNode.id;
                            const otherId = isSource ? edge.target : edge.source;
                            const otherNode = nodes.find(n => n.id === otherId);
                            const otherName = otherNode?.name || otherId;

                            return (
                              <div
                                key={edge.id}
                                onClick={() => setSelectedNodeId(otherId)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer text-xs flex items-center justify-between transition-colors"
                              >
                                <div>
                                  <span className="text-purple-300 font-medium">
                                    {isSource ? '→ ' : '← '}
                                    {edge.relationship.toLowerCase().replace(/_/g, ' ')}
                                  </span>{' '}
                                  <span className="text-slate-200 font-semibold">{otherName}</span>
                                </div>
                                <span className="text-[10px] text-slate-500">Ch. {edge.segmentIndex + 1}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Scene Occurrences */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Scene Appearances ({selectedNode.occurrences.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedNode.occurrences.map((occ, idx) => (
                          <div
                            key={idx}
                            onClick={() => onJumpToSegment && onJumpToSegment(occ.segmentIndex)}
                            className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 hover:border-purple-500/30 text-xs transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between text-[11px] text-purple-300 font-semibold mb-1">
                              <span>Scene {occ.segmentIndex + 1}</span>
                              <span className="group-hover:text-white transition-colors">Jump →</span>
                            </div>
                            <p className="text-slate-400 text-[11px] line-clamp-2 italic">
                              "{occ.snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Character Sentiment Arcs Tab */}
          {activeTab === 'timeline' && (
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Character Emotional Arcs & Sentiment Trajectories</h3>
                  <p className="text-xs text-slate-400">Tracks psychological sentiment transitions across story chapters to prevent out-of-character behavior.</p>
                </div>

                {nodes.filter(n => n.type === 'character').length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-white/5 rounded-2xl bg-white/[0.02]">
                    No characters identified in the narrative yet.
                  </div>
                ) : (
                  nodes
                    .filter(n => n.type === 'character')
                    .map(char => {
                      const trends = char.emotionalTrend || [];
                      return (
                        <div key={char.id} className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-white">{char.name}</h4>
                                <span className="text-xs text-slate-400">{char.mentionCount} mentions across story</span>
                              </div>
                            </div>
                            {char.currentEmotion && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Current State: {char.currentEmotion}
                              </span>
                            )}
                          </div>

                          {trends.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No sentiment transitions recorded yet.</p>
                          ) : (
                            <div className="relative pl-4 border-l-2 border-purple-500/30 space-y-4 my-2">
                              {trends.map((t, idx) => (
                                <div key={idx} className="relative flex items-center justify-between">
                                  <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-purple-500 ring-4 ring-slate-950" />
                                  <div>
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">{t.sentiment}</span>
                                    <span className="text-xs text-slate-400 ml-2">in Chapter / Scene {t.segmentIndex + 1}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono">Step #{idx + 1}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* Continuity Audit Tab */}
          {activeTab === 'audit' && (
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Narrative Continuity & Consistency Audit</h3>
                  <p className="text-xs text-slate-400">
                    Rule-based and semantic validation checking for item possession conflicts, dead/captive character contradictions, and allegiance shifts.
                  </p>
                </div>

                {auditItems.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-4 text-emerald-300">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-base font-bold text-emerald-200">No Narrative Contradictions Detected</h4>
                      <p className="text-xs text-emerald-300/80 mt-1">
                        All character status flags, object possessions, and relationship alignments are logically consistent across all chapters.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3 text-amber-200"
                      >
                        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                            Continuity Advisory #{idx + 1}
                          </span>
                          <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Audit Explanation */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 space-y-2">
                  <h5 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-400" />
                    How Narrative Continuity Auditing Works:
                  </h5>
                  <p>
                    The Knowledge Graph builds an in-memory ontology during story generation. When generating future branches, these audit findings are injected into the LLM system prompt as negative constraints to prevent common AI storytelling flaws such as:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li><strong>Possession Duplication:</strong> An ancient artifact claimed by one adventurer suddenly being held by another without transfer.</li>
                    <li><strong>Status Amnesia:</strong> A character incapacitated, poisoned, or imprisoned abruptly acting with full autonomy in subsequent scenes.</li>
                    <li><strong>Allegiance Incoherence:</strong> Factions or companions toggling between ally and mortal enemy without narrative justification.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
