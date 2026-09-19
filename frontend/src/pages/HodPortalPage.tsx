import React, { useState } from 'react';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import HodAdvisorsView from '../components/hod/HodAdvisorsView';
import HodStudentsView from '../components/hod/HodStudentsView';
import { UserCheck, GraduationCap, CheckCircle2 } from 'lucide-react';

type HodTab = 'advisors' | 'students';

export const HodPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HodTab>('advisors');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [bottomToast, setBottomToast] = useState<string | null>(null);

  // State passed through navigation flow
  const [selectedBatch, setSelectedBatch] = useState('2023-2027 (III Year)');
  const [selectedClass, setSelectedClass] = useState('CSE-B');
  const [selectedStudentRollNo, setSelectedStudentRollNo] = useState<string | undefined>(undefined);

  const showToast = (message: string) => {
    setBottomToast(message);
    setTimeout(() => {
      setBottomToast(null);
    }, 4500);
  };

  // 1. Advisor row clicked -> moves to Students navigation
  const handleSelectAdvisor = (batch: string, className: string) => {
    setSelectedBatch(batch);
    setSelectedClass(className);
    setActiveTab('students');
    showToast(`Switched to Class ${className} (${batch}) students.`);
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
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col font-sans relative">
      
      {/* Top Institutional Header */}
      <Header
        title="Head of Department Workspace"
        subtitle="Academic Project Governance, Student Mentorship & Project Auditing"
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Sticky Top Navigation Bar: 3 Main Tabs Center-Aligned */}
      <div className="bg-[#F8F5EE] border-b border-[#D8CCBA] sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center items-center space-x-2 py-3 overflow-x-auto text-xs font-bold scrollbar-none">
            
            {/* 1. Advisors Tab */}
            <button
              id="tabHodAdvisors"
              onClick={() => handleTabClick('advisors')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'advisors'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <UserCheck size={16} />
              <span>Advisors</span>
            </button>

            {/* 2. Students Tab */}
            <button
              id="tabHodStudents"
              onClick={() => handleTabClick('students')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <GraduationCap size={16} />
              <span>Students</span>
            </button>

          </nav>
        </div>
      </div>

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

    </div>
  );
};

export default HodPortalPage;
