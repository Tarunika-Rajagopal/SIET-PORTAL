import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GuideProvider } from './context/GuideContext';
import LoginPage from './pages/LoginPage';
import StudentPortalPage from './pages/StudentPortalPage';
import AdvisorPortalPage from './pages/AdvisorPortalPage';
import HodPortalPage from './pages/HodPortalPage';
import AdminPortalPage from './pages/AdminPortalPage';

// Guide Portal components & layout
import GuideLayout from './layouts/GuideLayout';
import ApproveProject from './pages/guide/ApproveProject';
import MyTeams from './pages/guide/MyTeams';
import WeeklySubmissions from './pages/guide/WeeklySubmissions';
import SubmissionHistory from './pages/guide/SubmissionHistory';

const RoleBasedHome: React.FC = () => {
  const { currentUser, activeRole } = useAuth();

  if (!currentUser) {
    return <LoginPage />;
  }

  const role = (activeRole || currentUser.role || 'student').toLowerCase();

  switch (role) {
    case 'guide':
      return <Navigate to="/guide/approve-submissions" replace />;
    case 'advisor':
      return <AdvisorPortalPage />;
    case 'hod':
      return <HodPortalPage />;
    case 'admin':
      return <AdminPortalPage />;
    case 'student':
    default:
      return <StudentPortalPage />;
  }
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Main Home / Login entrypoint */}
          <Route path="/" element={<RoleBasedHome />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student" element={<StudentPortalPage />} />
          <Route path="/advisor" element={<AdvisorPortalPage />} />
          <Route path="/hod" element={<HodPortalPage />} />
          <Route path="/admin" element={<AdminPortalPage />} />

          {/* Guide Portal Routes wrapped in GuideProvider and GuideLayout */}
          <Route
            path="/guide"
            element={
              <GuideProvider>
                <GuideLayout />
              </GuideProvider>
            }
          >
            <Route index element={<Navigate to="approve-submissions" replace />} />
            <Route path="approve-submissions" element={<ApproveProject />} />
            <Route path="approve-project" element={<ApproveProject />} />
            <Route path="teams" element={<MyTeams />} />
            <Route path="weekly-submissions" element={<WeeklySubmissions />} />
            <Route path="submission-history" element={<SubmissionHistory />} />

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
