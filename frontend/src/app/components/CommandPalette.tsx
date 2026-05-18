import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, MessageSquare, BarChart3, CreditCard, HelpCircle,
  Upload, Video, Settings, Map, FileText, Zap, ArrowRight,
  Globe, Brain, X, Sparkles, BookOpen, Timer
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, sendMessage } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const close = useCallback(() => {
    setCommandPaletteOpen(false);
    setQuery('');
    setSelectedIdx(0);
  }, [setCommandPaletteOpen]);

  const allCommands: CommandItem[] = [
    {
      id: 'nav-chat',
      label: 'Open Chat',
      description: 'AI workspace',
      icon: <MessageSquare className="w-4 h-4 text-blue-500" />,
      category: 'Navigation',
      action: () => { navigate('/'); close(); },
      keywords: ['chat', 'workspace', 'ai'],
    },
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Study stats & progress',
      icon: <BarChart3 className="w-4 h-4 text-emerald-500" />,
      category: 'Navigation',
      action: () => { navigate('/dashboard'); close(); },
      keywords: ['dashboard', 'stats', 'progress'],
    },
    {
      id: 'nav-flashcards',
      label: 'Flashcards',
      description: 'Study with spaced repetition',
      icon: <CreditCard className="w-4 h-4 text-violet-500" />,
      category: 'Navigation',
      action: () => { navigate('/flashcards'); close(); },
      keywords: ['flashcards', 'study', 'cards'],
    },
    {
      id: 'nav-quiz',
      label: 'Quiz Mode',
      description: 'Test your knowledge',
      icon: <HelpCircle className="w-4 h-4 text-amber-500" />,
      category: 'Navigation',
      action: () => { navigate('/quiz'); close(); },
      keywords: ['quiz', 'test', 'knowledge'],
    },
    {
      id: 'nav-mindmap',
      label: 'Mind Map',
      description: 'Visual knowledge graph',
      icon: <Map className="w-4 h-4 text-cyan-500" />,
      category: 'Navigation',
      action: () => { navigate('/mindmap'); close(); },
      keywords: ['mindmap', 'map', 'graph', 'visual'],
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'App preferences & AI model',
      icon: <Settings className="w-4 h-4 text-muted-foreground" />,
      category: 'Navigation',
      action: () => { navigate('/settings'); close(); },
      keywords: ['settings', 'preferences', 'model'],
    },

  ];

  const filtered = query.trim()
    ? allCommands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
        );
      })
    : allCommands;

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const flatFiltered = filtered;

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(p => Math.min(p + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(p => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatFiltered[selectedIdx]) {
        flatFiltered[selectedIdx].action();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search commands, pages, documents..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[55vh] overflow-y-auto py-2">
              {flatFiltered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Zap className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No commands found for "{query}"</p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-1">
                    <div className="px-4 py-1.5">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">{category}</span>
                    </div>
                    {items.map((item) => {
                      const idx = globalIdx++;
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-background' : 'bg-muted'
                          }`}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            )}
                          </div>
                          {isSelected && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-xs">↑↓</kbd>
                navigate
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-xs">↵</kbd>
                select
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-xs">⌘K</kbd>
                toggle
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
