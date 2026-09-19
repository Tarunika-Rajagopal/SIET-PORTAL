import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import MyTeamView from '../components/student/MyTeamView';
import SubmissionView from '../components/student/SubmissionView';
import MySubmissionView from '../components/student/MySubmissionView';
import { StudentService } from '../services/studentService';
import { Users, Send, Clock, CheckCircle2 } from 'lucide-react';

type StudentTab = 'my-team' | 'submission' | 'my-submission';

export const StudentPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudentTab>('my-team');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [bottomToast, setBottomToast] = useState<string | null>(null);
  const [team, setTeam] = useState(() => StudentService.getTeam());

  useEffect(() => {
    const handleSync = () => {
      setTeam(StudentService.getTeam());
    };
    const handleNavSubmission = (e: any) => {
      if (e?.detail?.edit) {
        localStorage.setItem('siet_student_start_edit_mode', 'true');
      }
      if (e?.detail?.week !== undefined) {
        localStorage.setItem('siet_student_target_week', String(e.detail.week));
      }
      setActiveTab('submission');
    };
    handleSync();
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('student_navigate_submission', handleNavSubmission);
    return () => {
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('student_navigate_submission', handleNavSubmission);
    };
  }, []);

  const showToast = (message: string) => {
    setBottomToast(message);
    setTimeout(() => {
      setBottomToast(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col font-sans relative">
      
      {/* Top Institutional Header */}
      <Header
        title="Student Project Portal"
        subtitle="Department of Computer Science and Engineering"
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Sticky Horizontal Navigation Bar: Strictly 3 Tabs - Center Aligned */}
      <div className="bg-[#F8F5EE] border-b border-[#D8CCBA] sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center items-center space-x-2 py-3 overflow-x-auto text-xs font-bold scrollbar-none">
            
            {/* 1. My Team Tab */}
            <button
              id="tabStudentMyTeam"
              onClick={() => setActiveTab('my-team')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'my-team'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <Users size={16} />
              <span>My Team</span>
            </button>

            {/* 2. Submission Tab */}
            <button
              id="tabStudentSubmission"
              onClick={() => setActiveTab('submission')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'submission'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <Send size={16} />
              <span>Submission</span>
            </button>

            {/* 3. My Submission Tab */}
            <button
              id="tabStudentMySubmission"
              onClick={() => setActiveTab('my-submission')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'my-submission'
                  ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold border border-[#292725]'
                  : 'text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111]'
              }`}
            >
              <Clock size={16} />
              <span>My Submission</span>
            </button>

          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {activeTab === 'my-team' && <MyTeamView team={team} />}
        {activeTab === 'submission' && <SubmissionView onSuccess={showToast} />}
        {activeTab === 'my-submission' && (
          <MySubmissionView 
            onSuccess={showToast} 
            onNavigateToSubmission={() => {
              localStorage.setItem('siet_student_start_edit_mode', 'true');
              setActiveTab('submission');
            }} 
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

export default StudentPortalPage;
