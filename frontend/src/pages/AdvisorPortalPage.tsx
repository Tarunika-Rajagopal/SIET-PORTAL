import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import NotificationToast from '../components/common/NotificationToast';
import AdvisorStudentsView from '../components/advisor/AdvisorStudentsView';
import AdvisorTeamsView from '../components/advisor/AdvisorTeamsView';
import AdvisorAssignMarksView from '../components/advisor/AdvisorAssignMarksView';
import AdvisorHistoryView from '../components/advisor/AdvisorHistoryView';
import { AdvisorService, ClassTeam } from '../services/advisorService';
import { AdminStudent, AdminService, AdminFaculty } from '../services/adminService';
import { useClassStudents } from '../hooks/useQueries';
import { Users, Layers, Award } from 'lucide-react';
import { GrainientBackground } from '@/components/ui/GrainientBackground';
import { PillNavTab } from '@/components/ui/PillNavTab';

export const AdvisorPortalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const className = currentUser?.advisorClass || currentUser?.class || currentUser?.section || "CSE-B";
  const batch = currentUser?.advisorBatch || currentUser?.batch || "2023–2027";
  const advisorName = currentUser?.name || "Class Advisor";

  // Navigation tab: 'students' | 'teams' | 'evaluations'
  const [activeTab, setActiveTab] = useState<'students' | 'teams' | 'evaluations'>('students');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { data: students = [] } = useClassStudents(className, batch);

  return (
    <GrainientBackground className="min-h-screen flex flex-col font-sans relative">
      
      {/* Single Compact Horizontal Navbar (76px height) */}
      <Header
        title="Class Advisor Workspace"
        subtitle={`${className} • ${batch}`}
        onOpenProfile={() => setProfileModalOpen(true)}
      >
        {/* 1. Students Tab */}
        <PillNavTab
          id="tabAdvisorStudents"
          isActive={activeTab === 'students'}
          onClick={() => setActiveTab('students')}
          badge={
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight transition-colors ${
              activeTab === 'students'
                ? 'bg-white text-[#176B7A]'
                : 'bg-white/25 text-white border border-white/35'
            }`}>
              {students.length}
            </span>
          }
        >
          Students
        </PillNavTab>

        {/* 2. Teams Tab */}
        <PillNavTab
          id="tabAdvisorTeams"
          isActive={activeTab === 'teams'}
          onClick={() => setActiveTab('teams')}
        >
          Teams
        </PillNavTab>

        {/* 3. Evaluations Tab */}
        <PillNavTab
          id="tabAdvisorEvaluations"
          isActive={activeTab === 'evaluations'}
          onClick={() => setActiveTab('evaluations')}
        >
          Evaluations
        </PillNavTab>
      </Header>

      {/* Main Workspace Container */}
      <main className="max-w-[1360px] w-full mx-auto px-6 sm:px-8 lg:px-12 py-8 flex-1 pb-24">
        
        {/* View 1: Students */}
        {activeTab === 'students' && (
          <AdvisorStudentsView
            className={className}
            batch={batch}
            advisorName={advisorName}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        )}

        {/* View 2: Teams */}
        {activeTab === 'teams' && (
          <AdvisorTeamsView
            className={className}
            batch={batch}
            advisorName={advisorName}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(teamId) => setSelectedTeamId(teamId)}
            onNavigateToAssignMarks={(teamId) => {
              setSelectedTeamId(teamId);
              setActiveTab('evaluations');
            }}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        )}

        {/* View 3: Evaluations */}
        {activeTab === 'evaluations' && (
          <AdvisorAssignMarksView
            className={className}
            advisorName={advisorName}
            selectedTeamId={selectedTeamId}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        )}

      </main>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <NotificationToast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

    </GrainientBackground>
  );
};

export default AdvisorPortalPage;
