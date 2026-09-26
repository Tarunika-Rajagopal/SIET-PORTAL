import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight, UserCheck, UserMinus, ShieldAlert } from 'lucide-react';
import { AdminFaculty, AdminService, AdminStudent } from '../../services/adminService';

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

  const [allFaculties,setAllfaculties] = useState<AdminFaculty[]>([]);
  const [successorEmail, setSuccessorEmail] = useState('');
  const [reason, setReason] = useState('Faculty academic load rebalancing & class advisory transition');
  const [error, setError] = useState('');

  

  
  useEffect(()=>{

    if (!isOpen || !faculty) return ;

    const fac = async()=>{
      try{
      const facu = await AdminService.getFaculties();
    setAllfaculties(facu);
  } catch(err){
        console.error('Failed to fetch faculties');
        setError('Failed to fetch faculties');
      }
    };
    fac();
  }
,[isOpen,faculty,[]])

  useEffect(() => {
  const fetchFaculties = async () => {
    const facu = await AdminService.getFaculties();
    setAllfaculties(facu);
  };

  fetchFaculties();
}, []);
  // Strictly eligible non-advisors: must not be an advisor currently, and not the outgoing faculty
  const eligibleNonAdvisors = allFaculties.filter(f => f.role.trim() !== 'Advisor'
  );
  
  console.log(eligibleNonAdvisors);
  console.log("All Faculties ",allFaculties);

  // Auto-sync successor selection when modal opens
  useEffect(() => {
    if(!isOpen)return;


    if (eligibleNonAdvisors.length > 0 && !eligibleNonAdvisors.some(f => f.email === successorEmail)) {
      setSuccessorEmail(eligibleNonAdvisors[0].email);
    }
  }, [allFaculties,isOpen]);

  const selectedSuccessor = allFaculties.find(f => f.email === successorEmail);

  const getProjectedRole = (f: AdminFaculty) => {
    if (f.role === 'Guide') return 'Advisor & Guide';
    return 'Advisor';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (eligibleNonAdvisors.length === 0) {
      setError('No eligible non-advisor faculty is currently available in the department. Please onboard a new faculty member first.');
      return;
    }

    const res = await AdminService.removeAdvisorWithSuccessor(faculty.email);
    if (res.success) {
      onSuccess(res.message);
      onClose();
    } else {
      setError(res.message);
    }
  };
   if (!isOpen || !faculty) {
    return null;
  }

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
              <h3 className="text-base font-extrabold text-slate-900">Remove Advisor </h3>
              <p className="text-xs text-slate-500">The faculty below will be removed as an advisor , should he be an advisor and guide , he/she will be demoted to a guide , while he/she is just an advisor , the respected faculty's role will be assigned as None</p>
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
         

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          

         

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
              <span>Remove Advisor</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default RemoveAdvisorShiftModal;
