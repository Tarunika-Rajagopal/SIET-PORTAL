import React, { useState,useEffect } from 'react';
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
  const [allFaculties,setAllFaculties] = useState<AdminFaculty[]>([]);
  useEffect(()=>{
    const f = async()=>{
      const fac = await AdminService.getFaculties();
      setAllFaculties(fac);
    }
    f();
  },[]);
  const isAdvisor = faculty.role === 'Advisor' || faculty.role === 'Advisor & Guide';
  const isGuide = faculty.role === 'Guide' || faculty.role === 'Advisor & Guide';
  const hasNoRole = faculty.role === 'None';

  // Eligible non-advisors to inherit advisor role (exclude departing faculty and anyone already an advisor)
  const eligibleAdvisors = allFaculties.filter(f => 
    f.email !== faculty.email && f.role !== 'Advisor' && f.role !== 'Advisor & Guide'
  );

  // Strictly eligible non-guides to inherit guide role (exclude departing faculty and anyone already a guide)
  const eligibleNonGuides = allFaculties.filter(f => 
    f.email !== faculty.email && f.role !== 'Guide' && f.role !== 'Advisor & Guide'
  );

  const [advisorSuccessor, setAdvisorSuccessor] = useState(eligibleAdvisors[0]?.email || '');
  const [guideSuccessor, setGuideSuccessor] = useState(eligibleNonGuides[0]?.email || '');
  const [reason, setReason] = useState('Faculty resignation / academic semester restructuring');
  const [error, setError] = useState('');

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required to finalize faculty deletion.');
      return;
    }
      try{
      await AdminService.deleteFaculty(
      faculty.email
      );
      onSuccess(`Faculty ${faculty.name} successfully deleted.`);
      onClose();

  } catch(err){
    console.error(err);
  } 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete Faculty</h3>
              <p className="text-xs text-slate-500">Decommission profile and reallocate responsibilities</p>
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
        <form onSubmit={handleConfirm} className="p-6 space-y-4 text-xs">
          
          {/* Target Info Pill */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] flex items-center justify-between">
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">{faculty.name}</span>
              <span className="text-slate-500 font-mono text-[11px]">{faculty.email}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
              {faculty.role}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hasNoRole ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <p className="font-bold">No Active Duties to Reallocate</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                This faculty currently has no assigned class or active teams. Deleting will immediately purge their credentials.
              </p>
            </div>
          ) : null}




          {/* Mandatory Reason Prompt */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Mandatory Deletion Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl text-slate-800 focus:outline-none focus:border-mint-500"
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
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Trash2 size={14} />
              <span> Delete</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default FacultyDeleteShiftModal;
