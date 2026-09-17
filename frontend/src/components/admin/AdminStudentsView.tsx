import React, { useState, useEffect } from 'react';
import { GraduationCap, Search, Plus, FileSpreadsheet, Trash2, UserCheck, AlertCircle, RotateCw, RefreshCw } from 'lucide-react';
import { AdminService, AdminStudent, AdminFaculty } from '../../services/adminService';
import AddStudentModal from './AddStudentModal';
import ImportStudentsModal from './ImportStudentsModal';
import AdvisorAssignModal from './AdvisorAssignModal';
import AdminReasonModal from './AdminReasonModal';

interface AdminStudentsViewProps {
  selectedBatch?: string;
  selectedClass?: string;
  onShowToast: (msg: string) => void;
}

export const AdminStudentsView: React.FC<AdminStudentsViewProps> = ({
  selectedBatch = "2023-2027 (III Year)",
  selectedClass = "CSE-B",
  onShowToast
}) => {
  const [students, setStudents] = useState<AdminStudent[]>(() => AdminService.getStudents());
  const [faculties, setFaculties] = useState<AdminFaculty[]>(() => AdminService.getFaculties());
  const [batchFilter, setBatchFilter] = useState(selectedBatch);
  const [sectionFilter, setSectionFilter] = useState(selectedClass);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [assignAdvisorModalOpen, setAssignAdvisorModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<AdminStudent | null>(null);

  // Update filter when props change (e.g. from Advisors tab row click)
  useEffect(() => {
    if (selectedBatch) setBatchFilter(selectedBatch);
    if (selectedClass) setSectionFilter(selectedClass);
  }, [selectedBatch, selectedClass]);

  useEffect(() => {
    return AdminService.subscribe(() => {
      setStudents(AdminService.getStudents());
      setFaculties(AdminService.getFaculties());
    });
  }, []);

  // Find the assigned advisor for current batch and section
  const currentAdvisor = faculties.find(f => 
    (f.role === 'Advisor' || f.role === 'Advisor & Guide') &&
    f.advisorBatch === batchFilter &&
    f.advisorClass === sectionFilter
  );

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.includes(searchTerm) ||
      s.projectTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBatch = batchFilter === 'ALL' || s.batch === batchFilter;
    const matchesSection = sectionFilter === 'ALL' || s.classSection === sectionFilter;

    return matchesSearch && matchesBatch && matchesSection;
  });

  const handleDeleteClick = (student: AdminStudent) => {
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = (reason: string) => {
    if (!studentToDelete) return;
    AdminService.deleteStudent(studentToDelete.rollNo, reason);
    onShowToast(`Removed candidate ${studentToDelete.name} (${studentToDelete.rollNo}) from roster.`);
    setDeleteModalOpen(false);
    setStudentToDelete(null);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Filter & Actions Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#D8CCBA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-bold text-[#111111]">
              Registered Students ({filteredStudents.length})
            </h2>
            <span className="text-xs text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] px-2.5 py-0.5 rounded-full font-medium">
              Enrollment Database
            </span>
          </div>
          <p className="text-xs text-[#75695A] mt-0.5">Manage candidates, academic class mapping &amp; project teams</p>
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

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Sections</option>
            <option value="CSE-A">Section CSE-A</option>
            <option value="CSE-B">Section CSE-B</option>
            <option value="CSE-C">Section CSE-C</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or roll no..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60"
            />
          </div>

          {/* Add Student Button */}
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-[#292725] text-white font-medium flex items-center gap-1.5 transition text-xs shadow-sm shrink-0"
          >
            <Plus size={14} />
            <span>Add Student</span>
          </button>

          {/* Import Spreadsheet */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] font-medium flex items-center gap-1.5 transition text-xs border border-[#D8CCBA] shrink-0"
          >
            <FileSpreadsheet size={14} className="text-[#111111]" />
            <span>Import</span>
          </button>

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

      {/* Class Advisor Banner (Rendered above the table) */}
      {sectionFilter !== 'ALL' && (
        <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F5EE] border-[#D8CCBA] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]">
              {currentAdvisor ? <UserCheck size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#75695A] uppercase tracking-wider">Designated Class Advisor:</span>
                <span className="text-xs font-bold text-[#111111]">
                  {currentAdvisor ? currentAdvisor.name : 'Not Assigned'}
                </span>
                {currentAdvisor && (
                  <span className="text-[11px] text-[#75695A] font-mono">({currentAdvisor.email})</span>
                )}
              </div>
              <p className="text-[11px] text-[#75695A] mt-0.5">
                Class: <strong className="text-[#111111]">{sectionFilter}</strong> • Academic Batch: <strong className="text-[#111111]">{batchFilter}</strong>
              </p>
            </div>
          </div>

          {!currentAdvisor && (
            <button
              onClick={() => setAssignAdvisorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#111111] hover:bg-[#292725] text-white font-medium flex items-center gap-1.5 transition text-xs shadow-sm self-start sm:self-auto shrink-0"
            >
              <UserCheck size={13} />
              <span>Assign Advisor</span>
            </button>
          )}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4">Register Number</th>
                <th className="p-4">Candidate Name</th>
                <th className="p-4">Class</th>
                <th className="p-4">Team No</th>
                <th className="p-4">Project Title</th>
                <th className="p-4">Assigned Guide</th>
                {isManageMode && <th className="p-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-normal">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 7 : 6} className="p-8 text-center text-[#75695A]">
                    No candidates found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.rollNo} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-4 font-mono font-medium text-[#111111] whitespace-nowrap">{s.rollNo}</td>
                    <td className="p-4">
                      <div className="font-bold text-[#111111]">{s.name}</div>
                      <span className="text-[11px] text-[#75695A] font-mono">{s.email}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#F8F5EE] text-[#111111] border border-[#D8CCBA] font-medium">
                        {s.classSection}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[#111111] whitespace-nowrap">{s.teamNo}</td>
                    <td className="p-4 max-w-xs truncate text-[#292725] font-normal" title={s.projectTitle}>
                      {s.projectTitle}
                    </td>
                    <td className="p-4 text-[#111111] font-medium whitespace-nowrap">{s.guide}</td>

                    {isManageMode && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteClick(s)}
                          title="Remove Candidate"
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center justify-center transition"
                        >
                          <Trash2 size={14} />
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

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        defaultBatch={batchFilter !== 'ALL' ? batchFilter : "2023-2027 (III Year)"}
        defaultClass={sectionFilter !== 'ALL' ? sectionFilter : "CSE-B"}
        onSuccess={(msg) => onShowToast(msg)}
      />

      {/* Import Students (.csv) Modal */}
      <ImportStudentsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        defaultBatch={batchFilter !== 'ALL' ? batchFilter : "2023-2027 (III Year)"}
        defaultClass={sectionFilter !== 'ALL' ? sectionFilter : "CSE-B"}
        onSuccess={(msg) => onShowToast(msg)}
      />

      {/* Assign Advisor Modal */}
      <AdvisorAssignModal
        isOpen={assignAdvisorModalOpen}
        batch={batchFilter !== 'ALL' ? batchFilter : "2023-2027 (III Year)"}
        className={sectionFilter !== 'ALL' ? sectionFilter : "CSE-B"}
        onClose={() => setAssignAdvisorModalOpen(false)}
        onSuccess={(msg) => onShowToast(msg)}
      />

      {/* Reason Modal for Student Deletion */}
      <AdminReasonModal
        isOpen={deleteModalOpen}
        title="Remove Student from Roster"
        subtitle="Mandatory reason required for audit trail tracking"
        targetDescription={studentToDelete ? `${studentToDelete.name} (${studentToDelete.rollNo}) • Class ${studentToDelete.classSection}` : ''}
        confirmLabel="Remove Candidate"
        isDanger={true}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

    </div>
  );
};

export default AdminStudentsView;
