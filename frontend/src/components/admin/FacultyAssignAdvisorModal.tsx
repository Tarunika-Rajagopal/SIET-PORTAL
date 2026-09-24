import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { AdminFaculty, AdminService } from '../../services/adminService';

interface FacultyAssignAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: AdminFaculty | null;
  onSuccess: (message: string) => void;
}

const AVAILABLE_BATCHES = [
  '2023-2027 (III Year)',
  '2024-2028 (II Year)',
  '2022-2026 (IV Year)',
  '2025-2029 (I Year)'
];

const SECTIONS = ['CSE-A', 'CSE-B', 'CSE-C'];

export const FacultyAssignAdvisorModal: React.FC<FacultyAssignAdvisorModalProps> = ({
  isOpen,
  onClose,
  faculty,
  onSuccess
}) => {
  if (!isOpen || !faculty) return null;

  const [allFaculties,setAllfaculties]= useState<AdminFaculty[]>([]);
  useEffect(()=>{
    const faculty = async()=>{
      const f = await AdminService.getFaculties();
      setAllfaculties(f);
    };
    faculty();
    return AdminService.subscribe(faculty);
  },[])
  const [selectedBatch, setSelectedBatch] = useState(AVAILABLE_BATCHES[0]);
  const [selectedSection, setSelectedSection] = useState('');
  const [reason, setReason] = useState('Academic session class advisory designation');
  const [error, setError] = useState('');

  // Map assigned sections for the chosen batch
  const assignedMap: { [sec: string]: AdminFaculty } = {};
  allFaculties.forEach(f => {
    if (f.advisorBatch === selectedBatch && f.advisorClass) {
      assignedMap[f.advisorClass] = f;
    }
  });

  const availableSections = SECTIONS.filter(sec => !assignedMap[sec]);

  // Auto-pick first unassigned section whenever batch changes
  useEffect(() => {
    if (availableSections.length > 0) {
      setSelectedSection(availableSections[0]);
    } else {
      setSelectedSection('');
    }
    setError('');
  }, [selectedBatch, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) {
      setError('Please select an available class section.');
      return;
    }

    if (assignedMap[selectedSection]) {
      setError(`Class ${selectedSection} is already assigned to ${assignedMap[selectedSection].name}.`);
      return;
    }

    if (!reason.trim()) {
      setError('Please enter a reason for this appointment.');
      return;
    }

    const ok = AdminService.assignAdvisor(faculty.email, selectedBatch, selectedSection, reason.trim());
    if (ok) {
      onSuccess(`Assigned ${faculty.name} as Class Advisor for ${selectedSection} (${selectedBatch}).`);
      onClose();
    } else {
      setError('Failed to assign advisor role.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Assign Class Advisor</h3>
              <p className="text-xs text-slate-500">Designate batch and section advisory responsibilities</p>
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
          
          {/* Target Info Pill */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] flex items-center justify-between">
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">{faculty.name}</span>
              <span className="text-slate-500 font-mono text-[11px]">{faculty.email}</span>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                Current: {faculty.role}
              </span>
              <span className="text-[11px] text-slate-500 font-bold block mt-1">
                {faculty.designation}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Academic Batch Selection */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Academic Batch <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold text-slate-800 focus:outline-none focus:border-mint-500 text-xs"
            >
              {AVAILABLE_BATCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Class Section Selection (with disabled assigned sections) */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Class Section <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold text-slate-800 focus:outline-none focus:border-mint-500 text-xs"
            >
              <option value="" disabled>-- Select Available Class Section --</option>
              {SECTIONS.map(sec => {
                const assignedFaculty = assignedMap[sec];
                const isAssigned = Boolean(assignedFaculty);
                return (
                  <option
                    key={sec}
                    value={sec}
                    disabled={isAssigned}
                    className={isAssigned ? 'text-slate-400 bg-slate-100 italic' : 'text-slate-900 font-bold'}
                  >
                    {isAssigned
                      ? `Class ${sec} — [Assigned to ${assignedFaculty.name}]`
                      : `Class ${sec} — Available`}
                  </option>
                );
              })}
            </select>

            {availableSections.length === 0 && (
              <p className="text-[11px] text-amber-700 font-bold mt-1.5 flex items-center gap-1">
                <ShieldAlert size={13} className="shrink-0" />
                <span>All sections in this batch are already assigned. Switch to another batch above.</span>
              </p>
            )}
          </div>

          {/* Appointment Reason */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Assignment Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl text-slate-800 focus:outline-none focus:border-mint-500 font-medium"
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
              disabled={!selectedSection || availableSections.length === 0}
              className={`px-5 py-2 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 ${
                !selectedSection || availableSections.length === 0
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Check size={14} />
              <span>Confirm Advisor Appointment</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default FacultyAssignAdvisorModal;
