import React, { useState } from 'react';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import AdminHomeView from '../components/admin/AdminHomeView';
import AdminAdvisorsView from '../components/admin/AdminAdvisorsView';
import AdminGuidesView from '../components/admin/AdminGuidesView';
import AdminStudentsView from '../components/admin/AdminStudentsView';
import { Home, UserCheck, Briefcase, GraduationCap, CheckCircle2 } from 'lucide-react';
import { GrainientBackground } from '@/components/ui/GrainientBackground';
import { PillNavTab } from '@/components/ui/PillNavTab';

export const AdminPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'advisors' | 'guides' | 'students'>(() => {
    try {
      const saved = localStorage.getItem('siet_admin_active_tab');
      if (saved && ['home', 'advisors', 'guides', 'students'].includes(saved)) {
        return saved as any;
      }
    } catch (e) {}
    return 'home';
  });
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const changeTab = (tab: 'home' | 'advisors' | 'guides' | 'students') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('siet_admin_active_tab', tab);
    } catch (e) {}
  };

  // Selected student filters passed to Students tab
  const [selectedStudentBatch, setSelectedStudentBatch] = useState('2023-2027 (III Year)');
  const [selectedStudentClass, setSelectedStudentClass] = useState('CSE-B');

  // Non-intrusive bottom notification message
  const [bottomToast, setBottomToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setBottomToast(message);
    setTimeout(() => {
      setBottomToast(null);
    }, 4500);
  };

  const handleSelectAdvisorRow = (batch: string, className: string) => {
    setSelectedStudentBatch(batch);
    setSelectedStudentClass(className);
    changeTab('students');
    showToast(`Switched to Class ${className} (${batch}) students.`);
  };

  return (
    <GrainientBackground className="min-h-screen flex flex-col font-sans relative">
      
      {/* Single Compact Horizontal Navbar (76px height) */}
      <Header
        title="Department Administration Portal"
        subtitle="Faculty Role Governance & Academic Student Allocation Engine"
        onOpenProfile={() => setProfileModalOpen(true)}
        hideSettings={true}
      >
        {/* Home Tab */}
        <PillNavTab
          id="tabAdminHome"
          isActive={activeTab === 'home'}
          onClick={() => changeTab('home')}
          icon={<Home size={15} strokeWidth={activeTab === 'home' ? 2.25 : 1.75} />}
        >
          Home
        </PillNavTab>

        {/* Advisors Tab */}
        <PillNavTab
          id="tabAdminAdvisors"
          isActive={activeTab === 'advisors'}
          onClick={() => changeTab('advisors')}
          icon={<UserCheck size={15} strokeWidth={activeTab === 'advisors' ? 2.25 : 1.75} />}
        >
          Advisors
        </PillNavTab>

        {/* Guides Tab */}
        <PillNavTab
          id="tabAdminGuides"
          isActive={activeTab === 'guides'}
          onClick={() => changeTab('guides')}
          icon={<Briefcase size={15} strokeWidth={activeTab === 'guides' ? 2.25 : 1.75} />}
        >
          Guides
        </PillNavTab>

        {/* Students Tab */}
        <PillNavTab
          id="tabAdminStudents"
          isActive={activeTab === 'students'}
          onClick={() => changeTab('students')}
          icon={<GraduationCap size={15} strokeWidth={activeTab === 'students' ? 2.25 : 1.75} />}
        >
          Students
        </PillNavTab>
      </Header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 pb-24">
        {activeTab === 'home' && (
          <AdminHomeView
            onNavigateTab={(tab) => setActiveTab(tab)}
            onShowToast={showToast}
          />
        )}
        {activeTab === 'advisors' && (
          <AdminAdvisorsView
            onSelectAdvisor={handleSelectAdvisorRow}
            onShowToast={showToast}
          />
        )}
        {activeTab === 'guides' && (
          <AdminGuidesView
            onShowToast={showToast}
          />
        )}
        {activeTab === 'students' && (
          <AdminStudentsView
            selectedBatch={selectedStudentBatch}
            selectedClass={selectedStudentClass}
            onShowToast={showToast}
          />
        )}
      </main>



      {/* Non-intrusive bottom notification message banner */}
      {bottomToast && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
            <CheckCircle2 size={16} className="text-mint-400 shrink-0" />
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

export default AdminPortalPage;
