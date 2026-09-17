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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D8CCBA] animate-in zoom-in-95 duration-200 relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#75695A] hover:text-[#111111] p-1.5 rounded-lg hover:bg-[#EDE7DB] transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold shadow-xs">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#111111]">Assign Technical Guide</h3>
            <p className="text-xs text-[#75695A]">{team.teamNo} &bull; {team.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="p-3 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] text-xs text-[#292725]">
            <span className="text-[#75695A] block font-medium uppercase text-[10px]">Lead Student</span>
            <span className="font-bold text-[#111111]">{team.leadStudent}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#75695A] mb-1">Select Department Project Guide</label>
            <select
              value={selectedGuide}
              onChange={(e) => setSelectedGuide(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
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
              className="px-4 py-2 text-xs font-medium text-[#75695A] hover:text-[#111111]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#111111] hover:bg-[#292725] text-white font-medium text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
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
