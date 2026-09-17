import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, BookOpen, Award, UserCheck, 
  ChevronRight, ChevronDown, CheckCircle2, AlertCircle, X, Check, UserX, UserPlus,
  FileText, FileCode, Github, ExternalLink, Download, Clock, Sparkles, Crown, 
  Mail, GraduationCap, XCircle, User, Calendar, Layers
} from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdminService, AdminFaculty, AdminStudent } from '../../services/adminService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import { MarksService } from '../../services/marksService';
import { AdvisorSubmissionsService } from '../../services/advisorSubmissionsService';
import { WeeklySubmission } from '../../types';
import { StudentService } from '../../services/studentService';
import AdvisorManualTeamModal from './AdvisorManualTeamModal';

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

  // Change Guide modal
  const [isChangeGuideOpen, setIsChangeGuideOpen] = useState<boolean>(false);
  const [selectedNewGuide, setSelectedNewGuide] = useState<string>('');
  const [guideError, setGuideError] = useState<string>('');

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
    : (teams.find(t => t.teamId === activeTeamId) || (onlyShowStudentTeam ? null : teams[0]));

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
    if (teamSubmissions.length > 0 && !teamSubmissions.some(s => s.week === selectedWeek)) {
      setSelectedWeek(teamSubmissions[0].week);
    }
  }, [activeTeamId, teamSubmissions, selectedWeek]);

  const activeSubmission: WeeklySubmission | undefined = 
    teamSubmissions.find(s => s.week === selectedWeek) || teamSubmissions[0];

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

  const handleConfirmChangeGuide = () => {
    setGuideError('');
    if (!selectedNewGuide || !activeTeam) {
      setGuideError('Please select a faculty guide from the dropdown.');
      return;
    }

    const res = AdvisorService.reassignGuide(className, activeTeam.teamId, selectedNewGuide);
    if (!res.success) {
      setGuideError(res.message);
      return;
    }

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Guide Reassignment',
      activeTeam.teamNo,
      `Reassigned project guide to ${selectedNewGuide}.`,
      advisorName
    );

    setIsChangeGuideOpen(false);
    onShowToast(res.message);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-serif font-semibold text-[#111111]">
              Advisor: {advisorName} &bull; Class {className} Teams
            </h2>
            <span className="text-xs text-[#292725] bg-[#F8F5EE] border border-[#D8CCBA] px-2.5 py-0.5 rounded-full font-medium">
              {teams.length} Teams
            </span>
          </div>
          <p className="text-xs text-[#75695A] mt-0.5">
            Click any team to inspect teammates, week-wise submissions, deliverables, and marks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team, guide, or student..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60 shadow-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh Page"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 1. If onlyShowStudentTeam and student is unassigned -> Show No Teams Assigned and Assign Team option */}
      {isStudentUnassigned ? (
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-xs border border-[#D8CCBA] text-center space-y-4 max-w-xl mx-auto my-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-[#EDE7DB] border border-[#D8CCBA] text-[#8A6A32] flex items-center justify-center mx-auto shadow-xs">
            <UserX size={32} />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase bg-[#F8F5EE] text-[#8A6A32] border border-[#D8CCBA] inline-block mb-2">
              Unassigned Candidate
            </span>
            <h3 className="text-xl font-serif font-semibold text-[#111111]">
              No Teams Assigned
            </h3>
            <p className="text-xs text-[#75695A] mt-1.5 max-w-md mx-auto leading-relaxed">
              Student <strong className="text-[#111111]">{selectedStudent?.name || 'Selected Student'}</strong> {selectedStudent?.rollNo ? `(${selectedStudent.rollNo})` : ''} has not been allocated to any project team in Class {className} yet.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsManualTeamModalOpen(true)}
              className="px-5 py-2.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-medium text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <UserPlus size={16} />
              <span>Assign Team</span>
            </button>

            {onResetFilter && (
              <button
                type="button"
                onClick={onResetFilter}
                className="px-4 py-2.5 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] font-semibold text-xs rounded-xl border border-[#D8CCBA] transition cursor-pointer"
              >
                View All Class Teams ({teams.length})
              </button>
            )}
          </div>
        </div>
      ) : onlyShowStudentTeam && activeTeam ? null : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-xs border border-[#D8CCBA] text-center space-y-4 max-w-xl mx-auto my-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-[#EDE7DB] border border-[#D8CCBA] text-[#111111] flex items-center justify-center mx-auto shadow-xs">
            <Users size={32} />
          </div>
          <div>
            <h3 className="text-xl font-serif font-semibold text-[#111111]">
              {teams.length === 0 ? `No Teams Registered in Class ${className}` : `No Teams Found`}
            </h3>
            <p className="text-xs text-[#75695A] mt-1.5 max-w-md mx-auto leading-relaxed">
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
                className="px-5 py-2.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-medium text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Assign / Create Team</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-5 py-2.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-medium text-xs rounded-xl shadow-xs transition cursor-pointer"
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
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#F8F5EE] border-[#111111] ring-1 ring-[#111111] shadow-xs'
                    : 'bg-white border-[#D8CCBA] hover:bg-[#F8F5EE]/40 hover:border-[#111111]/30 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-xs">
                    {t.teamNo}
                  </span>
                  <span className="text-[11px] font-mono text-[#75695A]">
                    {t.members.length} Members
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-[#111111] text-xs line-clamp-2 leading-snug">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-[#75695A] mt-1 truncate">
                    Lead: <strong className="text-[#292725]">{t.members.find(m => m.isLead)?.name || t.leadStudent}</strong>
                  </p>
                </div>

                <div className="pt-2 border-t border-[#D8CCBA]/70 flex items-center justify-between text-[11px]">
                  <span className="text-[#75695A] font-medium truncate max-w-[130px]">
                    Guide: {t.guide}
                  </span>
                  <span className="text-[#111111] font-semibold flex items-center gap-0.5">
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
          <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-[#D8CCBA] space-y-6">
            
            {/* Team Banner Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CCBA] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-xs">
                    {activeTeam.teamNo}
                  </span>
                  <span className="text-xs text-[#75695A] font-mono font-medium bg-[#F8F5EE] px-2.5 py-0.5 rounded-md border border-[#D8CCBA]">
                    {activeTeam.teamId}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#F8F5EE] text-[#292725] border border-[#D8CCBA] text-[10px] font-bold uppercase">
                    {activeTeam.status}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-serif font-semibold text-[#111111]">
                  {activeTeam.title}
                </h3>
                <p className="text-xs text-[#75695A] mt-0.5">
                  Class {activeTeam.class} &bull; Batch {activeTeam.batch} &bull; Project Technical Guide: <strong className="text-[#292725]">{activeTeam.guide}</strong>
                </p>
              </div>

              {/* Action Buttons: Assign Marks & Change Guide */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNewGuide(activeTeam.guide);
                    setGuideError('');
                    setIsChangeGuideOpen(true);
                  }}
                  className="px-4 py-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] font-semibold text-xs rounded-xl border border-[#D8CCBA] transition cursor-pointer shadow-xs"
                >
                  Change Guide
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToAssignMarks(activeTeam.teamId)}
                  className="px-5 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-medium text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Award size={15} />
                  <span>Assign Marks for {activeTeam.teamNo}</span>
                </button>
              </div>
            </div>

            {/* 1. Comprehensive Details of Team Members */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-bold text-[#75695A] uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={16} className="text-[#111111]" />
                  <span>Team Members &amp; Roster Details ({activeTeam.members.length} Students)</span>
                </h4>
                <span className="text-[11px] text-[#75695A] font-medium">
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
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-xs transition-all ${
                        m.isLead 
                          ? 'bg-[#F8F5EE] border-[#111111] ring-1 ring-[#111111]' 
                          : 'bg-[#F8F5EE]/40 border-[#D8CCBA] hover:bg-[#F8F5EE]/80'
                      }`}
                    >
                      {/* Top row: Avatar + Name & Lead Pill */}
                      <div>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                            m.isLead 
                              ? 'bg-[#111111] text-[#F8F5EE]' 
                              : 'bg-[#EDE7DB] border border-[#D8CCBA] text-[#111111]'
                          }`}>
                            {m.isLead ? <Crown size={17} className="text-[#F8F5EE]" /> : initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className="font-semibold text-[#111111] text-xs truncate" title={m.name}>
                                {m.name}
                              </span>
                              {m.isLead ? (
                                <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[9px] font-bold uppercase tracking-wider shrink-0">
                                  Lead
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-[#F8F5EE] text-[#75695A] border border-[#D8CCBA] text-[9px] font-medium shrink-0">
                                  Member
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#75695A] font-mono block mt-0.5">
                              {m.rollNo}
                            </span>
                          </div>
                        </div>

                        {/* Email & Details */}
                        <div className="mt-3 space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-[#292725] truncate">
                            <Mail size={12} className="text-[#75695A] shrink-0" />
                            <a 
                              href={`mailto:${m.email}`} 
                              className="hover:text-[#111111] hover:underline truncate"
                              title={m.email}
                            >
                              {m.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#75695A]">
                            <GraduationCap size={12} className="text-[#75695A] shrink-0" />
                            <span className="truncate">{activeTeam.batch || batch} &bull; Class {activeTeam.class}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Cumulative Score & Status */}
                      <div className="pt-2.5 border-t border-[#D8CCBA] flex items-center justify-between">
                        <span className="text-[10px] text-[#75695A] font-bold uppercase tracking-wider">
                          Cumulative Mark:
                        </span>
                        {avgScore !== null ? (
                          <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-xs">
                            {avgScore} / 100
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#75695A] italic">
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
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-[#D8CCBA] space-y-6">
            
            {/* Header: Title and Week Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CCBA] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-serif font-semibold text-[#111111] flex items-center gap-2">
                    <Layers size={18} className="text-[#111111]" />
                    <span>Weekly Milestone Submissions &amp; Deliverables</span>
                  </h3>
                  {(() => {
                    const avg = MarksService.getTeamAverage(activeTeam.teamId, selectedWeek);
                    if (avg !== null) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[11px] font-bold flex items-center gap-1">
                          <Award size={12} className="text-[#111111]" />
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
                <label htmlFor="selectAdvisorSprintWeek" className="text-xs font-semibold text-[#75695A] whitespace-nowrap">
                  Milestone Week:
                </label>
                <div className="relative">
                  <select
                    id="selectAdvisorSprintWeek"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    disabled={teamSubmissions.length === 0}
                    className="appearance-none pl-3.5 pr-8 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
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
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap flex items-center gap-2 cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-[#111111] text-[#F8F5EE] shadow-xs font-semibold'
                          : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA]'
                      }`}
                    >
                      <span>Week {s.week}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                        isSelected 
                          ? 'bg-white/20 text-[#F8F5EE]' 
                          : s.status === 'Approved' ? 'bg-[#4A5844]/15 text-[#4A5844] border border-[#4A5844]/20'
                          : s.status === 'Changes Requested' ? 'bg-[#7C3838]/15 text-[#7C3838] border border-[#7C3838]/20'
                          : (s.status === 'Submitted' || s.status === 'Pending') ? 'bg-[#8A6A32]/15 text-[#8A6A32] border border-[#8A6A32]/20'
                          : 'bg-[#EDE7DB] text-[#292725]'
                      }`}>
                        {s.status === 'Submitted' ? 'Pending' : s.status}
                      </span>
                      {weekMarks && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          isSelected ? 'bg-white text-[#111111]' : 'bg-[#EDE7DB] text-[#111111]'
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
                <div className="bg-[#F8F5EE] rounded-2xl p-5 border border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
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
                      className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-medium text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award size={14} />
                      <span>Assign / Update Marks</span>
                    </button>
                  </div>
                </div>

                {/* 2. Guide Evaluation & Remarks Card */}
                <div className="bg-[#F8F5EE] rounded-2xl p-5 border border-[#D8CCBA] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#D8CCBA]/70 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold">
                        <User size={16} />
                      </div>
                      <div>
                        <span className="font-semibold text-[#111111] block text-xs">
                          Technical Evaluation by {activeSubmission.guideName || activeTeam.guide}
                        </span>
                        <span className="text-[10px] text-[#75695A] font-medium">
                          Faculty Project Guide &bull; {activeSubmission.guideReviewDate || 'Reviewed'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSubmission.score !== undefined && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]">
                          Guide Score: {activeSubmission.score} / {activeSubmission.maxScore || 100}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        activeSubmission.status === 'Approved' ? 'bg-[#4A5844]/15 text-[#4A5844] border-[#4A5844]/20' :
                        activeSubmission.status === 'Changes Requested' ? 'bg-[#7C3838]/15 text-[#7C3838] border-[#7C3838]/20' :
                        'bg-[#8A6A32]/15 text-[#8A6A32] border-[#8A6A32]/20'
                      }`}>
                        Guide: {activeSubmission.status === 'Submitted' ? 'Pending' : activeSubmission.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Faculty Guide Critique &amp; Technical Remarks:
                    </span>
                    <p className="text-[#111111] font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#D8CCBA]">
                      {activeSubmission.comments || 'Submission is under active evaluation by the technical project guide.'}
                    </p>
                  </div>
                </div>

                {/* 3. Class Advisor Milestone Marks & Evaluation */}
                <div className="bg-white rounded-2xl p-5 border border-[#D8CCBA] space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#D8CCBA] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                        <Award size={16} />
                      </div>
                      <div>
                        <span className="font-semibold text-[#111111] block text-xs">
                          Advisor Milestone Marks &bull; Week {selectedWeek}
                        </span>
                        <span className="text-[10px] text-[#75695A]">
                          Assigned by Advisor: <strong className="text-[#292725]">{advisorName}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeWeekMarks && (
                        <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] font-bold text-xs border border-[#D8CCBA]">
                          Team Score: {activeWeekMarks.teamAverage} / 100
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateToAssignMarks(activeTeam.teamId)}
                        className="px-3 py-1 rounded-xl bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] font-semibold text-[11px] border border-[#D8CCBA] transition cursor-pointer"
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
                              className="p-3 bg-[#F8F5EE]/60 rounded-xl border border-[#D8CCBA] flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-[#111111] block truncate text-xs">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-[#75695A] font-mono block">
                                  {m.rollNo} {m.isLead ? '• Lead' : ''}
                                </span>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-white border border-[#D8CCBA] text-[#111111] font-bold text-xs shrink-0 shadow-xs">
                                {typeof score === 'number' ? `${score} / 100` : '-- / 100'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {activeWeekMarks.remarks && (
                        <div className="p-3 bg-[#F8F5EE]/60 rounded-xl border border-[#D8CCBA] text-[#111111] text-xs">
                          <span className="font-bold text-[#75695A] uppercase tracking-wider block text-[10px] mb-0.5">
                            Advisor Critique / Remarks:
                          </span>
                          <p className="italic leading-relaxed">&ldquo;{activeWeekMarks.remarks}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] text-center space-y-1.5">
                      <p className="text-xs font-semibold text-[#292725]">
                        Advisor has not yet submitted marks for Week {selectedWeek}.
                      </p>
                      <p className="text-[11px] text-[#75695A]">
                        Click &ldquo;+ Enter Week {selectedWeek} Marks&rdquo; to input individual scores and evaluation critique.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. Complete Student Submission Details */}
                <div className="space-y-4">
                  <h4 className="font-serif font-semibold text-sm text-[#111111] border-b border-[#D8CCBA] pb-2">
                    Complete Student Technical Submission Details
                  </h4>

                  {/* Project Title */}
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Project Title
                    </span>
                    <div className="p-3 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111]">
                      {activeSubmission.projectTitle || activeTeam.title}
                    </div>
                  </div>

                  {/* Problem Statement */}
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Problem Statement
                    </span>
                    {activeSubmission.problemStatement ? (
                      <div className="p-3.5 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs text-[#111111] leading-relaxed">
                        {activeSubmission.problemStatement}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>No problem statement submitted for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* Proposed Solution */}
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Proposed Solution &amp; Technical Approach
                    </span>
                    {activeSubmission.solution ? (
                      <div className="p-3.5 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs text-[#111111] leading-relaxed">
                        {activeSubmission.solution}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>No technical solution submitted for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* Technologies Used */}
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Technologies &amp; Frameworks
                    </span>
                    {activeSubmission.technologyUsed ? (
                      <div className="p-3.5 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl flex flex-wrap gap-2">
                        {activeSubmission.technologyUsed.split(',').map((tech, idx) => (
                          <span 
                            key={idx} 
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#D8CCBA] text-xs font-mono font-semibold text-[#111111] shadow-xs hover:border-[#111111]/40 transition"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>No specific technologies recorded for this week</span>
                      </div>
                    )}
                  </div>

                  {/* Obstacles Faced */}
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Obstacles Faced &amp; Engineering Resolutions
                    </span>
                    {activeSubmission.obstaclesFaced ? (
                      <div className="p-3.5 bg-[#7C3838]/10 border border-[#7C3838]/20 rounded-xl text-xs text-[#111111] leading-relaxed">
                        {activeSubmission.obstaclesFaced}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-[#4A5844]" />
                        <span>No blocking obstacles reported for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* Abstract */}
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Milestone Abstract &amp; Deliverable Summary
                    </span>
                    {activeSubmission.abstract ? (
                      <div className="p-3.5 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs text-[#111111] leading-relaxed">
                        {activeSubmission.abstract}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>No abstract summary provided for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* 5. Deliverables & File Downloads */}
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-2">
                      Milestone Deliverables, Presentations &amp; Repositories
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Presentation PPT */}
                      {activeSubmission.fileName || activeSubmission.presentationFile ? (
                        <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#8A6A32] flex items-center justify-center shrink-0 border border-[#D8CCBA]">
                              <FileText size={18} />
                            </div>
                            <div>
                              <span className="font-semibold text-[#111111] block truncate max-w-[150px]">
                                {activeSubmission.fileName || activeSubmission.presentationFile}
                              </span>
                              <span className="text-[10px] text-[#75695A] font-mono">
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
                            className="px-3 py-1.5 rounded-xl bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#75695A] flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div>
                              <span className="font-medium text-[#75695A] block">Presentation Deck</span>
                              <span className="text-[10px] text-[#75695A]/70">PowerPoint (.pptx)</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#7C3838]/10 text-[#7C3838] border border-[#7C3838]/20 text-[10px] font-semibold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* Technical Report PDF */}
                      {activeSubmission.pdfFile ? (
                        <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#7C3838] flex items-center justify-center shrink-0 border border-[#D8CCBA]">
                              <FileCode size={18} />
                            </div>
                            <div>
                              <span className="font-semibold text-[#111111] block truncate max-w-[150px]">
                                {activeSubmission.pdfFile}
                              </span>
                              <span className="text-[10px] text-[#75695A] font-mono">PDF Technical Dossier</span>
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
                            className="px-3 py-1.5 rounded-xl bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#75695A] flex items-center justify-center shrink-0">
                              <FileCode size={18} />
                            </div>
                            <div>
                              <span className="font-medium text-[#75695A] block">Technical Dossier</span>
                              <span className="text-[10px] text-[#75695A]/70">Report (.pdf)</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#7C3838]/10 text-[#7C3838] border border-[#7C3838]/20 text-[10px] font-semibold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* GitHub Repo Link */}
                      {activeSubmission.repoUrl ? (
                        <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0 border border-[#D8CCBA]">
                              <Github size={18} />
                            </div>
                            <div>
                              <span className="font-semibold text-[#111111] block">Source Code Repository</span>
                              <span className="text-[10px] text-[#75695A] truncate max-w-[150px] block font-mono">
                                {activeSubmission.repoUrl}
                              </span>
                            </div>
                          </div>
                          <a
                            href={activeSubmission.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                          >
                            <ExternalLink size={13} />
                            <span>Open</span>
                          </a>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-[#F8F5EE]/40 border border-dashed border-[#D8CCBA] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#75695A] flex items-center justify-center shrink-0">
                              <Github size={18} />
                            </div>
                            <div>
                              <span className="font-medium text-[#75695A] block">Source Code Repository</span>
                              <span className="text-[10px] text-[#75695A]/70">GitHub Link</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#7C3838]/10 text-[#7C3838] border border-[#7C3838]/20 text-[10px] font-semibold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* Live Demo Link */}
                      {activeSubmission.demoUrl ? (
                        <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
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

      {/* Change Guide Modal */}
      {isChangeGuideOpen && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all">
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-[#111111]">
                    Reassign Project Guide &bull; {activeTeam.teamNo}
                  </h3>
                  <p className="text-[11px] text-[#75695A]">
                    Max 5 teams per guide per class
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChangeGuideOpen(false)}
                className="text-[#75695A] hover:text-[#111111] p-2 rounded-xl hover:bg-[#EDE7DB] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {guideError && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{guideError}</span>
                </div>
              )}

              <div className="p-3 bg-[#F8F5EE] rounded-xl border border-[#D8CCBA]">
                <span className="text-[10px] text-[#75695A] font-bold uppercase block">Current Assigned Guide:</span>
                <span className="font-semibold text-[#111111] block text-xs mt-0.5">{activeTeam.guide}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider mb-1.5">
                  Select New Technical Guide
                </label>
                <select
                  value={selectedNewGuide}
                  onChange={(e) => setSelectedNewGuide(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs cursor-pointer"
                >
                  <option value="">Select Faculty Member...</option>
                  {availableGuides.map((g) => {
                    const assignedCount = AdvisorService.getGuideTeamCount(className, g.name);
                    const isCurrent = activeTeam.guide.toLowerCase() === g.name.toLowerCase();
                    const isMaxedOut = !isCurrent && assignedCount >= 5;

                    return (
                      <option key={g.id} value={g.name} disabled={isMaxedOut}>
                        {g.name} ({assignedCount}/5 teams in class) {isCurrent ? '• [Current]' : isMaxedOut ? '• [MAX 5 REACHED]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsChangeGuideOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#292725] hover:text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmChangeGuide}
                className="px-5 py-2 text-xs font-medium text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Confirm Guide Change</span>
              </button>
            </div>
          </div>
        </div>
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
