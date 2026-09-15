import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, X, Lock } from 'lucide-react';

export const ApproveConfirmModal = ({ isOpen, onClose, team, onConfirm }) => {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-modal-title"
      >
        {/* Header in White & Mint */}
        <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-700 border border-mint-200 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 id="approve-modal-title" className="text-sm font-extrabold text-slate-900 tracking-wide">
                Confirm Title Endorsement
              </h3>
              <p className="text-[11px] text-mint-700 font-semibold">Department Guide Jurisdiction &bull; CSE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-extrabold block mb-1">Permanent Scope Lock Warning:</strong>
              Once approved, the Project Title, Problem Statement, Scope, Student Roster, and Faculty Guide assignment are <span className="font-extrabold underline">permanently locked</span> for institutional academic records.
            </div>
          </div>

          <div className="border border-[#E2E8E4] rounded-xl p-4 bg-[#EFF3F1]/60 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Team Designation</span>
              <span className="font-extrabold px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[11px]">
                Team #{team.teamNumber}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Project Title</span>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5 leading-snug">{team.projectTitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8E4] text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Team Leader</span>
                <span className="font-bold text-slate-800">{team.teamLeader}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Total Students</span>
                <span className="font-bold text-slate-800">{team.membersCount || 4} Enrolled Students</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-mint-900 bg-mint-50 border border-mint-200 px-3.5 py-2.5 rounded-xl font-bold">
            <Lock size={14} className="shrink-0 text-mint-700" />
            <span>Weekly Milestone 1 sprint will be unlocked for student team submissions.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(team.teamId);
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-mint-500 hover:bg-mint-600 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
          >
            <CheckCircle2 size={15} />
            <span>Confirm &amp; Lock Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveConfirmModal;
