import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight, Briefcase, UserMinus, ShieldAlert } from 'lucide-react';
import { AdminFaculty, AdminService } from '../../services/adminService';

interface RemoveGuideShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: AdminFaculty | null;
  onSuccess: (message: string) => void;
}

export const RemoveGuideShiftModal: React.FC<RemoveGuideShiftModalProps> = ({
  isOpen,
  onClose,
  faculty,
  onSuccess
}) => {
  if (!isOpen || !faculty) return null;
  const [allFaculties,setAllfaculties] = useState<AdminFaculty[]>([]);

  useEffect(()=>{
    const faculty = async()=>{
    const res = await AdminService.getFaculties();
    setAllfaculties(res);
    };
    faculty();
  },[])
  // Strictly eligible non-guides: must not be a guide currently, and not the outgoing faculty
  const eligibleNonGuides = allFaculties.filter(f =>
    f.email !== faculty.email && f.role !== 'Guide' && f.role !== 'Advisor & Guide'
  );

  // Fallback: if all faculties are already guides, allow any faculty with available capacity
  const eligibleSuccessors = eligibleNonGuides.length > 0
    ? eligibleNonGuides
    : allFaculties.filter(f => f.email !== faculty.email && f.teamsCount < f.maxQuota);

  const [successorEmail, setSuccessorEmail] = useState(eligibleSuccessors[0]?.email || '');
  const [reason, setReason] = useState('Faculty research mentorship restructuring & team transfer');
  const [error, setError] = useState('');

  // Auto-sync successor selection when modal opens
  useEffect(() => {
    if (eligibleSuccessors.length > 0 && !eligibleSuccessors.some(f => f.email === successorEmail)) {
      setSuccessorEmail(eligibleSuccessors[0].email);
    }
  }, [faculty]);

  const selectedSuccessor = allFaculties.find(f => f.email === successorEmail);

  const getProjectedRole = (f: AdminFaculty) => {
    if (f.role === 'Advisor') return 'Advisor & Guide';
    return 'Guide';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required for institutional audit trail recording.');
      return;
    }

    if (faculty.teamsCount > 0 && !successorEmail && eligibleSuccessors.length > 0) {
      setError('Please select an eligible non-guide faculty member to inherit the mentored teams.');
      return;
    }

    if (faculty.teamsCount > 0 && eligibleSuccessors.length === 0) {
      setError('No eligible non-guide faculty is currently available. Please onboard a new faculty member first.');
      return;
    }

    const res = AdminService.removeGuideWithSuccessor(faculty.email, successorEmail, reason);
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
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-mint-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
              <UserMinus size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Remove Guide &amp; Reassign Mentorship</h3>
              <p className="text-xs text-slate-500">Transfer student capstone teams to a non-guide faculty</p>
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
          
          {/* Target Guide Info Pill */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] flex items-center justify-between">
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">{faculty.name}</span>
              <span className="text-slate-500 font-mono text-[11px]">{faculty.email}</span>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-mint-100 text-mint-900 border border-mint-200 uppercase">
                {faculty.role}
              </span>
              <span className="text-[11px] text-slate-500 font-bold block mt-1">
                {faculty.teamsCount} Active Teams ({faculty.teamsCount * 4} Students)
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
          <div className="p-4 rounded-2xl bg-mint-50/70 border border-mint-200 space-y-3">
            <div className="flex items-center gap-2 text-mint-900 font-extrabold text-xs">
              <Briefcase size={16} className="text-mint-700 shrink-0" />
              <span>Mandatory Mentorship Handover (Non-Guide Faculty)</span>
            </div>
            <p className="text-[11px] text-mint-800 leading-relaxed">
              <strong>{faculty.name}</strong> currently guides <strong>{faculty.teamsCount} Capstone Teams</strong>.
              To ensure research projects continue without interruption, you must select an eligible <strong>non-guide faculty</strong> to adopt these teams:
            </p>

            {eligibleSuccessors.length === 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-bold">
                ⚠️ No eligible faculty available with capacity to adopt these teams. Onboard a faculty first.
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Assign Teams To Non-Guide Faculty:
                </label>
                <select
                  value={successorEmail}
                  onChange={(e) => setSuccessorEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-mint-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-mint-500 text-xs shadow-2xs"
                >
                  {eligibleSuccessors.map(f => (
                    <option key={f.email} value={f.email}>
                      {f.name} ({f.designation} • Current: {f.role} • {f.teamsCount}/{f.maxQuota} Teams)
                    </option>
                  ))}
                </select>

                {selectedSuccessor && (
                  <div className="mt-2.5 p-2.5 bg-white/80 rounded-xl border border-mint-200 flex items-center gap-2 text-[11px] text-slate-700">
                    <ArrowRight size={13} className="text-mint-600 shrink-0" />
                    <span>
                      <strong>{selectedSuccessor.name}</strong> will inherit{' '}
                      <strong>{faculty.teamsCount} Teams</strong> (New Role:{' '}
                      <span className="font-bold text-mint-900">{getProjectedRole(selectedSuccessor)}</span>)
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
              disabled={faculty.teamsCount > 0 && eligibleSuccessors.length === 0}
              className={`px-5 py-2 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 ${
                faculty.teamsCount > 0 && eligibleSuccessors.length === 0
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-mint-600 hover:bg-mint-700'
              }`}
            >
              <UserMinus size={14} />
              <span>Confirm Shift &amp; Remove Guide</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default RemoveGuideShiftModal;
