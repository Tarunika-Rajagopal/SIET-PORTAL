import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import NotificationToast from '../components/common/NotificationToast';
import AdvisorStudentsView from '../components/advisor/AdvisorStudentsView';
import { useClassStudents } from '../hooks/useQueries';
import { GrainientBackground } from '@/components/ui/GrainientBackground';
import { PillNavTab } from '@/components/ui/PillNavTab';

export const AdvisorPortalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const className = currentUser?.advisorClass || currentUser?.class || currentUser?.section || "CSE-B";
  const batch = currentUser?.advisorBatch || currentUser?.batch || "2023-2027 (III Year)";
  const advisorName = currentUser?.name || "Class Advisor";

  const { data: students = [] } = useClassStudents(className, batch);

  return (
    <GrainientBackground className="min-h-screen flex flex-col font-sans relative">
      
      {/* Single Compact Horizontal Navbar (76px height) */}
      <Header
        title="Class Advisor Workspace"
        subtitle={`${className} • ${batch}`}
        onOpenProfile={() => setProfileModalOpen(true)}
      >
        {/* Students Tab */}
        <PillNavTab
          id="tabAdvisorStudents"
          isActive={true}
          onClick={() => {}}
          badge={
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight transition-colors bg-white text-[#176B7A]">
              {students.length}
            </span>
          }
        >
          Students
        </PillNavTab>
      </Header>

      {/* Main Workspace Container */}
      <main className="max-w-[1360px] w-full mx-auto px-6 sm:px-8 lg:px-12 py-8 flex-1 pb-24">
        <AdvisorStudentsView
          className={className}
          batch={batch}
          advisorName={advisorName}
          onShowToast={(msg) => setToastMessage(msg)}
        />
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
