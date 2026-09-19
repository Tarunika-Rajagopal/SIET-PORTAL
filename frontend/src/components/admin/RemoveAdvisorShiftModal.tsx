import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight, UserCheck, UserMinus, ShieldAlert } from 'lucide-react';
import { AdminFaculty, AdminService } from '../../services/adminService';

interface RemoveAdvisorShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: AdminFaculty | null;
  onSuccess: (message: string) => void;
}

export const RemoveAdvisorShiftModal: React.FC<RemoveAdvisorShiftModalProps> = ({
  isOpen,
  onClose,
  faculty,
  onSuccess
}) => {
  if (!isOpen || !faculty) return null;

  const allFaculties = AdminService.getFaculties();
  // Strictly eligible non-advisors: must not be an advisor currently, and not the outgoing faculty
  const eligibleNonAdvisors = allFaculties.filter(f =>
    f.email !== faculty.email && f.role !== 'Advisor' && f.role !== 'Advisor & Guide'
  );

  const [successorEmail, setSuccessorEmail] = useState(eligibleNonAdvisors[0]?.email || '');
  const [reason, setReason] = useState('Faculty academic load rebalancing & class advisory transition');
  const [error, setError] = useState('');

  // Auto-sync successor selection when modal opens
  useEffect(() => {
    if (eligibleNonAdvisors.length > 0 && !eligibleNonAdvisors.some(f => f.email === successorEmail)) {
      setSuccessorEmail(eligibleNonAdvisors[0].email);
    }
  }, [faculty]);

  const selectedSuccessor = allFaculties.find(f => f.email === successorEmail);

  const getProjectedRole = (f: AdminFaculty) => {
    if (f.role === 'Guide') return 'Advisor & Guide';
    return 'Advisor';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required for institutional audit trail recording.');
      return;
    }

    if (!successorEmail && eligibleNonAdvisors.length > 0) {
      setError('Please select an eligible non-advisor faculty member to inherit the class.');
      return;
    }

    if (eligibleNonAdvisors.length === 0) {
      setError('No eligible non-advisor faculty is currently available in the department. Please onboard a new faculty member first.');
      return;
    }

    const res = AdminService.removeAdvisorWithSuccessor(faculty.email, successorEmail, reason);
    if (res.success) {
      onSuccess(res.message);
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <UserMinus size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Remove Advisor &amp; Reassign Section</h3>
              <p className="text-xs text-slate-500">Transfer student section duties to a non-advisor faculty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Target Advisor Info Pill */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] flex items-center justify-between">
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">{faculty.name}</span>
              <span className="text-slate-500 font-mono text-[11px]">{faculty.email}</span>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                {faculty.role}
              </span>
              <span className="text-[11px] text-slate-500 font-bold block mt-1">
                Class {faculty.advisorClass || 'N/A'} ({faculty.advisorBatch || 'N/A'})
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Workload Transfer Warning & Selector */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
              <UserCheck size={16} className="text-amber-700 shrink-0" />
              <span>Mandatory Section Handover (Non-Advisor Faculty)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <strong>{faculty.name}</strong> currently supervises <strong>Class {faculty.advisorClass || 'CSE-B'}</strong> ({faculty.advisorBatch || 'Current Batch'}). 
              To ensure students are not left unguided, you must select an eligible <strong>non-advisor faculty</strong> to inherit this section:
            </p>

            {eligibleNonAdvisors.length === 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-bold">
                ⚠️ No eligible non-advisor faculty available. Every faculty is currently an advisor. Onboard a faculty first.
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Assign Section To Non-Advisor Faculty:
                </label>
                <select
                  value={successorEmail}
                  onChange={(e) => setSuccessorEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-mint-500 text-xs shadow-2xs"
                >
                  {eligibleNonAdvisors.map(f => (
                    <option key={f.email} value={f.email}>
                      {f.name} ({f.designation} • Current: {f.role})
                    </option>
                  ))}
                </select>

                {selectedSuccessor && (
                  <div className="mt-2.5 p-2.5 bg-white/80 rounded-xl border border-amber-200 flex items-center gap-2 text-[11px] text-slate-700">
                    <ArrowRight size={13} className="text-amber-600 shrink-0" />
                    <span>
                      <strong>{selectedSuccessor.name}</strong> will become Class Advisor for{' '}
                      <strong>Class {faculty.advisorClass}</strong> (New Role:{' '}
                      <span className="font-bold text-amber-900">{getProjectedRole(selectedSuccessor)}</span>)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Institutional Audit Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl text-slate-800 focus:outline-none focus:border-mint-500 text-xs"
            />
          </div>

          {/* Actions */}
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
              disabled={eligibleNonAdvisors.length === 0}
              className={`px-5 py-2 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 ${
                eligibleNonAdvisors.length === 0
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <UserMinus size={14} />
              <span>Confirm Shift &amp; Remove Advisor</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default RemoveAdvisorShiftModal;
