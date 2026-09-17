import React, { useState, useEffect } from 'react';
import { UserCheck, Search, RotateCw, Trash2, CheckCircle2, ArrowUpRight, UserMinus, RefreshCw } from 'lucide-react';
import { AdminService, AdminFaculty } from '../../services/adminService';
import AdminReasonModal from './AdminReasonModal';

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

  // Reason modal for revoking advisor role
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
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
    setReasonModalOpen(true);
  };

  const handleConfirmRevoke = (reason: string) => {
    if (!facultyToRevoke) return;

    AdminService.removeAdvisor(facultyToRevoke.email, reason);
    setFaculties(AdminService.getFaculties());
    onShowToast(`Revoked advisor designation for ${facultyToRevoke.name}.`);
    setReasonModalOpen(false);
    setFacultyToRevoke(null);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Filter and Action Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#D8CCBA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-bold text-[#111111]">
              Department Class Advisors ({filtered.length})
            </h2>
            <span className="text-xs text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] px-2.5 py-0.5 rounded-full font-medium">
              Student Supervision
            </span>
          </div>
          <p className="text-xs text-[#75695A] mt-0.5">
            Click anywhere on an advisor row to inspect their student roster in the Students view
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
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
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Classes</option>
            <option value="CSE-A">Class CSE-A</option>
            <option value="CSE-B">Class CSE-B</option>
            <option value="CSE-C">Class CSE-C</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search advisor or section..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60"
            />
          </div>

          {/* Manage Toggle */}
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-1.5 text-xs ${
              isManageMode
                ? 'bg-[#111111] text-white border border-[#111111] shadow-xs'
                : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]'
            }`}
          >
            <RotateCw size={13} className={isManageMode ? 'text-white' : 'text-[#75695A]'} />
            <span>{isManageMode ? 'Done Managing' : 'Manage'}</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh page"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh page"
          >
            <RefreshCw size={14} />
          </button>

        </div>
      </div>

      {/* Advisors Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4">Advisor Name</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Assigned Section</th>
                <th className="p-4">Academic Batch</th>
                <th className="p-4">Total Students</th>
                <th className="p-4">Status</th>
                {isManageMode && <th className="p-4 text-center">Manage Role</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 7 : 6} className="p-8 text-center text-[#75695A]">
                    No advisors match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={(e) => handleRowClick(a, e)}
                    className="hover:bg-[#F8F5EE]/60 cursor-pointer transition group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-[#111111] group-hover:text-black transition">
                          {a.name}
                        </div>
                        <ArrowUpRight size={13} className="text-[#75695A] group-hover:text-[#111111] transition opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-[11px] text-[#75695A] font-mono">{a.email}</span>
                    </td>
                    <td className="p-4 text-[#292725]">{a.designation}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md bg-[#F8F5EE] text-[#111111] font-medium border border-[#D8CCBA]">
                        Class {a.advisorClass || 'Unassigned'}
                      </span>
                    </td>
                    <td className="p-4 text-[#75695A] font-medium">{a.advisorBatch || 'N/A'}</td>
                    <td className="p-4 font-bold text-[#111111]">64 Students</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={12} />
                        <span>Active</span>
                      </span>
                    </td>

                    {isManageMode && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenRevoke(a)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-medium transition flex items-center gap-1 text-xs mx-auto"
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

      {/* Mandatory Reason Modal for Revocation */}
      <AdminReasonModal
        isOpen={reasonModalOpen}
        title="Revoke Class Advisor Status"
        subtitle="Mandatory reason required for audit trail recording"
        targetDescription={facultyToRevoke ? `${facultyToRevoke.name} • Class ${facultyToRevoke.advisorClass} (${facultyToRevoke.advisorBatch})` : ''}
        confirmLabel="Confirm Revocation"
        isDanger={true}
        onClose={() => setReasonModalOpen(false)}
        onConfirm={handleConfirmRevoke}
      />

    </div>
  );
};

export default AdminAdvisorsView;
