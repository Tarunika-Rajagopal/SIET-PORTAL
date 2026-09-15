import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Phone, BookOpen, Shield } from 'lucide-react';

interface ProfileModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, activeRole } = useAuth();

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header with Mint Gradient */}
        <div className="bg-gradient-to-r from-mint-700 to-mint-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white text-mint-800 font-extrabold text-2xl flex items-center justify-center shadow-lg border-2 border-white/30">
              {currentUser.initials || 'SI'}
            </div>
            <div>
              <h3 className="text-xl font-extrabold">{currentUser.name}</h3>
              <p className="text-mint-100 text-xs mt-0.5">{currentUser.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white text-mint-900 text-[11px] font-extrabold capitalize shadow-sm">
                  {activeRole}
                </span>
                <span className="text-[11px] text-mint-100 font-medium">
                  {currentUser.department}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body Details */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            {currentUser.rollNo && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Register Number</div>
                <div className="text-slate-800 font-extrabold text-sm mt-0.5">{currentUser.rollNo}</div>
              </div>
            )}

            {currentUser.class && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Class & Section</div>
                <div className="text-slate-800 font-extrabold text-sm mt-0.5">{currentUser.class}</div>
              </div>
            )}

            {currentUser.batch && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Academic Batch</div>
                <div className="text-slate-800 font-semibold text-xs mt-0.5">{currentUser.batch}</div>
              </div>
            )}

            {currentUser.designation && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Faculty Designation</div>
                <div className="text-slate-800 font-semibold text-xs mt-0.5">{currentUser.designation}</div>
              </div>
            )}
          </div>

          {/* Student Specific Fields */}
          {activeRole === 'student' && (
            <div className="space-y-3 bg-mint-50/70 p-4 rounded-2xl border border-mint-200/80">
              <div className="font-bold text-mint-900 text-xs flex items-center gap-1.5">
                <BookOpen size={14} className="text-mint-600" />
                <span>Project Assignment</span>
              </div>
              <p className="text-slate-700 font-semibold leading-relaxed">
                {currentUser.projectTitle || 'Autonomous Crop Disease Segmentation & Yield Advisory Drone System'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-mint-200/50 text-[11px]">
                <div>
                  <span className="text-slate-500">Project Guide:</span>
                  <p className="font-bold text-slate-800">{currentUser.guideName || 'Dr. P. Manimegalai'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Class Advisor:</span>
                  <p className="font-bold text-slate-800">{currentUser.advisorName || 'Dr. R. Karthikeyan'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Faculty Contact */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-slate-600">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400" />
              <span>{currentUser.email}</span>
            </div>
            {currentUser.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <span>{currentUser.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-slate-400" />
              <span>Sri Shakthi Institute of Engineering and Technology</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-[#E2E8E4] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
