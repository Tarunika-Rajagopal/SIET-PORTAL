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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal border border-[#D8CCBA] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1A1A1A] text-[#F8F5EE] p-6 text-center border-b border-[#292725]">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 text-[#F8F5EE] flex items-center justify-center mb-3 border border-white/10">
            <ShieldCheck size={26} />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#F8F5EE]">Select Your Faculty Workspace</h3>
          <p className="text-[#B8AA97] text-xs mt-1">
            Welcome, <span className="font-bold text-white">{user.name}</span>. You hold dual responsibilities in CSE.
          </p>
        </div>

        {/* Roles Selection */}
        <div className="p-6 space-y-3 bg-white">
          
          {/* Option 1: Class Advisor */}
          <button
            onClick={() => onSelectRole(user, 'advisor')}
            className="w-full text-left p-4 rounded-xl border border-[#D8CCBA] hover:border-[#111111] bg-[#F8F5EE] hover:bg-[#F3EFE6] transition group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#111111] text-[#F8F5EE] flex items-center justify-center shadow-subtle border border-[#292725]">
                <Compass size={22} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#111111] group-hover:text-black transition">
                  Designated Class Advisor
                </h4>
                <p className="text-[11px] text-[#75695A] mt-0.5">
                  Student management, team allocations &amp; guide assignments
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-[#75695A] group-hover:text-[#111111] transform group-hover:translate-x-1 transition" />
          </button>

          {/* Option 2: Project Guide */}
          <button
            onClick={() => onSelectRole(user, 'guide')}
            className="w-full text-left p-4 rounded-xl border border-[#D8CCBA] hover:border-[#111111] bg-[#F8F5EE] hover:bg-[#F3EFE6] transition group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#111111] text-[#F8F5EE] flex items-center justify-center shadow-subtle border border-[#292725]">
                <BookOpen size={22} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#111111] group-hover:text-black transition">
                  Project Technical Guide
                </h4>
                <p className="text-[11px] text-[#75695A] mt-0.5">
                  Mentee evaluations, rubric scoring &amp; weekly deliverable approvals
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-[#75695A] group-hover:text-[#111111] transform group-hover:translate-x-1 transition" />
          </button>

        </div>

        {/* Footer */}
        <div className="bg-[#F8F5EE] px-6 py-3.5 border-t border-[#D8CCBA] flex justify-between items-center text-xs">
          <span className="text-[#75695A]">Switch roles anytime from top navigation.</span>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-[#75695A] hover:text-[#111111] font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default DualRoleModal;
