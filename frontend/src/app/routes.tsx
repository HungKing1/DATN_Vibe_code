import { createBrowserRouter, Navigate } from 'react-router';

// Layouts
import { Layout as MainLayout } from './components/Layout';
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Route Guards
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';

// Existing Pages (MainApp components inside MainLayout)
import { WorkspacePage } from './components/WorkspacePage';
import { Dashboard } from './components/Dashboard';
import { FlashcardMode } from './components/FlashcardMode';
import { QuizMode } from './components/QuizMode';
import { MindMapPage } from './components/MindMapPage';
import { SettingsPage } from './components/SettingsPage';

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
      { path: 'dashboard', Component: Dashboard },
      { path: 'flashcards', Component: FlashcardMode },
      { path: 'quiz', Component: QuizMode },
      { path: 'mindmap', Component: MindMapPage },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]);
