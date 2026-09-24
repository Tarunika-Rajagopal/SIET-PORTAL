import React, { useState, useEffect } from 'react';
import { AdminService, AdminFaculty } from '../../services/adminService';
import { Users, UserCheck, Briefcase, Plus, CheckCircle2, RotateCw, Trash2, ShieldAlert, ArrowRight } from 'lucide-react';
import FacultyDeleteShiftModal from './FacultyDeleteShiftModal';
import RemoveAdvisorShiftModal from './RemoveAdvisorShiftModal';
import RemoveGuideShiftModal from './RemoveGuideShiftModal';
import FacultyAssignAdvisorModal from './FacultyAssignAdvisorModal';

interface AdminHomeViewProps {
  onNavigateTab: (tab: 'home' | 'advisors' | 'guides' | 'students' | 'history') => void;
  onShowToast: (msg: string) => void;
}

export const AdminHomeView: React.FC<AdminHomeViewProps> = ({ onNavigateTab, onShowToast }) => {
  const [faculties, setFaculties] = useState<AdminFaculty[]>([]);
  const [isManageMode, setIsManageMode] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [role, setRole] = useState<'Advisor' | 'Guide' | 'Advisor & Guide' | ''>('');
  const [batch, setBatch] = useState('2023-2027 (III Year)');
  const [className, setClassName] = useState('CSE-B');

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState<AdminFaculty | null>(null);

  // Role revocation shift modals state
  const [advisorShiftModalOpen, setAdvisorShiftModalOpen] = useState(false);
  const [facultyToShiftAdvisor, setFacultyToShiftAdvisor] = useState<AdminFaculty | null>(null);

  const [guideShiftModalOpen, setGuideShiftModalOpen] = useState(false);
  const [facultyToShiftGuide, setFacultyToShiftGuide] = useState<AdminFaculty | null>(null);

  // Assign Advisor Modal state
  const [assignAdvisorModalOpen, setAssignAdvisorModalOpen] = useState(false);
  const [facultyToAssignAdvisor, setFacultyToAssignAdvisor] = useState<AdminFaculty | null>(null);

  useEffect(() => {
    const faculty = async()=>{
    const f = await AdminService.getFaculties();
    setFaculties(f);
    };
    faculty();
    return AdminService.subscribe(faculty);
  }, []);

  // Compute counts
  const availableFacultiesCount = faculties.length;
  const assignedAdvisorsCount = faculties.filter(f => f.role === 'Advisor' || f.role === 'Advisor & Guide').length;
  const assignedGuidesCount = faculties.filter(f => f.role === 'Guide' || f.role === 'Advisor & Guide').length;

  // Identify assigned classes in the selected batch
  const assignedClassesInBatch = faculties
    .filter(f => f.advisorBatch === batch && f.advisorClass)
    .map(f => f.advisorClass as string);

  const handleAddFaculty = async(e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const chosenRole = role || 'None';

  const result = await AdminService.addFaculty({
    name: name.trim(),
    email: email.trim(),
    designation,
    role: chosenRole,
    advisorBatch:
      chosenRole === "Advisor" || chosenRole === "Advisor & Guide"
        ? batch
        : undefined,
    advisorClass:
      chosenRole === "Advisor" || chosenRole === "Advisor & Guide"
        ? className
        : undefined,
    specialization: "Computer Science & Engineering",
  });
  console.log(result);

    onShowToast(`Faculty member ${name} onboarded successfully!`);
    setName('');
    setEmail('');
    setRole('');
  };

  const handleToggleAdvisor = (fac: AdminFaculty) => {
    if (fac.role === 'Advisor' || fac.role === 'Advisor & Guide') {
      // Must shift class to a non-advisor faculty
      setFacultyToShiftAdvisor(fac);
      setAdvisorShiftModalOpen(true);
    } else {
      // Ask which batch and section, with assigned classes disabled
      setFacultyToAssignAdvisor(fac);
      setAssignAdvisorModalOpen(true);
    }
  };

  const handleToggleGuide = (fac: AdminFaculty) => {
    if (fac.role === 'Guide' || fac.role === 'Advisor & Guide') {
      // Must shift teams to a non-guide faculty
      setFacultyToShiftGuide(fac);
      setGuideShiftModalOpen(true);
    } else {
      AdminService.assignGuide(fac.email, "Assigned guide role from Available Faculties table");
      onShowToast(`Assigned ${fac.name} as Project Guide`);
    }
  };

  const openDeleteModal = (fac: AdminFaculty) => {
    setFacultyToDelete(fac);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Available Faculties */}
        <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E2E8E4] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Available Faculties</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{availableFacultiesCount}</span>
            <span className="text-[11px] text-mint-600 font-bold mt-1 block">Active In System</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
        </div>

        {/* Assigned Advisors (Click navigates to Advisors tab) */}
        <div 
          onClick={() => onNavigateTab('advisors')}
          className="bg-white p-5 rounded-3xl shadow-card border border-[#E2E8E4] flex items-center justify-between cursor-pointer hover:border-mint-400 hover:shadow-md transition group"
        >
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Assigned Advisors</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{assignedAdvisorsCount}</span>
            <span className="text-[11px] text-amber-700 font-bold mt-1 block flex items-center gap-1">
              <span>Sections Mapped</span>
              <ArrowRight size={11} className="group-hover:translate-x-1 transition" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold group-hover:scale-105 transition">
            <UserCheck size={24} />
          </div>
        </div>

        {/* Assigned Guides (Click navigates to Guides tab) */}
        <div 
          onClick={() => onNavigateTab('guides')}
          className="bg-white p-5 rounded-3xl shadow-card border border-[#E2E8E4] flex items-center justify-between cursor-pointer hover:border-mint-400 hover:shadow-md transition group"
        >
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Assigned Guides</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{assignedGuidesCount}</span>
            <span className="text-[11px] text-mint-600 font-bold mt-1 block flex items-center gap-1">
              <span>Research Mentors</span>
              <ArrowRight size={11} className="group-hover:translate-x-1 transition" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold group-hover:scale-105 transition">
            <Briefcase size={24} />
          </div>
        </div>

      </div>

      {/* Add Faculty Form Container */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4]">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#E2E8E4]">
          <div className="w-9 h-9 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-sm">
            <Plus size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Add Faculty Member</h3>
            <p className="text-xs text-slate-500">Register new teaching faculty into the project portal database</p>
          </div>
        </div>

        <form onSubmit={handleAddFaculty} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Faculty Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Institutional Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Designation</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold focus:outline-none focus:border-mint-500"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold focus:outline-none focus:border-mint-500"
              >
                <option value="">Select role</option>
                <option value="Advisor">Advisor</option>
                <option value="Guide">Guide</option>
                <option value="Advisor & Guide">Advisor & Guide</option>
              </select>
            </div>
          </div>

          {/* Dynamic Extra Fields for Advisor */}
          {(role === 'Advisor' || role === 'Advisor & Guide') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-mint-50/50 rounded-2xl border border-mint-200">
              <div>
                <label className="block text-mint-900 font-extrabold mb-1">Designated Academic Batch</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-mint-300 rounded-xl font-bold focus:outline-none focus:border-mint-500"
                >
                  <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
                  <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
                  <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-mint-900 font-extrabold mb-1">Designated Section / Class</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-mint-300 rounded-xl font-bold focus:outline-none focus:border-mint-500"
                >
                  <option value="CSE-A" disabled={assignedClassesInBatch.includes('CSE-A')}>
                    CSE-A {assignedClassesInBatch.includes('CSE-A') ? '(Assigned)' : ''}
                  </option>
                  <option value="CSE-B" disabled={assignedClassesInBatch.includes('CSE-B')}>
                    CSE-B {assignedClassesInBatch.includes('CSE-B') ? '(Assigned)' : ''}
                  </option>
                  <option value="CSE-C" disabled={assignedClassesInBatch.includes('CSE-C')}>
                    CSE-C {assignedClassesInBatch.includes('CSE-C') ? '(Assigned)' : ''}
                  </option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Add Faculty Member</span>
            </button>
          </div>

        </form>
      </div>

      {/* Available Faculties Table with Manage Toggle */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Available Faculties</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async() => {
                if (isManageMode) {
                  setFaculties(await AdminService.getFaculties());
                  setIsManageMode(false);
                  onShowToast("Faculties roster refreshed.");
                } else {
                  setIsManageMode(true);
                }
              }}
              title={isManageMode ? "Refresh page" : "Manage Available Faculties"}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 text-xs ${
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Faculty Name</th>
                <th className="p-4">Institutional Email</th>
                <th className="p-4">Designation</th>
                <th className="p-4 text-center whitespace-nowrap">Current Role</th>
                <th className="p-4">Assigned Workload</th>
                {isManageMode && (
                  <>
                    <th className="p-4 text-center">Assign Guide</th>
                    <th className="p-4 text-center">Assign Advisor</th>
                    <th className="p-4 text-center">Delete</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {faculties.map((f) => (
                <tr key={f.id} className="hover:bg-mint-50/40 transition">
                  <td className="p-4 font-bold text-slate-900">{f.name}</td>
                  <td className="p-4 text-slate-500 font-mono">{f.email}</td>
                  <td className="p-4 text-slate-700">{f.designation}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center min-w-[125px] px-3 py-1 rounded-full font-bold text-[10px] text-center border ${
                      f.role === 'Advisor' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                      f.role === 'Guide' ? 'bg-mint-100 text-mint-900 border-mint-200' :
                      f.role === 'Advisor & Guide' ? 'bg-purple-50 text-purple-900 border-purple-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {f.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 font-bold">
                    {f.advisorClass ? `Class ${f.advisorClass} (${f.advisorBatch})` : ''}
                    {f.advisorClass && f.teamsCount > 0 ? ' • ' : ''}
                    {f.teamsCount > 0 ? `${f.teamsCount} Mentored Teams` : ''}
                    {!f.advisorClass && f.teamsCount === 0 ? (
                      <span className="text-slate-400 font-normal">None (Available)</span>
                    ) : null}
                  </td>

                  {/* Manage Action Columns */}
                  {isManageMode && (
                    <>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleGuide(f)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            f.role === 'Guide' || f.role === 'Advisor & Guide'
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-mint-50 text-mint-800 border-mint-200 hover:bg-mint-100'
                          }`}
                        >
                          {f.role === 'Guide' || f.role === 'Advisor & Guide' ? 'Remove Guide' : 'Assign Guide'}
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleAdvisor(f)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            f.role === 'Advisor' || f.role === 'Advisor & Guide'
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {f.role === 'Advisor' || f.role === 'Advisor & Guide' ? 'Remove Advisor' : 'Assign Advisor'}
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => openDeleteModal(f)}
                          title="Delete Faculty & Shift Workload"
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 inline-flex items-center justify-center transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete / Shift Workload Modal */}
      <FacultyDeleteShiftModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        faculty={facultyToDelete}
        onSuccess={(msg) => onShowToast(msg)}
      />

      {/* Remove Advisor Shift Modal */}
      <RemoveAdvisorShiftModal
        isOpen={advisorShiftModalOpen}
        onClose={() => {
          setAdvisorShiftModalOpen(false);
          setFacultyToShiftAdvisor(null);
        }}
        faculty={facultyToShiftAdvisor}
        onSuccess={(msg) => onShowToast(msg)}
      />

      {/* Remove Guide Shift Modal */}
      <RemoveGuideShiftModal
        isOpen={guideShiftModalOpen}
        onClose={() => {
          setGuideShiftModalOpen(false);
          setFacultyToShiftGuide(null);
        }}
        faculty={facultyToShiftGuide}
        onSuccess={(msg) => onShowToast(msg)}
      />

      {/* Assign Advisor Modal with Batch and Class Selection */}
      <FacultyAssignAdvisorModal
        isOpen={assignAdvisorModalOpen}
        onClose={() => {
          setAssignAdvisorModalOpen(false);
          setFacultyToAssignAdvisor(null);
        }}
        faculty={facultyToAssignAdvisor}
        onSuccess={(msg) => onShowToast(msg)}
      />

    </div>
  );
};

export default AdminHomeView;
