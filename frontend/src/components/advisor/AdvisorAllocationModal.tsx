import React, { useState } from 'react';
import { X, CheckCircle2, UserCheck } from 'lucide-react';
import { ClassTeam } from '../../services/advisorService';

interface AdvisorAllocationModalProps {
  isOpen: boolean;
  team: ClassTeam | null;
  onClose: () => void;
  onAssign: (teamId: string, guideName: string) => void;
}

const AVAILABLE_GUIDES = [
  "Dr. P. Manimegalai (Associate Professor)",
  "Dr. A. Devipriya (Associate Professor)",
  "Dr. K. Vignesh (Assistant Professor)",
  "Dr. S. Kavitha (Assistant Professor)",
  "Dr. M. Prakash (Associate Professor)"
];

export const AdvisorAllocationModal: React.FC<AdvisorAllocationModalProps> = ({
  isOpen,
  team,
  onClose,
  onAssign
}) => {
  const [selectedGuide, setSelectedGuide] = useState(AVAILABLE_GUIDES[0]);

  if (!isOpen || !team) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(team.teamId, selectedGuide.split('(')[0].trim());
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
            <h3 className="text-base font-extrabold text-slate-900">Assign Technical Guide</h3>
            <p className="text-xs text-slate-500 font-semibold">{team.teamNo} &bull; {team.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
            <span className="text-slate-400 block font-bold uppercase text-[10px]">Lead Student</span>
            <span className="font-extrabold text-slate-900">{team.leadStudent}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Department Project Guide</label>
            <select
              value={selectedGuide}
              onChange={(e) => setSelectedGuide(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500"
            >
              {AVAILABLE_GUIDES.map(g => (
                <option key={g} value={g}>{g}</option>
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
              <span>Confirm Mapping</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AdvisorAllocationModal;
