import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Download, Sparkles, Brain } from 'lucide-react';

interface MindNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  level: 0 | 1 | 2;
  parentId?: string;
  color: string;
  emoji: string;
  collapsed?: boolean;
}

interface Edge {
  from: string;
  to: string;
}

const INITIAL_NODES: MindNode[] = [
  // Root
  { id: 'root', label: 'AI Knowledge Base', description: '7 documents · 597 chunks', x: 500, y: 310, level: 0, color: '#3B82F6', emoji: '🧠' },
  // Level 1
  { id: 'neural', label: 'Neural Networks', description: 'Core architecture concepts', x: 195, y: 175, level: 1, parentId: 'root', color: '#8B5CF6', emoji: '🔗' },
  { id: 'training', label: 'Training & Optimization', description: 'Learning algorithms', x: 195, y: 440, level: 1, parentId: 'root', color: '#06B6D4', emoji: '⚙️' },
  { id: 'transformers', label: 'Transformers', description: 'Attention mechanisms', x: 805, y: 175, level: 1, parentId: 'root', color: '#10B981', emoji: '⚡' },
  { id: 'applications', label: 'Applications', description: 'Real-world use cases', x: 805, y: 440, level: 1, parentId: 'root', color: '#F59E0B', emoji: '🚀' },
  // Level 2 - Neural
  { id: 'layers', label: 'Layer Types', description: 'Dense, Conv, Recurrent', x: 55, y: 80, level: 2, parentId: 'neural', color: '#8B5CF6', emoji: '📐' },
  { id: 'activation', label: 'Activation Fns', description: 'ReLU, Sigmoid, Tanh', x: 50, y: 175, level: 2, parentId: 'neural', color: '#8B5CF6', emoji: '⚡' },
  { id: 'cnn', label: 'CNNs', description: 'Convolutional networks', x: 55, y: 270, level: 2, parentId: 'neural', color: '#8B5CF6', emoji: '🖼️' },
  // Level 2 - Training
  { id: 'backprop', label: 'Backpropagation', description: 'Chain rule gradient flow', x: 55, y: 375, level: 2, parentId: 'training', color: '#06B6D4', emoji: '↩️' },
  { id: 'gradient', label: 'Gradient Descent', description: 'SGD, Adam, RMSProp', x: 50, y: 465, level: 2, parentId: 'training', color: '#06B6D4', emoji: '📉' },
  { id: 'regularize', label: 'Regularization', description: 'Dropout, BatchNorm', x: 60, y: 550, level: 2, parentId: 'training', color: '#06B6D4', emoji: '🛡️' },
  // Level 2 - Transformers
  { id: 'attention', label: 'Self-Attention', description: 'Q, K, V mechanism', x: 920, y: 80, level: 2, parentId: 'transformers', color: '#10B981', emoji: '👁️' },
  { id: 'bert', label: 'BERT', description: 'Bidirectional encoder', x: 930, y: 175, level: 2, parentId: 'transformers', color: '#10B981', emoji: '🤗' },
  { id: 'gpt', label: 'GPT', description: 'Autoregressive decoder', x: 920, y: 270, level: 2, parentId: 'transformers', color: '#10B981', emoji: '💬' },
  // Level 2 - Applications
  { id: 'vision', label: 'Computer Vision', description: 'Object detection, segmentation', x: 920, y: 375, level: 2, parentId: 'applications', color: '#F59E0B', emoji: '👀' },
  { id: 'nlp', label: 'NLP', description: 'Text classification, generation', x: 940, y: 460, level: 2, parentId: 'applications', color: '#F59E0B', emoji: '💬' },
  { id: 'transfer', label: 'Transfer Learning', description: 'Fine-tuning pretrained models', x: 920, y: 545, level: 2, parentId: 'applications', color: '#F59E0B', emoji: '🔄' },
];

const EDGES: Edge[] = [
  { from: 'root', to: 'neural' },
  { from: 'root', to: 'training' },
  { from: 'root', to: 'transformers' },
  { from: 'root', to: 'applications' },
  { from: 'neural', to: 'layers' },
  { from: 'neural', to: 'activation' },
  { from: 'neural', to: 'cnn' },
  { from: 'training', to: 'backprop' },
  { from: 'training', to: 'gradient' },
  { from: 'training', to: 'regularize' },
  { from: 'transformers', to: 'attention' },
  { from: 'transformers', to: 'bert' },
  { from: 'transformers', to: 'gpt' },
  { from: 'applications', to: 'vision' },
  { from: 'applications', to: 'nlp' },
  { from: 'applications', to: 'transfer' },
];

function getNodeRadius(level: number) {
  return level === 0 ? 52 : level === 1 ? 42 : 34;
}

function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function MindMapPage() {
  const [nodes, setNodes] = useState<MindNode[]>(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [animKey, setAnimKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedId);

  const visibleNodeIds = new Set<string>();
  nodes.forEach(n => {
    if (n.level === 0) visibleNodeIds.add(n.id);
    if (n.level === 1) visibleNodeIds.add(n.id);
    if (n.level === 2) {
      const parent = nodes.find(p => p.id === n.parentId);
      if (parent && !parent.collapsed) visibleNodeIds.add(n.id);
    }
  });

  const visibleNodes = nodes.filter(n => visibleNodeIds.has(n.id));
  const visibleEdges = EDGES.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));

  const toggleCollapse = (id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, collapsed: !n.collapsed } : n));
  };

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
    const node = nodes.find(n => n.id === id);
    if (node && node.level === 1) toggleCollapse(id);
  };

  const handleRegenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setAnimKey(p => p + 1);
      setGenerating(false);
    }, 1200);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom(prev => Math.min(2, Math.max(0.4, prev + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('.mind-node')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-foreground">Knowledge Mind Map</span>
          <span className="px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 rounded-full text-xs border border-cyan-200 dark:border-cyan-800">
            7 documents
          </span>
          <span className="text-xs text-muted-foreground ml-1">Click level-1 nodes to expand/collapse</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(p => Math.min(2, p + 0.1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(p => Math.max(0.4, p - 0.1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(0.85); setPan({ x: 0, y: 0 }); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            title="Fit to screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg text-xs hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {generating ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.div>
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onWheel={handleWheel}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Gradient defs */}
            {['blue', 'violet', 'cyan', 'emerald', 'amber'].map(color => {
              const colorMap: Record<string, [string, string]> = {
                blue: ['#3B82F6', '#1D4ED8'],
                violet: ['#8B5CF6', '#6D28D9'],
                cyan: ['#06B6D4', '#0891B2'],
                emerald: ['#10B981', '#059669'],
                amber: ['#F59E0B', '#D97706'],
              };
              const [c1, c2] = colorMap[color];
              return (
                <linearGradient key={color} id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
              );
            })}
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: '50% 50%' }}>
            {/* Edges */}
            {visibleEdges.map(edge => {
              const from = nodes.find(n => n.id === edge.from)!;
              const to = nodes.find(n => n.id === edge.to)!;
              return (
                <motion.path
                  key={`${edge.from}-${edge.to}-${animKey}`}
                  d={getBezierPath(from.x, from.y, to.x, to.y)}
                  fill="none"
                  stroke={from.color}
                  strokeWidth={from.level === 0 ? 2.5 : 1.5}
                  strokeOpacity={0.35}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: from.level * 0.2, ease: 'easeInOut' }}
                />
              );
            })}

            {/* Nodes */}
            {visibleNodes.map((node) => {
              const r = getNodeRadius(node.level);
              const isSelected = selectedId === node.id;
              const colorName = node.color === '#3B82F6' ? 'blue'
                : node.color === '#8B5CF6' ? 'violet'
                : node.color === '#06B6D4' ? 'cyan'
                : node.color === '#10B981' ? 'emerald'
                : 'amber';

              return (
                <motion.g
                  key={`${node.id}-${animKey}`}
                  className="mind-node"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: node.level * 0.15 + (node.level === 2 ? 0.3 : 0),
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNodeClick(node.id)}
                >
                  {/* Glow ring when selected */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r + 8}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={2}
                      strokeOpacity={0.4}
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Node background */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r}
                    fill={`url(#grad-${colorName})`}
                    fillOpacity={node.level === 2 ? 0.12 : 0.18}
                    stroke={node.color}
                    strokeWidth={node.level === 0 ? 2.5 : 1.5}
                    strokeOpacity={isSelected ? 1 : 0.6}
                  />

                  {/* Emoji */}
                  <text
                    x={node.x}
                    y={node.level === 0 ? node.y - 10 : node.level === 1 ? node.y - 8 : node.y - 6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: node.level === 0 ? '22px' : node.level === 1 ? '16px' : '13px' }}
                  >
                    {node.emoji}
                  </text>

                  {/* Label inside node */}
                  <text
                    x={node.x}
                    y={node.level === 0 ? node.y + 12 : node.level === 1 ? node.y + 10 : node.y + 9}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={node.color}
                    style={{
                      fontSize: node.level === 0 ? '11px' : node.level === 1 ? '10px' : '9px',
                      fontWeight: 600,
                      fontFamily: 'Inter, sans-serif',
                      userSelect: 'none',
                    }}
                  >
                    {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                  </text>

                  {/* Collapse indicator for level 1 */}
                  {node.level === 1 && (
                    <text
                      x={node.x + r - 6}
                      y={node.y - r + 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={node.color}
                      style={{ fontSize: '10px', userSelect: 'none' }}
                    >
                      {node.collapsed ? '+' : '−'}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </g>
        </svg>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-4 px-2.5 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-card border border-border rounded-xl p-3 space-y-1.5">
          {[
            { color: '#3B82F6', label: 'Knowledge Base' },
            { color: '#8B5CF6', label: 'Neural Networks' },
            { color: '#06B6D4', label: 'Training' },
            { color: '#10B981', label: 'Transformers' },
            { color: '#F59E0B', label: 'Applications' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Selected node tooltip */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl px-4 py-2.5 shadow-lg pointer-events-none"
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '16px' }}>{selectedNode.emoji}</span>
                <div>
                  <p className="text-sm text-foreground">{selectedNode.label}</p>
                  <p className="text-xs text-muted-foreground">{selectedNode.description}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generating overlay */}
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}
            >
              <div className="bg-card border border-border rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-5 h-5 text-blue-500" />
                </motion.div>
                <span className="text-sm text-foreground">Regenerating knowledge graph...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
