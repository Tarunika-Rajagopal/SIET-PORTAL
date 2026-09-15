import React from 'react';
import { LogOut, AlertCircle, X } from 'lucide-react';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, facultyProfile }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <LogOut size={24} />
          </div>

          <div className="text-center space-y-1">
            <h3 id="logout-modal-title" className="text-base font-extrabold text-slate-900">
              Sign Out of Faculty Guide Portal?
            </h3>
            <p className="text-xs text-slate-500">
              You will need to authenticate again with your SIET institutional credentials to evaluate pending student milestones.
            </p>
          </div>

          {facultyProfile && (
            <div className="p-3.5 bg-[#EFF3F1]/70 border border-[#E2E8E4] rounded-xl text-xs text-slate-700 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-slate-900 block">{facultyProfile.name}</span>
                <span className="text-[10px] text-slate-500">{facultyProfile.empId} &bull; {facultyProfile.role}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-extrabold">
                Active Session
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8E4] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onConfirm) onConfirm();
              }}
              className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
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
