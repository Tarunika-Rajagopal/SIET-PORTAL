import React from 'react';
import { LogOut, AlertCircle, X } from 'lucide-react';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, facultyProfile }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F8F5EE] text-[#111111] flex items-center justify-center mx-auto border border-[#D8CCBA]">
            <LogOut size={24} />
          </div>

          <div className="text-center space-y-1">
            <h3 id="logout-modal-title" className="text-base font-serif font-bold text-[#111111]">
              Sign Out of Faculty Guide Portal?
            </h3>
            <p className="text-xs text-[#75695A]">
              You will need to authenticate again with your SIET institutional credentials to evaluate pending student milestones.
            </p>
          </div>

          {facultyProfile && (
            <div className="p-3.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#111111] block">{facultyProfile.name}</span>
                <span className="text-[10px] text-[#75695A]">{facultyProfile.empId} &bull; {facultyProfile.role}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[10px] font-bold">
                Active Session
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-[#111111] bg-white hover:bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onConfirm) onConfirm();
              }}
              className="w-full py-2.5 text-xs font-bold text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Confirm Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
