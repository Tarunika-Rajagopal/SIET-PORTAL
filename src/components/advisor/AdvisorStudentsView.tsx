import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, RefreshCw, Plus, MoveRight, UserPlus, Sparkles, 
  CheckCircle2, AlertCircle, X, Check, BookOpen, ChevronRight, Settings
} from 'lucide-react';
import { AdminService, AdminStudent } from '../../services/adminService';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import AdvisorCreateTeamModal from './AdvisorCreateTeamModal';

interface AdvisorStudentsViewProps {
  className: string;
  batch: string;
  advisorName: string;
  onSelectStudentToViewTeam: (teamNoOrId: string | null, onlyShowTeam?: boolean, student?: AdminStudent) => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorStudentsView: React.FC<AdvisorStudentsViewProps> = ({
  className,
  batch,
  advisorName,
  onSelectStudentToViewTeam,
  onShowToast
}) => {
  const [students, setStudents] = useState<AdminStudent[]>(() => 
    AdvisorService.getClassStudents(className, batch)
  );
  const [teams, setTeams] = useState<ClassTeam[]>(() => 
    AdvisorService.getTeamsForClass(className)
  );

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isManageMode, setIsManageMode] = useState<boolean>(false);

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState<boolean>(false);
  const [studentToMove, setStudentToMove] = useState<AdminStudent | null>(null);

  // Add student form state
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentRoll, setNewStudentRoll] = useState<string>('');
  const [addStudentError, setAddStudentError] = useState<string>('');

  // Move student state
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [moveError, setMoveError] = useState<string>('');

  // Refresh when admin or advisor service updates
  useEffect(() => {
    const unsubAdvisor = AdvisorService.subscribe(() => {
      setStudents(AdvisorService.getClassStudents(className, batch));
      setTeams(AdvisorService.getTeamsForClass(className));
    });
    const unsubAdmin = AdminService.subscribe(() => {
      setStudents(AdvisorService.getClassStudents(className, batch));
      setTeams(AdvisorService.getTeamsForClass(className));
    });

    return () => {
      unsubAdvisor();
      unsubAdmin();
    };
  }, [className, batch]);

  const teamCapacity = AdvisorService.getTeamCapacity(className);
  const areTeamsCreated = teams.length > 0 && students.some(s => s.teamNo && s.teamNo !== 'Unassigned');

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.rollNo.includes(q) ||
        (s.teamNo && s.teamNo.toLowerCase().includes(q)) ||
        (s.guide && s.guide.toLowerCase().includes(q))
      );
    });
  }, [students, searchTerm]);

  // Handle Add Student Submit
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError('');

    if (!newStudentName.trim() || !newStudentRoll.trim()) {
      setAddStudentError('Please enter both student name and register number.');
      return;
    }

    const res = AdvisorService.addStudentToClass(className, batch, newStudentName, newStudentRoll);
    if (!res.success) {
      setAddStudentError(res.message);
      return;
    }

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Student Enrollment',
      `${newStudentName} (${newStudentRoll})`,
      `Enrolled into Class ${className}.`,
      advisorName
    );

    onShowToast(`Student ${newStudentName} (${newStudentRoll}) successfully registered to Class ${className}.`);
    setNewStudentName('');
    setNewStudentRoll('');
    setIsAddStudentOpen(false);
  };

  // Handle Move Student Submit
  const handleConfirmMoveStudent = () => {
    setMoveError('');
    if (!studentToMove || !targetTeamId) {
      setMoveError('Please select a destination team.');
      return;
    }

    const res = AdvisorService.moveStudent(className, studentToMove.rollNo, targetTeamId);
    if (!res.success) {
      setMoveError(res.message);
      return;
    }

    const targetT = teams.find(t => t.teamId === targetTeamId);

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Student Transfer',
      `${studentToMove.name} (${studentToMove.rollNo})`,
      `Transferred from ${studentToMove.teamNo || 'Unassigned'} to ${targetT?.teamNo || 'target team'}.`,
      advisorName
    );

    onShowToast(res.message);
    setStudentToMove(null);
    setTargetTeamId('');
  };

  // Handle Team Creation from Modal
  const handleTeamsCreated = (
    capacity: number,
    newTeams: Array<any>
  ) => {
    AdvisorService.createTeams(className, batch, capacity, newTeams);

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Team Formation',
      `Class ${className}`,
      `Generated & partitioned ${newTeams.length} teams with capacity of ${capacity} members each.`,
      advisorName
    );

    onShowToast(`Successfully generated and finalized ${newTeams.length} teams with capacity of ${capacity} students per team.`);
  };

  // When a student is clicked:
  // - If student has an assigned team -> normal flow: view that team & teammates in View Teams
  // - If student is unassigned -> view teams shows "no teams assigned" with manual "Assign Team" option
  const handleRowClick = (student: AdminStudent) => {
    const isUnassigned = !student.teamNo || student.teamNo.trim() === '' || student.teamNo.toLowerCase() === 'unassigned';
    if (isUnassigned) {
      onSelectStudentToViewTeam(null, true, student);
    } else {
      const assignedTeam = teams.find(t => 
        t.teamNo.toLowerCase() === student.teamNo.toLowerCase() ||
        t.members.some(m => m.rollNo === student.rollNo)
      );
      if (assignedTeam) {
        onSelectStudentToViewTeam(assignedTeam.teamId, true, student);
      } else {
        onSelectStudentToViewTeam(null, true, student);
      }
    }
  };

  const totalStrength = students.length;
  const assignedTeamsCount = teams.length;
  const unassignedStudentsCount = students.filter(s => !s.teamNo || s.teamNo === 'Unassigned').length;

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* 1. Green Hero Banner Matching Screenshot: Displays Advisor Name, Class, Batch, and ONLY the 3 Stat Boxes */}
      <div className="bg-[#0B7A4D] rounded-3xl p-6 sm:p-7 shadow-card text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-mint-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide w-fit">
            <span>SECTION ADVISORY</span>
            <span>&bull;</span>
            <span>BATCH {batch}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-2.5 tracking-tight">
            Advisor: {advisorName} &bull; Class {className}
          </h1>
          <p className="text-xs text-white/90 mt-1 max-w-xl leading-relaxed">
            Supervise student team formation, manage team allocation, and track milestone compliance for Class {className}.
          </p>
        </div>

        {/* ONLY THESE THREE STAT BOXES: Total Strength, Assigned Teams, Unassigned Students */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
          
          {/* Total Strength */}
          <div className="bg-white/15 backdrop-blur-xs border border-white/25 rounded-2xl p-3 sm:p-4 text-center min-w-[95px] sm:min-w-[110px]">
            <div className="text-2xl sm:text-3xl font-black text-white">{totalStrength}</div>
            <div className="text-[9px] sm:text-[10px] font-black tracking-wider text-white/85 uppercase mt-1">
              TOTAL STRENGTH
            </div>
          </div>

          {/* Assigned Teams */}
          <div className="bg-white/15 backdrop-blur-xs border border-white/25 rounded-2xl p-3 sm:p-4 text-center min-w-[95px] sm:min-w-[110px]">
            <div className="text-2xl sm:text-3xl font-black text-white">{assignedTeamsCount}</div>
            <div className="text-[9px] sm:text-[10px] font-black tracking-wider text-white/85 uppercase mt-1">
              ASSIGNED TEAMS
            </div>
          </div>

          {/* Unassigned Students */}
          <div className="bg-white/15 backdrop-blur-xs border border-white/25 rounded-2xl p-3 sm:p-4 text-center min-w-[95px] sm:min-w-[110px]">
            <div className="text-2xl sm:text-3xl font-black text-white">{unassignedStudentsCount}</div>
            <div className="text-[9px] sm:text-[10px] font-black tracking-wider text-white/85 uppercase mt-1">
              UNASSIGNED STUDENTS
            </div>
          </div>

        </div>
      </div>

      {/* 2. Action Controls & Manage Row */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Class {className} Enrolled Student Cohort
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any student row to view only their respective team and teammates in View Teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or register no..."
              className="w-full pl-8 pr-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Refresh button updates all changes */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh & Update All Changes"
            className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
          >
            <RefreshCw size={14} />
          </button>

          {/* Manage Button: Shown ONLY when NOT in manage mode. During managing, only refresh option is enough! */}
          {!isManageMode && (
            <button
              type="button"
              onClick={() => setIsManageMode(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 border border-[#E2E8E4]"
            >
              <Settings size={14} />
              <span>Manage</span>
            </button>
          )}

        </div>
      </div>

      {/* 2.1. Dedicated Organized Management Panel when Manage mode is active */}
      {isManageMode && (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-mint-200 bg-gradient-to-b from-mint-50/40 via-white to-white space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Settings size={18} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Class {className} Administrative Controls
                </h4>
                <p className="text-xs text-slate-500">
                  Configure team formation, re-partition project groups, and enroll new students.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsManageMode(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition cursor-pointer self-start sm:self-center"
            >
              Exit Manage Mode
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Setting 1: Team Formation & Allocation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8E4] flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-xs block">
                    Team Formation &amp; Allocation
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {areTeamsCreated 
                      ? `${teams.length} teams actively partitioned with capacity of ${teamCapacity} members each.`
                      : 'Generate and partition class cohort into balanced project teams.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8E4]/60">
                <span className="text-[11px] font-bold text-slate-600">
                  Status: <strong className="text-mint-800">{areTeamsCreated ? 'Configured' : 'Not Formed'}</strong>
                </span>
                {areTeamsCreated ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamOpen(true)}
                    className="px-3.5 py-1.5 bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 rounded-xl text-xs font-extrabold transition cursor-pointer"
                  >
                    Re-shuffle Teams
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamOpen(true)}
                    className="px-3.5 py-1.5 bg-mint-500 hover:bg-mint-600 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs"
                  >
                    Create Teams
                  </button>
                )}
              </div>
            </div>

            {/* Setting 2: Student Enrollment */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8E4] flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                  <UserPlus size={16} />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-xs block">
                    Student Enrollment &amp; Registration
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Manually register a candidate into Class {className} roster for Academic Batch {batch}.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8E4]/60">
                <span className="text-[11px] font-bold text-slate-600">
                  Enrolled: <strong className="text-slate-900">{students.length} Candidates</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewStudentName('');
                    setNewStudentRoll('');
                    setAddStudentError('');
                    setIsAddStudentOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Student</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Students Table (Clean - NO helper text banner, NO status column with assigned badges) */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Register Number</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Institutional Email</th>
                <th className="p-4">Assigned Team</th>
                <th className="p-4">Technical Guide</th>
                {isManageMode && <th className="p-4 text-right">Team Allocation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 6 : 5} className="p-12 text-center text-slate-400">
                    No students found matching current search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const hasTeam = s.teamNo && s.teamNo !== 'Unassigned';

                  return (
                    <tr
                      key={s.rollNo}
                      onClick={() => handleRowClick(s)}
                      className="hover:bg-mint-50/40 transition cursor-pointer group"
                    >
                      {/* Register Number */}
                      <td className="p-4 font-mono font-bold text-mint-800 whitespace-nowrap">
                        {s.rollNo}
                      </td>

                      {/* Student Name */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 group-hover:text-mint-800 transition flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <ChevronRight size={13} className="text-slate-300 group-hover:text-mint-600 transition" />
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {s.email}
                      </td>

                      {/* Assigned Team */}
                      <td className="p-4 whitespace-nowrap">
                        {hasTeam ? (
                          <span className="px-2.5 py-1 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-[11px]">
                            {s.teamNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold italic text-[11px]">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Technical Guide */}
                      <td className="p-4 text-slate-700 whitespace-nowrap">
                        <span className="font-bold">{s.guide || 'Unassigned'}</span>
                      </td>

                      {/* Manage Actions (Move) */}
                      {isManageMode && (
                        <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentToMove(s);
                              setTargetTeamId('');
                              setMoveError('');
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-mint-50 text-mint-800 hover:text-mint-900 border border-mint-300 rounded-xl font-extrabold text-xs transition shadow-2xs flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <MoveRight size={13} />
                            <span>Move</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add Student to Class */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-md rounded-3xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Add Student to Class {className}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Synchronizes universally across all portals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4 text-xs">
              {addStudentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{addStudentError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Aravind Swamy"
                  className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-mint-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Register Number / Roll No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStudentRoll}
                  onChange={(e) => setNewStudentRoll(e.target.value)}
                  placeholder="e.g. 714023104199"
                  className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-mint-500 shadow-2xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E2E8E4]">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-mint-500 hover:bg-mint-600 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Candidate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Move Student to Another Team */}
      {studentToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-md rounded-3xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
                  <MoveRight size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Shift Student Team
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {studentToMove.name} ({studentToMove.rollNo})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStudentToMove(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {moveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{moveError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E4] space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Team:</span>
                <span className="font-extrabold text-slate-900 block text-xs">
                  {studentToMove.teamNo || 'Unassigned'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Select Destination Team (Max Capacity: {teamCapacity} Members)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {teams.map((t) => {
                    const isCurrent = t.teamNo.toLowerCase() === (studentToMove.teamNo || '').toLowerCase();
                    const currentCount = t.members.length;
                    const maxCap = t.capacity || teamCapacity;
                    const isFull = currentCount >= maxCap;
                    const isSelected = targetTeamId === t.teamId;

                    return (
                      <div
                        key={t.teamId}
                        onClick={() => {
                          if (!isCurrent && !isFull) {
                            setTargetTeamId(t.teamId);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : isFull
                            ? 'bg-rose-50/50 border-rose-200 opacity-70 cursor-not-allowed'
                            : isSelected
                            ? 'bg-mint-50 border-mint-500 ring-2 ring-mint-400/40 shadow-xs cursor-pointer'
                            : 'bg-white border-[#E2E8E4] hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs">{t.teamNo}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[160px]">{t.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Guide: {t.guide}</span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                            isFull 
                              ? 'bg-rose-100 text-rose-800 border-rose-200' 
                              : 'bg-mint-100 text-mint-900 border-mint-200'
                          }`}>
                            {currentCount} / {maxCap} Members
                          </span>
                          {isFull && <span className="text-[9px] text-rose-600 block mt-0.5 font-bold">Team Full</span>}
                          {isCurrent && <span className="text-[9px] text-slate-400 block mt-0.5">Current Team</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStudentToMove(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveStudent}
                className="px-5 py-2 text-xs font-extrabold text-white bg-mint-500 hover:bg-mint-600 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Confirm Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Teams Wizard */}
      <AdvisorCreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        className={className}
        batch={batch}
        students={students}
        existingTeamsCount={teams.length}
        onConfirmTeams={handleTeamsCreated}
      />

    </div>
  );
};

export default AdvisorStudentsView;
