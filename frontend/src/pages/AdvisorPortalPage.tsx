import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import NotificationToast from '../components/common/NotificationToast';
import AdvisorStudentsView from '../components/advisor/AdvisorStudentsView';
import AdvisorHistoryView from '../components/advisor/AdvisorHistoryView';
import { AdvisorService, ClassTeam } from '../services/advisorService';
import { AdminStudent, AdminService, AdminFaculty } from '../services/adminService';
import { Users, History } from 'lucide-react';

export const AdvisorPortalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [faculties,setFaculties] = useState<AdminFaculty[]>([]);
  useEffect(()=>{
    const f = async()=>{
      const faculty = await AdminService.getFaculties();
      setFaculties(faculty);
    };
    f();
    return AdminService.subscribe(f);
  },[])
  const currentFaculty = faculties.find(f => f.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const className = currentFaculty?.advisorClass || currentUser?.advisorClass || "CSE-B";
  const batch = currentFaculty?.advisorBatch || currentUser?.advisorBatch || "2023-2027 (III Year)";
  const advisorName = currentFaculty?.name || currentUser?.name || "Dr. R. Karthikeyan";

  // Navigation tab: 'students' | 'history'
  const [activeTab, setActiveTab] = useState<'students' | 'history'>('students');

  const [teams, setTeams] = useState<ClassTeam[]>(() => AdvisorService.getTeamsForClass(className));
  const [students, setStudents] = useState<AdminStudent[]>([]);

  useEffect(()=>{
        const fetch = async()=>{
          setTeams(AdvisorService.getTeamsForClass(className));
          setStudents(await AdvisorService.getClassStudents(className, 'ALL'));
        }
        fetch();
  },[]);

  useEffect(() => {
    const handleSync = async() => {
      setTeams(await AdvisorService.getTeamsForClass(className));
      setStudents(await AdvisorService.getClassStudents(className, 'ALL'));
    };

    const unsubAdvisor = AdvisorService.subscribe(handleSync);
    const unsubAdmin = AdminService.subscribe(handleSync);
    window.addEventListener('siet_admin_students_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsubAdvisor();
      unsubAdmin();
      window.removeEventListener('siet_admin_students_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [className]);

  return (
    <div className="min-h-screen bg-[#EFF3F1] flex flex-col font-sans relative">
      
      {/* 1. Header with Uploaded SIET Logo & Profile */}
      <Header
        title="Class Advisor Workspace"
        subtitle={`Advisor: ${advisorName} &bull; Section ${className}`}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* 2. Sticky Top Navigation Bar (Like Other Portals: Center-Aligned) */}
      <div className="bg-white border-b border-[#E2E8E4] sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center items-center space-x-2 py-3 overflow-x-auto text-xs font-bold scrollbar-none">
            
            {/* Students Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-mint-500 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 hover:bg-mint-50 hover:text-mint-800'
              }`}
            >
              <Users size={16} />
              <span>Students</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'students' ? 'bg-white text-mint-900' : 'bg-mint-100 text-mint-900'
              }`}>
                {students.length}
              </span>
            </button>

            {/* History Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-mint-500 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 hover:bg-mint-50 hover:text-mint-800'
              }`}
            >
              <History size={16} />
              <span>History</span>
            </button>

          </nav>
        </div>
      </div>

      {/* 3. Main Workspace Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 pb-24">
        
        {/* View 1: Students */}
        {activeTab === 'students' && (
          <AdvisorStudentsView
            className={className}
            batch={batch}
            advisorName={advisorName}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        )}

        {/* View 2: History */}
        {activeTab === 'history' && (
          <AdvisorHistoryView
            className={className}
            advisorName={advisorName}
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

    </div>
  );
};

export default AdvisorPortalPage;
