import React, { useState } from 'react';
import { X, UserCheck, CheckCircle2 } from 'lucide-react';
import { HodService } from '../../services/hodService';

interface AssignAdvisorModalProps {
  isOpen: boolean;
  targetClass?: string;
  onClose: () => void;
  onAssign: (facultyName: string, targetClass: string) => void;
}

export const AssignAdvisorModal: React.FC<AssignAdvisorModalProps> = ({
  isOpen,
  targetClass = "Class CSE-B",
  onClose,
  onAssign
}) => {
  const facultyList = HodService.getFacultyList();
  const [selectedFaculty, setSelectedFaculty] = useState(facultyList[0]?.name || 'Dr. R. Karthikeyan');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(selectedFaculty, targetClass);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#D8CCBA] animate-in zoom-in-95 duration-200 relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#75695A] hover:text-[#111111] p-1.5 rounded-lg hover:bg-[#EDE7DB] transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-sm">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#111111]">Designate Class Advisor</h3>
            <p className="text-xs text-[#75695A] font-medium">Department Order &bull; {targetClass}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="p-3 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] text-xs text-[#75695A]">
            <span className="text-[#75695A] block font-semibold uppercase tracking-wider text-[10px]">Class &amp; Batch Target</span>
            <span className="font-bold text-[#111111]">{targetClass} &bull; Batch 2023-2027</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">Select Senior Faculty</label>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              {facultyList.map(f => (
                <option key={f.id} value={f.name}>
                  {f.name} ({f.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#75695A] hover:text-[#111111] hover:bg-[#EDE7DB] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 size={15} />
              <span>Issue Allocation Order</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AssignAdvisorModal;
