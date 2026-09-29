import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GuideProvider } from './context/GuideContext';
import LoginPage from './pages/LoginPage';

// Lazy-loaded portals to dramatically reduce initial bundle size
const StudentPortalPage = React.lazy(() => import('./pages/StudentPortalPage'));
const AdvisorPortalPage = React.lazy(() => import('./pages/AdvisorPortalPage'));
const HodPortalPage = React.lazy(() => import('./pages/HodPortalPage'));
const AdminPortalPage = React.lazy(() => import('./pages/AdminPortalPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

// Guide Portal components & layout
const GuideLayout = React.lazy(() => import('./layouts/GuideLayout'));
const ApproveProject = React.lazy(() => import('./pages/guide/ApproveProject'));
const MyTeams = React.lazy(() => import('./pages/guide/MyTeams'));
const WeeklySubmissions = React.lazy(() => import('./pages/guide/WeeklySubmissions'));
const SubmissionHistory = React.lazy(() => import('./pages/guide/SubmissionHistory'));

const PortalLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
    <p className="text-sm font-medium text-slate-400 tracking-wide">Loading workspace...</p>
  </div>
);

const RoleBasedHome: React.FC = () => {
  const { currentUser, activeRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = (activeRole || currentUser.role || '').toLowerCase();

  switch (role) {
    case 'guide':
      return <Navigate to="/guide/approve-submissions" replace />;
    case 'advisor':
      return <Navigate to="/advisor" replace />;
    case 'hod':
      return <Navigate to="/hod" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'student':
      return <Navigate to="/student" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const ProtectedRoute: React.FC<{ allowedRoles?: string[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { currentUser, activeRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = (activeRole || currentUser.role || '').toLowerCase();
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PortalLoadingFallback />}>
          <Routes>
          {/* Main Home / Login entrypoint */}
          <Route path="/" element={<RoleBasedHome />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor"
            element={
              <ProtectedRoute allowedRoles={['advisor']}>
                <AdvisorPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod"
            element={
              <ProtectedRoute allowedRoles={['hod']}>
                <HodPortalPage />
              </ProtectedRoute>
            }
          />
          <Route path="/hod/settings" element={<Navigate to="/settings" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPortalPage />
              </ProtectedRoute>
            }
          />

          {/* Settings Route - Accessible to all authenticated users */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Guide Portal Routes wrapped in ProtectedRoute, GuideProvider, and GuideLayout */}
          <Route
            path="/guide"
            element={
              <ProtectedRoute allowedRoles={['guide']}>
                <GuideProvider>
                  <GuideLayout />
                </GuideProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="approve-submissions" replace />} />
            <Route path="approve-submissions" element={<ApproveProject />} />
            <Route path="approve-project" element={<ApproveProject />} />
            <Route path="teams" element={<MyTeams />} />
            <Route path="weekly-submissions" element={<WeeklySubmissions />} />
            <Route path="submission-history" element={<SubmissionHistory />} />
            <Route path="settings" element={<Navigate to="/settings" replace />} />

            {/* Fallback redirects specified in requirements */}
            <Route path="title-approval" element={<Navigate to="approve-submissions" replace />} />
            <Route path="dashboard" element={<Navigate to="approve-submissions" replace />} />
            <Route path="weekly-review" element={<Navigate to="weekly-submissions" replace />} />
            <Route path="*" element={<Navigate to="approve-submissions" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
