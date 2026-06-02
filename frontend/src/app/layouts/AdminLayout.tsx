import { useState } from 'react';
import { Outlet, NavLink } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, UploadCloud, Database, LayoutDashboard, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../context/AuthContext';

const NAV_PRIMARY = [
  { to: '/admin',             label: 'Tổng quan',          icon: LayoutDashboard, end: true  },
  { to: '/admin/ingestion',   label: 'Quản lý Tài liệu',   icon: UploadCloud,     end: false },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end = false,
  collapsed = false,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          collapsed ? 'justify-center px-2' : '',
          isActive
            ? 'bg-blue-50 text-blue-600'
            : 'text-muted-foreground hover:text-accent-foreground hover:bg-accent',
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: collapsed ? 56 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex flex-col flex-shrink-0 border-r border-border bg-background relative"
      >
        {/* Brand */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 border-b border-border`}>
          <AnimatePresence>
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2.5 px-1 overflow-hidden"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                  <span className="text-sm font-bold">A</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-foreground leading-none truncate">RAG Admin</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Hệ thống AI Pháp luật</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-shrink-0"
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <p className="text-xs font-medium text-muted-foreground px-3 mb-1 mt-1 uppercase tracking-wider">
              Cơ sở tri thức
            </p>
          )}
          {collapsed && <div className="h-4" />}
          
          {NAV_PRIMARY.map(item => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Footer: user info + actions */}
        <div className={`p-2 border-t border-border flex-shrink-0 ${collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1'}`}>
          {!collapsed && (
            <>
              {/* User info */}
              <div className="px-3 py-2 mb-1">
                <p className="text-xs text-foreground font-medium truncate">{user?.email}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{user?.role}</p>
              </div>

              <Separator className="my-1 opacity-50" />

              {/* Back to app */}
              <NavLink
                to="/"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-accent-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span>Quay lại Ứng dụng</span>
              </NavLink>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </>
          )}

          {collapsed && (
            <>
              <NavLink
                to="/"
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Quay lại Ứng dụng"
              >
                <ArrowLeft className="w-4 h-4" />
              </NavLink>
              <button
                onClick={logout}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background p-8">
        <Outlet />
      </main>
    </div>
  );
}
