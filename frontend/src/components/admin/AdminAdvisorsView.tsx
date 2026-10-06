import React, { useState } from 'react';
import { UserCheck, Search, Settings, ArrowUpRight, UserMinus, AlertCircle } from 'lucide-react';
import { AdminFaculty } from '../../services/adminService';
import { useFaculties, useAdminStudents, invalidateFacultiesQuery } from '../../hooks/useQueries';
import RemoveAdvisorShiftModal from './RemoveAdvisorShiftModal';
import { AdvisorAssignModal } from './AdvisorAssignModal';

interface AdminAdvisorsViewProps {
  onSelectAdvisor: (batch: string, className: string) => void;
  onShowToast: (msg: string) => void;
}

interface ClassAdvisorRow {
  id: string;
  batch: string;
  className: string;
  advisor: AdminFaculty | null;
  studentCount: number;
}

export const AdminAdvisorsView: React.FC<AdminAdvisorsViewProps> = ({
  onSelectAdvisor,
  onShowToast
}) => {
  const { data: faculties = [] } = useFaculties();
  const { data: students = [] } = useAdminStudents();

  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [isManageMode, setIsManageMode] = useState(false);

  // Shift & Reassignment modal for removing advisor role
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [facultyToRevoke, setFacultyToRevoke] = useState<AdminFaculty | null>(null);

  // Assign Advisor Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedClassForAssign, setSelectedClassForAssign] = useState<{ batch: string; className: string }>({
    batch: '2023-2027 (III Year)',
    className: 'CSE-A',
  });

  // Collect all known batches and classes
  const defaultBatches = [
    '2023-2027 (III Year)',
    '2024-2028 (II Year)',
    '2022-2026 (IV Year)',
  ];
  const availableBatches = Array.from(new Set([
    ...defaultBatches,
    ...students.map(s => s.batch).filter(Boolean),
    ...faculties.map(f => f.advisorBatch).filter(Boolean) as string[],
  ]));

  const defaultClasses = ['CSE-A', 'CSE-B', 'CSE-C'];
  const availableClasses = Array.from(new Set([
    ...defaultClasses,
    ...students.map(s => s.classSection).filter(Boolean),
    ...faculties.map(f => f.advisorClass).filter(Boolean) as string[],
  ])).sort();

  // Build rows for all classes
  const targetBatches = batchFilter === 'ALL' ? availableBatches : [batchFilter];
  const targetClasses = classFilter === 'ALL' ? availableClasses : [classFilter];

  const classRows: ClassAdvisorRow[] = [];
  targetBatches.forEach(batch => {
    targetClasses.forEach(className => {
      // Find assigned advisor for this exact batch and class
      const advisor = faculties.find(f =>
        (f.role === 'Advisor' || f.role === 'Advisor & Guide') &&
        f.advisorClass === className &&
        (f.advisorBatch === batch || !f.advisorBatch)
      ) || null;

      // Calculate real enrolled students count from students data
      const studentCount = students.filter(s =>
        s.classSection === className && s.batch === batch
      ).length;

      classRows.push({
        id: `${batch}-${className}`,
        batch,
        className,
        advisor,
        studentCount,
      });
    });
  });

  // Filter rows by search term
  const filteredRows = classRows.filter(row => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;

    const matchesClass = row.className.toLowerCase().includes(q);
    const matchesBatch = row.batch.toLowerCase().includes(q);
    const matchesAdvisorName = row.advisor?.name.toLowerCase().includes(q) || false;
    const matchesAdvisorEmail = row.advisor?.email.toLowerCase().includes(q) || false;
    const matchesUnassigned = !row.advisor && 'unassigned'.includes(q);

    return matchesClass || matchesBatch || matchesAdvisorName || matchesAdvisorEmail || matchesUnassigned;
  });

  const handleRowClick = (row: ClassAdvisorRow, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    if (row.advisor) {
      onSelectAdvisor(row.batch, row.className);
    } else {
      handleOpenAssign(row.batch, row.className);
    }
  };

  const handleOpenRevoke = (faculty: AdminFaculty) => {
    setFacultyToRevoke(faculty);
    setShiftModalOpen(true);
  };

  const handleOpenAssign = (batch: string, className: string) => {
    setSelectedClassForAssign({ batch, className });
    setAssignModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">

      {/* Top Filter and Action Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#D8CCBA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Batches</option>
            {availableBatches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Classes</option>
            {availableClasses.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search advisor or class..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Manage Button */}
          <button
            type="button"
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 text-xs cursor-pointer ${
              isManageMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'bg-[#EFF3F1] hover:bg-mint-100 text-slate-700 border border-[#E2E8E4]'
            }`}
          >
            <Settings size={13} className={isManageMode ? 'text-amber-700' : 'text-slate-500'} />
            <span>{isManageMode ? 'Finish Managing' : 'Manage'}</span>
          </button>
        </div>
      </div>

      {/* Advisors Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4">Assigned Section</th>
                <th className="p-4">Academic Batch</th>
                <th className="p-4">Advisor Name</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Total Students</th>
                <th className="p-4 text-center">Action / Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-normal">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No classes match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const hasAdvisor = Boolean(row.advisor);

                  return (
                    <tr
                      key={row.id}
                      onClick={(e) => handleRowClick(row, e)}
                      className="hover:bg-[#F8F5EE]/60 cursor-pointer transition-colors duration-200 group"
                    >
                      {/* Class Section */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-[#F8F5EE] text-[#111111] font-bold border border-[#D8CCBA]">
                          Class {row.className}
                        </span>
                      </td>

                      {/* Academic Batch */}
                      <td className="p-4 text-slate-700 font-semibold">
                        {row.batch}
                      </td>

                      {/* Advisor Name */}
                      <td className="p-4">
                        {hasAdvisor && row.advisor ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-[#111111] group-hover:text-black transition">
                                {row.advisor.name}
                              </div>
                              <ArrowUpRight size={13} className="text-[#75695A] group-hover:text-[#111111] transition opacity-0 group-hover:opacity-100" />
                            </div>
                            <span className="text-[11px] text-[#75695A] font-mono">{row.advisor.email}</span>
                          </>
                        ) : (
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold inline-flex items-center gap-1">
                              <AlertCircle size={12} className="text-amber-600" />
                              Unassigned
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">No advisor designated</span>
                          </div>
                        )}
                      </td>

                      {/* Designation */}
                      <td className="p-4 text-[#292725]">
                        {hasAdvisor && row.advisor ? row.advisor.designation : <span className="text-slate-400">—</span>}
                      </td>

                      {/* Total Students (Real Data Only) */}
                      <td className="p-4 font-bold text-slate-800">
                        {row.studentCount} {row.studentCount === 1 ? 'Student' : 'Students'}
                      </td>

                      {/* Action / Manage Role */}
                      <td className="p-4 text-center">
                        {!hasAdvisor ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssign(row.batch, row.className);
                            }}
                            className="px-3 py-1.5 bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] border border-[#D8CCBA] rounded-xl font-bold transition flex items-center gap-1.5 text-xs shadow-2xs hover:shadow-xs cursor-pointer mx-auto"
                          >
                            <UserCheck size={14} className="text-[#175A67]" />
                            <span>Assign Advisor</span>
                          </button>
                        ) : isManageMode ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssign(row.batch, row.className);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-[#F8F5EE] text-slate-800 border border-[#D8CCBA] rounded-xl font-medium transition text-xs shadow-2xs cursor-pointer"
                              title="Reassign Advisor"
                            >
                              Reassign
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRevoke(row.advisor!);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-medium transition flex items-center gap-1 text-xs cursor-pointer"
                              title="Remove Advisor"
                            >
                              <UserMinus size={13} />
                              <span>Remove</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssign(row.batch, row.className);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-[#F8F5EE] text-slate-700 hover:text-black border border-[#D8CCBA] rounded-xl font-medium transition text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Reassign Advisor"
                            >
                              <UserCheck size={12} className="text-[#75695A]" />
                              <span>Reassign</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAdvisor(row.batch, row.className);
                              }}
                              className="px-2.5 py-1 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-slate-700 hover:text-black border border-[#D8CCBA] rounded-xl font-semibold transition text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>View</span>
                              <ArrowUpRight size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Advisor Modal for unassigned classes or reassigning */}
      {assignModalOpen && (
        <AdvisorAssignModal
          isOpen={assignModalOpen}
          batch={selectedClassForAssign.batch}
          className={selectedClassForAssign.className}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={(msg) => {
            invalidateFacultiesQuery();
            onShowToast(msg);
          }}
        />
      )}

      {/* Workload Shift Modal when removing advisor */}
      <RemoveAdvisorShiftModal
        isOpen={shiftModalOpen}
        onClose={() => {
          setShiftModalOpen(false);
          setFacultyToRevoke(null);
        }}
        faculty={facultyToRevoke}
        onSuccess={(msg) => {
          invalidateFacultiesQuery();
          onShowToast(msg);
        }}
      />

    </div>
  );
};

export default AdminAdvisorsView;
