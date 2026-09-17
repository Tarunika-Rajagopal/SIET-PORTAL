import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Users, Clock, History, LogOut, User as UserIcon,
  CheckCircle2, AlertCircle, Info, X 
} from 'lucide-react';
import { useGuide } from '../context/GuideContext';
import { useAuth } from '../context/AuthContext';
import ProfileModal from '../components/common/ProfileModal';

export const GuideLayout = () => {
  const { facultyProfile, stats, toasts, removeToast } = useGuide();
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // If user session is cleared, immediately redirect to login
  useEffect(() => {
    const sessionUser = sessionStorage.getItem('siet_auth_user');
    if (!currentUser && !sessionUser) {
      window.location.href = '/';
    }
  }, [currentUser]);

  const handleLogout = () => {
    try {
      if (logout) {
        logout();
      }
      sessionStorage.removeItem('siet_auth_user');
      localStorage.removeItem('siet_auth_user');
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/';
  };

  const navItems = [
    {
      to: '/guide/approve-submissions',
      label: 'Approve Submissions',
      icon: CheckSquare,
      badge: stats.pendingTitleApprovalsCount > 0 ? `${stats.pendingTitleApprovalsCount} Pending` : null,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300'
    },
    {
      to: '/guide/teams',
      label: 'My Teams',
      icon: Users,
      badge: `${stats.assignedTeamsCount}`,
      badgeColor: 'bg-mint-100 text-mint-900 border border-mint-200'
    },
    {
      to: '/guide/weekly-submissions',
      label: 'Weekly Submissions',
      icon: Clock,
      badge: stats.pendingWeeklySubmissionsCount > 0 ? `${stats.pendingWeeklySubmissionsCount} Due` : null,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300'
    },
    {
      to: '/guide/submission-history',
      label: 'History',
      icon: History,
      badge: null,
      badgeColor: 'bg-mint-100 text-mint-900 border border-mint-200'
    }
  ];

  return (
    <div className="min-h-screen bg-[#EFF3F1] text-slate-900 flex flex-col font-sans antialiased">
      
      {/* 1. Sticky Header with Uploaded Logo & Title */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8E4] px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="SIET CSE" 
            className="w-10 h-10 rounded-xl object-contain shadow-xs border border-mint-200 bg-white p-0.5 shrink-0" 
          />
          <div>
            <div className="text-xs font-bold text-slate-900 tracking-wide flex items-center gap-1.5">
              <span>Faculty Guide Portal</span>
              <span className="w-2 h-2 rounded-full bg-mint-500"></span>
            </div>
            <div className="text-[10px] text-mint-700 font-bold hidden sm:block">
              Department of Computer Science and Engineering &bull; Sri Shakthi Institute
            </div>
          </div>
        </div>

        {/* Right: Metric Pill & User Profile Avatar Dropdown */}
        <div className="flex items-center gap-3">
          {/* Assigned Teams Badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-100 border border-mint-200 text-mint-900 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-mint-600"></span>
            <span>Assigned: {stats.assignedTeamsCount} Teams</span>
          </div>

          {/* User Profile Avatar with First Letter & Initial */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(v => !v)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-mint-500 to-emerald-600 hover:from-mint-600 hover:to-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md hover:ring-2 hover:ring-mint-400 hover:ring-offset-2 transition focus:outline-none cursor-pointer"
              aria-label="User profile menu"
            >
              {facultyProfile.initials || 'SK'}
            </button>

            {/* Dropdown with ONLY Profile and Logout */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-card border border-[#E2E8E4] p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-mint-50 hover:text-mint-800 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <UserIcon size={16} className="text-mint-600" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut size={16} className="text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </header>

      {/* 2. Top Navigation Bar (Full Portal Top Bar Navigation) */}
      <div className="bg-white border-b border-[#E2E8E4] sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center items-center space-x-2 py-3 overflow-x-auto text-xs font-bold no-scrollbar">
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
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-mint-500 text-white shadow-sm font-extrabold'
                      : 'text-slate-600 hover:bg-mint-50 hover:text-mint-800'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-white/25 text-white' : item.badgeColor
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

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
                ? 'bg-mint-800 text-white border-mint-600'
                : toast.type === 'error'
                ? 'bg-rose-800 text-white border-rose-600'
                : toast.type === 'warning'
                ? 'bg-amber-800 text-white border-amber-600'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} className="text-mint-300 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle size={16} className="text-rose-300 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle size={16} className="text-amber-300 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info size={16} className="text-sky-300 shrink-0 mt-0.5" />}
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
    </div>
  );
};

export default GuideLayout;
