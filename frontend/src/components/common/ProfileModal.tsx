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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-modal border border-[#D8CCBA] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header with Sleek Charcoal Treatment */}
        <div className="bg-[#1A1A1A] p-6 text-[#F8F5EE] border-b border-[#292725] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#B8AA97] hover:text-[#F8F5EE] p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#F8F5EE] text-[#111111] font-serif font-bold text-2xl flex items-center justify-center shadow-subtle border border-[#D8CCBA]">
              {currentUser.initials || 'SI'}
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-[#F8F5EE]">{currentUser.name}</h3>
              <p className="text-[#B8AA97] text-xs mt-0.5">{currentUser.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE7DB] text-[#111111] text-[11px] font-bold capitalize shadow-xs border border-[#D8CCBA]">
                  {activeRole}
                </span>
                <span className="text-[11px] text-[#B8AA97] font-medium">
                  {currentUser.department}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body Details */}
        <div className="p-6 space-y-4 text-xs bg-white">
          <div className="grid grid-cols-2 gap-4">
            {currentUser.rollNo && (
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#D8CCBA]">
                <div className="text-[#75695A] font-bold uppercase tracking-wider text-[10px]">Register Number</div>
                <div className="text-[#111111] font-bold text-sm mt-0.5">{currentUser.rollNo}</div>
              </div>
            )}

            {currentUser.class && (
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#D8CCBA]">
                <div className="text-[#75695A] font-bold uppercase tracking-wider text-[10px]">Class & Section</div>
                <div className="text-[#111111] font-bold text-sm mt-0.5">{currentUser.class}</div>
              </div>
            )}

            {currentUser.batch && (
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#D8CCBA]">
                <div className="text-[#75695A] font-bold uppercase tracking-wider text-[10px]">Academic Batch</div>
                <div className="text-[#111111] font-semibold text-xs mt-0.5">{currentUser.batch}</div>
              </div>
            )}

            {currentUser.designation && (
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#D8CCBA]">
                <div className="text-[#75695A] font-bold uppercase tracking-wider text-[10px]">Faculty Designation</div>
                <div className="text-[#111111] font-semibold text-xs mt-0.5">{currentUser.designation}</div>
              </div>
            )}
          </div>

          {/* Student Specific Fields */}
          {activeRole === 'student' && (
            <div className="space-y-3 bg-[#F3EFE6] p-4 rounded-xl border border-[#D8CCBA]">
              <div className="font-bold text-[#111111] text-xs flex items-center gap-1.5">
                <BookOpen size={14} className="text-[#75695A]" />
                <span className="font-serif">Project Assignment</span>
              </div>
              <p className="text-[#292725] font-semibold leading-relaxed">
                {currentUser.projectTitle || 'Autonomous Crop Disease Segmentation & Yield Advisory Drone System'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D8CCBA] text-[11px]">
                <div>
                  <span className="text-[#75695A]">Project Guide:</span>
                  <p className="font-bold text-[#111111]">{currentUser.guideName || 'Dr. P. Manimegalai'}</p>
                </div>
                <div>
                  <span className="text-[#75695A]">Class Advisor:</span>
                  <p className="font-bold text-[#111111]">{currentUser.advisorName || 'Dr. R. Karthikeyan'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Faculty Contact */}
          <div className="space-y-2 pt-2 border-t border-[#D8CCBA] text-[#75695A]">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-[#B8AA97]" />
              <span className="text-[#292725]">{currentUser.email}</span>
            </div>
            {currentUser.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#B8AA97]" />
                <span className="text-[#292725]">{currentUser.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#B8AA97]" />
              <span className="text-[#292725]">Sri Shakthi Institute of Engineering and Technology</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-bold text-xs rounded-lg shadow-subtle border border-[#292725] transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
