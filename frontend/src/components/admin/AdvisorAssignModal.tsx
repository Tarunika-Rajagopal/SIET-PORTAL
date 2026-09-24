import React, { useState,useEffect} from 'react';
import { X, UserCheck, Check, AlertTriangle } from 'lucide-react';
import { AdminFaculty, AdminService } from '../../services/adminService';

interface AdvisorAssignModalProps {
  isOpen: boolean;
  batch: string;
  className: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AdvisorAssignModal: React.FC<AdvisorAssignModalProps> = ({
  isOpen,
  batch,
  className,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;
  
  const[allFaculties,setAllfaculties] = useState<AdminFaculty[]>([]);
  
  useEffect(() => {
  const fetchFaculties = async () => {
    const f = await AdminService.getFaculties();
    setAllfaculties(f);
  };

  fetchFaculties();

  // const unsubscribe = AdminService.subscribe((updatedFaculties:AdminFaculty[]) => {
  //   setAllfaculties(updatedFaculties);
  // });

  // return () => {
  //   unsubscribe();
  // };
}, []);
  // Faculties not already assigned to this exact class
  const candidates = allFaculties.filter(f => !(f.advisorBatch === batch && f.advisorClass === className));

  const [selectedEmail, setSelectedEmail] = useState(candidates[0]?.email || '');
  const [reason, setReason] = useState(`Designated Class Advisor for ${className} (${batch})`);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) {
      setError('Please select a faculty member.');
      return;
    }

    const ok = AdminService.assignAdvisor(selectedEmail, batch, className, reason);
    if (!ok) {
      setError('Failed to assign advisor.');
      return;
    }

    const fac = allFaculties.find(f => f.email === selectedEmail);
    onSuccess(`Assigned ${fac?.name || selectedEmail} as Class Advisor for ${className}.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-[#D8CCBA] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold shadow-xs">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#111111]">Assign Class Advisor</h3>
              <p className="text-xs text-[#75695A]">Designate faculty advisor for {className}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] text-[#111111] font-medium flex items-center justify-between">
            <span>Target Section:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#D8CCBA] text-[#111111]">
              {className} • {batch}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[#75695A] font-medium mb-1">Select Faculty Member</label>
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              {candidates.map(f => (
                <option key={f.email} value={f.email}>
                  {f.name} ({f.designation} • {f.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#75695A] font-medium mb-1">
              Assignment Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] font-medium text-[#111111]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8CCBA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#75695A] font-medium hover:text-[#111111] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#111111] hover:bg-[#292725] text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Check size={14} />
              <span>Confirm Appointment</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AdvisorAssignModal;
