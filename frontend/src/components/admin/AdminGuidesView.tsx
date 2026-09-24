import React, { useState, useEffect } from 'react';
import { Briefcase, Search, RotateCw, CheckCircle2, UserMinus, RefreshCw } from 'lucide-react';
import { AdminService, AdminFaculty } from '../../services/adminService';
import RemoveGuideShiftModal from './RemoveGuideShiftModal';

interface AdminGuidesViewProps {
  onShowToast: (msg: string) => void;
}

export const AdminGuidesView: React.FC<AdminGuidesViewProps> = ({ onShowToast }) => {
  const [faculties, setFaculties] = useState<AdminFaculty[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);

  // Shift & Reassignment modal for removing guide role
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [facultyToRevoke, setFacultyToRevoke] = useState<AdminFaculty | null>(null);
  
  useEffect(() => {
    const faculty = async()=>{
    const f = await AdminService.getFaculties();
    setFaculties(f);
    };
    faculty();
    return AdminService.subscribe(faculty);
  }, []);

  // Filter only faculty assigned as Guides
  const guides = faculties.filter(f => f.role === 'Guide' || f.role === 'Advisor & Guide');

  const filtered = guides.filter(g => {
    const q = searchTerm.toLowerCase();
    return !searchTerm.trim() ||
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q);
  });

  const handleOpenRevoke = (g: AdminFaculty) => {
    setFacultyToRevoke(g);
    setShiftModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Actions Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E2E8E4] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Single Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search technical guide..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Manage / Refresh Button */}
          <button
            onClick={async() => {
              if (isManageMode) {
                setFaculties(await AdminService.getFaculties());
                setIsManageMode(false);
                onShowToast("Guides data refreshed.");
              } else {
                setIsManageMode(true);
              }
            }}
            title={isManageMode ? "Refresh page" : "Manage Guides"}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 text-xs ${
              isManageMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs hover:bg-amber-200'
                : 'bg-[#EFF3F1] hover:bg-mint-100 text-slate-700 border border-[#E2E8E4]'
            }`}
          >
            <RotateCw size={13} className={isManageMode ? 'text-amber-700' : 'text-slate-500'} />
            {!isManageMode && <span>Manage</span>}
          </button>
        </div>
      </div>

      {/* Guides Table */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Guide Name</th>
                <th className="p-4">Designation</th>
                {isManageMode && <th className="p-4 text-center">Manage Role</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 3 : 2} className="p-8 text-center text-slate-400">
                    No technical guides match the search.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-mint-50/40 transition">
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900">{g.name}</div>
                      <span className="text-[11px] text-slate-400 font-mono">{g.email}</span>
                    </td>
                    <td className="p-4 text-slate-700">{g.designation}</td>

                    {isManageMode && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenRevoke(g)}
                          className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition flex items-center gap-1 text-xs mx-auto"
                        >
                          <UserMinus size={13} />
                          <span>Remove Guide</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workload Shift Modal when removing guide */}
      <RemoveGuideShiftModal
        isOpen={shiftModalOpen}
        onClose={() => {
          setShiftModalOpen(false);
          setFacultyToRevoke(null);
        }}
        faculty={facultyToRevoke}
        onSuccess={async(msg) => {
          setFaculties(await AdminService.getFaculties());
          onShowToast(msg);
        }}
      />

    </div>
  );
};

export default AdminGuidesView;
