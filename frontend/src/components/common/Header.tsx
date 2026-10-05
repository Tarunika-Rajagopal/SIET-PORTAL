import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserInitials } from '../../services/authService';
import { LogOut, User as UserIcon, Settings as SettingsIcon, MoreVertical } from 'lucide-react';
import GlassSurface from '../ui/GlassSurface';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenProfile?: () => void;
  children?: React.ReactNode;
  extraRight?: React.ReactNode;
  userInitials?: string;
  hideSettings?: boolean;
  noBorder?: boolean;
  isSticky?: boolean;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Department Project Portal",
  subtitle = "Department of Computer Science and Engineering",
  onOpenProfile,
  children,
  extraRight,
  userInitials,
  hideSettings,
  noBorder = false,
  isSticky = false,
  className = ""
}) => {
  const { currentUser, activeRole, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const avatarInitials = userInitials || (currentUser?.initials && currentUser.initials !== 'US'
    ? currentUser.initials
    : (currentUser?.name ? getUserInitials(currentUser.name) : (activeRole === 'student' ? 'ST' : 'DR')));

  return (
    <header className={`${isSticky ? 'sticky top-0 z-40' : 'relative z-40'} w-full ${className}`}>
      <GlassSurface
        width="100%"
        height={76}
        borderRadius={0}
        borderWidth={0.07}
        brightness={50}
        opacity={0.93}
        blur={11}
        displace={0.5}
        distortionScale={-180}
        redOffset={0}
        greenOffset={10}
        blueOffset={20}
        mixBlendMode="screen"
        backgroundOpacity={0}
        saturation={1}
        overflow="visible"
        className={`w-full ${noBorder ? '' : 'border-b border-white/20'}`}
        contentClassName="w-full h-full p-0 flex items-center justify-center overflow-visible"
      >
        <div className="max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 w-full">
          <div className="flex items-center justify-between h-[76px]">
          
          {/* Left: CSE logo + Title + Small Subtitle */}
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3.5 cursor-pointer group shrink-0"
            title="Return to Dashboard"
          >
            <img 
              src="/logo.jpg" 
              alt="SIET CSE" 
              className="w-10 h-10 rounded-xl object-contain border border-[#D8CCBA] bg-white p-0.5 shrink-0" 
            />
            <div>
              <h1 className="text-[15px] sm:text-base font-sans font-bold text-white leading-tight drop-shadow-xs">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[12px] text-white/85 font-semibold leading-none mt-0.5 drop-shadow-xs">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Center: Navigation Tabs Slot (Single row, centered, thin black underline) */}
          {children && (
            <nav className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 h-full overflow-x-auto scrollbar-none px-2">
              {children}
            </nav>
          )}

          {/* Right: Actions / ⋮ + Profile Avatar DR */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {extraRight}

            {/* Subtle More ⋮ Dropdown Menu */}
            <div className="relative">
              <button
                id="headerMoreMenuButton"
                onClick={() => {
                  setMoreMenuOpen(!moreMenuOpen);
                  setProfileDropdownOpen(false);
                }}
                className="w-9 h-9 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="More options"
                title="Options"
              >
                <MoreVertical size={18} />
              </button>

              {moreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMoreMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] rounded-xl shadow-card border border-[#D8CCBA] p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111] rounded-lg flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <UserIcon size={16} className="text-[#75695A]" />
                      <span>My Profile</span>
                    </button>
                    {activeRole !== 'admin' && (
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-[#292725] hover:bg-[#F3EFE6] hover:text-[#111111] rounded-lg flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <SettingsIcon size={16} className="text-[#75695A]" />
                        <span>Portal Settings</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar Button with Initials e.g. DR */}
            <div className="relative">
              <button
                id="headerProfileAvatarButton"
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setMoreMenuOpen(false);
                }}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm flex items-center justify-center border border-white/40 shadow-xs hover:ring-2 hover:ring-white/50 transition focus:outline-none cursor-pointer tracking-wider backdrop-blur-sm"
                aria-label="User profile menu"
              >
                {avatarInitials}
              </button>

              {/* Dropdown with Profile and Logout options */}
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
      </GlassSurface>
    </header>
  );
};

export default Header;

