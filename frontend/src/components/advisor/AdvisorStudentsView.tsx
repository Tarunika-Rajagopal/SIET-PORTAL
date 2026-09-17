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
      
      {/* 1. Deep Charcoal Hero Banner: Displays Advisor Name, Class, Batch, and the 3 Stat Boxes */}
      <div className="bg-[#111111] rounded-2xl p-6 sm:p-7 shadow-xs text-[#F8F5EE] flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-[#292725]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#292725] text-[#EDE7DB] text-[11px] font-medium tracking-wide w-fit border border-[#D8CCBA]/20">
            <span>SECTION ADVISORY</span>
            <span>&bull;</span>
            <span>BATCH {batch}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-[#F8F5EE] mt-2.5 tracking-tight">
            Advisor: {advisorName} &bull; Class {className}
          </h1>
          <p className="text-xs text-[#B8AA97] mt-1 max-w-xl leading-relaxed">
            Supervise student team formation, manage team allocation, and track milestone compliance for Class {className}.
          </p>
        </div>

        {/* THREE STAT BOXES: Total Strength, Assigned Teams, Unassigned Students */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
          
          {/* Total Strength */}
          <div className="bg-[#292725]/60 border border-[#D8CCBA]/20 rounded-xl p-3 sm:p-4 text-center min-w-[95px] sm:min-w-[110px]">
            <div className="text-2xl sm:text-3xl font-bold text-[#F8F5EE]">{totalStrength}</div>
            <div className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#B8AA97] uppercase mt-1">
              TOTAL STRENGTH
            </div>
          </div>

          {/* Assigned Teams */}
          <div className="bg-[#292725]/60 border border-[#D8CCBA]/20 rounded-xl p-3 sm:p-4 text-center min-w-[95px] sm:min-w-[110px]">
            <div className="text-2xl sm:text-3xl font-bold text-[#F8F5EE]">{assignedTeamsCount}</div>
            <div className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#B8AA97] uppercase mt-1">
              ASSIGNED TEAMS
            </div>
          </div>

          {/* Unassigned Students */}
          <div className="bg-[#292725]/60 border border-[#D8CCBA]/20 rounded-xl p-3 sm:p-4 text-center min-w-[95px] sm:min-w-[110px]">
            <div className="text-2xl sm:text-3xl font-bold text-[#F8F5EE]">{unassignedStudentsCount}</div>
            <div className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#B8AA97] uppercase mt-1">
              UNASSIGNED STUDENTS
            </div>
          </div>

        </div>
      </div>

      {/* 2. Action Controls & Manage Row */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-serif font-semibold text-[#111111]">
            Class {className} Enrolled Student Cohort
          </h3>
          <p className="text-xs text-[#75695A] mt-0.5">
            Click any student row to view only their respective team and teammates in View Teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or register no..."
              className="w-full pl-8 pr-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60"
            />
          </div>

          {/* Refresh button updates all changes */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh & Update All Changes"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
          >
            <RefreshCw size={14} />
          </button>

          {/* Manage Button */}
          {!isManageMode && (
            <button
              type="button"
              onClick={() => setIsManageMode(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA]"
            >
              <Settings size={14} />
              <span>Manage</span>
            </button>
          )}

        </div>
      </div>

      {/* 2.1. Dedicated Organized Management Panel when Manage mode is active */}
      {isManageMode && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-[#D8CCBA] space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CCBA] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs">
                <Settings size={18} />
              </div>
              <div>
                <h4 className="text-base font-serif font-semibold text-[#111111]">
                  Class {className} Administrative Controls
                </h4>
                <p className="text-xs text-[#75695A]">
                  Configure team formation, re-partition project groups, and enroll new students.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsManageMode(false)}
              className="px-4 py-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] font-semibold text-xs rounded-xl border border-[#D8CCBA] transition cursor-pointer self-start sm:self-center"
            >
              Exit Manage Mode
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Setting 1: Team Formation & Allocation */}
            <div className="p-4 rounded-xl bg-[#F8F5EE]/60 border border-[#D8CCBA] flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <span className="font-semibold text-[#111111] text-xs block">
                    Team Formation &amp; Allocation
                  </span>
                  <p className="text-[11px] text-[#75695A] mt-0.5 leading-relaxed">
                    {areTeamsCreated 
                      ? `${teams.length} teams actively partitioned with capacity of ${teamCapacity} members each.`
                      : 'Generate and partition class cohort into balanced project teams.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#D8CCBA]/60">
                <span className="text-[11px] font-medium text-[#75695A]">
                  Status: <strong className="text-[#111111]">{areTeamsCreated ? 'Configured' : 'Not Formed'}</strong>
                </span>
                {areTeamsCreated ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamOpen(true)}
                    className="px-3.5 py-1.5 bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Re-shuffle Teams
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamOpen(true)}
                    className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    Create Teams
                  </button>
                )}
              </div>
            </div>

            {/* Setting 2: Student Enrollment */}
            <div className="p-4 rounded-xl bg-[#F8F5EE]/60 border border-[#D8CCBA] flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                  <UserPlus size={16} />
                </div>
                <div>
                  <span className="font-semibold text-[#111111] text-xs block">
                    Student Enrollment &amp; Registration
                  </span>
                  <p className="text-[11px] text-[#75695A] mt-0.5 leading-relaxed">
                    Manually register a candidate into Class {className} roster for Academic Batch {batch}.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#D8CCBA]/60">
                <span className="text-[11px] font-medium text-[#75695A]">
                  Enrolled: <strong className="text-[#111111]">{students.length} Candidates</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewStudentName('');
                    setNewStudentRoll('');
                    setAddStudentError('');
                    setIsAddStudentOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Student</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Students Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#292725] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4">Register Number</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Institutional Email</th>
                <th className="p-4">Assigned Team</th>
                <th className="p-4">Technical Guide</th>
                {isManageMode && <th className="p-4 text-right">Team Allocation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 6 : 5} className="p-12 text-center text-[#75695A]">
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
                      className="hover:bg-[#F8F5EE]/60 transition cursor-pointer group"
                    >
                      {/* Register Number */}
                      <td className="p-4 font-mono font-bold text-[#111111] whitespace-nowrap">
                        {s.rollNo}
                      </td>

                      {/* Student Name */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-semibold text-[#111111] group-hover:text-[#292725] transition flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <ChevronRight size={13} className="text-[#75695A] group-hover:text-[#111111] transition" />
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-4 text-[#75695A] font-mono text-[11px] whitespace-nowrap">
                        {s.email}
                      </td>

                      {/* Assigned Team */}
                      <td className="p-4 whitespace-nowrap">
                        {hasTeam ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-[11px]">
                            {s.teamNo}
                          </span>
                        ) : (
                          <span className="text-[#75695A] font-medium italic text-[11px]">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Technical Guide */}
                      <td className="p-4 text-[#292725] whitespace-nowrap">
                        <span className="font-medium">{s.guide || 'Unassigned'}</span>
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
                            className="px-3 py-1.5 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] rounded-xl font-semibold text-xs transition shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
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
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-[#111111]">
                    Add Student to Class {className}
                  </h3>
                  <p className="text-[11px] text-[#75695A]">
                    Synchronizes universally across all portals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-[#75695A] hover:text-[#111111] p-2 rounded-xl hover:bg-[#EDE7DB] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4 text-xs">
              {addStudentError && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{addStudentError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Aravind Swamy"
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider mb-1">
                  Register Number / Roll No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStudentRoll}
                  onChange={(e) => setNewStudentRoll(e.target.value)}
                  placeholder="e.g. 714023104199"
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-mono font-semibold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#D8CCBA]">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#292725] hover:text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#F8F5EE] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
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
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                  <MoveRight size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-[#111111]">
                    Shift Student Team
                  </h3>
                  <p className="text-[11px] text-[#75695A]">
                    {studentToMove.name} ({studentToMove.rollNo})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStudentToMove(null)}
                className="text-[#75695A] hover:text-[#111111] p-2 rounded-xl hover:bg-[#EDE7DB] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {moveError && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{moveError}</span>
                </div>
              )}

              <div className="p-3 bg-[#F8F5EE] rounded-xl border border-[#D8CCBA] space-y-1">
                <span className="text-[10px] text-[#75695A] font-bold uppercase block">Current Team:</span>
                <span className="font-semibold text-[#111111] block text-xs">
                  {studentToMove.teamNo || 'Unassigned'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider mb-1.5">
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
                        className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-[#F8F5EE] border-[#D8CCBA] opacity-60 cursor-not-allowed'
                            : isFull
                            ? 'bg-rose-50/50 border-rose-200 opacity-70 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#F8F5EE] border-[#111111] ring-1 ring-[#111111] shadow-xs cursor-pointer'
                            : 'bg-white border-[#D8CCBA] hover:bg-[#F8F5EE]/50 cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#111111] text-xs">{t.teamNo}</span>
                            <span className="text-[10px] text-[#75695A] truncate max-w-[160px]">{t.title}</span>
                          </div>
                          <span className="text-[10px] text-[#75695A] block mt-0.5">Guide: {t.guide}</span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isFull 
                              ? 'bg-rose-100 text-rose-800 border-rose-200' 
                              : 'bg-[#EDE7DB] text-[#111111] border-[#D8CCBA]'
                          }`}>
                            {currentCount} / {maxCap} Members
                          </span>
                          {isFull && <span className="text-[9px] text-rose-600 block mt-0.5 font-medium">Team Full</span>}
                          {isCurrent && <span className="text-[9px] text-[#75695A] block mt-0.5">Current Team</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStudentToMove(null)}
                className="px-4 py-2 text-xs font-semibold text-[#292725] hover:text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveStudent}
                className="px-5 py-2 text-xs font-medium text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
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
