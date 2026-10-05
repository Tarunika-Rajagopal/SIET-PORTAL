import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import MyTeamView from '../components/student/MyTeamView';
import SubmissionView from '../components/student/SubmissionView';
import MySubmissionView from '../components/student/MySubmissionView';
import { StudentService } from '../services/studentService';
import { ApiClient } from '../services/apiClient';
import { Users, Send, Clock, CheckCircle2 } from 'lucide-react';
import { GrainientBackground } from '@/components/ui/GrainientBackground';
import { PillNavTab } from '@/components/ui/PillNavTab';

type StudentTab = 'my-team' | 'submission' | 'my-submission';

export const StudentPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudentTab>('my-team');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [bottomToast, setBottomToast] = useState<string | null>(null);
  const [team, setTeam] = useState(() => StudentService.getTeam());

  // Fetch the authenticated user's actual team from the backend on mount.
  // The backend resolves the team from the JWT token (user.team_id),
  // so each student dynamically receives their own team data.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ApiClient.getStudentTeam().catch((err: any) => {
        console.warn('Could not fetch team from backend, using cached/default:', err.message);
        return null;
      }),
      ApiClient.getStudentSubmissions().catch((err: any) => {
        console.warn('Could not fetch submissions from backend:', err.message);
        return [];
      }),
    ]).then(([backendTeam, backendSubs]: [any, any]) => {
      if (cancelled) return;
      if (backendTeam) {
        const mapped = {
          id: backendTeam.teamId || backendTeam.id || '',
          teamNo: backendTeam.teamNo || '',
          projectTitle: backendTeam.projectTitle || '',
          submittedTitle: backendTeam.submittedTitle || backendTeam.projectTitle || '',
          isTitleApproved: Boolean(backendTeam.isTitleApproved),
          guideApprovalStatus: backendTeam.guideApprovalStatus || 'Pending',
          rejectionReason: backendTeam.rejectionReason || '',
          guideName: backendTeam.guideName || '',
          advisorName: backendTeam.advisorName || '',
          batch: backendTeam.batch || '',
          section: backendTeam.section || '',
          status: backendTeam.status || 'In Progress',
          progress: backendTeam.progress || 0,
          problemStatement: backendTeam.problemStatement || '',
          proposedSolution: backendTeam.proposedSolution || '',
          abstract: backendTeam.abstract || '',
          repoUrl: backendTeam.repoUrl || '',
          demoUrl: backendTeam.demoUrl || '',
          members: (backendTeam.members || []).map((m: any) => ({
            rollNo: m.rollNo || '',
            name: m.name || '',
            email: m.email || '',
            phone: m.phone || '',
            role: m.isLead ? 'Team Lead' : (m.role || 'Team Member'),
            isLead: Boolean(m.isLead),
          })),
        };
        StudentService.saveTeam(mapped as any);
        setTeam(mapped as any);
      }
      if (Array.isArray(backendSubs) && backendSubs.length > 0) {
        StudentService.saveSubmissions(backendSubs);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleSync = () => {
      setTeam(StudentService.getTeam());
    };
    const handleNavSubmission = (e: any) => {
      if (e?.detail?.edit && StudentService.isCurrentUserTeamLead(team)) {
        localStorage.setItem('siet_student_start_edit_mode', 'true');
      }
      if (e?.detail?.week !== undefined) {
        localStorage.setItem('siet_student_target_week', String(e.detail.week));
      }
      setActiveTab('submission');
    };
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
    <GrainientBackground className="min-h-screen flex flex-col font-sans relative">
      
      {/* Single Compact Horizontal Navbar (76px height) */}
      <Header
        title="Student Project Portal"
        subtitle="Department of Computer Science and Engineering"
        onOpenProfile={() => setProfileModalOpen(true)}
      >
        {/* 1. My Team Tab */}
        <PillNavTab
          id="tabStudentMyTeam"
          isActive={activeTab === 'my-team'}
          onClick={() => setActiveTab('my-team')}
          icon={<Users size={15} strokeWidth={activeTab === 'my-team' ? 2.25 : 1.75} />}
        >
          My Team
        </PillNavTab>

        {/* 2. Submission Tab */}
        <PillNavTab
          id="tabStudentSubmission"
          isActive={activeTab === 'submission'}
          onClick={() => setActiveTab('submission')}
          icon={<Send size={15} strokeWidth={activeTab === 'submission' ? 2.25 : 1.75} />}
        >
          Submission
        </PillNavTab>

        {/* 3. My Submission Tab */}
        <PillNavTab
          id="tabStudentMySubmission"
          isActive={activeTab === 'my-submission'}
          onClick={() => setActiveTab('my-submission')}
          icon={<Clock size={15} strokeWidth={activeTab === 'my-submission' ? 2.25 : 1.75} />}
        >
          My Submission
        </PillNavTab>
      </Header>

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto px-6 sm:px-8 lg:px-12 py-8 pb-24" style={{ maxWidth: '1360px' }}>
        {activeTab === 'my-team' && <MyTeamView team={team} />}
        {activeTab === 'submission' && <SubmissionView onSuccess={showToast} />}
        {activeTab === 'my-submission' && (
          <MySubmissionView 
            onSuccess={showToast} 
            onNavigateToSubmission={() => {
              if (StudentService.isCurrentUserTeamLead(team)) {
                localStorage.setItem('siet_student_start_edit_mode', 'true');
              }
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

    </GrainientBackground>
  );
};

export default StudentPortalPage;
