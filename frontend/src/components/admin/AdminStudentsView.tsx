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
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [faculties, setFaculties] = useState<AdminFaculty[]>([]);
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
  const loadStudents = async () => {
    const students = await AdminService.getStudents();

    console.log("Students fetched:", students);

    setStudents(students);

    setFaculties(await AdminService.getFaculties());
  };

  loadStudents();

  const unsubscribe = AdminService.subscribe(async () => {
    const students = await AdminService.getStudents();

    console.log("Students updated:", students);

    setStudents(students);
    setFaculties(await AdminService.getFaculties());
  });

  return unsubscribe;
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

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Actions Header */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E2E8E4] flex flex-wrap items-center justify-between gap-3">
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

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Sections</option>
            <option value="CSE-A">Section CSE-A</option>
            <option value="CSE-B">Section CSE-B</option>
            <option value="CSE-C">Section CSE-C</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or roll no..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Student Button */}
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-mint-500 hover:bg-mint-600 text-white font-extrabold flex items-center gap-1.5 transition text-xs shadow-sm shrink-0"
          >
            <Plus size={14} />
            <span>Add Student</span>
          </button>

          {/* Import Spreadsheet */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#EFF3F1] hover:bg-mint-100 text-slate-700 font-bold flex items-center gap-1.5 transition text-xs border border-[#E2E8E4] shrink-0"
          >
            <FileSpreadsheet size={14} className="text-mint-700" />
            <span>Import</span>
          </button>

          {/* Manage / Refresh Button */}
          <button
            onClick={async() => {
              if (isManageMode) {
                setStudents(await AdminService.getStudents());
                setIsManageMode(false);
                onShowToast("Students roster refreshed.");
              } else {
                setIsManageMode(true);
              }
            }}
            title={isManageMode ? "Refresh page" : "Manage Students"}
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

      {/* Class Advisor Banner (Rendered above the table) */}
      {sectionFilter !== 'ALL' && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          currentAdvisor
            ? 'bg-white border-[#E2E8E4] shadow-xs'
            : 'bg-amber-50/70 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              currentAdvisor ? 'bg-mint-100 text-mint-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {currentAdvisor ? <UserCheck size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Designated Class Advisor:</span>
                <span className="text-xs font-extrabold text-slate-900">
                  {currentAdvisor ? currentAdvisor.name : 'Not Assigned'}
                </span>
                {currentAdvisor && (
                  <span className="text-[11px] text-slate-400 font-mono">({currentAdvisor.email})</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Class: <strong className="text-slate-800">{sectionFilter}</strong> • Academic Batch: <strong className="text-slate-800">{batchFilter}</strong>
              </p>
            </div>
          </div>

          {!currentAdvisor && (
            <button
              onClick={() => setAssignAdvisorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold flex items-center gap-1.5 transition text-xs shadow-sm self-start sm:self-auto shrink-0"
            >
              <UserCheck size={13} />
              <span>Assign Advisor</span>
            </button>
          )}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Register Number</th>
                <th className="p-4">Candidate Name</th>
                <th className="p-4">Class</th>
                {isManageMode && <th className="p-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 4 : 3} className="p-8 text-center text-slate-400">
                    No candidates found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.rollNo} className="hover:bg-mint-50/40 transition">
                    <td className="p-4 font-mono font-bold text-mint-900 whitespace-nowrap">{s.rollNo}</td>
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900">{s.name}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-mint-50 text-mint-900 border border-mint-200 font-bold">
                        {s.classSection}
                      </span>
                    </td>

                    {isManageMode && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteClick(s)}
                          title="Remove Candidate"
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 inline-flex items-center justify-center transition"
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
      />

    </div>
  );
};

export default AdminStudentsView;
