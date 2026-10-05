import React from 'react';
import { GuideProvider } from '../context/GuideContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import GuideLayout from '../layouts/GuideLayout';
import ApproveProject from './guide/ApproveProject';
import MyTeams from './guide/MyTeams';
import WeeklySubmissions from './guide/WeeklySubmissions';
import SubmissionHistory from './guide/SubmissionHistory';

export const GuidePortalPage: React.FC = () => {
  return (
    <GuideProvider>
      <Routes>
        <Route element={<GuideLayout />}>
          <Route index element={<Navigate to="approve-submissions" replace />} />
          <Route path="approve-submissions" element={<ApproveProject />} />
          <Route path="approve-project" element={<ApproveProject />} />
          <Route path="teams" element={<MyTeams />} />
          <Route path="weekly-submissions" element={<WeeklySubmissions />} />
          <Route path="submission-history" element={<SubmissionHistory />} />
          <Route path="title-approval" element={<Navigate to="approve-submissions" replace />} />
          <Route path="dashboard" element={<Navigate to="approve-submissions" replace />} />
          <Route path="weekly-review" element={<Navigate to="weekly-submissions" replace />} />
          <Route path="*" element={<Navigate to="approve-submissions" replace />} />
        </Route>
      </Routes>
    </GuideProvider>
  );
};

export default GuidePortalPage;
