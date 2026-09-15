import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

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

  return (
    <header className="bg-white border-b border-[#E2E8E4] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Brand with Uploaded Logo & Title */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="SIET CSE" 
              className="w-10 h-10 rounded-xl object-contain shadow-xs border border-mint-200 bg-white p-0.5 shrink-0" 
            />
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-mint-100 text-mint-800 border border-mint-200 uppercase tracking-wider">
                  {activeRole}
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">{subtitle}</p>
            </div>
          </div>

          {/* Optional Center/In-Header Navigation Slot */}
          {children && (
            <div className="hidden md:flex items-center space-x-1">
              {children}
            </div>
          )}

          {/* Right: Only User Avatar with First Letter & Initial */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-mint-500 to-emerald-600 hover:from-mint-600 hover:to-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md hover:ring-2 hover:ring-mint-400 hover:ring-offset-2 transition focus:outline-none cursor-pointer"
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-card border border-[#E2E8E4] p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onOpenProfile) onOpenProfile();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-mint-50 hover:text-mint-800 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <UserIcon size={16} className="text-mint-600" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      try {
                        if (logout) logout();
                        sessionStorage.removeItem('siet_auth_user');
                        localStorage.removeItem('siet_auth_user');
                      } catch (e) {
                        console.error(e);
                      }
                      window.location.href = '/';
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
      </div>
    </header>
  );
};

export default Header;
