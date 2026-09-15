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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E2E8E4] animate-in zoom-in-95 duration-200 relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-extrabold shadow-sm">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Designate Class Advisor</h3>
            <p className="text-xs text-slate-500 font-semibold">Department Order &bull; {targetClass}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
            <span className="text-slate-400 block font-bold uppercase text-[10px]">Class &amp; Batch Target</span>
            <span className="font-extrabold text-slate-900">{targetClass} &bull; Batch 2023-2027</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Senior Faculty</label>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500"
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
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
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
