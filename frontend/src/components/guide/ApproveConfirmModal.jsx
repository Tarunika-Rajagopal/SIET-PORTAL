import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, X, Lock } from 'lucide-react';

export const ApproveConfirmModal = ({ isOpen, onClose, team, onConfirm }) => {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-modal-title"
      >
        {/* Header in Warm Ivory */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F8F5EE] border border-[#111111] flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 id="approve-modal-title" className="text-sm font-serif font-bold text-[#111111] tracking-wide">
                Confirm Title Endorsement
              </h3>
              <p className="text-[11px] text-[#75695A] font-semibold">Department Guide Jurisdiction &bull; CSE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-lg hover:bg-[#EDE7DB] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-amber-950 leading-relaxed">
              <strong className="font-bold block mb-1">Permanent Scope Lock Warning:</strong>
              Once approved, the Project Title, Problem Statement, Scope, Student Roster, and Faculty Guide assignment are <span className="font-bold underline">permanently locked</span> for institutional academic records.
            </div>
          </div>

          <div className="border border-[#D8CCBA] rounded-xl p-4 bg-[#F8F5EE] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#75695A] uppercase tracking-wider text-[10px]">Team Designation</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[11px]">
                Team #{team.teamNumber}
              </span>
            </div>
            <div>
              <span className="font-bold text-[#75695A] uppercase tracking-wider text-[10px]">Project Title</span>
              <p className="font-serif font-bold text-[#111111] text-sm mt-0.5 leading-snug">{team.projectTitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D8CCBA] text-[#111111]">
              <div>
                <span className="text-[10px] text-[#75695A] block font-semibold">Team Leader</span>
                <span className="font-bold text-[#111111]">{team.teamLeader}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#75695A] block font-semibold">Total Students</span>
                <span className="font-bold text-[#111111]">{team.membersCount || 4} Enrolled Students</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] px-3.5 py-2.5 rounded-xl font-bold">
            <Lock size={14} className="shrink-0 text-[#111111]" />
            <span>Weekly Milestone 1 sprint will be unlocked for student team submissions.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#111111] hover:text-black bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(team.teamId);
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
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
