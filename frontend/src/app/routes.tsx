import { createBrowserRouter, Navigate } from 'react-router';

// Layouts
import { Layout as MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Route Guards
import { ProtectedRoute, AdminRoute } from './guards/RouteGuards';

// Existing Pages (MainApp components inside MainLayout)
import { WorkspacePage } from './pages/workspace/WorkspacePage';
import { LegalDocumentPage } from './pages/legal/LegalDocumentPage';
import { LegalDocumentViewer } from './pages/legal/LegalDocumentViewer';

// New Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { IngestionPage } from './pages/admin/IngestionPage';
import { LegalQAPage } from './pages/legalQA/LegalQAPage';

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
      { path: 'legal', Component: LegalDocumentPage },
      { path: 'legal/:soKyHieu', Component: LegalDocumentViewer },
      { path: 'legal-qa', Component: LegalQAPage },
    ],
  },
]);
