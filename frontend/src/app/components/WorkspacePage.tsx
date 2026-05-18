import { ChatPanel } from './ChatPanel';
import { ThemeToggle } from './ThemeToggle';
import { Settings, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';

export function WorkspacePage() {
  const { setCommandPaletteOpen, laws } = useApp();
  const navigate = useNavigate();
  const readyDocs = laws.filter(d => d.status === 'active').length;

  return (
    <div className="flex flex-col h-full">
      {/* Workspace top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Clickable search / command trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border border-border rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Search or ask anything...</span>
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs hidden sm:inline">⌘K</kbd>
          </button>

          {/* Status pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400">{readyDocs} sources active</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center ml-1 flex-shrink-0">
            <span className="text-white" style={{ fontSize: '11px' }}>A</span>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  );
}
