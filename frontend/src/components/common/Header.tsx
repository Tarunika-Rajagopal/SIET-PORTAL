import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenProfile?: () => void;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Department Project Portal",
  subtitle = "Department of Computer Science and Engineering",
  onOpenProfile,
  children
}) => {
  const { currentUser, activeRole, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = (name?: string, fallback: string = 'TR') => {
    if (!name) return fallback;
    const cleaned = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const avatarInitials = currentUser?.initials && currentUser.initials !== 'US'
    ? currentUser.initials
    : getInitials(currentUser?.name, activeRole === 'student' ? 'TR' : 'US');

  const isSettings = location.pathname === '/settings';

  return (
    <header className="bg-[#F8F5EE] border-b border-[#D8CCBA] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Brand with Uploaded Logo & Title */}
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
            title="Return to Dashboard"
          >
            <img 
              src="/logo.jpg" 
              alt="SIET CSE" 
              className="w-10 h-10 rounded-xl object-contain shadow-xs border border-[#D8CCBA] bg-white p-0.5 shrink-0" 
            />
            <div>
              <h1 className="text-sm font-serif font-bold text-[#111111] leading-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] uppercase tracking-wider">
                  {activeRole}
                </span>
              </h1>
              <p className="text-[11px] text-[#75695A] hidden sm:block">{subtitle}</p>
            </div>
          </div>

          {/* Optional Center/In-Header Navigation Slot */}
          {children && (
            <div className="hidden md:flex items-center space-x-1">
              {children}
            </div>
          )}

          {/* Right: Settings Icon & User Profile Avatar Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              id="headerSettingsButton"
              onClick={() => navigate('/settings')}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition focus:outline-none cursor-pointer ${
                isSettings
                  ? 'bg-[#111111] text-[#F8F5EE] border-[#111111] shadow-xs'
                  : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] hover:text-[#111111] border-[#D8CCBA] shadow-2xs'
              }`}
              title="Settings"
              aria-label="Settings"
            >
              <SettingsIcon size={18} className="transition-transform duration-200 hover:rotate-45" />
            </button>

            <div className="relative">
              <button
                id="headerProfileAvatarButton"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-10 h-10 rounded-full bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-black text-xs sm:text-sm flex items-center justify-center shadow-subtle border border-[#292725] hover:ring-2 hover:ring-[#B8AA97] hover:ring-offset-2 transition focus:outline-none cursor-pointer"
                aria-label="User profile menu"
              >
                {avatarInitials}
              </button>

              {/* Dropdown with ONLY Profile and Logout options */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] rounded-xl shadow-card border border-[#D8CCBA] p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111] rounded-lg flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <UserIcon size={16} className="text-[#75695A]" />
                      <span>Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        try {
                          if (logout) logout();
                          sessionStorage.removeItem('siet_auth_user_v5');
                          sessionStorage.removeItem('siet_auth_user');
                          sessionStorage.removeItem('siet_auth_token');
                          localStorage.removeItem('siet_auth_user_v5');
                          localStorage.removeItem('siet_auth_user');
                          localStorage.removeItem('siet_auth_token');
                        } catch (e) {
                          console.error(e);
                        }
                        window.location.href = '/login';
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-[#7C3838] hover:bg-[#F8EEEE] rounded-lg flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <LogOut size={16} className="text-[#7C3838]" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;

