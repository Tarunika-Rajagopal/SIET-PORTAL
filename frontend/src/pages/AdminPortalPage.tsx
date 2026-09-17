import React, { useState } from 'react';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import AdminHomeView from '../components/admin/AdminHomeView';
import AdminAdvisorsView from '../components/admin/AdminAdvisorsView';
import AdminGuidesView from '../components/admin/AdminGuidesView';
import AdminStudentsView from '../components/admin/AdminStudentsView';
import AdminHistoryView from '../components/admin/AdminHistoryView';
import { Home, UserCheck, Briefcase, GraduationCap, History, CheckCircle2 } from 'lucide-react';

export const AdminPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'advisors' | 'guides' | 'students' | 'history'>('home');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

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
    setActiveTab('students');
    showToast(`Switched to Class ${className} (${batch}) students.`);
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col font-sans relative">
      
      {/* Institutional Top Header */}
      <Header
        title="Department Administration Portal"
        subtitle="Faculty Role Governance & Academic Student Allocation Engine"
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Sticky Horizontal Navigation Bar */}
      <div className="bg-[#F8F5EE] border-b border-[#D8CCBA] sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center items-center space-x-2 py-3 overflow-x-auto text-xs font-bold scrollbar-none">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <Home size={15} />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveTab('advisors')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'advisors'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <UserCheck size={15} />
              <span>Advisors</span>
            </button>

            <button
              onClick={() => setActiveTab('guides')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'guides'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <Briefcase size={15} />
              <span>Guides</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <GraduationCap size={15} />
              <span>Students</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <History size={15} />
              <span>History</span>
            </button>
          </nav>
        </div>
      </div>

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
        {activeTab === 'history' && (
          <AdminHistoryView />
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

export default AdminPortalPage;
