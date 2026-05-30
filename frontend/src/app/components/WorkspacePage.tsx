import { ChatPanel } from './ChatPanel';
import { Settings, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';

export function WorkspacePage() {
  const { setCommandPaletteOpen } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Workspace top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">



        </div>

        <div className="flex items-center gap-1">
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
