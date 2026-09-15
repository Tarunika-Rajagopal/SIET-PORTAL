import React from 'react';
import { User, Role } from '../../types';
import { ShieldCheck, BookOpen, Compass, ArrowRight } from 'lucide-react';

interface DualRoleModalProps {
  user: User;
  onSelectRole: (user: User, role: Role) => void;
  onCancel: () => void;
}

export const DualRoleModal: React.FC<DualRoleModalProps> = ({
  user,
  onSelectRole,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-mint-700 to-mint-500 text-white p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 text-white flex items-center justify-center mb-3">
            <ShieldCheck size={26} />
          </div>
          <h3 className="text-lg font-extrabold">Select Your Faculty Workspace</h3>
          <p className="text-mint-100 text-xs mt-1">
            Welcome, <span className="font-bold text-white">{user.name}</span>. You hold dual responsibilities in CSE.
          </p>
        </div>

        {/* Roles Selection */}
        <div className="p-6 space-y-3">
          
          {/* Option 1: Class Advisor */}
          <button
            onClick={() => onSelectRole(user, 'advisor')}
            className="w-full text-left p-4 rounded-2xl border-2 border-mint-100 hover:border-mint-500 bg-mint-50/40 hover:bg-mint-50 transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-mint-500 text-white flex items-center justify-center shadow-sm">
                <Compass size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-mint-800 transition">
                  Designated Class Advisor
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Student management, team allocations &amp; guide assignments
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:text-mint-600 transform group-hover:translate-x-1 transition" />
          </button>

          {/* Option 2: Project Guide */}
          <button
            onClick={() => onSelectRole(user, 'guide')}
            className="w-full text-left p-4 rounded-2xl border-2 border-mint-100 hover:border-mint-500 bg-mint-50/40 hover:bg-mint-50 transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-mint-700 text-white flex items-center justify-center shadow-sm">
                <BookOpen size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-mint-800 transition">
                  Project Technical Guide
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mentee evaluations, rubric scoring &amp; weekly deliverable approvals
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:text-mint-600 transform group-hover:translate-x-1 transition" />
          </button>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-[#E2E8E4] flex justify-between items-center text-xs">
          <span className="text-slate-400">Switch roles anytime from top navigation.</span>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-slate-500 hover:text-slate-800 font-semibold"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default DualRoleModal;
