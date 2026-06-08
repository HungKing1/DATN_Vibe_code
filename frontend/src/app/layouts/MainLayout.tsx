import { Outlet, useLocation, Navigate } from 'react-router';
import { LeftSidebar } from '../components/LeftSidebar';
import { ReferencePanel } from '../components/ReferencePanel';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const location = useLocation();
  const isWorkspace = location.pathname === '/';
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Đang tải...</div>;
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

        {/* Content area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <Outlet />
          </div>
          
          {/* Side Panel for Legal Reference */}
          {(location.pathname === '/' || location.pathname.startsWith('/legal-qa')) && <ReferencePanel />}
        </div>
      </div>
    </div>
  );
}
