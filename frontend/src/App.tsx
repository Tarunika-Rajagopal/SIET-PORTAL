import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GuideProvider } from './context/GuideContext';
import LoginPage from './pages/LoginPage';
import StudentPortalPage from './pages/StudentPortalPage';
import AdvisorPortalPage from './pages/AdvisorPortalPage';
import HodPortalPage from './pages/HodPortalPage';
import AdminPortalPage from './pages/AdminPortalPage';
import SettingsPage from './pages/SettingsPage';

// Guide Portal components & layout
import GuideLayout from './layouts/GuideLayout';
import ApproveProject from './pages/guide/ApproveProject';
import MyTeams from './pages/guide/MyTeams';
import WeeklySubmissions from './pages/guide/WeeklySubmissions';
import SubmissionHistory from './pages/guide/SubmissionHistory';

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
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
