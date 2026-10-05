import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, RefreshCw, Plus, MoveRight, UserPlus, Sparkles, 
  CheckCircle2, AlertCircle, X, Check, ChevronRight, ChevronDown,
  School, FileText, FileCode, Github, ExternalLink, Download, XCircle, Award, Eye, Clock,
  ArrowRightLeft, ArrowRight, BookOpen, Trash2
} from 'lucide-react';
import { AdminService, AdminStudent } from '../../services/adminService';
import { AdvisorService, ClassTeam, TeamMemberRecord } from '../../services/advisorService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import { AdvisorSubmissionsService } from '../../services/advisorSubmissionsService';
import { MarksService, WeeklyMarksRecord } from '../../services/marksService';
import { StudentService } from '../../services/studentService';
import { WeeklySubmission } from '../../types';
import AdvisorCreateTeamModal from './AdvisorCreateTeamModal';
import AdvisorManualTeamModal from './AdvisorManualTeamModal';
import AdvisorGuideReassignModal from './AdvisorGuideReassignModal';
import AdvisorDeleteTeamModal from './AdvisorDeleteTeamModal';
import { useClassStudents, useClassTeams, invalidateStudentsQuery, invalidateTeamsQuery } from '../../hooks/useQueries';
import { queryClient, QUERY_KEYS } from '../../lib/queryClient';
import { formatProjectTitle, getSubmissionTitle } from '../../utils/titleUtils';

interface AdvisorStudentsViewProps {
  className: string;
  batch: string;
  advisorName: string;
  onSelectStudentToViewTeam?: (teamNoOrId: string | null, onlyShowTeam?: boolean, student?: AdminStudent) => void;
  onShowToast: (msg: string) => void;
}

export const  AdvisorStudentsView: React.FC<AdvisorStudentsViewProps> = ({
  className,
  batch,
  advisorName,
  onShowToast
}) => {
  const { data: students = [], refetch: refetchStudents } = useClassStudents(className, batch);
  const { data: teams = [], refetch: refetchTeams } = useClassTeams(className);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isManageMode, setIsManageMode] = useState<boolean>(false);

  // Student dropdown expansion (supports multiple rows toggled at the same time)
  const [expandedStudentRolls, setExpandedStudentRolls] = useState<Set<string>>(new Set());

  // Submission Inspection Modal (Exact Student Submission Details Pop-up)
  const [inspectionSubmission, setInspectionSubmission] = useState<{
    sub: WeeklySubmission;
    team: ClassTeam;
    marks: WeeklyMarksRecord | null;
  } | null>(null);

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState<boolean>(false);
  const [isManualTeamOpen, setIsManualTeamOpen] = useState<boolean>(false);
  const [studentToMove, setStudentToMove] = useState<AdminStudent | null>(null);
  const [studentForManualTeam, setStudentForManualTeam] = useState<AdminStudent | null>(null);
  const [isReassignGuideOpen, setIsReassignGuideOpen] = useState<boolean>(false);
  const [teamForGuideReassign, setTeamForGuideReassign] = useState<ClassTeam | null>(null);
  const [isDeleteTeamOpen, setIsDeleteTeamOpen] = useState<boolean>(false);
  const [teamToDelete, setTeamToDelete] = useState<ClassTeam | null>(null);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState<boolean>(false);

  // Add student form state (NO placeholders)
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentRoll, setNewStudentRoll] = useState<string>('');
  const [newStudentEmail, setNewStudentEmail] = useState<string>('');
  const [newStudentPassword, setNewStudentPassword] = useState<string>('');
  const [newStudentTargetTeam, setNewStudentTargetTeam] = useState<string>('unassigned');
  const [addStudentError, setAddStudentError] = useState<string>('');

  // Submissions toggle per student roll
  const [viewSubmissionsRoll, setViewSubmissionsRoll] = useState<string | null>(null);

  // Move student state
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [moveError, setMoveError] = useState<string>('');
  const [fullTeamSelected, setFullTeamSelected] = useState<ClassTeam | null>(null);
  const [studentToReplace, setStudentToReplace] = useState<TeamMemberRecord | null>(null);
  const [exchangeAction, setExchangeAction] = useState<'swap' | 'unassign'>('unassign');
  const [isMovingStudent, setIsMovingStudent] = useState<boolean>(false);
  const [teamSearchFilter, setTeamSearchFilter] = useState<string>('');

  const refreshData = async () => {
    invalidateStudentsQuery();
    invalidateTeamsQuery();
    await Promise.all([refetchStudents(), refetchTeams()]);
  };

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
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError('');

    if (!newStudentName.trim() || !newStudentRoll.trim() || !newStudentEmail.trim() || !newStudentPassword.trim()) {
      setAddStudentError('Please enter student name, register number, institutional email, and password.');
      return;
    }

    const cleanName = newStudentName.trim();
    const cleanRoll = newStudentRoll.trim();
    const cleanEmail = newStudentEmail.trim();
    const cleanPassword = newStudentPassword.trim();

    // If assigned to an existing team with capacity
    if (newStudentTargetTeam && newStudentTargetTeam !== 'unassigned' && newStudentTargetTeam !== 'create_new') {
      const targetTeam = teams.find(t => t.teamId === newStudentTargetTeam || t.teamNo === newStudentTargetTeam);
      const cap = targetTeam?.capacity || teamCapacity;
      if (targetTeam && targetTeam.members.length >= cap) {
        const res = await AdvisorService.addStudentToClass(className, batch, cleanName, cleanRoll, undefined, cleanEmail, cleanPassword);
       
        if (!res.success) {
          setAddStudentError(res.message);
          return;
        }
        AdvisorHistoryService.addLog(
          className,
          'Student Enrollment',
          `${cleanName} (${cleanRoll})`,
          `Enrolled into Class ${className}.`,
          advisorName
        );
        const enrolledStudent: AdminStudent = {
          name: cleanName,
          rollNo: cleanRoll,
          email: cleanEmail,
          password: cleanPassword,
          batch,
          classSection: className,
          teamNo: 'Unassigned',
          projectTitle: '',
          guide: 'Unassigned'
        };
        setIsAddStudentOpen(false);
        setStudentForManualTeam(enrolledStudent);
        setIsManualTeamOpen(true);
        onShowToast(`Student ${cleanName} enrolled. Please create a new team for this student.`);
        await refreshData();
        return;
      }

      const res = await AdvisorService.addStudentToClass(className, batch, cleanName, cleanRoll, newStudentTargetTeam, cleanEmail, cleanPassword);
      if (!res.success) {
        setAddStudentError(res.message);
        return;
      }

      AdvisorHistoryService.addLog(
        className,
        'Student Enrollment',
        `${cleanName} (${cleanRoll})`,
        `Enrolled into Class ${className} and assigned to ${targetTeam?.teamNo || newStudentTargetTeam}.`,
        advisorName
      );
      onShowToast(`Student ${cleanName} (${cleanRoll}) registered and assigned to ${targetTeam?.teamNo || 'team'}.`);
      setNewStudentName('');
      setNewStudentRoll('');
      setNewStudentEmail('');
      setNewStudentPassword('');
      setNewStudentTargetTeam('unassigned');
      setIsAddStudentOpen(false);
      await refreshData();
      return;
    }

    if (newStudentTargetTeam === 'create_new') {
      const res = await AdvisorService.addStudentToClass(className, batch, cleanName, cleanRoll, undefined, cleanEmail, cleanPassword);
      if (!res.success) {
        setAddStudentError(res.message);
        return;
      }
      AdvisorHistoryService.addLog(
        className,
        'Student Enrollment',
        `${cleanName} (${cleanRoll})`,
        `Enrolled into Class ${className}.`,
        advisorName
      );
      const enrolledStudent: AdminStudent = {
        name: cleanName,
        rollNo: cleanRoll,
        email: cleanEmail,
        password: cleanPassword,
        batch,
        classSection: className,
        teamNo: 'Unassigned',
        projectTitle: '',
        guide: 'Unassigned'
      };
      setIsAddStudentOpen(false);
      setStudentForManualTeam(enrolledStudent);
      setIsManualTeamOpen(true);
      await refreshData();
      return;
    }

    // Default: Unassigned
    const res = await AdvisorService.addStudentToClass(className, batch, cleanName, cleanRoll, undefined, cleanEmail, cleanPassword);
    if (!res.success) {
      setAddStudentError(res.message);
      return;
    }

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Student Enrollment',
      `${cleanName} (${cleanRoll})`,
      `Enrolled into Class ${className}.`,
      advisorName
    );

    onShowToast(`Student ${cleanName} (${cleanRoll}) enrolled into Class ${className}.`);
    setNewStudentName('');
    setNewStudentRoll('');
    setNewStudentEmail('');
    setNewStudentPassword('');
    setNewStudentTargetTeam('unassigned');
    setIsAddStudentOpen(false);
    await refreshData();
  };

  // Handle Move / Assign Student Confirm
  const handleConfirmMoveStudent = async () => {
    if (!studentToMove || !targetTeamId) return;
    setMoveError('');
    setIsMovingStudent(true);

    const targetTeam = teams.find(t => t.teamId === targetTeamId);
    if (!targetTeam) {
      setMoveError('Please select a valid destination team.');
      setIsMovingStudent(false);
      return;
    }

    const currentTeamNo = studentToMove.teamNo || 'Unassigned';
    const isTransfer = currentTeamNo !== 'Unassigned' && currentTeamNo.trim() !== '';
    const isReplacing = Boolean(fullTeamSelected && studentToReplace);

    const res = await AdvisorService.assignStudentToTeam(
      className,
      studentToMove.rollNo,
      targetTeamId,
      isReplacing
        ? {
            replaceStudentRollNo: studentToReplace?.rollNo,
            exchangeAction: exchangeAction || 'unassign',
          }
        : undefined
    );

    if (!res.success) {
      setMoveError(res.message);
      setIsMovingStudent(false);
      return;
    }

    let historyLogMsg = isTransfer
      ? `Transferred student from ${currentTeamNo} to ${targetTeam.teamNo} (Guide: ${targetTeam.guide}).`
      : `Reallocated student to ${targetTeam.teamNo} (Guide: ${targetTeam.guide}).`;

    if (isReplacing && studentToReplace) {
      if (exchangeAction === 'swap' && isTransfer) {
        historyLogMsg = `Exchanged ${studentToMove.name} (${currentTeamNo} -> ${targetTeam.teamNo}) with ${studentToReplace.name} (${targetTeam.teamNo} -> ${currentTeamNo}).`;
      } else {
        historyLogMsg = `Moved ${studentToMove.name} to ${targetTeam.teamNo}, replacing ${studentToReplace.name} who is now Unassigned.`;
      }
    }

    AdvisorHistoryService.addLog(
      className,
      'Student Transfer',
      `${studentToMove.name} (${studentToMove.rollNo})`,
      historyLogMsg,
      advisorName,
      'Class Advisor'
    );

    onShowToast(
      isReplacing && studentToReplace
        ? (exchangeAction === 'swap' && isTransfer
            ? `Successfully exchanged ${studentToMove.name} and ${studentToReplace.name} between teams.`
            : `${studentToMove.name} moved to ${targetTeam.teamNo}. ${studentToReplace.name} is now Unassigned.`)
        : `${studentToMove.name} successfully ${isTransfer ? 'transferred' : 'allocated'} to ${targetTeam.teamNo}.`
    );

    // Optimistically update React Query cache immediately for zero-lag table update
    queryClient.setQueryData<AdminStudent[]>(
      QUERY_KEYS.advisorStudents(className, batch),
      (old = []) => {
        return old.map(st => {
          if (st.rollNo === studentToMove.rollNo) {
            return {
              ...st,
              teamNo: targetTeam.teamNo,
              guide: targetTeam.guide,
              projectTitle: targetTeam.title || '',
            };
          }
          if (isReplacing && studentToReplace && st.rollNo === studentToReplace.rollNo) {
            if (exchangeAction === 'swap' && isTransfer) {
              const srcTeam = teams.find(t => t.teamNo.toLowerCase() === currentTeamNo.toLowerCase());
              return {
                ...st,
                teamNo: currentTeamNo,
                guide: srcTeam?.guide || 'Unassigned',
                projectTitle: srcTeam?.title || '',
              };
            } else {
              return {
                ...st,
                teamNo: 'Unassigned',
                guide: 'Unassigned',
                projectTitle: '',
              };
            }
          }
          return st;
        });
      }
    );

    queryClient.setQueryData<ClassTeam[]>(
      QUERY_KEYS.advisorTeams(className),
      (old = []) => {
        return old.map(t => {
          let updatedMembers = [...(t.members || [])];
          if (t.teamId === targetTeam.teamId || t.teamNo === targetTeam.teamNo) {
            if (isReplacing && studentToReplace) {
              updatedMembers = updatedMembers.filter(m => m.rollNo !== studentToReplace.rollNo);
            }
            if (!updatedMembers.some(m => m.rollNo === studentToMove.rollNo)) {
              updatedMembers.push({
                rollNo: studentToMove.rollNo,
                name: studentToMove.name,
                email: studentToMove.email,
                isLead: updatedMembers.length === 0,
              });
            }
            return {
              ...t,
              members: updatedMembers,
              membersCount: updatedMembers.length,
            };
          }
          if (isTransfer && t.teamNo.toLowerCase() === currentTeamNo.toLowerCase()) {
            updatedMembers = updatedMembers.filter(m => m.rollNo !== studentToMove.rollNo);
            if (isReplacing && studentToReplace && exchangeAction === 'swap') {
              if (!updatedMembers.some(m => m.rollNo === studentToReplace.rollNo)) {
                updatedMembers.push({
                  rollNo: studentToReplace.rollNo,
                  name: studentToReplace.name,
                  email: studentToReplace.email,
                  isLead: updatedMembers.length === 0,
                });
              }
            }
            return {
              ...t,
              members: updatedMembers,
              membersCount: updatedMembers.length,
            };
          }
          return t;
        });
      }
    );

    setStudentToMove(null);
    setTargetTeamId('');
    setFullTeamSelected(null);
    setStudentToReplace(null);
    setExchangeAction('unassign');
    setTeamSearchFilter('');
    setIsMovingStudent(false);
    await refreshData();
  };

  const handleTeamsCreated = async (
    capacity: number,
    newTeams: Array<{
      teamNo: string;
      title: string;
      guide: string;
      guideEmail?: string;
      leadRollNo: string;
      members: TeamMemberRecord[];
    }>
  ) => {
    await AdvisorService.createTeams(className, batch, capacity, newTeams);
    setIsCreateTeamOpen(false);
    AdvisorHistoryService.addLog(
      className,
      'Team Formation',
      `Class ${className}`,
      `Generated & partitioned ${newTeams.length} teams with capacity of ${capacity} members each.`,
      advisorName
    );
    onShowToast(`Successfully generated and finalized ${newTeams.length} teams.`);
  };

  // Toggle dropdown row when student is clicked (supports multiple rows simultaneously)
  const handleStudentRowClick = (student: AdminStudent) => {
    setExpandedStudentRolls(prev => {
      const next = new Set(prev);
      if (next.has(student.rollNo)) {
        next.delete(student.rollNo);
      } else {
        next.add(student.rollNo);
      }
      return next;
    });
  };



  // Live metrics that update automatically whenever data changes
  const totalStrength = students.length;
  const assignedTeamsCount = teams.length;
  const unassignedStudentsCount = students.filter(s => {
    if (teams.length > 0) {
      return !teams.some(t => t.members && t.members.some(m => m.rollNo === s.rollNo));
    }
    return !s.teamNo || s.teamNo === 'Unassigned';
  }).length;

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      
      {/* 1. Live Information Bar (Automatically updates if changed anywhere) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Class */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8E4] shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mint-50 text-mint-800 flex items-center justify-center shrink-0">
            <School size={18} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Class</div>
            <div className="text-base font-black text-slate-900">{className}</div>
          </div>
        </div>

        {/* Total Strength */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8E4] shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Strength</div>
            <div className="text-base font-black text-slate-900">{totalStrength} Candidates</div>
          </div>
        </div>

        {/* Assigned Teams */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8E4] shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Teams</div>
            <div className="text-base font-black text-slate-900">{assignedTeamsCount} Teams</div>
          </div>
        </div>

        {/* Unassigned Students */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8E4] shadow-card flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${unassignedStudentsCount > 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-500'}`}>
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unassigned</div>
            <div className={`text-base font-black ${unassignedStudentsCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
              {unassignedStudentsCount} Students
            </div>
          </div>
        </div>

      </div>

      {/* 2. Filter & Manage Controls (NO title or instructions - starts directly with filtering) */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student or register no..."
            className="w-full pl-8 pr-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Manage Button (Shows Manage when not managing) */}
          {!isManageMode && (
            <button
              type="button"
              onClick={() => {
                setIsManageMode(true);
                setIsTeamManagementOpen(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center shadow-2xs cursor-pointer bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 border border-[#E2E8E4]"
            >
              <span>Manage</span>
            </button>
          )}
        </div>
      </div>

      {/* 2.1. Management Panel when Manage mode is active */}
      {isManageMode && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-card border border-mint-200 bg-gradient-to-b from-mint-50/40 via-white to-white space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Options in the horizontal space on the left */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 flex-1">
              {/* Option 1: Team Management */}
              <button
                type="button"
                onClick={() => setIsTeamManagementOpen((prev) => !prev)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 border ${
                  isTeamManagementOpen
                    ? 'bg-slate-200 text-slate-900 border-slate-300 ring-2 ring-slate-400/20'
                    : 'bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 hover:text-slate-900 border-[#E2E8E4]'
                }`}
              >
                <Users size={15} className={isTeamManagementOpen ? 'text-slate-800' : 'text-slate-600'} />
                <span>Team Management</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    isTeamManagementOpen ? 'rotate-180 text-slate-800' : 'text-slate-500'
                  }`}
                />
              </button>

              {/* Option 2: Reassign Guide */}
              <button
                type="button"
                onClick={() => {
                  setTeamForGuideReassign(null);
                  setIsReassignGuideOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 hover:text-slate-900 border border-[#E2E8E4]"
              >
                <BookOpen size={15} className="text-slate-600" />
                <span>Reassign Guide</span>
              </button>

              {/* Option 3: Add Student */}
              <button
                type="button"
                onClick={() => {
                  setNewStudentName('');
                  setNewStudentRoll('');
                  setNewStudentEmail('');
                  setNewStudentPassword('');
                  setAddStudentError('');
                  setIsAddStudentOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 hover:text-slate-900 border border-[#E2E8E4]"
              >
                <UserPlus size={15} className="text-slate-600" />
                <span>Add Student</span>
              </button>
            </div>

            {/* Exit Manage Mode on the right */}
            <button
              type="button"
              onClick={() => {
                setIsManageMode(false);
                setIsTeamManagementOpen(false);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition cursor-pointer shrink-0"
            >
              Exit Manage Mode
            </button>
          </div>

          {/* Sub-options when Team Management is clicked */}
          {isTeamManagementOpen && (
            <div className="p-3.5 rounded-2xl bg-white/70 border border-[#E2E8E4] shadow-2xs animate-fadeIn mt-1">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
                {/* 1. Allocate Team Manually */}
                <button
                  type="button"
                  onClick={() => {
                    setStudentForManualTeam(null);
                    setIsManualTeamOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 hover:text-slate-900 border border-[#E2E8E4] shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Sparkles size={14} className="text-slate-600" />
                  <span>Allocate Team Manually</span>
                </button>

                {/* 2. Auto Team Allocation */}
                <button
                  type="button"
                  onClick={() => setIsCreateTeamOpen(true)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 hover:text-slate-900 border border-[#E2E8E4] shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                >
                  <RefreshCw size={14} className="text-slate-600" />
                  <span>Auto Team Allocation</span>
                </button>

                {/* 3. Delete Team */}
                <button
                  type="button"
                  disabled={teams.length === 0}
                  onClick={() => {
                    setTeamToDelete(null);
                    setIsDeleteTeamOpen(true);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2 shadow-2xs ${
                    teams.length === 0
                      ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                  }`}
                >
                  <Trash2 size={14} className={teams.length === 0 ? 'text-slate-400' : 'text-rose-600'} />
                  <span>Delete Team</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Students Table with Smooth Expandable Accordion */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: isManageMode ? '30%' : '38%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: isManageMode ? '20%' : '26%' }} />
              {isManageMode && <col style={{ width: '14%' }} />}
            </colgroup>
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4 w-[18%]">Register Number</th>
                <th className={`p-4 ${isManageMode ? 'w-[30%]' : 'w-[38%]'}`}>Student Name</th>
                <th className="p-4 w-[18%]">Assigned Team</th>
                <th className={`p-4 ${isManageMode ? 'w-[20%]' : 'w-[26%]'}`}>Assigned Guide</th>
                {isManageMode && <th className="p-4 text-right w-[14%]">Team Allocation</th>}
              </tr>
            </thead>
            <tbody className="font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 5 : 4} className="p-12 text-center text-slate-400">
                    No students found matching current search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isExpanded = expandedStudentRolls.has(s.rollNo);

                  // Authoritative assignment: student is assigned if and only if they are present in a team's members roster
                  let assignedTeam = teams.find(t => 
                    t.members && t.members.some(m => m.rollNo === s.rollNo)
                  );
                  if (!assignedTeam && teams.length === 0) {
                    const studentTeam = StudentService.getTeam();
                    if (studentTeam && studentTeam.members?.some((m: any) => m.rollNo === s.rollNo)) {
                      assignedTeam = {
                        teamId: studentTeam.id || s.teamNo || 'Unassigned',
                        teamNo: studentTeam.teamNo || s.teamNo || 'Unassigned',
                        class: studentTeam.section || className,
                        batch: studentTeam.batch || batch,
                        title: studentTeam.projectTitle || studentTeam.submittedTitle || '',
                        guide: studentTeam.guideName || s.guide || 'Unassigned',
                        status: (studentTeam.isTitleApproved || studentTeam.guideApprovalStatus === 'Approved') ? 'Approved' : 'Pending',
                        capacity: 4,
                        membersCount: studentTeam.members.length,
                        leadStudent: studentTeam.members.find((m: any) => m.role?.toLowerCase().includes('lead') || (m as any).isLead)?.name || s.name,
                        members: studentTeam.members.map((m: any) => ({
                          rollNo: m.rollNo,
                          name: m.name,
                          email: m.email,
                          isLead: Boolean(m.role?.toLowerCase().includes('lead') || (m as any).isLead)
                        }))
                      };
                    }
                  }

                  const hasTeam = assignedTeam != null || (teams.length === 0 && Boolean(s.teamNo && s.teamNo !== 'Unassigned'));
                  const displayTeamNo = assignedTeam ? assignedTeam.teamNo : (hasTeam ? s.teamNo : 'Unassigned');
                  const displayGuide = assignedTeam ? assignedTeam.guide : (hasTeam ? s.guide : 'Unassigned');

                  // Retrieve submissions and recorded marks for this team
                  const teamSubmissions: WeeklySubmission[] = assignedTeam 
                    ? AdvisorSubmissionsService.getTeamSubmissions(assignedTeam) 
                    : [];
                  const teamMarksRecords = assignedTeam 
                    ? MarksService.getAllTeamMarks(assignedTeam.teamId, assignedTeam.members.map(m => m.rollNo))
                    : {};

                  // Milestones: Submission 1, Submission 2, Submission 3, Submission 4 (and any extra submitted weeks)
                  const milestoneWeeks = Array.from(new Set([0, 1, 2, 3, ...teamSubmissions.map(sub => sub.week)])).sort((a, b) => a - b);

                  return (
                    <React.Fragment key={s.rollNo}>
                      {/* Main Student Row */}
                      <tr
                        onClick={() => handleStudentRowClick(s)}
                        className={`border-b border-[#E2E8E4] hover:bg-mint-50/40 transition-colors duration-300 ease-out cursor-pointer group select-none ${
                          isExpanded ? 'bg-mint-50/30' : ''
                        }`}
                      >
                        {/* Register Number */}
                        <td className="p-4 font-mono font-bold text-mint-800 whitespace-nowrap">
                          {s.rollNo}
                        </td>

                        {/* Student Name with Expand Chevron */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-extrabold text-slate-900 group-hover:text-mint-800 transition-colors duration-300 flex items-center gap-2">
                            <span>{s.name}</span>
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform duration-450 ease-out ${
                                isExpanded ? 'rotate-180 text-mint-700' : 'rotate-0 text-slate-400 group-hover:text-mint-600'
                              }`} 
                            />
                          </div>
                        </td>

                        {/* Assigned Team */}
                        <td className="p-4 whitespace-nowrap">
                          {hasTeam ? (
                            <span className="px-2.5 py-1 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-[11px]">
                              {displayTeamNo}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold italic text-[11px]">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Technical Guide */}
                        <td className="p-4 text-slate-700 whitespace-nowrap">
                          <span className="font-bold">{displayGuide}</span>
                        </td>

                        {/* Manage Actions (Move / Assign / Unassign) */}
                        {isManageMode && (
                          <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {!hasTeam ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStudentForManualTeam(s);
                                      setIsManualTeamOpen(true);
                                    }}
                                    title="Allocate Team"
                                    className="px-2.5 py-1.5 bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-300 rounded-xl font-extrabold text-xs transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Sparkles size={12} />
                                    <span>Allocate Team</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStudentToMove(s);
                                      setTargetTeamId('');
                                      setMoveError('');
                                      setFullTeamSelected(null);
                                      setStudentToReplace(null);
                                      setExchangeAction('unassign');
                                      setTeamSearchFilter('');
                                    }}
                                    title="Reallocate student to a team"
                                    className="px-3 py-1.5 bg-white hover:bg-mint-50 text-mint-800 hover:text-mint-900 border border-mint-300 rounded-xl font-extrabold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <UserPlus size={13} />
                                    <span>Reallocate</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentToMove(s);
                                    setTargetTeamId('');
                                    setMoveError('');
                                    setFullTeamSelected(null);
                                    setStudentToReplace(null);
                                    setExchangeAction('unassign');
                                    setTeamSearchFilter('');
                                  }}
                                  title="Transfer student to another team"
                                  className="px-3 py-1.5 bg-white hover:bg-mint-50 text-mint-800 hover:text-mint-900 border border-mint-300 rounded-xl font-extrabold text-xs transition shadow-2xs flex items-center gap-1.5 ml-auto cursor-pointer"
                                >
                                  <ArrowRightLeft size={13} />
                                  <span>Transfer</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Smooth Dropdown Accordion Row */}
                      <tr className={isExpanded ? 'border-b border-[#E2E8E4]' : 'border-0'}>
                        <td colSpan={isManageMode ? 5 : 4} className="p-0 border-0">
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateRows: isExpanded ? '1fr' : '0fr',
                              opacity: isExpanded ? 1 : 0,
                              transition: 'grid-template-rows 460ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                              pointerEvents: isExpanded ? 'auto' : 'none',
                            }}
                          >
                            <div style={{ overflow: 'hidden', minHeight: 0 }}>
                              <div className="p-5 sm:p-6 space-y-5 border-l-4 border-l-mint-500 bg-gradient-to-b from-mint-50/20 via-white to-slate-50/50">
                              
                              {/* 1. Team Members First */}
                              <div className="bg-white rounded-2xl p-4 border border-[#E2E8E4] shadow-xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8E4] pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                                      {assignedTeam?.teamNo || s.teamNo || 'Unassigned'}
                                    </span>
                                    {(() => {
                                      const isApproved = assignedTeam?.status === 'Approved' || (assignedTeam as any)?.isTitleApproved || StudentService.isSubmission1Approved(assignedTeam?.teamId);
                                      const formatted = formatProjectTitle(assignedTeam?.title || s.projectTitle, isApproved ? 'Approved' : assignedTeam?.status, isApproved);
                                      const isTitleApproved = formatted !== 'No Title Submitted' && formatted !== 'Title Approval Pending';
                                      const isPending = formatted === 'Title Approval Pending';
                                      if (isApproved) {
                                        return (
                                          <span className="font-extrabold text-slate-900 text-xs">
                                            {formatted}
                                          </span>
                                        );
                                      } else if (isPending) {
                                        return (
                                          <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                            <Clock size={11} /> Title Approval Pending
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
                                            No Title Submitted
                                          </span>
                                        );
                                      }
                                    })()}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-bold flex items-center gap-2">
                                    <span>Assigned Guide: <strong className="text-slate-800">{assignedTeam?.guide || s.guide || 'Unassigned'}</strong></span>
                                    {isManageMode && assignedTeam && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTeamForGuideReassign(assignedTeam);
                                            setIsReassignGuideOpen(true);
                                          }}
                                          className="px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                        >
                                          <BookOpen size={11} />
                                          <span>Reassign Guide</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Team Members Listing */}
                                <div>
                                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                                    Team Members ({assignedTeam ? assignedTeam.members.length : 1})
                                  </div>

                                  {assignedTeam && assignedTeam.members.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                                      {assignedTeam.members.map((member) => (
                                        <div 
                                          key={member.rollNo}
                                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition ${
                                            member.rollNo === s.rollNo 
                                              ? 'bg-mint-50/80 border-mint-300 ring-1 ring-mint-300/60' 
                                              : 'bg-[#F8FAF9] border-[#E2E8E4]'
                                          }`}
                                        >
                                          <div className="w-8 h-8 rounded-lg bg-mint-200/80 text-mint-900 font-black text-xs flex items-center justify-center shrink-0">
                                            {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                                              <span>{member.name}</span>
                                              {member.isLead && (
                                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">Lead</span>
                                              )}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-500">{member.rollNo}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                                        <AlertCircle size={15} className="text-amber-600 shrink-0" />
                                        <span>Candidate is currently not assigned to any team.</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStudentToMove(s);
                                          setTargetTeamId('');
                                          setMoveError('');
                                        }}
                                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                                      >
                                        Assign Team
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 2. Submissions Milestone List (Directly visible when student is selected) */}
                              {assignedTeam && (
                              <div className="bg-white rounded-2xl p-4 border border-[#E2E8E4] shadow-xs space-y-3 animate-fadeIn">
                                <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-2.5">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Project Milestone Deliverables &amp; Progress
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {teamSubmissions.length > 0 ? `${teamSubmissions.length} milestone submission(s) on record` : 'Submissions on record'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {milestoneWeeks.map((weekNum) => {
                                    const submissionNumber = weekNum + 1;
                                    const sub = teamSubmissions.find(item => 
                                      item.week === weekNum || 
                                      item.title?.toLowerCase().includes(`submission ${submissionNumber}`)
                                    );
                                    const weekMarks = teamMarksRecords[submissionNumber] || 
                                                      (submissionNumber === 1 ? teamMarksRecords[0] : null) ||
                                                      teamMarksRecords[submissionNumber - 1];
                                    const markScore = (weekMarks?.teamAverage !== undefined && weekMarks.teamAverage > 0)
                                      ? weekMarks.teamAverage
                                      : (typeof sub?.score === 'number' && sub.score > 0 ? sub.score : null);

                                    // If submitted
                                    if (sub) {
                                      const isApproved = sub.status === 'Approved';
                                      const isRevision = sub.status === 'Changes Requested';

                                      const effectiveTeam: ClassTeam = assignedTeam || {
                                        teamId: s.teamNo || 'team-temp',
                                        teamNo: s.teamNo || 'Team',
                                        class: className,
                                        batch,
                                        title: getSubmissionTitle(sub.projectTitle || assignedTeam?.title),
                                        guide: s.guide || 'Faculty Guide',
                                        status: 'Formed',
                                        capacity: 4,
                                        membersCount: 1,
                                        leadStudent: `${s.name} (${s.rollNo})`,
                                        members: [{ name: s.name, rollNo: s.rollNo, email: s.email, isLead: true }]
                                      };

                                      return (
                                        <div
                                          key={weekNum}
                                          onClick={() => setInspectionSubmission({
                                            sub,
                                            team: effectiveTeam,
                                            marks: weekMarks
                                          })}
                                          className="p-3.5 rounded-2xl border border-mint-200 bg-mint-50/20 hover:bg-mint-50/60 hover:border-mint-400 transition cursor-pointer flex flex-col justify-between gap-3 shadow-2xs group/sub"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-md bg-mint-600 text-white font-black text-[10px] uppercase tracking-wide">
                                                  Submission {submissionNumber}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                  {sub.submissionDate || 'Submitted'}
                                                </span>
                                              </div>
                                              <h5 className="font-extrabold text-slate-900 text-xs mt-1.5 line-clamp-1 group-hover/sub:text-mint-900 transition">
                                                {sub.projectTitle || sub.title || `Milestone Submission ${submissionNumber}`}
                                              </h5>
                                            </div>

                                            {/* Status Badge */}
                                            {isApproved ? (
                                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-[10px] flex items-center gap-1 shrink-0">
                                                <CheckCircle2 size={11} className="text-emerald-700" />
                                                <span>Approved</span>
                                              </span>
                                            ) : isRevision ? (
                                              <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-200 font-extrabold text-[10px] flex items-center gap-1 shrink-0">
                                                <AlertCircle size={11} className="text-rose-700" />
                                                <span>Revision Req.</span>
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-[10px] flex items-center gap-1 shrink-0">
                                                <Sparkles size={11} className="text-amber-700" />
                                                <span>Submitted</span>
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center justify-between pt-2 border-t border-[#E2E8E4]/60">
                                            {/* Marks Awarded (View-Only) */}
                                            <div>
                                              {markScore !== null ? (
                                                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-black text-[10px] flex items-center gap-1">
                                                  <Award size={11} className="text-amber-400" />
                                                  <span>Marks: {markScore}/100</span>
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-slate-400 font-bold italic">
                                                  Marks pending evaluation
                                                </span>
                                              )}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setInspectionSubmission({
                                                  sub,
                                                  team: effectiveTeam,
                                                  marks: weekMarks
                                                });
                                              }}
                                              className="px-3 py-1 rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 font-extrabold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs group-hover/sub:bg-mint-100"
                                            >
                                              <Eye size={12} />
                                              <span>View Details</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }

                                    // If NOT submitted -> Show in RED: Not Submitted
                                    return (
                                      <div
                                        key={weekNum}
                                        className="p-3.5 rounded-2xl border border-dashed border-rose-200 bg-rose-50/30 flex flex-col justify-between gap-3"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] uppercase">
                                                Submission {submissionNumber}
                                              </span>
                                            </div>
                                            <div className="text-xs font-semibold text-slate-400 mt-1.5 italic">
                                              Deliverable dossier not uploaded
                                            </div>
                                          </div>

                                          {/* RED Not Submitted Badge */}
                                          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 font-extrabold text-[10px] flex items-center gap-1 shrink-0">
                                            <XCircle size={12} className="text-rose-600" />
                                            <span>Not Submitted</span>
                                          </span>
                                        </div>

                                        <div className="pt-2 border-t border-rose-100 text-[10px] text-rose-600/80 font-medium">
                                          Pending candidate upload &amp; guide defense
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              )}

                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP-UP 1: Exact Student Submission Inspection Modal (Deliverables & View-Only Marks) */}
      {inspectionSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-2xl rounded-3xl shadow-modal border border-[#E2E8E4] max-h-[90vh] flex flex-col overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-mint-600 text-white font-black text-xs">
                    Submission {inspectionSubmission.sub.week + 1}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {inspectionSubmission.team.teamNo}
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-xs text-slate-600 font-medium">
                    Guide: {inspectionSubmission.team.guide || 'Faculty Guide'}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                  {inspectionSubmission.sub.projectTitle || inspectionSubmission.sub.title || 'Technical Submission Deliverables'}
                </h3>
              </div>
              <button
                onClick={() => setInspectionSubmission(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Submission Status & Marks Overview Banner */}
              <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold shrink-0">
                    <Award size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Evaluation Status
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${
                        inspectionSubmission.sub.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                          : inspectionSubmission.sub.status === 'Changes Requested'
                          ? 'bg-rose-100 text-rose-900 border-rose-200'
                          : 'bg-amber-100 text-amber-900 border-amber-200'
                      }`}>
                        {inspectionSubmission.sub.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Date: {inspectionSubmission.sub.submissionDate || 'Recorded'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View-Only Marks Display */}
                {(() => {
                  const subNum = (inspectionSubmission.sub as any).weekNumber !== undefined 
                    ? ((inspectionSubmission.sub as any).weekNumber + 1) 
                    : (inspectionSubmission.sub.week !== undefined ? inspectionSubmission.sub.week + 1 : 1);
                  const memberRolls = inspectionSubmission.team.members?.map(m => m.rollNo);
                  const marksRec = MarksService.getWeeklyMarks(inspectionSubmission.team.teamId, subNum, memberRolls) ||
                                   (subNum === 1 ? MarksService.getWeeklyMarks(inspectionSubmission.team.teamId, 0, memberRolls) : null) ||
                                   MarksService.getWeeklyMarks(inspectionSubmission.team.teamId, subNum - 1, memberRolls) ||
                                   inspectionSubmission.marks;
                  const hasMarks = Boolean(marksRec && (
                    (marksRec.teamAverage !== undefined && marksRec.teamAverage > 0) ||
                    (marksRec.memberMarks && Object.keys(marksRec.memberMarks).length > 0)
                  ));

                  return (
                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E2E8E4]">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Guide Assigned Marks (View-Only)
                      </div>
                      {hasMarks ? (
                        <div className="text-base font-black text-slate-900 mt-0.5 flex items-center sm:justify-end gap-1.5">
                          <span className="text-emerald-700">
                            {marksRec?.teamAverage ?? inspectionSubmission.sub.score}
                          </span>
                          <span className="text-xs text-slate-400">/ 100</span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-500 italic mt-0.5">
                          Marks pending guide assessment
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Individual Student Marks Breakdown Card */}
              {(() => {
                const subNum = (inspectionSubmission.sub as any).weekNumber !== undefined 
                  ? ((inspectionSubmission.sub as any).weekNumber + 1) 
                  : (inspectionSubmission.sub.week !== undefined ? inspectionSubmission.sub.week + 1 : 1);
                const memberRolls = inspectionSubmission.team.members?.map(m => m.rollNo);
                const marksRec = MarksService.getWeeklyMarks(inspectionSubmission.team.teamId, subNum, memberRolls) ||
                                 (subNum === 1 ? MarksService.getWeeklyMarks(inspectionSubmission.team.teamId, 0, memberRolls) : null) ||
                                 MarksService.getWeeklyMarks(inspectionSubmission.team.teamId, subNum - 1, memberRolls) ||
                                 inspectionSubmission.marks;
                const hasMarks = Boolean(marksRec && (
                  (marksRec.teamAverage !== undefined && marksRec.teamAverage > 0) ||
                  (marksRec.memberMarks && Object.keys(marksRec.memberMarks).length > 0)
                ));
                if (!hasMarks || !marksRec) return null;

                return (
                  <div className="p-4 rounded-2xl bg-mint-50/70 border border-mint-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award size={16} className="text-mint-800" />
                        <h4 className="text-xs font-bold text-mint-950 uppercase tracking-wider">
                          Assigned Milestone Marks Breakdown
                        </h4>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-white border border-mint-200 font-extrabold text-xs text-mint-900">
                        Team Average: {marksRec.teamAverage} / 100
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(inspectionSubmission.team.members || []).map((member) => {
                        const mScore = marksRec.memberMarks?.[member.rollNo] ?? marksRec.teamAverage;
                        return (
                          <div key={member.rollNo} className="p-2.5 bg-white rounded-xl border border-mint-200 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="truncate">
                              <span className="font-bold text-slate-900 text-xs block truncate">{member.name}</span>
                              <span className="font-mono text-[10px] text-slate-500">{member.rollNo} {member.isLead && '• Lead'}</span>
                            </div>
                            <div>
                              {mScore !== undefined ? (
                                <span className="px-2.5 py-1 rounded-lg bg-mint-100 text-mint-950 font-black text-xs border border-mint-200">
                                  {mScore} / 100
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic font-semibold">
                                  Unassigned
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {marksRec.remarks && (
                      <p className="text-xs text-mint-900 font-medium pt-1 border-t border-mint-200/60 italic">
                        &ldquo;{marksRec.remarks}&rdquo; &bull; Evaluated by {marksRec.gradedBy}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Guide Remarks / Comments if Available */}
              {(inspectionSubmission.sub.comments || inspectionSubmission.marks?.remarks) && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Guide Feedback / Evaluation Remarks:
                  </span>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {inspectionSubmission.sub.comments || inspectionSubmission.marks?.remarks}
                  </p>
                </div>
              )}

              {/* Problem Statement */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Problem Statement
                </span>
                {inspectionSubmission.sub.problemStatement ? (
                  <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                    {inspectionSubmission.sub.problemStatement}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400" />
                    <span>No problem statement submitted for this milestone</span>
                  </div>
                )}
              </div>

              {/* Proposed Solution */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Proposed Solution &amp; Technical Approach
                </span>
                {inspectionSubmission.sub.solution ? (
                  <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                    {inspectionSubmission.sub.solution}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400" />
                    <span>No technical solution submitted for this milestone</span>
                  </div>
                )}
              </div>

              {/* Technologies Used */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Technologies &amp; Frameworks
                </span>
                {inspectionSubmission.sub.technologyUsed ? (
                  <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl flex flex-wrap gap-2">
                    {inspectionSubmission.sub.technologyUsed.split(',').map((tech, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8E4] text-xs font-mono font-bold text-slate-800 shadow-2xs"
                      >
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400" />
                    <span>No specific technologies recorded for this week</span>
                  </div>
                )}
              </div>

              {/* Obstacles Faced */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Obstacles Faced &amp; Resolutions
                </span>
                {inspectionSubmission.sub.obstaclesFaced ? (
                  <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-xs text-slate-800 leading-relaxed">
                    {inspectionSubmission.sub.obstaclesFaced}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>No blocking obstacles reported for this milestone</span>
                  </div>
                )}
              </div>

              {/* Abstract */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Milestone Abstract &amp; Deliverable Summary
                </span>
                {inspectionSubmission.sub.abstract ? (
                  <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                    {inspectionSubmission.sub.abstract}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400" />
                    <span>No abstract summary provided for this milestone</span>
                  </div>
                )}
              </div>

              {/* Deliverable Files & Links */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                  Deliverable Files, Presentations &amp; Repositories
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


                  {/* GitHub Repo Link */}
                  {inspectionSubmission.sub.repoUrl ? (
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                          <Github size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block">Source Code Repository</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px] block font-mono">
                            {inspectionSubmission.sub.repoUrl}
                          </span>
                        </div>
                      </div>
                      <a
                        href={inspectionSubmission.sub.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>Open</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-dashed border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Github size={18} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 block">Source Code Repository</span>
                          <span className="text-[10px] text-slate-400">GitHub Link</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                        ✕ Not Uploaded
                      </span>
                    </div>
                  )}

                  {/* Live Demo Link */}
                  {inspectionSubmission.sub.demoUrl ? (
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <ExternalLink size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block">Live Demo / Telemetry</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px] block font-mono">
                            {inspectionSubmission.sub.demoUrl}
                          </span>
                        </div>
                      </div>
                      <a
                        href={inspectionSubmission.sub.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>Launch</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-dashed border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <ExternalLink size={18} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 block">Live Demo / Dashboard</span>
                          <span className="text-[10px] text-slate-400">Web URL</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                        ✕ Not Uploaded
                      </span>
                    </div>
                  )}

                </div>
              </div>



            </div>

            {/* Modal Footer */}
            <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setInspectionSubmission(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-[#E2E8E4] hover:bg-slate-50 rounded-xl transition cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 2: Add Student to Class (NO placeholders in inputs!) */}
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
                </div>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-mint-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Institutional Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-mint-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-mint-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Assign to Team (Optional)
                </label>
                <select
                  value={newStudentTargetTeam}
                  onChange={(e) => setNewStudentTargetTeam(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-mint-500 shadow-2xs cursor-pointer"
                >
                  <option value="unassigned">Keep Unassigned (Allocate Later)</option>
                  {teams.map(t => {
                    const isFull = t.members.length >= (t.capacity || teamCapacity);
                    return (
                      <option key={t.teamId} value={t.teamId}>
                        {t.teamNo} ({t.members.length}/{t.capacity || teamCapacity} members{isFull ? ' - Full' : ''})
                      </option>
                    );
                  })}
                  <option value="create_new">➕ Create New Team for Candidate</option>
                </select>
              </div>

              {/* Notice if target team is full */}
              {(() => {
                if (newStudentTargetTeam && newStudentTargetTeam !== 'unassigned' && newStudentTargetTeam !== 'create_new') {
                  const selTeam = teams.find(t => t.teamId === newStudentTargetTeam || t.teamNo === newStudentTargetTeam);
                  const isFull = selTeam && selTeam.members.length >= (selTeam.capacity || teamCapacity);
                  if (isFull) {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                        <div className="flex items-center gap-2 font-bold text-amber-800">
                          <AlertCircle size={14} className="shrink-0 text-amber-600" />
                          <span>Team {selTeam?.teamNo} is currently full ({selTeam?.members.length}/{selTeam?.capacity || teamCapacity} members).</span>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              <div className="pt-2 flex items-center justify-between border-t border-[#E2E8E4]">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition cursor-pointer"
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

      {/* POP-UP 3: Move / Assign Student to Another Team */}
      {studentToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-lg rounded-3xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-mint-50/70 via-white to-slate-50 px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-xs">
                  {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned' ? <ArrowRightLeft size={19} /> : <UserPlus size={19} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned' 
                      ? 'Student Team Transfer & Reallocation' 
                      : 'Student Team Allocation'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {studentToMove.name} &bull; Roll No: <span className="font-mono font-bold text-slate-700">{studentToMove.rollNo}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStudentToMove(null);
                  setFullTeamSelected(null);
                  setStudentToReplace(null);
                  setExchangeAction('unassign');
                  setTeamSearchFilter('');
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {moveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2 animate-fadeIn">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{moveError}</span>
                </div>
              )}

              {/* Current Status Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                    Current Allocation
                  </span>
                  {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned' ? (
                    <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-black">
                      {studentToMove.teamNo}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black">
                      Unassigned
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                  <div>
                    <span>Guide: </span>
                    <strong className="text-slate-800">{studentToMove.guide || 'Not Assigned'}</strong>
                  </div>
                  <div>
                    <span>Section: </span>
                    <strong className="text-slate-800">{studentToMove.classSection || className}</strong>
                  </div>
                </div>

                {(() => {
                  const currentTeam = teams.find(t => t.teamNo.toLowerCase() === (studentToMove.teamNo || '').toLowerCase());
                  const isLeader = currentTeam && (currentTeam.leadStudent?.includes(studentToMove.rollNo) || currentTeam.members?.some(m => m.rollNo === studentToMove.rollNo && m.isLead));
                  if (isLeader) {
                    return (
                      <div className="mt-1 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                        <AlertCircle size={13} className="text-amber-600 shrink-0" />
                        <span>Candidate is currently Team Leader. Transferring will automatically promote the next member.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Destination Team Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                    Select Target Team (Capacity: {teamCapacity} Max)
                  </label>
                  <span className="text-[11px] font-bold text-slate-500">
                    {teams.length} Teams Available
                  </span>
                </div>

                {/* Filter Teams */}
                {teams.length > 4 && (
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={teamSearchFilter}
                      onChange={(e) => setTeamSearchFilter(e.target.value)}
                      placeholder="Filter destination teams by number, title, or guide..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800"
                    />
                  </div>
                )}

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {teams
                    .filter(t => {
                      if (!teamSearchFilter.trim()) return true;
                      const q = teamSearchFilter.toLowerCase();
                      return t.teamNo.toLowerCase().includes(q) || 
                             t.guide.toLowerCase().includes(q) || 
                             (t.title && t.title.toLowerCase().includes(q));
                    })
                    .map((t) => {
                      const isCurrent = t.teamNo.toLowerCase() === (studentToMove.teamNo || '').toLowerCase();
                      const currentCount = t.members.length;
                      const maxCap = t.capacity || teamCapacity;
                      const isFull = currentCount >= maxCap;
                      const isSelected = targetTeamId === t.teamId;
                      const openSlots = Math.max(0, maxCap - currentCount);

                      return (
                        <div
                          key={t.teamId}
                          onClick={() => {
                            if (isCurrent) return;
                            if (isFull) {
                              setFullTeamSelected(t);
                              setTargetTeamId(t.teamId);
                              setStudentToReplace(null);
                              setExchangeAction(studentToMove?.teamNo && studentToMove.teamNo !== 'Unassigned' ? 'swap' : 'unassign');
                            } else {
                              setFullTeamSelected(null);
                              setTargetTeamId(t.teamId);
                              setStudentToReplace(null);
                              setExchangeAction('unassign');
                            }
                          }}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                            isCurrent
                              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                              : isFull
                              ? fullTeamSelected?.teamId === t.teamId
                                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/50 cursor-pointer'
                                : 'bg-rose-50/40 border-rose-200 hover:border-amber-300 cursor-pointer'
                              : isSelected
                              ? 'bg-mint-50 border-mint-500 ring-2 ring-mint-400/40 shadow-xs cursor-pointer'
                              : 'bg-white border-[#E2E8E4] hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-xs">{t.teamNo}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[170px]">{t.title || 'Untitled'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Guide: {t.guide}</span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                              isFull 
                                ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                : 'bg-mint-100 text-mint-900 border-mint-200'
                            }`}>
                              {currentCount} / {maxCap}
                            </span>
                            {isFull && <span className="text-[9px] text-rose-600 block mt-0.5 font-bold">Team Full (Click to replace)</span>}
                            {!isFull && !isCurrent && (
                              <span className="text-[9px] text-emerald-700 block mt-0.5 font-medium">
                                {openSlots} open slot{openSlots > 1 ? 's' : ''}
                              </span>
                            )}
                            {isCurrent && <span className="text-[9px] text-slate-400 block mt-0.5 font-bold">Current</span>}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* If selected team is full: show member removal & swap/unassign options */}
                {fullTeamSelected && (
                  <div className="mt-3 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                      <AlertCircle size={15} className="shrink-0 text-amber-600" />
                      <span>{fullTeamSelected.teamNo} is at maximum capacity ({fullTeamSelected.members.length}/{fullTeamSelected.capacity || teamCapacity} members).</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      To add <strong>{studentToMove.name}</strong> to this team, please select which student to remove from <strong>{fullTeamSelected.teamNo}</strong>:
                    </p>

                    {/* Team member selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fullTeamSelected.members.map((m) => {
                        const isSelected = studentToReplace?.rollNo === m.rollNo;
                        return (
                          <button
                            key={m.rollNo}
                            type="button"
                            onClick={() => setStudentToReplace(m)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/50 shadow-2xs'
                                : 'bg-white border-[#E2E8E4] hover:bg-amber-50/50'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-800 text-xs truncate">{m.name}</div>
                              <div className="text-[10px] font-mono text-slate-500">{m.rollNo}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase shrink-0 ${
                              m.isLead ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {m.isLead ? 'Lead' : 'Member'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Once a member is selected to be removed: ask whether to exchange or keep unassigned */}
                    {studentToReplace && (
                      <div className="pt-2.5 border-t border-amber-200 space-y-2 animate-fadeIn">
                        <div className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wider">
                          Action for removed student ({studentToReplace.name}):
                        </div>

                        {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Option A: Exchange Teams */}
                            <div
                              onClick={() => setExchangeAction('swap')}
                              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                                exchangeAction === 'swap'
                                  ? 'bg-mint-50 border-mint-500 ring-2 ring-mint-400/50 text-mint-950 shadow-2xs'
                                  : 'bg-white border-[#E2E8E4] hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-extrabold text-xs mb-1">
                                <ArrowRightLeft size={13} className={exchangeAction === 'swap' ? 'text-mint-700' : 'text-slate-500'} />
                                <span>Exchange Teams (Swap)</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-tight">
                                {studentToReplace.name} moves to <strong>{studentToMove.teamNo}</strong> in exchange for {studentToMove.name}.
                              </p>
                            </div>

                            {/* Option B: Keep Unassigned */}
                            <div
                              onClick={() => setExchangeAction('unassign')}
                              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                                exchangeAction === 'unassign'
                                  ? 'bg-amber-100/90 border-amber-500 ring-2 ring-amber-400/50 text-amber-950 shadow-2xs'
                                  : 'bg-white border-[#E2E8E4] hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-extrabold text-xs mb-1">
                                <AlertCircle size={13} className={exchangeAction === 'unassign' ? 'text-amber-700' : 'text-slate-500'} />
                                <span>Keep Student Unassigned</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-tight">
                                {studentToReplace.name} is removed from {fullTeamSelected.teamNo} and becomes <strong>Unassigned</strong>.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-[11px] text-amber-950 font-bold flex items-center gap-2">
                            <AlertCircle size={14} className="text-amber-700 shrink-0" />
                            <span>
                              {studentToMove.name} replaces <strong>{studentToReplace.name}</strong> in {fullTeamSelected.teamNo}. {studentToReplace.name} will become <strong>Unassigned</strong>.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}


              </div>

              {/* Reallocation Preview */}
              {targetTeamId && (() => {
                const target = teams.find(t => t.teamId === targetTeamId);
                if (!target) return null;
                const isTransfer = studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned';
                const isReplacing = Boolean(fullTeamSelected && studentToReplace);

                if (isReplacing && studentToReplace) {
                  const isSwap = exchangeAction === 'swap' && isTransfer;
                  return (
                    <div className="p-3.5 bg-mint-50/70 rounded-2xl border border-mint-200 space-y-2 animate-fadeIn">
                      <span className="text-[10px] font-black uppercase tracking-wider text-mint-900 block">
                        {isSwap ? 'Student Exchange (Swap) Summary' : 'Student Replacement Summary'}
                      </span>
                      <div className="space-y-1.5 text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8E4] text-[11px]">
                            {studentToMove.name} ({studentToMove.teamNo || 'Unassigned'})
                          </span>
                          <ArrowRight size={13} className="text-mint-600 shrink-0" />
                          <span className="px-2 py-0.5 rounded-md bg-mint-600 text-white text-[11px]">
                            {target.teamNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8E4] text-[11px]">
                            {studentToReplace.name} ({target.teamNo})
                          </span>
                          <ArrowRight size={13} className="text-mint-600 shrink-0" />
                          <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                            isSwap ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {isSwap ? studentToMove.teamNo : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 pt-1 border-t border-mint-200">
                        Assigned Technical Guide for {target.teamNo}: <strong className="text-slate-800">{target.guide}</strong>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-3.5 bg-mint-50/70 rounded-2xl border border-mint-200 space-y-2 animate-fadeIn">
                    <span className="text-[10px] font-black uppercase tracking-wider text-mint-900 block">
                      Transfer &amp; Reallocation Summary
                    </span>
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8E4]">
                        {studentToMove.teamNo || 'Unassigned'}
                      </span>
                      <ArrowRight size={14} className="text-mint-600 shrink-0" />
                      <span className="px-2.5 py-1 rounded-lg bg-mint-600 text-white shadow-2xs">
                        {target.teamNo}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Assigned Technical Guide: <strong className="text-slate-800">{target.guide}</strong></div>
                      <div>Target Capacity After Move: <strong>{target.members.length + 1} / {target.capacity || teamCapacity} members</strong></div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Actions */}
            <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStudentToMove(null);
                  setFullTeamSelected(null);
                  setStudentToReplace(null);
                  setExchangeAction('unassign');
                  setTeamSearchFilter('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetTeamId || isMovingStudent || (Boolean(fullTeamSelected) && !studentToReplace)}
                onClick={handleConfirmMoveStudent}
                className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-sm transition flex items-center gap-1.5 ${
                  targetTeamId && !isMovingStudent && (!fullTeamSelected || Boolean(studentToReplace))
                    ? 'bg-mint-500 hover:bg-mint-600 cursor-pointer active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isMovingStudent ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Reallocation...</span>
                  </>
                ) : fullTeamSelected ? (
                  <>
                    <Check size={14} />
                    <span>
                      {exchangeAction === 'swap' && studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned'
                        ? 'Confirm Student Exchange'
                        : 'Confirm Replacement'}
                    </span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>
                      {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned'
                        ? 'Confirm Team Transfer'
                        : 'Confirm Allocation'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 4: Create Teams Wizard */}
      <AdvisorCreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        className={className}
        batch={batch}
        students={students}
        existingTeamsCount={teams.length}
        onConfirmTeams={handleTeamsCreated}
      />

      {/* POP-UP 5: Manual Team Creation for New / Unassigned Student */}
      <AdvisorManualTeamModal
        isOpen={isManualTeamOpen}
        onClose={() => {
          setIsManualTeamOpen(false);
          setStudentForManualTeam(null);
        }}
        className={className}
        batch={batch}
        advisorName={advisorName}
        initialStudent={studentForManualTeam}
        onTeamCreated={(newTeam) => {
          setIsManualTeamOpen(false);
          setStudentForManualTeam(null);
          refreshData();
          onShowToast(`Team ${newTeam.teamNo} successfully formed and allocated.`);
        }}
        onShowToast={onShowToast}
      />

      {/* POP-UP 6: Faculty Guide Reassignment Modal */}
      <AdvisorGuideReassignModal
        isOpen={isReassignGuideOpen}
        onClose={() => {
          setIsReassignGuideOpen(false);
          setTeamForGuideReassign(null);
        }}
        className={className}
        advisorName={advisorName}
        teams={teams}
        initialTeam={teamForGuideReassign}
        onSuccess={(msg) => {
          refreshData();
          onShowToast(msg);
        }}
      />

      {/* POP-UP 7: Delete Team Modal */}
      <AdvisorDeleteTeamModal
        isOpen={isDeleteTeamOpen}
        onClose={() => {
          setIsDeleteTeamOpen(false);
          setTeamToDelete(null);
        }}
        className={className}
        advisorName={advisorName}
        teams={teams}
        initialTeam={teamToDelete}
        onSuccess={(msg) => {
          refreshData();
          onShowToast(msg);
        }}
      />

    </div>
  );
};

export default AdvisorStudentsView;
