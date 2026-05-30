import { createBrowserRouter, Navigate } from 'react-router';

// Layouts
import { Layout as MainLayout } from './components/Layout';
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Route Guards
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';

// Existing Pages (MainApp components inside MainLayout)
import { WorkspacePage } from './components/WorkspacePage';
import { SettingsPage } from './components/SettingsPage';
import { LegalDocumentPage } from './components/LegalDocumentPage';
import { LegalDocumentViewer } from './components/LegalDocumentViewer';

// New Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { IngestionPage } from './pages/Admin/IngestionPage';
import { CollectionRegistryPage } from './pages/Admin/CollectionRegistryPage';

export const router = createBrowserRouter([
  // ---------------------------------------------
  // GROUP 1: Auth routes (Login, Signup)
  // ---------------------------------------------
  {
    path: '/auth',
    Component: AuthLayout,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', Component: LoginPage },
      { path: 'signup', Component: SignupPage },
    ],
  },

  // ---------------------------------------------
  // GROUP 2: Admin routes (ROLE_ADMIN only)
  // ---------------------------------------------
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, Component: AdminDashboard },
      { path: 'ingestion', Component: IngestionPage },
      { path: 'collections', Component: CollectionRegistryPage },
    ],
  },

  // ---------------------------------------------
  // GROUP 3: Main App routes (Authenticated users)
  // ---------------------------------------------
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: WorkspacePage },
      { path: 'settings', Component: SettingsPage },
      { path: 'legal', Component: LegalDocumentPage },
      { path: 'legal/:soKyHieu', Component: LegalDocumentViewer },
    ],
  },
]);
