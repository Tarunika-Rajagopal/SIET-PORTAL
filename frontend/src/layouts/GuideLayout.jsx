import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Users, Clock, History, LogOut, User as UserIcon,
  CheckCircle2, AlertCircle, Info, X
} from 'lucide-react';
import { useGuide } from '../context/GuideContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import { GrainientBackground } from '@/components/ui/GrainientBackground';
import { PillNavTab } from '@/components/ui/PillNavTab';

export const GuideLayout = () => {
  const { facultyProfile, stats, toasts, removeToast } = useGuide();
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // If user session is cleared or not a guide, immediately redirect to login
  useEffect(() => {
    const sessionUser = sessionStorage.getItem('siet_auth_user_v5') || sessionStorage.getItem('siet_auth_user');
    if (!currentUser && !sessionUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogout = () => {
    try {
      if (logout) {
        logout();
      }
      sessionStorage.removeItem('siet_auth_user_v5');
      localStorage.removeItem('siet_auth_user_v5');
      sessionStorage.removeItem('siet_auth_user');
      localStorage.removeItem('siet_auth_user');
      localStorage.removeItem('siet_auth_token');
      sessionStorage.removeItem('siet_auth_token');
    } catch (e) {
      console.error(e);
    }
    navigate('/login', { replace: true });
  };

  const navItems = [
    {
      to: '/guide/approve-submissions',
      label: 'Approve Submissions',
      icon: CheckSquare,
      badge: (stats.totalPendingApprovalsCount > 0) ? `${stats.totalPendingApprovalsCount} Pending` : null,
      badgeColor: 'bg-[#EDE7DB] text-[#8A6A32] border border-[#D4C39F]'
    },
    {
      to: '/guide/teams',
      label: 'My Teams',
      icon: Users,
      badge: `${stats.assignedTeamsCount}`,
      badgeColor: 'bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]'
    },
    {
      to: '/guide/submission-history',
      label: 'History',
      icon: History,
      badge: null,
      badgeColor: 'bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]'
    }
  ];

  return (
    <GrainientBackground className="min-h-screen text-[#111111] flex flex-col font-sans antialiased">
      
      {/* Single Compact Horizontal Navbar (76px height) */}
      <Header
        title="Faculty Guide Portal"
        subtitle="Department of Computer Science and Engineering"
        onOpenProfile={() => setProfileModalOpen(true)}
        userInitials={facultyProfile.initials || 'SK'}
        extraRight={
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold shadow-xs backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span>Assigned: {stats.assignedTeamsCount} Teams</span>
          </div>
        }
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || 
            (item.to === '/guide/approve-submissions' && (
              location.pathname === '/guide' || 
              location.pathname === '/guide/' || 
              location.pathname === '/guide/approve-project' ||
              location.pathname === '/guide/approve-submissions'
            ));

          return (
            <PillNavTab
              key={item.to}
              to={item.to}
              id={`tabGuide${item.label.replace(/\s+/g, '')}`}
              isActive={isActive}
              icon={<Icon size={15} strokeWidth={isActive ? 2.25 : 1.75} />}
              badge={
                item.badge ? (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight transition-colors ${
                    isActive
                      ? 'bg-white text-[#176B7A]'
                      : 'bg-white/25 text-white border border-white/35'
                  }`}>
                    {item.badge}
                  </span>
                ) : null
              }
            >
              {item.label}
            </PillNavTab>
          );
        })}
      </Header>

      {/* 3. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* 4. Global Toast Notifications Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl shadow-modal text-xs font-semibold border transition-all animate-slideUp ${
              toast.type === 'success'
                ? 'bg-[#1B2119] text-[#EDF1EC] border-[#4A5844]'
                : toast.type === 'error'
                ? 'bg-[#381717] text-[#F8EEEE] border-[#7C3838]'
                : toast.type === 'warning'
                ? 'bg-[#382B14] text-[#F7F2E7] border-[#8A6A32]'
                : 'bg-[#1A1A1A] text-[#F8F5EE] border-[#D8CCBA]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} className="text-[#84A07B] shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle size={16} className="text-[#D9AEAE] shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle size={16} className="text-[#DBCFA8] shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info size={16} className="text-[#B8AA97] shrink-0 mt-0.5" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white p-0.5 rounded transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 5. Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </GrainientBackground>
  );
};

export default GuideLayout;
