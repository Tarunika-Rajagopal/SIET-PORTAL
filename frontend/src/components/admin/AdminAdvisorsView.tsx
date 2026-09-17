import React, { useState, useEffect } from 'react';
import { UserCheck, Search, RotateCw, Trash2, CheckCircle2, ArrowUpRight, UserMinus, RefreshCw } from 'lucide-react';
import { AdminService, AdminFaculty } from '../../services/adminService';
import RemoveAdvisorShiftModal from './RemoveAdvisorShiftModal';

interface AdminAdvisorsViewProps {
  onSelectAdvisor: (batch: string, className: string) => void;
  onShowToast: (msg: string) => void;
}

export const AdminAdvisorsView: React.FC<AdminAdvisorsViewProps> = ({
  onSelectAdvisor,
  onShowToast
}) => {
  const [faculties, setFaculties] = useState<AdminFaculty[]>(() => AdminService.getFaculties());
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [isManageMode, setIsManageMode] = useState(false);

  // Shift & Reassignment modal for removing advisor role
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [facultyToRevoke, setFacultyToRevoke] = useState<AdminFaculty | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setFaculties(AdminService.getFaculties());
    };
    window.addEventListener('admin_faculty_updated', handleUpdate);
    return () => window.removeEventListener('admin_faculty_updated', handleUpdate);
  }, []);

  // Filter only faculty assigned as Class Advisors
  const advisorFaculties = faculties.filter(f => f.role === 'Advisor & Guide' || f.advisorClass);

  const filtered = advisorFaculties.filter(f => {
    const matchesBatch = batchFilter === 'ALL' || f.advisorBatch === batchFilter;
    const matchesClass = classFilter === 'ALL' || f.advisorClass === classFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      f.name.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      (f.advisorClass && f.advisorClass.toLowerCase().includes(q));

    return matchesBatch && matchesClass && matchesSearch;
  });

  const handleRowClick = (faculty: AdminFaculty, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (faculty.advisorBatch && faculty.advisorClass) {
      onSelectAdvisor(faculty.advisorBatch, faculty.advisorClass);
    }
  };

  const handleOpenRevoke = (faculty: AdminFaculty) => {
    setFacultyToRevoke(faculty);
    setShiftModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Action Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">
              Department Class Advisors ({filtered.length})
            </h2>
            <span className="text-xs text-mint-700 bg-mint-50 border border-mint-200 px-2.5 py-0.5 rounded-full font-bold">
              Student Supervision
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click anywhere on an advisor row to inspect their student roster in the Students view
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Batches</option>
            <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
            <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
            <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
          </select>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Classes</option>
            <option value="CSE-A">Class CSE-A</option>
            <option value="CSE-B">Class CSE-B</option>
            <option value="CSE-C">Class CSE-C</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search advisor or section..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Manage / Refresh Button */}
          <button
            onClick={() => {
              if (isManageMode) {
                setFaculties(AdminService.getFaculties());
                setIsManageMode(false);
                onShowToast("Advisors data refreshed.");
              } else {
                setIsManageMode(true);
              }
            }}
            title={isManageMode ? "Refresh page" : "Manage Advisors"}
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

      {/* Advisors Table */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Advisor Name</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Assigned Section</th>
                <th className="p-4">Academic Batch</th>
                <th className="p-4">Total Students</th>
                {isManageMode && <th className="p-4 text-center">Manage Role</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 6 : 5} className="p-8 text-center text-slate-400">
                    No advisors match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={(e) => handleRowClick(a, e)}
                    className="hover:bg-mint-50/50 cursor-pointer transition group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-extrabold text-slate-900 group-hover:text-mint-700 transition">
                          {a.name}
                        </div>
                        <ArrowUpRight size={13} className="text-slate-300 group-hover:text-mint-600 transition opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{a.email}</span>
                    </td>
                    <td className="p-4 text-slate-700">{a.designation}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200">
                        Class {a.advisorClass || 'Unassigned'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-bold">{a.advisorBatch || 'N/A'}</td>
                    <td className="p-4 font-bold text-slate-800">64 Students</td>

                    {isManageMode && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenRevoke(a)}
                          className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition flex items-center gap-1 text-xs mx-auto"
                        >
                          <UserMinus size={13} />
                          <span>Remove Advisor</span>
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

      {/* Workload Shift Modal when removing advisor */}
      <RemoveAdvisorShiftModal
        isOpen={shiftModalOpen}
        onClose={() => {
          setShiftModalOpen(false);
          setFacultyToRevoke(null);
        }}
        faculty={facultyToRevoke}
        onSuccess={(msg) => {
          setFaculties(AdminService.getFaculties());
          onShowToast(msg);
        }}
      />

    </div>
  );
};

export default AdminAdvisorsView;
