import { Outlet, NavLink } from 'react-router';
import {
  ArrowLeft, UploadCloud, Database, LayoutDashboard, LogOut,
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../context/AuthContext';

const NAV_PRIMARY = [
  { to: '/admin',             label: 'Tổng quan',          icon: LayoutDashboard, end: true  },
  { to: '/admin/ingestion',   label: 'Quản lý Tài liệu',   icon: UploadCloud,     end: false },
  { to: '/admin/collections', label: 'Collection Registry', icon: Database,        end: false },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end = false,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </NavLink>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col flex-shrink-0 border-r border-border bg-sidebar">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 text-sm">
            ⚖️
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-none">RAG Admin</p>
            <p className="text-xs text-muted-foreground mt-0.5">Legal AI System</p>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground px-3 mb-1 mt-1 uppercase tracking-wider">
            Knowledge Base
          </p>
          {NAV_PRIMARY.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Footer: user info + actions */}
        <div className="p-3 border-t border-border space-y-1">
          {/* User info */}
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{user?.role}</p>
          </div>

          <Separator />

          {/* Back to app */}
          <NavLink
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            Quay lai App
          </NavLink>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Dang xuat
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-muted/20 p-8">
        <Outlet />
      </main>
    </div>
  );
}
