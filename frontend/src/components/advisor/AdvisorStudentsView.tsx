import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, RefreshCw, Plus, MoveRight, UserPlus, Sparkles, 
  CheckCircle2, AlertCircle, X, Check, ChevronRight, ChevronDown, Settings,
  School, FileText, FileCode, Github, ExternalLink, Download, XCircle, Award, Eye, Clock
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
  const [students, setStudents] = useState<AdminStudent[]>([]);


  useEffect(()=>{
  const getClassStud = async()=>{
    const res = await AdvisorService.getClassStudents(className,batch);
    setStudents(res);
  };
  getClassStud();
}
,[]);

  const [teams, setTeams] = useState<ClassTeam[]>(() => 
    AdvisorService.getTeamsForClass(className)
  );

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isManageMode, setIsManageMode] = useState<boolean>(false);

  // Student dropdown expansion
  const [expandedStudentRoll, setExpandedStudentRoll] = useState<string | null>(null);

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

  // Live synchronizer: auto-updates if data is changed anywhere across the application
  const refreshData = async () => {
    const res = await AdvisorService.getClassStudents(className, batch);
    setStudents(res);
    setTeams(AdvisorService.getTeamsForClass(className));
  };

  useEffect(() => {
    const unsubAdvisor = AdvisorService.subscribe(refreshData);
    const unsubAdmin = AdminService.subscribe(refreshData);

    const handleStorageChange = () => refreshData();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('siet_data_updated', handleStorageChange);
    window.addEventListener('siet_marks_updated', handleStorageChange);
    window.addEventListener('siet_student_submissions_updated', handleStorageChange);
    window.addEventListener('siet_admin_students_updated', handleStorageChange);

    return () => {
      unsubAdvisor();
      unsubAdmin();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('siet_data_updated', handleStorageChange);
      window.removeEventListener('siet_marks_updated', handleStorageChange);
      window.removeEventListener('siet_student_submissions_updated', handleStorageChange);
      window.removeEventListener('siet_admin_students_updated', handleStorageChange);
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
  };

  // Handle Move / Assign Student Confirm
  const handleConfirmMoveStudent = async () => {
    if (!studentToMove || !targetTeamId) return;
    setMoveError('');

    const targetTeam = teams.find(t => t.teamId === targetTeamId);
    if (!targetTeam) {
      setMoveError('Please select a valid destination team.');
      return;
    }

    const currentTeamNo = studentToMove.teamNo || 'Unassigned';
    const res = await AdvisorService.assignStudentToTeam(className, studentToMove.rollNo, targetTeamId);
    if (!res.success) {
      setMoveError(res.message);
      return;
    }

    AdvisorHistoryService.addLog(
      className,
      'Student Transfer',
      `${studentToMove.name} (${studentToMove.rollNo})`,
      `Shifted allocation from ${currentTeamNo} to ${targetTeam.teamNo}.`,
      advisorName
    );

    onShowToast(`${studentToMove.name} successfully assigned to ${targetTeam.teamNo}.`);
    setStudentToMove(null);
    setTargetTeamId('');
    setFullTeamSelected(null);
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

  // Toggle dropdown row when student is clicked
  const handleStudentRowClick = (student: AdminStudent) => {
    setExpandedStudentRoll(prev => prev === student.rollNo ? null : student.rollNo);
  };

  // Real file download trigger for PPT and PDF
  const handleDownloadFile = (fileName: string, fileType: 'ppt' | 'pdf', sub: WeeklySubmission, team: ClassTeam, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    AdvisorSubmissionsService.downloadFile(fileName, fileType, sub, team, advisorName);
    onShowToast(`Downloaded ${fileName}`);
  };

  // Live metrics that update automatically whenever data changes
  const totalStrength = students.length;
  const assignedTeamsCount = teams.length;
  const unassignedStudentsCount = students.filter(s => !s.teamNo || s.teamNo === 'Unassigned').length;

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
              onClick={() => setIsManageMode(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 border border-[#E2E8E4]"
            >
              <Settings size={14} />
              <span>Manage</span>
            </button>
          )}
        </div>
      </div>

      {/* 2.1. Management Panel when Manage mode is active */}
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

      {/* 3. Students Table with Smooth Expandable Accordion */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Register Number</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Assigned Team</th>
                <th className="p-4">Technical Guide</th>
                {isManageMode && <th className="p-4 text-right">Team Allocation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 5 : 4} className="p-12 text-center text-slate-400">
                    No students found matching current search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const hasTeam = s.teamNo && s.teamNo !== 'Unassigned';
                  const isExpanded = expandedStudentRoll === s.rollNo;

                  // Find assigned team for student
                  let assignedTeam = teams.find(t => 
                    (hasTeam && t.teamNo.toLowerCase() === s.teamNo.toLowerCase()) ||
                    t.members.some(m => m.rollNo === s.rollNo)
                  );
                  if (!assignedTeam) {
                    const studentTeam = StudentService.getTeam();
                    if (studentTeam && studentTeam.members?.some((m: any) => m.rollNo === s.rollNo)) {
                      assignedTeam = {
                        teamId: studentTeam.id || 'TEAM-CSE-Y3-B04',
                        teamNo: studentTeam.teamNo || 'Team 04',
                        class: studentTeam.section || className,
                        batch: studentTeam.batch || batch,
                        title: studentTeam.projectTitle || studentTeam.submittedTitle || '',
                        guide: studentTeam.guideName || s.guide || 'Dr. P. Manimegalai',
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
                        className={`hover:bg-mint-50/40 transition cursor-pointer group select-none ${
                          isExpanded ? 'bg-mint-50/30' : ''
                        }`}
                      >
                        {/* Register Number */}
                        <td className="p-4 font-mono font-bold text-mint-800 whitespace-nowrap">
                          {s.rollNo}
                        </td>

                        {/* Student Name with Expand Chevron */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-extrabold text-slate-900 group-hover:text-mint-800 transition flex items-center gap-2">
                            <span>{s.name}</span>
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-mint-700 transition" />
                            ) : (
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-mint-600 transition" />
                            )}
                          </div>
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

                        {/* Manage Actions (Move / Assign) */}
                        {isManageMode && (
                          <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setStudentToMove(s);
                                setTargetTeamId('');
                                setMoveError('');
                                setFullTeamSelected(null);
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-mint-50 text-mint-800 hover:text-mint-900 border border-mint-300 rounded-xl font-extrabold text-xs transition shadow-2xs flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              {hasTeam ? <MoveRight size={13} /> : <UserPlus size={13} />}
                              <span>{hasTeam ? 'Move' : 'Assign'}</span>
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Smooth Dropdown Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-[#E2E8E4] transition-all duration-500 ease-in-out animate-fadeIn">
                          <td colSpan={isManageMode ? 5 : 4} className="p-0">
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
                                  <div className="text-[11px] text-slate-500 font-bold">
                                    Technical Guide: <strong className="text-slate-800">{assignedTeam?.guide || s.guide || 'Unassigned'}</strong>
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
                          </td>
                        </tr>
                      )}
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
                  
                  {/* Presentation PPT */}
                  {inspectionSubmission.sub.fileName || inspectionSubmission.sub.presentationFile ? (
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                            {inspectionSubmission.sub.fileName || inspectionSubmission.sub.presentationFile}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">PowerPoint Deck</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(
                          inspectionSubmission.sub.fileName || inspectionSubmission.sub.presentationFile || `Submission_${inspectionSubmission.sub.week + 1}_Deck.pptx`,
                          'ppt',
                          inspectionSubmission.sub,
                          inspectionSubmission.team,
                          e
                        )}
                        className="px-3 py-1.5 rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-dashed border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 block">Presentation Deck</span>
                          <span className="text-[10px] text-slate-400">PowerPoint (.pptx)</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                        ✕ Not Uploaded
                      </span>
                    </div>
                  )}

                  {/* Technical Report PDF */}
                  {inspectionSubmission.sub.pdfFile ? (
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                          <FileCode size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                            {inspectionSubmission.sub.pdfFile}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">PDF Technical Dossier</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(
                          inspectionSubmission.sub.pdfFile || `Submission_${inspectionSubmission.sub.week + 1}_Report.pdf`,
                          'pdf',
                          inspectionSubmission.sub,
                          inspectionSubmission.team,
                          e
                        )}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-dashed border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <FileCode size={18} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 block">Technical Dossier</span>
                          <span className="text-[10px] text-slate-400">Report (.pdf)</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                        ✕ Not Uploaded
                      </span>
                    </div>
                  )}

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

              {/* Screenshot Preview if Available */}
              {inspectionSubmission.sub.screenshotFile && (
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    Implementation Screenshot / Proof of Work
                  </span>
                  <div className="p-2 rounded-2xl bg-slate-50 border border-[#E2E8E4] flex items-center justify-center">
                    <img 
                      src={inspectionSubmission.sub.screenshotFile} 
                      alt="Deliverable Screenshot" 
                      className="max-h-64 rounded-xl border border-slate-200 object-contain shadow-xs" 
                    />
                  </div>
                </div>
              )}

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
            className="bg-white w-full max-w-md rounded-3xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
                  {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned' ? <MoveRight size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned' ? 'Shift Student Team' : 'Assign Student Team'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {studentToMove.name} ({studentToMove.rollNo})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStudentToMove(null);
                  setFullTeamSelected(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
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
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Status:</span>
                <span className="font-extrabold text-slate-900 block text-xs">
                  {studentToMove.teamNo && studentToMove.teamNo !== 'Unassigned' ? studentToMove.teamNo : 'Unassigned'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Select Destination Team (Max Capacity: {teamCapacity} Members)
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                          if (isCurrent) return;
                          if (isFull) {
                            setFullTeamSelected(t);
                            setTargetTeamId('');
                          } else {
                            setFullTeamSelected(null);
                            setTargetTeamId(t.teamId);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : isFull
                            ? fullTeamSelected?.teamId === t.teamId
                              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/50 cursor-pointer'
                              : 'bg-rose-50/50 border-rose-200 hover:border-amber-300 cursor-pointer'
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

                {/* If selected team is full, allow direct creation of a new team */}
                {fullTeamSelected && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertCircle size={15} className="shrink-0 text-amber-600" />
                      <span>{fullTeamSelected.teamNo} is at maximum capacity ({fullTeamSelected.members.length}/{fullTeamSelected.capacity || teamCapacity} members).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const student = studentToMove;
                        setStudentToMove(null);
                        setFullTeamSelected(null);
                        setStudentForManualTeam(student);
                        setIsManualTeamOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>Create New Team for {studentToMove.name}</span>
                    </button>
                  </div>
                )}

                {/* Option to create new team instead of selecting existing */}
                <div className="pt-3 border-t border-[#E2E8E4] mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const student = studentToMove;
                      setStudentToMove(null);
                      setFullTeamSelected(null);
                      setStudentForManualTeam(student);
                      setIsManualTeamOpen(true);
                    }}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-mint-50 text-mint-900 font-bold border border-mint-200 border-dashed rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                  >
                    <Plus size={14} className="text-mint-600" />
                    <span>Or Create New Team Instead</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStudentToMove(null);
                  setFullTeamSelected(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetTeamId}
                onClick={handleConfirmMoveStudent}
                className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-sm transition flex items-center gap-1.5 ${
                  targetTeamId
                    ? 'bg-mint-500 hover:bg-mint-600 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Check size={14} />
                <span>Confirm Assignment</span>
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
          onShowToast(`Team ${newTeam.teamNo} successfully formed and allocated.`);
        }}
        onShowToast={onShowToast}
      />

    </div>
  );
};

export default AdvisorStudentsView;
