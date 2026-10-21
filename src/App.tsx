import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from './hooks/useUser';

import LandingPage     from './pages/LandingPage';
import LoginPage       from './pages/LoginPage';
import DocsPage        from './pages/DocsPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import OverviewPage    from './pages/dashboard/OverviewPage';
import FilesPage       from './pages/dashboard/FilesPage';
import UploadPage      from './pages/dashboard/UploadPage';
import SharedPage      from './pages/dashboard/SharedPage';
import WorkspacesPage  from './pages/dashboard/WorkspacesPage';
import ApiPage         from './pages/dashboard/ApiPage';
import RepositoryPage  from './pages/dashboard/RepositoryPage';
import StoragePage     from './pages/dashboard/StoragePage';
import SettingsPage    from './pages/dashboard/SettingsPage';
import SandboxPage    from './pages/dashboard/SandboxPage';
import PublicSharePage from './pages/PublicSharePage';
import AuthCallbackPage from './pages/AuthCallbackPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useUser();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !user) {
    // Clear all cached queries before redirecting so no stale data is shown
    // if the user logs back in (or a different user logs in) in the same tab.
    queryClient.clear();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/docs"  element={<DocsPage />} />
        <Route path="/share/:token" element={<PublicSharePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index                element={<OverviewPage />} />
          <Route path="files"         element={<FilesPage />} />
          <Route path="upload"        element={<UploadPage />} />
          <Route path="shared"        element={<SharedPage />} />
          <Route path="workspaces"    element={<WorkspacesPage />} />
          <Route path="api"           element={<ApiPage />} />
          <Route path="sandbox"       element={<SandboxPage />} />
          <Route path="repository"    element={<RepositoryPage />} />
          <Route path="storage"       element={<StoragePage />} />
          <Route path="settings"      element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
