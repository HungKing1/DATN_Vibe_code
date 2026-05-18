import { Outlet, useLocation } from 'react-router';
import { LeftSidebar } from './LeftSidebar';
import { SourcePanel } from './SourcePanel';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { Settings, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';

import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';

export function Layout() {
  const location = useLocation();
  const isWorkspace = location.pathname === '/';
  const { setCommandPaletteOpen } = useApp();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar */}
      <LeftSidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top navbar - only on non-workspace pages */}
        {!isWorkspace && (
          <header className="flex items-center justify-between px-6 py-2.5 border-b border-border bg-card flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl flex-1 hover:bg-accent transition-colors text-left"
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1">Search anything...</span>
                <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs text-muted-foreground">⌘K</kbd>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />

              <button
                onClick={() => navigate('/settings')}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center ml-1 flex-shrink-0">
                <span className="text-white text-xs">A</span>
              </div>
            </div>
          </header>
        )}

        {/* Content area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden">
            <Outlet />
          </div>
          {/* Right source panel - only on workspace */}
          {isWorkspace && <SourcePanel />}
        </div>
      </div>

      {/* Modals */}
      <CommandPalette />
    </div>
  );
}
