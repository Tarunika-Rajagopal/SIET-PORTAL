import React, { useState, useEffect } from 'react';
import { AdminService, AdminFaculty } from '../../services/adminService';
import { Users, UserCheck, Briefcase, Plus, CheckCircle2, RotateCw, Trash2, ShieldAlert, ArrowRight } from 'lucide-react';
import FacultyDeleteShiftModal from './FacultyDeleteShiftModal';

interface AdminHomeViewProps {
  onNavigateTab: (tab: 'home' | 'advisors' | 'guides' | 'students' | 'history') => void;
  onShowToast: (msg: string) => void;
}

export const AdminHomeView: React.FC<AdminHomeViewProps> = ({ onNavigateTab, onShowToast }) => {
  const [faculties, setFaculties] = useState<AdminFaculty[]>(() => AdminService.getFaculties());
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

  useEffect(() => {
    return AdminService.subscribe(() => {
      setFaculties(AdminService.getFaculties());
    });
  }, []);

  // Compute counts
  const availableFacultiesCount = faculties.length;
  const assignedAdvisorsCount = faculties.filter(f => f.role === 'Advisor' || f.role === 'Advisor & Guide').length;
  const assignedGuidesCount = faculties.filter(f => f.role === 'Guide' || f.role === 'Advisor & Guide').length;

  // Identify assigned classes in the selected batch
  const assignedClassesInBatch = faculties
    .filter(f => f.advisorBatch === batch && f.advisorClass)
    .map(f => f.advisorClass as string);

  const handleAddFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const chosenRole = role || 'None';

    AdminService.addFaculty({
      name: name.trim(),
      email: email.trim(),
      designation,
      role: chosenRole,
      advisorBatch: (chosenRole === 'Advisor' || chosenRole === 'Advisor & Guide') ? batch : undefined,
      advisorClass: (chosenRole === 'Advisor' || chosenRole === 'Advisor & Guide') ? className : undefined,
      specialization: "Computer Science & Engineering"
    });

    onShowToast(`Faculty member ${name} onboarded successfully!`);
    setName('');
    setEmail('');
    setRole('');
  };

  const handleToggleAdvisor = (fac: AdminFaculty) => {
    if (fac.role === 'Advisor' || fac.role === 'Advisor & Guide') {
      AdminService.removeAdvisor(fac.email, "Removed advisor role from Available Faculties table");
      onShowToast(`Removed Advisor role from ${fac.name}`);
    } else {
      // Find first unassigned class
      const availableClass = ['CSE-A', 'CSE-B', 'CSE-C'].find(c => !assignedClassesInBatch.includes(c)) || 'CSE-A';
      AdminService.assignAdvisor(fac.email, batch, availableClass, "Assigned advisor role from Available Faculties table");
      onShowToast(`Assigned ${fac.name} as Advisor for ${availableClass}`);
    }
  };

  const handleToggleGuide = (fac: AdminFaculty) => {
    if (fac.role === 'Guide' || fac.role === 'Advisor & Guide') {
      AdminService.removeGuide(fac.email, "Removed guide role from Available Faculties table");
      onShowToast(`Removed Guide role from ${fac.name}`);
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
    <div className="space-y-6 font-sans">
      
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Available Faculties */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#D8CCBA] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">Available Faculties</span>
            <span className="text-2xl font-serif font-bold text-[#111111] mt-0.5 block">{availableFacultiesCount}</span>
            <span className="text-[11px] text-[#75695A] font-medium mt-1 block">Active In System</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
        </div>

        {/* Assigned Advisors (Click navigates to Advisors tab) */}
        <div 
          onClick={() => onNavigateTab('advisors')}
          className="bg-white p-5 rounded-3xl shadow-sm border border-[#D8CCBA] flex items-center justify-between cursor-pointer hover:border-[#111111] hover:shadow-md transition group"
        >
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">Assigned Advisors</span>
            <span className="text-2xl font-serif font-bold text-[#111111] mt-0.5 block">{assignedAdvisorsCount}</span>
            <span className="text-[11px] text-[#75695A] font-medium mt-1 block flex items-center gap-1">
              <span>Sections Mapped</span>
              <ArrowRight size={11} className="group-hover:translate-x-1 transition" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold group-hover:scale-105 transition">
            <UserCheck size={24} />
          </div>
        </div>

        {/* Assigned Guides (Click navigates to Guides tab) */}
        <div 
          onClick={() => onNavigateTab('guides')}
          className="bg-white p-5 rounded-3xl shadow-sm border border-[#D8CCBA] flex items-center justify-between cursor-pointer hover:border-[#111111] hover:shadow-md transition group"
        >
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">Assigned Guides</span>
            <span className="text-2xl font-serif font-bold text-[#111111] mt-0.5 block">{assignedGuidesCount}</span>
            <span className="text-[11px] text-[#75695A] font-medium mt-1 block flex items-center gap-1">
              <span>Research Mentors</span>
              <ArrowRight size={11} className="group-hover:translate-x-1 transition" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold group-hover:scale-105 transition">
            <Briefcase size={24} />
          </div>
        </div>

      </div>

      {/* Add Faculty Form Container */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#D8CCBA]">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#D8CCBA]">
          <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center font-bold shadow-sm">
            <Plus size={18} />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#111111]">Add Faculty Member</h3>
            <p className="text-xs text-[#75695A]">Register new teaching faculty into the project portal database</p>
          </div>
        </div>

        <form onSubmit={handleAddFaculty} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[#75695A] font-medium mb-1">Faculty Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. K. Rajesh"
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] text-[#111111] font-medium"
              />
            </div>

            <div>
              <label className="block text-[#75695A] font-medium mb-1">Institutional Email <span className="text-rose-500">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rajesh.k@siet.ac.in"
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] font-mono text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-[#75695A] font-medium mb-1">Designation</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor (Sr. Gr)">Assistant Professor (Sr. Gr)</option>
                <option value="Assistant Professor">Assistant Professor</option>
              </select>
            </div>

            <div>
              <label className="block text-[#75695A] font-medium mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA]">
              <div>
                <label className="block text-[#111111] font-medium mb-1">Designated Academic Batch</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
                  <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
                  <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#111111] font-medium mb-1">Designated Section / Class</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
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
              className="px-5 py-2 bg-[#111111] hover:bg-[#292725] text-white font-medium rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Add Faculty Member</span>
            </button>
          </div>

        </form>
      </div>

      {/* Available Faculties Table with Manage Toggle */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="p-5 border-b border-[#D8CCBA] flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-[#111111]">Available Faculties Roster</h3>
            <p className="text-xs text-[#75695A] mt-0.5">Faculty credentials, active appointments, and workload reallocation</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsManageMode(!isManageMode)}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 text-xs ${
                isManageMode
                  ? 'bg-[#111111] text-white border border-[#111111] shadow-xs'
                  : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]'
              }`}
            >
              <RotateCw size={13} className={isManageMode ? 'text-white' : 'text-[#75695A]'} />
              <span>{isManageMode ? 'Close Manage' : 'Manage'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4">Faculty Name</th>
                <th className="p-4">Institutional Email</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Current Role</th>
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
            <tbody className="divide-y divide-[#D8CCBA] font-normal">
              {faculties.map((f) => (
                <tr key={f.id} className="hover:bg-[#F8F5EE]/60 transition">
                  <td className="p-4 font-bold text-[#111111]">{f.name}</td>
                  <td className="p-4 text-[#75695A] font-mono">{f.email}</td>
                  <td className="p-4 text-[#292725]">{f.designation}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-medium text-[10px] border ${
                      f.role === 'Advisor' ? 'bg-[#F8F5EE] text-[#111111] border-[#D8CCBA]' :
                      f.role === 'Guide' ? 'bg-[#EDE7DB] text-[#111111] border-[#D8CCBA]' :
                      f.role === 'Advisor & Guide' ? 'bg-[#111111] text-white border-[#111111]' :
                      'bg-[#F3EFE6] text-[#75695A] border-[#D8CCBA]'
                    }`}>
                      {f.role}
                    </span>
                  </td>
                  <td className="p-4 text-[#292725] font-medium">
                    {f.advisorClass ? `Class ${f.advisorClass} (${f.advisorBatch})` : ''}
                    {f.advisorClass && f.teamsCount > 0 ? ' • ' : ''}
                    {f.teamsCount > 0 ? `${f.teamsCount} Mentored Teams` : ''}
                    {!f.advisorClass && f.teamsCount === 0 ? (
                      <span className="text-[#75695A] font-normal">None (Available)</span>
                    ) : null}
                  </td>

                  {/* Manage Action Columns */}
                  {isManageMode && (
                    <>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleGuide(f)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                            f.role === 'Guide' || f.role === 'Advisor & Guide'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-[#F8F5EE] text-[#111111] border-[#D8CCBA] hover:bg-[#EDE7DB]'
                          }`}
                        >
                          {f.role === 'Guide' || f.role === 'Advisor & Guide' ? 'Remove Guide' : 'Assign Guide'}
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleAdvisor(f)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                            f.role === 'Advisor' || f.role === 'Advisor & Guide'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-[#EDE7DB] text-[#111111] border-[#D8CCBA] hover:bg-[#D8CCBA]'
                          }`}
                        >
                          {f.role === 'Advisor' || f.role === 'Advisor & Guide' ? 'Remove Advisor' : 'Assign Advisor'}
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => openDeleteModal(f)}
                          title="Delete Faculty & Shift Workload"
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center justify-center transition"
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

    </div>
  );
};

export default AdminHomeView;
