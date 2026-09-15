import React, { useState } from 'react';
import { X, UserCheck, Check, AlertTriangle } from 'lucide-react';
import { AdminService } from '../../services/adminService';

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

  const allFaculties = AdminService.getFaculties();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-mint-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-sm">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Assign Class Advisor</h3>
              <p className="text-xs text-slate-500">Designate faculty advisor for {className}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="p-3.5 bg-mint-50/50 rounded-2xl border border-mint-200 text-mint-900 font-bold flex items-center justify-between">
            <span>Target Section:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-mint-300 text-mint-900">
              {className} • {batch}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">Select Faculty Member</label>
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold text-slate-800 focus:outline-none focus:border-mint-500"
            >
              {candidates.map(f => (
                <option key={f.email} value={f.email}>
                  {f.name} ({f.designation} • {f.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Assignment Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Semester workload allocation"
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2"
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
