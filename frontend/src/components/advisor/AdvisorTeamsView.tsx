import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, BookOpen, Award, UserCheck, 
  ChevronRight, ChevronDown, CheckCircle2, AlertCircle, X, Check, UserX, UserPlus,
  FileText, FileCode, Github, ExternalLink, Download, Clock, Sparkles, Crown, 
  Mail, GraduationCap, XCircle, User, Calendar, Layers, Edit3, Trash2
} from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdminService, AdminFaculty, AdminStudent } from '../../services/adminService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import { MarksService } from '../../services/marksService';
import { AdvisorSubmissionsService } from '../../services/advisorSubmissionsService';
import { WeeklySubmission } from '../../types';
import { StudentService } from '../../services/studentService';
import AdvisorManualTeamModal from './AdvisorManualTeamModal';
import AdvisorEditTeamModal from './AdvisorEditTeamModal';

interface AdvisorTeamsViewProps {
  className: string;
  batch?: string;
  advisorName: string;
  selectedTeamId?: string | null;
  selectedStudent?: AdminStudent | null;
  onlyShowStudentTeam?: boolean;
  onResetFilter?: () => void;
  onSelectTeam: (teamId: string) => void;
  onNavigateToAssignMarks: (teamId: string) => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorTeamsView: React.FC<AdvisorTeamsViewProps> = ({
  className,
  batch = "2023-2027 (III Year)",
  advisorName,
  selectedTeamId,
  selectedStudent,
  onlyShowStudentTeam = false,
  onResetFilter,
  onSelectTeam,
  onNavigateToAssignMarks,
  onShowToast
}) => {
  const [teams, setTeams] = useState<ClassTeam[]>(() => 
    AdvisorService.getTeamsForClass(className)
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected team (defaults to prop selectedTeamId or first team)
  const [activeTeamId, setActiveTeamId] = useState<string>(() => 
    selectedTeamId || teams[0]?.teamId || ''
  );

  // Selected week for week-wise milestone details (1-8)
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Manual Team creation modal
  const [isManualTeamModalOpen, setIsManualTeamModalOpen] = useState<boolean>(false);

  // Edit Team modal
  const [isEditTeamOpen, setIsEditTeamOpen] = useState<boolean>(false);

  // Delete Team confirmation modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  const [, setMarksUpdate] = useState<number>(0);

  useEffect(() => {
    const unsubAdvisor = AdvisorService.subscribe(() => {
      setTeams(AdvisorService.getTeamsForClass(className));
    });
    const unsubMarks = MarksService.subscribe(() => {
      setMarksUpdate(n => n + 1);
    });
    const handleSync = () => {
      setTeams(AdvisorService.getTeamsForClass(className));
      setMarksUpdate(n => n + 1);
    };
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      unsubAdvisor();
      unsubMarks();
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [className]);

  useEffect(() => {
    if (selectedTeamId) {
      setActiveTeamId(selectedTeamId);
    } else if (!activeTeamId && teams.length > 0) {
      setActiveTeamId(teams[0].teamId);
    }
  }, [selectedTeamId, teams, activeTeamId]);

  // Check if current flow is an unassigned student
  const isStudentUnassigned = onlyShowStudentTeam && (
    !selectedTeamId ||
    (selectedStudent && (!selectedStudent.teamNo || selectedStudent.teamNo.toLowerCase() === 'unassigned' || selectedStudent.teamNo.trim() === ''))
  );

  const activeTeam = isStudentUnassigned
    ? null
    : (teams.find(t => 
        t.teamId === activeTeamId || 
        (activeTeamId && t.teamNo.toLowerCase() === activeTeamId.toLowerCase()) ||
        (activeTeamId && t.teamId.toLowerCase() === activeTeamId.toLowerCase())
      ) || (onlyShowStudentTeam ? null : (activeTeamId ? null : teams[0])));

  const filteredTeams = teams.filter(t => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.teamNo.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.guide.toLowerCase().includes(q) ||
      t.members.some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q))
    );
  });

  const availableGuides: AdminFaculty[] = AdminService.getFaculties().filter(
    f => f.role === 'Guide' || f.role === 'Advisor & Guide'
  );

  // Submissions for currently selected active team (Strictly authentic student submissions)
  const teamSubmissions: WeeklySubmission[] = activeTeam 
    ? AdvisorSubmissionsService.getTeamSubmissions(activeTeam)
    : [];

  // Keep selectedWeek aligned with actual submissions when team changes
  useEffect(() => {
    if (teamSubmissions.length > 0) {
      if (!teamSubmissions.some(s => s.week === selectedWeek)) {
        setSelectedWeek(teamSubmissions[0].week);
      }
    }
  }, [activeTeamId, teamSubmissions, selectedWeek]);

  const activeSubmission: WeeklySubmission | undefined = 
    teamSubmissions.length > 0
      ? (teamSubmissions.find(s => s.week === selectedWeek) || teamSubmissions[0])
      : undefined;

  // Marks map for all evaluated weeks of the active team
  const teamMarksMap = activeTeam ? MarksService.getAllTeamMarks(activeTeam.teamId) : {};
  const activeWeekMarks = activeTeam ? MarksService.getWeeklyMarks(activeTeam.teamId, selectedWeek) : null;

  const handleDownloadFile = (fileName: string, fileType: 'ppt' | 'pdf', sub?: WeeklySubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeTeam) return;
    const targetSub = sub || activeSubmission;
    if (!targetSub) return;
    AdvisorSubmissionsService.downloadFile(fileName, fileType, targetSub, activeTeam, advisorName);
    onShowToast(`Downloaded ${fileName}`);
  };

  const handleConfirmDeleteTeam = () => {
    if (!activeTeam) return;
    const teamNoToDelete = activeTeam.teamNo;
    const teamIdToDelete = activeTeam.teamId;

    const res = AdvisorService.deleteTeam(className, teamIdToDelete);
    if (!res.success) {
      onShowToast(res.message);
      return;
    }

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Team Deletion',
      teamNoToDelete,
      `Deleted project team ${teamNoToDelete}. Assigned students reverted to unassigned status.`,
      advisorName,
      'Class Advisor'
    );

    onShowToast(`Team ${teamNoToDelete} was successfully deleted.`);
    setIsDeleteConfirmOpen(false);

    const updatedTeams = AdvisorService.getTeamsForClass(className);
    setTeams(updatedTeams);
    if (updatedTeams.length > 0) {
      setActiveTeamId(updatedTeams[0].teamId);
      onSelectTeam(updatedTeams[0].teamId);
    } else {
      setActiveTeamId('');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Controls Bar (Clean - No big green banner, no approved batch) */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Advisor: {advisorName} &bull; Class {className} Teams
            </h2>
            <span className="text-xs text-mint-800 bg-mint-100 border border-mint-200 px-2.5 py-0.5 rounded-full font-bold">
              {teams.length} Teams
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any team to inspect teammates, week-wise submissions, deliverables, and marks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team, guide, or student..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh Page"
            className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 1. If onlyShowStudentTeam and student is unassigned -> Show No Teams Assigned and Assign Team option */}
      {isStudentUnassigned ? (
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-card border border-[#E2E8E4] text-center space-y-4 max-w-xl mx-auto my-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <UserX size={32} />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-2">
              Unassigned Candidate
            </span>
            <h3 className="text-xl font-black text-slate-900">
              No Teams Assigned
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
              Student <strong>{selectedStudent?.name || 'Selected Student'}</strong> {selectedStudent?.rollNo ? `(${selectedStudent.rollNo})` : ''} has not been allocated to any project team in Class {className} yet.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsManualTeamModalOpen(true)}
              className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <UserPlus size={16} />
              <span>Assign Team</span>
            </button>

            {onResetFilter && (
              <button
                type="button"
                onClick={onResetFilter}
                className="px-4 py-2.5 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 font-bold text-xs rounded-xl border border-[#E2E8E4] transition cursor-pointer"
              >
                View All Class Teams ({teams.length})
              </button>
            )}
          </div>
        </div>
      ) : onlyShowStudentTeam && activeTeam ? null : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-card border border-[#E2E8E4] text-center space-y-4 max-w-xl mx-auto my-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-mint-50 border border-mint-200 text-mint-700 flex items-center justify-center mx-auto shadow-xs">
            <Users size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              {teams.length === 0 ? `No Teams Registered in Class ${className}` : `No Teams Found`}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
              {teams.length === 0
                ? 'No project teams have been registered for this class section yet. You can create a team and assign students manually.'
                : `No project teams match your search term "${searchTerm}". Try searching by a different name, roll number, or guide.`}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            {teams.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsManualTeamModalOpen(true)}
                className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Assign / Create Team</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 3. Grid of All Teams when directly navigated or all teams requested */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredTeams.map((t) => {
            const isSelected = activeTeam?.teamId === t.teamId;

            return (
              <div
                key={t.teamId}
                onClick={() => {
                  setActiveTeamId(t.teamId);
                  onSelectTeam(t.teamId);
                }}
                className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-mint-50/70 border-mint-500 ring-2 ring-mint-400/40 shadow-sm'
                    : 'bg-white border-[#E2E8E4] hover:bg-slate-50 hover:border-mint-300 shadow-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                    {t.teamNo}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {t.members.length} Members
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-snug">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    Lead: <strong className="text-slate-700">{t.members.find(m => m.isLead)?.name || t.leadStudent}</strong>
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E2E8E4]/70 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium truncate max-w-[130px]">
                    Guide: {t.guide}
                  </span>
                  <span className="text-mint-700 font-extrabold flex items-center gap-0.5">
                    <span>View</span>
                    <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Team: Detailed Teammates & Week-Wise Submissions Section */}
      {activeTeam && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Main Selected Team Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-6">
            
            {/* Team Banner Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8E4] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                    {activeTeam.teamNo}
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {activeTeam.teamId}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                    {activeTeam.status}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {activeTeam.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Class {activeTeam.class} &bull; Batch {activeTeam.batch} &bull; Project Technical Guide: <strong>{activeTeam.guide}</strong>
                </p>
              </div>

              {/* Action Buttons: Make Changes, Delete Team, Assign Marks */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditTeamOpen(true)}
                  className="px-4 py-2 bg-white hover:bg-mint-50 text-mint-900 font-extrabold text-xs rounded-xl border border-mint-300 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Edit3 size={14} className="text-mint-700" />
                  <span>Make Changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Trash2 size={14} className="text-rose-600" />
                  <span>Delete Team</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToAssignMarks(activeTeam.teamId)}
                  className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Award size={15} />
                  <span>Assign Marks for {activeTeam.teamNo}</span>
                </button>
              </div>
            </div>

            {/* 1. Comprehensive Details of Team Members */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={16} className="text-mint-600" />
                  <span>Team Members &amp; Roster Details ({activeTeam.members.length} Students)</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Class {activeTeam.class} &bull; {activeTeam.batch}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {activeTeam.members.map((m) => {
                  // Calculate average marks across evaluated weeks for this student
                  const studentEvaluations = Object.values(teamMarksMap)
                    .map(record => record.memberMarks?.[m.rollNo])
                    .filter(val => typeof val === 'number') as number[];

                  const avgScore = studentEvaluations.length > 0
                    ? Math.round((studentEvaluations.reduce((a, b) => a + b, 0) / studentEvaluations.length) * 10) / 10
                    : null;

                  const initials = m.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(w => w[0].toUpperCase())
                    .join('');

                  return (
                    <div 
                      key={m.rollNo}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-2xs transition-all ${
                        m.isLead 
                          ? 'bg-mint-50/70 border-mint-300 ring-1 ring-mint-400/40' 
                          : 'bg-slate-50/90 border-[#E2E8E4] hover:bg-slate-100/70'
                      }`}
                    >
                      {/* Top row: Avatar + Name & Lead Pill */}
                      <div>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                            m.isLead 
                              ? 'bg-mint-500 text-white' 
                              : 'bg-white border border-[#E2E8E4] text-slate-700'
                          }`}>
                            {m.isLead ? <Crown size={17} className="text-white" /> : initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className="font-extrabold text-slate-900 text-xs truncate" title={m.name}>
                                {m.name}
                              </span>
                              {m.isLead ? (
                                <span className="px-2 py-0.5 rounded-md bg-mint-200 text-mint-950 text-[9px] font-black uppercase tracking-wider shrink-0">
                                  Lead
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-600 text-[9px] font-bold shrink-0">
                                  Member
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                              {m.rollNo}
                            </span>
                          </div>
                        </div>

                        {/* Email & Details */}
                        <div className="mt-3 space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 truncate">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <a 
                              href={`mailto:${m.email}`} 
                              className="hover:text-mint-700 hover:underline truncate"
                              title={m.email}
                            >
                              {m.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <GraduationCap size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{activeTeam.batch || batch} &bull; Class {activeTeam.class}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Cumulative Score & Status */}
                      <div className="pt-2.5 border-t border-[#E2E8E4] flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Cumulative Mark:
                        </span>
                        {avgScore !== null ? (
                          <span className="px-2 py-0.5 rounded-md bg-mint-100 text-mint-950 border border-mint-200 font-black text-xs">
                            {avgScore} / 100
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 italic">
                            Pending Grading
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* 2. Comprehensive Week-Wise Submissions Module (Weeks 1 to 8) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-[#E2E8E4] space-y-6">
            
            {/* Header: Title and Week Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8E4] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers size={18} className="text-mint-600" />
                    <span>Weekly Milestone Submissions &amp; Deliverables</span>
                  </h3>
                  {(() => {
                    const avg = MarksService.getTeamAverage(activeTeam.teamId, selectedWeek);
                    if (avg !== null) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[11px] font-black flex items-center gap-1">
                          <Award size={12} className="text-mint-700" />
                          <span>Advisor Score: {avg} / 100</span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Gentle Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="selectAdvisorSprintWeek" className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  Milestone Week:
                </label>
                <div className="relative">
                  <select
                    id="selectAdvisorSprintWeek"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    disabled={teamSubmissions.length === 0}
                    className="appearance-none pl-3.5 pr-8 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-mint-500 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {teamSubmissions.length === 0 ? (
                      <option value="">No submissions available</option>
                    ) : (
                      teamSubmissions.map((s) => (
                        <option key={s.week} value={s.week}>
                          Week {s.week}: {s.title} ({s.status})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Quick Week Pill Buttons (Weeks with Submissions) */}
            {teamSubmissions.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {teamSubmissions.map((s) => {
                  const isSelected = s.week === selectedWeek;
                  const weekMarks = MarksService.getWeeklyMarks(activeTeam.teamId, s.week);

                  return (
                    <button
                      key={s.week}
                      type="button"
                      onClick={() => setSelectedWeek(s.week)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-mint-500 text-white shadow-sm font-extrabold ring-2 ring-mint-400/30'
                          : 'bg-slate-50 hover:bg-mint-50 text-slate-700 border border-[#E2E8E4]'
                      }`}
                    >
                      <span>Week {s.week}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : s.status === 'Approved' ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'Changes Requested' ? 'bg-rose-100 text-rose-800'
                          : (s.status === 'Submitted' || s.status === 'Pending') ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {s.status === 'Submitted' ? 'Pending' : s.status}
                      </span>
                      {weekMarks && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                          isSelected ? 'bg-white text-mint-950' : 'bg-mint-100 text-mint-900'
                        }`}>
                          {weekMarks.teamAverage}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Submissions Details or Empty State */}
            {teamSubmissions.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-50/80 border border-dashed border-slate-300 text-center space-y-3 animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                  <Layers size={24} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-300 mb-2.5 select-none">
                    <Clock size={12} className="text-slate-500" />
                    <span>No Submission</span>
                  </span>
                  <h4 className="text-sm font-black text-slate-800">
                    No Milestone Deliverables Submitted Yet
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    This team has not yet submitted any weekly milestone deliverables. Only authentic submissions made by students will appear here for your review and mark evaluation.
                  </p>
                </div>
              </div>
            ) : activeSubmission ? (
              <div className="space-y-6 pt-1 text-xs">
                
                {/* 1. Milestone Overview Card */}
                <div className="bg-gradient-to-r from-slate-50 via-mint-50/40 to-slate-50 rounded-2xl p-5 border border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-mint-500 text-white font-black text-xs uppercase tracking-wider">
                        Week {activeSubmission.week} Milestone
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase border ${
                        activeSubmission.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        activeSubmission.status === 'Changes Requested' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        (activeSubmission.status === 'Submitted' || activeSubmission.status === 'Pending') ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {activeSubmission.status === 'Submitted' ? 'Pending' : activeSubmission.status}
                      </span>
                      {activeSubmission.submissionDate && (
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          <span>Submitted: {activeSubmission.submissionDate}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900">
                      {activeSubmission.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Due Milestone: <strong>{activeSubmission.dueDate}</strong> &bull; Team: <strong>{activeTeam.teamNo}</strong> ({activeTeam.title})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => onNavigateToAssignMarks(activeTeam.teamId)}
                      className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award size={14} />
                      <span>Assign / Update Marks</span>
                    </button>
                  </div>
                </div>

                {/* 2. Guide Evaluation & Remarks Card */}
                <div className="bg-[#EFF3F1]/90 rounded-2xl p-5 border border-mint-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-mint-200/70 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold">
                        <User size={16} />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block text-xs">
                          Technical Evaluation by {activeSubmission.guideName || activeTeam.guide}
                        </span>
                        <span className="text-[10px] text-mint-700 font-bold">
                          Faculty Project Guide &bull; {activeSubmission.guideReviewDate || 'Reviewed'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSubmission.score !== undefined && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-mint-100 text-mint-950 border border-mint-200">
                          Guide Score: {activeSubmission.score} / {activeSubmission.maxScore || 100}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        activeSubmission.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        activeSubmission.status === 'Changes Requested' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        Guide: {activeSubmission.status === 'Submitted' ? 'Pending' : activeSubmission.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Faculty Guide Critique &amp; Technical Remarks:
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#E2E8E4]">
                      {activeSubmission.comments || 'Submission is under active evaluation by the technical project guide.'}
                    </p>
                  </div>
                </div>

                {/* 3. Class Advisor Milestone Marks & Evaluation */}
                <div className="bg-white rounded-2xl p-5 border border-[#E2E8E4] space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
                        <Award size={16} />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block text-xs">
                          Advisor Milestone Marks &bull; Week {selectedWeek}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Assigned by Advisor: <strong>{advisorName}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeWeekMarks && (
                        <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-950 font-black text-xs border border-mint-200">
                          Team Score: {activeWeekMarks.teamAverage} / 100
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateToAssignMarks(activeTeam.teamId)}
                        className="px-3 py-1 rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-800 font-extrabold text-[11px] border border-mint-200 transition cursor-pointer"
                      >
                        {activeWeekMarks ? 'Edit / Assign Marks' : `+ Enter Week ${selectedWeek} Marks`}
                      </button>
                    </div>
                  </div>

                  {activeWeekMarks ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {activeTeam.members.map((m) => {
                          const score = activeWeekMarks.memberMarks?.[m.rollNo];
                          return (
                            <div 
                              key={m.rollNo}
                              className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E4] flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate text-xs">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {m.rollNo} {m.isLead ? '• Lead' : ''}
                                </span>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-white border border-mint-200 text-mint-950 font-black text-xs shrink-0 shadow-2xs">
                                {typeof score === 'number' ? `${score} / 100` : '-- / 100'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {activeWeekMarks.remarks && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8E4] text-slate-700 text-xs">
                          <span className="font-extrabold text-slate-500 uppercase tracking-wider block text-[10px] mb-0.5">
                            Advisor Critique / Remarks:
                          </span>
                          <p className="italic leading-relaxed">&ldquo;{activeWeekMarks.remarks}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50/70 border border-dashed border-slate-300 text-center space-y-1.5">
                      <p className="text-xs font-bold text-slate-700">
                        Advisor has not yet submitted marks for Week {selectedWeek}.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Click &ldquo;+ Enter Week {selectedWeek} Marks&rdquo; to input individual scores and evaluation critique.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. Complete Student Submission Details */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-900 border-b border-[#E2E8E4] pb-2">
                    Complete Student Technical Submission Details
                  </h4>

                  {/* Project Title */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Project Title
                    </span>
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900">
                      {activeSubmission.projectTitle || activeTeam.title}
                    </div>
                  </div>

                  {/* Problem Statement */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Problem Statement
                    </span>
                    {activeSubmission.problemStatement ? (
                      <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                        {activeSubmission.problemStatement}
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
                    {activeSubmission.solution ? (
                      <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                        {activeSubmission.solution}
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
                    {activeSubmission.technologyUsed ? (
                      <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl flex flex-wrap gap-2">
                        {activeSubmission.technologyUsed.split(',').map((tech, idx) => (
                          <span 
                            key={idx} 
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8E4] text-xs font-mono font-bold text-slate-800 shadow-2xs hover:border-mint-300 transition"
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
                      Obstacles Faced &amp; Engineering Resolutions
                    </span>
                    {activeSubmission.obstaclesFaced ? (
                      <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-xs text-slate-800 leading-relaxed">
                        {activeSubmission.obstaclesFaced}
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
                    {activeSubmission.abstract ? (
                      <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                        {activeSubmission.abstract}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-slate-400" />
                        <span>No abstract summary provided for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* 5. Deliverables & File Downloads */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                      Milestone Deliverables, Presentations &amp; Repositories
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Presentation PPT */}
                      {activeSubmission.fileName || activeSubmission.presentationFile ? (
                        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                                {activeSubmission.fileName || activeSubmission.presentationFile}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {activeSubmission.fileSize || '4.2 MB'} &bull; PowerPoint Deck
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadFile(
                              activeSubmission.fileName || activeSubmission.presentationFile || `Week_${activeSubmission.week}_Presentation.pptx`,
                              'ppt',
                              activeSubmission,
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
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* Technical Report PDF */}
                      {activeSubmission.pdfFile ? (
                        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                              <FileCode size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                                {activeSubmission.pdfFile}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">PDF Technical Dossier</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadFile(
                              activeSubmission.pdfFile || `Week_${activeSubmission.week}_Report.pdf`,
                              'pdf',
                              activeSubmission,
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
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* GitHub Repo Link */}
                      {activeSubmission.repoUrl ? (
                        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                              <Github size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">Source Code Repository</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px] block font-mono">
                                {activeSubmission.repoUrl}
                              </span>
                            </div>
                          </div>
                          <a
                            href={activeSubmission.repoUrl}
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
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* Live Demo Link */}
                      {activeSubmission.demoUrl ? (
                        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                              <ExternalLink size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">Live Demo / Telemetry</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px] block font-mono">
                                {activeSubmission.demoUrl}
                              </span>
                            </div>
                          </div>
                          <a
                            href={activeSubmission.demoUrl}
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
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

              </div>
            ) : null}

          </div>

        </div>
      )}

      {/* Modal: Delete Team Confirmation Dialog */}
      {isDeleteConfirmOpen && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-rose-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Delete Project Team
                  </h3>
                  <p className="text-[11px] text-rose-700 font-bold">
                    Permanent Allocation Removal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-2">
                <span className="font-black text-rose-900 text-sm block">
                  Are you sure you want to delete this team?
                </span>
                <p className="text-slate-600 leading-relaxed text-xs">
                  You are about to delete <strong>{activeTeam.teamNo}</strong> (<em>{activeTeam.title}</em>).
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold text-slate-500">Technical Guide:</span>
                  <span className="font-extrabold">{activeTeam.guide}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold text-slate-500">Team Members ({activeTeam.members.length}):</span>
                  <span className="font-mono font-bold text-mint-900 truncate max-w-[200px]">{activeTeam.members.map(m => m.name).join(', ')}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                * Note: Deleting this team will unassign the students and remove the team grouping. All individual student accounts and institutional records remain completely intact.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTeam}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 size={14} />
                <span>Delete Team</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Make Changes / Edit Team */}
      {isEditTeamOpen && activeTeam && (
        <AdvisorEditTeamModal
          isOpen={isEditTeamOpen}
          onClose={() => setIsEditTeamOpen(false)}
          className={className}
          batch={batch}
          advisorName={advisorName}
          team={activeTeam}
          onTeamUpdated={(updatedTeam) => {
            const updatedTeams = AdvisorService.getTeamsForClass(className);
            setTeams(updatedTeams);
            setActiveTeamId(updatedTeam.teamId);
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Manual Team Creation Modal for Unassigned Students */}
      <AdvisorManualTeamModal
        isOpen={isManualTeamModalOpen}
        onClose={() => setIsManualTeamModalOpen(false)}
        className={className}
        batch={batch}
        advisorName={advisorName}
        initialStudent={selectedStudent}
        onTeamCreated={(newTeam) => {
          setActiveTeamId(newTeam.teamId);
          onSelectTeam(newTeam.teamId);
          if (onResetFilter) {
            onResetFilter();
          }
        }}
        onShowToast={onShowToast}
      />

    </div>
  );
};

export default AdvisorTeamsView;
