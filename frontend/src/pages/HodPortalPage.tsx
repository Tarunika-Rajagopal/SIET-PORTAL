import React, { useState } from 'react';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import HodAdvisorsView from '../components/hod/HodAdvisorsView';
import HodStudentsView from '../components/hod/HodStudentsView';
import WeeklySubmissionManagementView from '../components/hod/WeeklySubmissionManagementView';
import HodHistoryView from '../components/hod/HodHistoryView';
import { UserCheck, GraduationCap, CheckCircle2, Calendar, History } from 'lucide-react';
import { GrainientBackground } from '@/components/ui/GrainientBackground';
import { PillNavTab } from '@/components/ui/PillNavTab';

type HodTab = 'advisors' | 'students' | 'submissions' | 'history';

export const HodPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HodTab>('advisors');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [bottomToast, setBottomToast] = useState<string | null>(null);

  // State passed through navigation flow
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStudentRollNo, setSelectedStudentRollNo] = useState<string | undefined>(undefined);

  const showToast = (message: string) => {
    setBottomToast(message);
    setTimeout(() => {
      setBottomToast(null);
    }, 4500);
  };

  // 1. Advisor row clicked -> moves to Students navigation
  const handleSelectAdvisor = (batch: string, className: string) => {
    if (!className) {
      showToast('Advisor is unassigned with no class or section.');
      return;
    }
    setSelectedBatch(batch || 'ALL');
    setSelectedClass(className || 'ALL');
    setActiveTab('students');
    showToast(`Switched to Class ${className} (${batch || 'All Batches'}) teams.`);
  };

  // 2. Student row clicked -> stays in Students view where inspection modal is open
  const handleSelectStudent = (studentRollNo: string, batch: string, className: string) => {
    setSelectedStudentRollNo(studentRollNo);
    setSelectedBatch(batch);
    setSelectedClass(className);
    setActiveTab('students');
  };

  const handleTabClick = (tab: HodTab) => {
    setActiveTab(tab);
  };

  return (
    <GrainientBackground className="min-h-screen flex flex-col font-sans relative">
      
      {/* Single Compact Horizontal Navbar (76px height) */}
      <Header
        title="Head of Department Workspace"
        subtitle="Academic Project Governance & Mentorship"
        onOpenProfile={() => setProfileModalOpen(true)}
      >
        {/* 1. Advisors Tab */}
        <PillNavTab
          id="tabHodAdvisors"
          isActive={activeTab === 'advisors'}
          onClick={() => handleTabClick('advisors')}
          icon={<UserCheck size={15} strokeWidth={activeTab === 'advisors' ? 2.25 : 1.75} />}
        >
          Advisors
        </PillNavTab>

        {/* 2. Students Tab */}
        <PillNavTab
          id="tabHodStudents"
          isActive={activeTab === 'students'}
          onClick={() => handleTabClick('students')}
          icon={<GraduationCap size={15} strokeWidth={activeTab === 'students' ? 2.25 : 1.75} />}
        >
          Students
        </PillNavTab>

        {/* 3. Weekly Submissions Tab */}
        <PillNavTab
          id="tabHodSubmissions"
          isActive={activeTab === 'submissions'}
          onClick={() => handleTabClick('submissions')}
          icon={<Calendar size={15} strokeWidth={activeTab === 'submissions' ? 2.25 : 1.75} />}
        >
          Weekly Submissions
        </PillNavTab>

        {/* 4. Action History Tab */}
        <PillNavTab
          id="tabHodHistory"
          isActive={activeTab === 'history'}
          onClick={() => handleTabClick('history')}
          icon={<History size={15} strokeWidth={activeTab === 'history' ? 2.25 : 1.75} />}
        >
          Action History
        </PillNavTab>
      </Header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 pb-24">
        {activeTab === 'advisors' && (
          <HodAdvisorsView
            onSelectAdvisor={handleSelectAdvisor}
          />
        )}
        {activeTab === 'students' && (
          <HodStudentsView
            selectedBatch={selectedBatch}
            selectedClass={selectedClass}
            onSelectStudent={handleSelectStudent}
          />
        )}
        {activeTab === 'submissions' && (
          <WeeklySubmissionManagementView />
        )}
        {activeTab === 'history' && (
          <HodHistoryView />
        )}
      </main>

      {/* Non-intrusive bottom notification message banner */}
      {bottomToast && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-[#1A1A1A] text-[#F8F5EE] px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-[#D8CCBA] animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
            <CheckCircle2 size={16} className="text-[#84A07B] shrink-0" />
            <span>{bottomToast}</span>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

    </GrainientBackground>
  );
};

export default HodPortalPage;
