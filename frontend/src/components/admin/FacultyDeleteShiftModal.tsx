import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight, Trash2, UserCheck, Briefcase } from 'lucide-react';
import { AdminFaculty, AdminService } from '../../services/adminService';

interface FacultyDeleteShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: AdminFaculty | null;
  onSuccess: (message: string) => void;
}

export const FacultyDeleteShiftModal: React.FC<FacultyDeleteShiftModalProps> = ({
  isOpen,
  onClose,
  faculty,
  onSuccess
}) => {
  if (!isOpen || !faculty) return null;

  const allFaculties = AdminService.getFaculties();
  const isAdvisor = faculty.role === 'Advisor' || faculty.role === 'Advisor & Guide';
  const isGuide = faculty.role === 'Guide' || faculty.role === 'Advisor & Guide';
  const hasNoRole = faculty.role === 'None';

  // Eligible non-advisors to inherit advisor role (exclude departing faculty and anyone already an advisor)
  const eligibleAdvisors = allFaculties.filter(f => 
    f.email !== faculty.email && f.role !== 'Advisor' && f.role !== 'Advisor & Guide'
  );

  // Eligible non-guides or guides with capacity to inherit guide teams
  const eligibleGuides = allFaculties.filter(f => 
    f.email !== faculty.email && f.teamsCount < f.maxQuota
  );

  const [advisorSuccessor, setAdvisorSuccessor] = useState(eligibleAdvisors[0]?.email || '');
  const [guideSuccessor, setGuideSuccessor] = useState(eligibleGuides[0]?.email || '');
  const [reason, setReason] = useState('Faculty resignation / academic semester restructuring');
  const [error, setError] = useState('');

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required to finalize faculty deletion.');
      return;
    }

    if (isAdvisor && !advisorSuccessor && eligibleAdvisors.length > 0) {
      setError('Please select an eligible faculty member to inherit the Class Advisor duties.');
      return;
    }

    if (isGuide && faculty.teamsCount > 0 && !guideSuccessor && eligibleGuides.length > 0) {
      setError('Please select an eligible faculty member to inherit the guided student teams.');
      return;
    }

    AdminService.shiftWorkloadAndDeleteFaculty(
      faculty.email,
      isAdvisor ? advisorSuccessor : undefined,
      isGuide ? guideSuccessor : undefined,
      reason
    );

    onSuccess(`Faculty ${faculty.name} successfully deleted. Workloads shifted and audit trail updated.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-[#D8CCBA] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center font-bold">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#111111]">Delete Faculty &amp; Shift Workload</h3>
              <p className="text-xs text-[#75695A]">Decommission profile and reallocate responsibilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4 text-xs">
          
          {/* Target Info Pill */}
          <div className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#111111] text-sm block">{faculty.name}</span>
              <span className="text-[#75695A] font-mono text-[11px]">{faculty.email}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EDE7DB] text-[#111111] uppercase border border-[#D8CCBA]">
              {faculty.role}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hasNoRole ? (
            <div className="p-3.5 rounded-2xl bg-[#EDE7DB]/60 border border-[#D8CCBA] text-[#111111]">
              <p className="font-bold">No Active Duties to Reallocate</p>
              <p className="text-[11px] text-[#75695A] mt-0.5">
                This faculty currently has no assigned class or active teams. Deleting will immediately purge their credentials.
              </p>
            </div>
          ) : null}

          {/* Shift Advisor Workload */}
          {isAdvisor && (
            <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] space-y-2.5">
              <div className="flex items-center gap-2 text-[#111111] font-bold text-xs">
                <UserCheck size={16} className="text-[#111111]" />
                <span>Class Advisor Shift Required</span>
              </div>
              <p className="text-[11px] text-[#75695A]">
                Currently supervising <strong>{faculty.advisorClass || 'Assigned Class'}</strong> ({faculty.advisorBatch || 'Current Batch'}).
                Select an eligible non-advisor faculty to inherit this section:
              </p>
              <select
                value={advisorSuccessor}
                onChange={(e) => setAdvisorSuccessor(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111] text-xs"
              >
                {eligibleAdvisors.length === 0 ? (
                  <option value="">No other faculties available</option>
                ) : (
                  eligibleAdvisors.map(f => (
                    <option key={f.email} value={f.email}>
                      {f.name} ({f.designation} • Current: {f.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Shift Guide Workload */}
          {isGuide && faculty.teamsCount > 0 && (
            <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] space-y-2.5">
              <div className="flex items-center gap-2 text-[#111111] font-bold text-xs">
                <Briefcase size={16} className="text-[#111111]" />
                <span>Project Mentorship Shift Required</span>
              </div>
              <p className="text-[11px] text-[#75695A]">
                Currently mentoring <strong>{faculty.teamsCount} Capstone Teams</strong>. Select a successor guide to adopt these teams:
              </p>
              <select
                value={guideSuccessor}
                onChange={(e) => setGuideSuccessor(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111] text-xs"
              >
                {eligibleGuides.length === 0 ? (
                  <option value="">No available guides with capacity</option>
                ) : (
                  eligibleGuides.map(f => (
                    <option key={f.email} value={f.email}>
                      {f.name} ({f.teamsCount}/{f.maxQuota} Teams Active)
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Mandatory Reason Prompt */}
          <div>
            <label className="block text-[#75695A] font-medium mb-1">
              Mandatory Deletion Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter official justification for audit records..."
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] font-medium"
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
              className="px-5 py-2 bg-[#7C3838] hover:bg-[#682F2F] text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Trash2 size={14} />
              <span>Confirm Workload Shift &amp; Delete</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default FacultyDeleteShiftModal;
