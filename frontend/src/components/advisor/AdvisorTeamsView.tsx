import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, BookOpen, Award, CheckCircle2, 
  AlertCircle, ChevronDown, Check, UserX, UserPlus,
  FileText, FileCode, Github, ExternalLink, Download, Clock,
  ShieldCheck, AlertTriangle, Compass, Image as ImageIcon,
  XCircle, Edit3, X
} from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdminService, AdminFaculty, AdminStudent } from '../../services/adminService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import { MarksService } from '../../services/marksService';
import { AdvisorSubmissionsService } from '../../services/advisorSubmissionsService';
import { WeeklySubmission } from '../../types';
import { StudentService } from '../../services/studentService';
import { getUserInitials } from '../../services/authService';
import AdvisorManualTeamModal from './AdvisorManualTeamModal';

interface AdvisorTeamsViewProps {
  className: string;
  batch?: string;
  advisorName: string;
  selectedTeamId?: string | null;
  selectedStudent?: AdminStudent | null;
  onlyShowStudentTeam?: boolean;
  onResetFilter?: () => void;
  onSelectTeam?: (teamId: string) => void;
  onNavigateToAssignMarks?: (teamId: string) => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorTeamsView: React.FC<AdvisorTeamsViewProps> = ({
  className,
  batch = "2023-2027 (III Year)",
  advisorName,
  selectedTeamId: initialSelectedTeamId,
  selectedStudent,
  onlyShowStudentTeam = false,
  onResetFilter,
  onSelectTeam,
  onShowToast
}) => {
  const [teams, setTeams] = useState<ClassTeam[]>(() => 
    AdvisorService.getTeamsForClass(className)
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected team state (null initially unless pre-selected from navigation)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    if (initialSelectedTeamId) return initialSelectedTeamId;
    if (selectedStudent && selectedStudent.teamNo && selectedStudent.teamNo.toLowerCase() !== 'unassigned') {
      const match = teams.find(t => 
        t.teamNo.toLowerCase() === selectedStudent.teamNo.toLowerCase() ||
        t.members.some(m => m.rollNo === selectedStudent.rollNo)
      );
      if (match) return match.teamId;
    }
    return null;
  });

  const [selectedTeamOnly, setSelectedTeamOnly] = useState<boolean>(
    Boolean(initialSelectedTeamId || onlyShowStudentTeam)
  );

  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();

  // Selected sprint week for milestone details
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return StudentService.getCurrentAcademicWeek();
  });

  // Assign Marks modal state (triggers the evaluation flow directly in View Teams)
  const [isMarksModalOpen, setIsMarksModalOpen] = useState<boolean>(false);
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [advisorRemarks, setAdvisorRemarks] = useState<string>('');
  const [marksError, setMarksError] = useState<string>('');

  // Manual Team creation modal
  const [isManualTeamModalOpen, setIsManualTeamModalOpen] = useState<boolean>(false);

  // Change Guide modal
  const [isChangeGuideOpen, setIsChangeGuideOpen] = useState<boolean>(false);
  const [selectedNewGuide, setSelectedNewGuide] = useState<string>('');
  const [guideError, setGuideError] = useState<string>('');

  const [, setMarksUpdate] = useState<number>(0);

  // Listeners for cross-portal reactivity
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

  // Sync props when student or team is selected from parent
  useEffect(() => {
    if (initialSelectedTeamId) {
      setSelectedTeamId(initialSelectedTeamId);
      setSelectedTeamOnly(true);
    } else if (selectedStudent) {
      if (selectedStudent.teamNo && selectedStudent.teamNo.toLowerCase() !== 'unassigned') {
        const match = teams.find(t => 
          t.teamNo.toLowerCase() === selectedStudent.teamNo.toLowerCase() ||
          t.members.some(m => m.rollNo === selectedStudent.rollNo)
        );
        if (match) {
          setSelectedTeamId(match.teamId);
          setSelectedTeamOnly(true);
        }
      } else {
        setSelectedTeamId(null);
        setSelectedTeamOnly(true);
      }
    }
  }, [initialSelectedTeamId, selectedStudent, teams]);

  // Check if current view is for an unassigned candidate
  const isStudentUnassigned = onlyShowStudentTeam && (
    !selectedTeamId &&
    selectedStudent &&
    (!selectedStudent.teamNo || selectedStudent.teamNo.toLowerCase() === 'unassigned' || selectedStudent.teamNo.trim() === '')
  );

  // Active selected team
  const activeTeam = selectedTeamId
    ? (teams.find(t => t.teamId === selectedTeamId) || null)
    : null;

  // Filtered teams list based on search term
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

  // Displayed teams in the grid: if a team is clicked, do not show the remaining teams
  const displayedTeams = selectedTeamOnly && selectedTeamId
    ? filteredTeams.filter(t => t.teamId === selectedTeamId)
    : filteredTeams;

  // Active team members roll numbers for precise marks lookup
  const activeMemberRollNos = activeTeam?.members?.map(m => m.rollNo) || [];
  const activeTeamMarks = activeTeam ? MarksService.getAllTeamMarks(activeTeam.teamId, activeMemberRollNos) : {};
  const gradedWeeks = Object.keys(activeTeamMarks).map(Number);

  // Submissions for currently selected active team (Strictly authentic student submissions)
  const teamSubmissions: WeeklySubmission[] = activeTeam 
    ? AdvisorSubmissionsService.getTeamSubmissions(activeTeam)
    : [];
  const submissionWeeks = teamSubmissions.map(s => s.week);

  // Highest evaluated or active week (ensures evaluated weeks like Week 1 are selectable in dropdown)
  const maxEvaluatedOrActiveWeek = Math.max(
    currentAcademicWeek,
    ...gradedWeeks,
    ...submissionWeeks
  );

  // Available weeks from 0 up to max evaluated/active week (no next/future unstarted weeks)
  const availableWeeks = Array.from({ length: Math.max(1, maxEvaluatedOrActiveWeek + 1) }, (_, i) => i);

  // Active submission strictly for the selected week
  const activeSubmission: WeeklySubmission | undefined = teamSubmissions.find(s => s.week === selectedWeek);

  // Automatically align selectedWeek with the latest evaluated week when activeTeam changes
  useEffect(() => {
    if (!activeTeam) return;
    const mRolls = activeTeam.members?.map(m => m.rollNo) || [];
    const tMarks = MarksService.getAllTeamMarks(activeTeam.teamId, mRolls);
    const weeksWithPositiveMarks = Object.keys(tMarks)
      .map(Number)
      .filter(w => tMarks[w]?.teamAverage > 0);

    if (weeksWithPositiveMarks.length > 0) {
      const highestEvaluated = Math.max(...weeksWithPositiveMarks);
      setSelectedWeek(highestEvaluated);
    } else if (teamSubmissions.length > 0) {
      setSelectedWeek(Math.max(...teamSubmissions.map(s => s.week)));
    } else {
      setSelectedWeek(currentAcademicWeek);
    }
  }, [activeTeam?.teamId]);

  // Prepopulate marks modal inputs when opened or active week changes
  useEffect(() => {
    if (!activeTeam) return;
    const existing = MarksService.getWeeklyMarks(activeTeam.teamId, selectedWeek, activeMemberRollNos);
    const initialInputs: Record<string, string> = {};
    activeTeam.members.forEach(m => {
      if (existing && existing.memberMarks[m.rollNo] !== undefined) {
        initialInputs[m.rollNo] = String(existing.memberMarks[m.rollNo]);
      } else {
        initialInputs[m.rollNo] = '';
      }
    });
    setMarksInput(initialInputs);
    setAdvisorRemarks(existing?.remarks || '');
    setMarksError('');
  }, [activeTeam?.teamId, selectedWeek, isMarksModalOpen]);

  // Live team average calculation for modal
  const liveAverageScore = (() => {
    const values = Object.values(marksInput)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 0 && v <= 100);
    if (values.length === 0) return null;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / values.length) * 10) / 10;
  })();

  const handleSaveMarks = (e: React.FormEvent) => {
    e.preventDefault();
    setMarksError('');

    if (!activeTeam) return;

    const parsedMarks: Record<string, number> = {};
    for (const m of activeTeam.members) {
      const raw = marksInput[m.rollNo];
      if (raw === undefined || raw === '') {
        setMarksError(`Please enter marks for ${m.name} (${m.rollNo}).`);
        return;
      }
      const num = parseFloat(raw);
      if (isNaN(num) || num < 0 || num > 100) {
        setMarksError(`Marks for ${m.name} must be a number between 0 and 100.`);
        return;
      }
      parsedMarks[m.rollNo] = num;
    }

    const record = MarksService.saveWeeklyMarks(
      activeTeam.teamId,
      selectedWeek,
      parsedMarks,
      advisorRemarks,
      advisorName
    );

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Marks Evaluation',
      `${activeTeam.teamNo} (Week ${selectedWeek})`,
      `Evaluated individual marks for ${activeTeam.members.length} students. Calculated Team Average: ${record.teamAverage}/100.`,
      advisorName
    );

    setIsMarksModalOpen(false);
    onShowToast(`Successfully saved Week ${selectedWeek} marks for ${activeTeam.teamNo} (Average: ${record.teamAverage}/100).`);
  };

  const handleDownloadFile = (fileName: string, fileType: 'ppt' | 'pdf', sub?: WeeklySubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeTeam) return;
    const targetSub = sub || activeSubmission;
    if (!targetSub) return;
    AdvisorSubmissionsService.downloadFile(fileName, fileType, targetSub, activeTeam, advisorName);
    onShowToast(`Downloaded ${fileName}`);
  };

  const availableGuides: AdminFaculty[] = AdminService.getFaculties().filter(
    f => f.role === 'Guide' || f.role === 'Advisor & Guide'
  );

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
      
      {/* 1. Filter and Search Controls Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-card border border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-mint-100 text-mint-900 flex items-center justify-center font-bold">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Class {className} Capstone Teams
            </h2>
            <p className="text-[11px] text-slate-500">
              Advisor: <strong>{advisorName}</strong> &bull; Batch {batch}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate, roll no, or title..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
          </div>

          {/* Refresh Button - resets selection and restores all teams */}
          <button
            type="button"
            onClick={() => {
              setSelectedTeamId(null);
              setSelectedTeamOnly(false);
              setSearchTerm('');
              if (onResetFilter) onResetFilter();
            }}
            title="Refresh and show all teams"
            className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
            aria-label="Refresh and show all teams"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 2. Unassigned Student Notification Card (if routed from an unassigned student click) */}
      {isStudentUnassigned && (
        <div className="bg-white rounded-3xl p-8 shadow-card border border-[#E2E8E4] text-center space-y-4 max-w-xl mx-auto my-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <UserX size={32} />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-2">
              Unassigned Candidate
            </span>
            <h3 className="text-xl font-black text-slate-900">
              No Team or Guide Assigned
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
              Student <strong>{selectedStudent?.name || 'Selected Student'}</strong> {selectedStudent?.rollNo ? `(${selectedStudent.rollNo})` : ''} has not been allocated to any project team or Technical Guide in Class {className} yet.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsManualTeamModalOpen(true)}
              className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <BookOpen size={16} />
              <span>Assign Guide &amp; Team</span>
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
      )}

      {/* 3. Teams in Class Section */}
      {!isStudentUnassigned && (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {selectedTeamOnly && selectedTeamId ? 'Selected Team' : `Teams in Class ${className}`}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-black">
                {displayedTeams.length} {displayedTeams.length === 1 ? 'Team' : 'Teams'}
              </span>
            </div>
            {selectedTeamOnly && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamOnly(false);
                  if (onResetFilter) onResetFilter();
                }}
                className="text-xs font-bold text-mint-700 hover:text-mint-800 underline cursor-pointer"
              >
                Show all teams
              </button>
            )}
          </div>

          {displayedTeams.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No teams found matching &ldquo;{searchTerm}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedTeams.map((team) => {
                const isSelected = activeTeam?.teamId === team.teamId;
                const leadMember = team.members.find(m => m.isLead) || team.members[0];

                return (
                  <button
                    key={team.teamId}
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(team.teamId);
                      setSelectedTeamOnly(true);
                      if (onSelectTeam) onSelectTeam(team.teamId);

                      // Select latest week with evaluated marks
                      const mRolls = team.members?.map(m => m.rollNo) || [];
                      const tMarks = MarksService.getAllTeamMarks(team.teamId, mRolls);
                      const weeksWithPositiveMarks = Object.keys(tMarks)
                        .map(Number)
                        .filter(w => tMarks[w]?.teamAverage > 0);

                      if (weeksWithPositiveMarks.length > 0) {
                        setSelectedWeek(Math.max(...weeksWithPositiveMarks));
                      } else {
                        setSelectedWeek(currentAcademicWeek);
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-mint-50/80 border-mint-500 shadow-sm ring-2 ring-mint-400/40'
                        : 'bg-white border-[#E2E8E4] hover:border-mint-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 text-xs font-black">
                        {team.teamNo}
                      </span>
                      <span className={`text-[11px] font-extrabold ${
                        team.status.includes('Approved') ? 'text-emerald-700' :
                        team.status.includes('Review') ? 'text-amber-700' : 'text-slate-600'
                      }`}>
                        {team.status.includes('Approved') ? 'Approved' : team.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs line-clamp-1">
                        {team.title || (
                          <span className="text-slate-400 italic font-normal">No Title Submitted</span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Lead: {leadMember?.name || 'Student'} ({leadMember?.rollNo})
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Selected Team Details & Submissions View (Matching HOD Flow) */}
      {activeTeam && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* 4.1. Team Header & Members Merged Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                    {activeTeam.teamNo}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {activeTeam.title || (
                    <span className="text-slate-400 italic font-normal">No Project Title Submitted</span>
                  )}
                </h2>
                <span className="text-xs text-slate-500 block">
                  Batch: {activeTeam.batch}
                </span>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className={`text-sm font-extrabold ${
                    activeTeam.status.includes('Approved') ? 'text-emerald-700' :
                    activeTeam.status.includes('Review') ? 'text-amber-700' : 'text-slate-600'
                  }`}>
                    {activeTeam.status.includes('Approved') ? 'Approved' : activeTeam.status}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>

            {/* Advisor & Guide quick summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Compass size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Designated Class Advisor</span>
                  <span className="font-extrabold text-slate-900 block">{advisorName}</span>
                  <span className="text-[10px] text-slate-500">Class {className} Advisor</span>
                </div>
              </div>

              <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-900 flex items-center justify-center shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Project Technical Guide</span>
                    <span className="font-extrabold text-slate-900 block">{activeTeam.guide}</span>
                    <span className="text-[10px] text-slate-500">{activeTeam.guideEmail || 'Faculty Guide'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedNewGuide(activeTeam.guide);
                    setIsChangeGuideOpen(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-mint-700 hover:text-mint-800 bg-white border border-[#E2E8E4] hover:border-mint-300 rounded-lg shadow-2xs transition cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Team Members */}
            <div className="pt-3 border-t border-[#E2E8E4] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-mint-100 text-mint-900 flex items-center justify-center font-bold">
                    <Users size={14} />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Team Members ({activeTeam.members?.length || 0})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeTeam.members?.map((m) => (
                  <div key={m.rollNo} className="p-3.5 rounded-2xl bg-[#EFF3F1]/70 border border-[#E2E8E4] flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {getUserInitials(m.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs truncate">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                            {m.rollNo}
                          </div>
                        </div>
                      </div>
                      {m.isLead && (
                        <span className="px-1.5 py-0.5 rounded bg-mint-100 text-mint-900 border border-mint-200 text-[9px] font-black uppercase shrink-0">
                          Lead
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate pt-2 border-t border-[#E2E8E4]/60 font-mono">
                      {m.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4.2. Week-Wise Milestone Assessment & Deliverables Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-6 animate-fadeIn">
            
            {/* Milestone Week Dropdown (Left side alone, only weeks up to evaluated/current week) */}
            <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-4 gap-3">
              <div className="flex items-center gap-3">
                <label htmlFor="advisorMilestoneWeekSelect" className="text-xs font-extrabold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  Select Milestone Week:
                </label>
                <select
                  id="advisorMilestoneWeekSelect"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="px-3.5 py-1.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-mint-500 cursor-pointer shadow-2xs"
                >
                  {availableWeeks.map((w) => {
                    const wMarks = activeTeamMarks[w];
                    const hasMarks = wMarks && wMarks.teamAverage > 0;
                    return (
                      <option key={w} value={w}>
                        Week {w}{hasMarks ? ` — Evaluated (${wMarks.teamAverage}/100)` : (w === currentAcademicWeek ? ' (Current Week)' : '')}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Assign / Edit Marks Action Button */}
              <button
                type="button"
                onClick={() => setIsMarksModalOpen(true)}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Award size={14} />
                <span>{activeTeamMarks[selectedWeek]?.teamAverage > 0 ? 'Edit Marks' : 'Assign Marks'}</span>
              </button>
            </div>

            {/* MARKS ASSIGNED BY CLASS ADVISOR (Shown First At The Top of the Week View) */}
            <div className="space-y-3">
              {(() => {
                const marks = MarksService.getWeeklyMarks(activeTeam.teamId, selectedWeek, activeMemberRollNos);

                const isBlankZeroRecord = marks && marks.teamAverage === 0 && 
                  (!marks.remarks || marks.remarks.trim() === '') && 
                  Object.values(marks.memberMarks || {}).every(v => v === 0);

                if (!marks || isBlankZeroRecord) {
                  return (
                    <div className="p-6 rounded-2xl bg-slate-50/80 border border-dashed border-slate-300 text-center space-y-2">
                      <p className="text-xs font-bold text-slate-700">
                        You ({advisorName}) have not assigned marks for Week {selectedWeek} yet.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Click below to enter individual student scores and technical milestone remarks.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMarksModalOpen(true)}
                        className="mt-1 px-4 py-1.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Award size={13} />
                        <span>Assign Week {selectedWeek} Marks</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Team Milestone Assessment Score Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50 via-emerald-50 to-teal-50 border border-mint-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-[10px] text-mint-800 font-extrabold uppercase tracking-wider block">
                          Team Milestone Assessment Score &bull; Week {selectedWeek}
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                          Team Score: <span className="text-mint-800">{marks.teamAverage}</span> / 100
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Evaluated by <strong>{marks.gradedBy || advisorName}</strong>
                          {marks.gradedAt && ` on ${new Date(marks.gradedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMarksModalOpen(true)}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-mint-300 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                      >
                        <Edit3 size={13} className="text-mint-700" />
                        <span>Update Evaluation</span>
                      </button>
                    </div>

                    {/* Individual Student Marks Grid */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Individual Student Marks ({activeTeam.members?.length || 0} Students):
                      </span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {activeTeam.members?.map((m) => {
                          const score = marks.memberMarks?.[m.rollNo];
                          return (
                            <div
                              key={m.rollNo}
                              className="p-3 bg-white rounded-xl border border-[#E2E8E4] flex items-center justify-between shadow-2xs"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-extrabold text-slate-900 text-xs truncate">
                                  {m.name}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {m.rollNo}
                                </span>
                              </div>

                              <span className="px-2 py-1 rounded-lg bg-mint-100 text-mint-950 font-black text-xs border border-mint-200 shrink-0">
                                {typeof score === 'number' ? `${score} / 100` : '-- / 100'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Advisor Evaluation Remarks */}
                    {marks.remarks && (
                      <div className="p-3.5 bg-white rounded-xl border border-[#E2E8E4] text-xs space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          Class Advisor Evaluation Critique &amp; Remarks:
                        </span>
                        <p className="text-slate-800 font-medium italic leading-relaxed">
                          &ldquo;{marks.remarks}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* SUBMITTED DELIVERABLES (Shown According to Clicked Week) */}
            <div className="border-t border-[#E2E8E4] pt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Submitted Deliverables &bull; Week {selectedWeek}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Milestone work submitted by students for evaluation
                    </span>
                  </div>
                </div>

                {activeSubmission && (
                  <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <span className="text-xs text-slate-500 font-medium">
                      Submitted Date: <strong className="text-slate-800 font-bold">{activeSubmission.submissionDate || 'N/A'}</strong>
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                      activeSubmission.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected' ? 'Revision Requested / Rejected' : activeSubmission.status}
                    </span>
                  </div>
                )}
              </div>

              {activeSubmission ? (
                <div className="space-y-4 pt-1 text-xs">
                  
                  {/* Guide Review & Approval/Rejection with Reason Banner */}
                  <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                    activeSubmission.status === 'Approved'
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected'
                      ? 'bg-rose-50/80 border-rose-200'
                      : 'bg-amber-50/80 border-amber-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          activeSubmission.status === 'Approved'
                            ? 'bg-emerald-600'
                            : activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected'
                            ? 'bg-rose-600'
                            : 'bg-amber-600'
                        }`} />
                        <span className={`font-extrabold uppercase text-[11px] tracking-wide ${
                          activeSubmission.status === 'Approved'
                            ? 'text-emerald-900'
                            : activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected'
                            ? 'text-rose-900'
                            : 'text-amber-900'
                        }`}>
                          {activeSubmission.status === 'Approved'
                            ? 'Approved by Project Technical Guide'
                            : activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected'
                            ? 'Rejected / Revision Required by Guide'
                            : 'Awaiting Technical Guide Evaluation'}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-500 font-medium">
                        Guide: <strong className="text-slate-800">{activeSubmission.guideName || activeTeam.guide}</strong>
                      </span>
                    </div>

                    {(activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected') ? (
                      <div className="p-3 bg-white rounded-xl border border-rose-200 text-rose-950 font-medium space-y-1">
                        <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider block">
                          Guide Rejection Reason &bull; Feedback:
                        </span>
                        <p className="leading-relaxed italic">
                          &ldquo;{activeSubmission.comments || 'Guide has requested technical revisions on the submitted milestone deliverables before approval.'}&rdquo;
                        </p>
                      </div>
                    ) : activeSubmission.status === 'Approved' ? (
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 text-emerald-950 font-medium space-y-1">
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                          Guide Endorsement &bull; Remarks:
                        </span>
                        <p className="leading-relaxed">
                          {activeSubmission.comments || 'Deliverables verified, technical progress validated, and approved.'}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-amber-200 text-amber-900 font-medium">
                        <p className="text-[11px]">
                          Milestone work has been received and is awaiting review and evaluation from {activeSubmission.guideName || activeTeam.guide}.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Student Deliverables Form Details */}
                  <div className="space-y-3">
                    {/* Project Title */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Project Title
                      </span>
                      <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900">
                        {activeSubmission.projectTitle || activeTeam.title || (
                          <span className="text-slate-400 italic font-normal">No Project Title Specified</span>
                        )}
                      </div>
                    </div>

                    {/* Problem Statement */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Problem Statement
                      </span>
                      {activeSubmission.problemStatement ? (
                        <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                          {activeSubmission.problemStatement}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-400" />
                          <span>Not Uploaded / No Problem Statement submitted for this milestone</span>
                        </div>
                      )}
                    </div>

                    {/* Proposed Solution */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Proposed Solution &amp; Technical Approach
                      </span>
                      {activeSubmission.solution ? (
                        <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                          {activeSubmission.solution}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-400" />
                          <span>Not Uploaded / No Technical Solution submitted for this milestone</span>
                        </div>
                      )}
                    </div>

                    {/* Technologies Used */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Technologies Used
                      </span>
                      {activeSubmission.technologyUsed ? (
                        <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 font-mono font-bold">
                          {activeSubmission.technologyUsed}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-400" />
                          <span>Not Uploaded / No Technologies specified</span>
                        </div>
                      )}
                    </div>

                    {/* Obstacles Faced */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Obstacles Faced
                      </span>
                      {activeSubmission.obstaclesFaced ? (
                        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-slate-800 leading-relaxed">
                          {activeSubmission.obstaclesFaced}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-400" />
                          <span>Not Uploaded / No Obstacles Reported</span>
                        </div>
                      )}
                    </div>

                    {/* Abstract */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Project Abstract
                      </span>
                      {activeSubmission.abstract ? (
                        <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                          {activeSubmission.abstract}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-400" />
                          <span>Not Uploaded / No Abstract provided for this milestone</span>
                        </div>
                      )}
                    </div>

                    {/* Submitted Files & Media */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        Submitted Files, Repositories &amp; Media
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Presentation PPT */}
                        {activeSubmission.fileName || activeSubmission.presentationFile ? (
                          <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold shrink-0">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 block truncate text-xs">
                                  {activeSubmission.presentationFile || activeSubmission.fileName || 'Milestone_Presentation.pptx'}
                                </span>
                                <span className="text-[10px] text-slate-400">PowerPoint Presentation (.pptx)</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDownloadFile(activeSubmission.presentationFile || activeSubmission.fileName || 'Milestone_Presentation.pptx', 'ppt', activeSubmission, e)}
                              className="px-3 py-1.5 bg-mint-50 hover:bg-mint-100 text-mint-900 font-bold rounded-lg border border-mint-200 transition flex items-center gap-1 text-[11px] shrink-0 cursor-pointer"
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center gap-2 text-slate-400">
                            <XCircle size={16} />
                            <span>No PowerPoint presentation file submitted</span>
                          </div>
                        )}

                        {/* Project Report PDF */}
                        {(activeSubmission.pdfFile || (activeSubmission as any).reportFile) ? (
                          <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold shrink-0">
                                <FileCode size={18} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 block truncate text-xs">
                                  {activeSubmission.pdfFile || (activeSubmission as any).reportFile}
                                </span>
                                <span className="text-[10px] text-slate-400">Project Report Document (.pdf)</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDownloadFile(activeSubmission.pdfFile || (activeSubmission as any).reportFile || 'Project_Report.pdf', 'pdf', activeSubmission, e)}
                              className="px-3 py-1.5 bg-mint-50 hover:bg-mint-100 text-mint-900 font-bold rounded-lg border border-mint-200 transition flex items-center gap-1 text-[11px] shrink-0 cursor-pointer"
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center gap-2 text-slate-400">
                            <XCircle size={16} />
                            <span>No Project Report document submitted</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* External Demonstration & Code Links */}
                    {(activeSubmission.repoUrl || (activeSubmission as any).githubLink || activeSubmission.demoUrl || (activeSubmission as any).demoLink) && (
                      <div className="pt-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                          Project Repositories &amp; Live Links
                        </span>

                        <div className="flex flex-wrap items-center gap-2.5">
                          {(activeSubmission.repoUrl || (activeSubmission as any).githubLink) && (
                            <a
                              href={activeSubmission.repoUrl || (activeSubmission as any).githubLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E4] hover:border-slate-400 text-slate-800 text-xs font-bold flex items-center gap-2 transition shadow-2xs"
                            >
                              <Github size={14} className="text-slate-700" />
                              <span>GitHub Repository</span>
                              <ExternalLink size={12} className="text-slate-400" />
                            </a>
                          )}

                          {(activeSubmission.demoUrl || (activeSubmission as any).demoLink) && (
                            <a
                              href={activeSubmission.demoUrl || (activeSubmission as any).demoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E4] hover:border-mint-400 text-mint-900 text-xs font-bold flex items-center gap-2 transition shadow-2xs"
                            >
                              <ExternalLink size={14} className="text-mint-700" />
                              <span>Live Preview / Demonstration</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 text-xs space-y-1">
                  <p className="font-bold text-slate-700">No deliverables submitted for Week {selectedWeek}.</p>
                  <p className="text-slate-400 text-[11px]">Submissions made by team members will automatically appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Assign Marks Modal (Flow ported seamlessly from Assign Marks Page) */}
      {isMarksModalOpen && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-[#E2E8E4] max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Milestone Marks Evaluation &bull; Week {selectedWeek}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeTeam.teamNo} &bull; Class {className} &bull; {activeTeam.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMarksModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMarks} className="space-y-5">
              {/* Calculated Live Team Average Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50 to-emerald-50 border border-mint-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div>
                  <span className="text-[10px] text-mint-800 font-extrabold uppercase tracking-wider block">
                    Calculated Milestone Score
                  </span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">
                    {liveAverageScore !== null ? `Team Average: ${liveAverageScore} / 100` : 'Enter Individual Marks Below'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 italic">
                  Marks visible to Guide and HOD.
                </span>
              </div>

              {marksError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2 text-xs">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{marksError}</span>
                </div>
              )}

              {/* Individual Member Marks Inputs */}
              <div className="space-y-2.5">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Individual Student Marks (0 - 100)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTeam.members.map((m) => (
                    <div 
                      key={m.rollNo}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8E4] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-xs truncate">{m.name}</span>
                          {m.isLead && (
                            <span className="px-1.5 py-0.2 rounded bg-mint-100 text-mint-900 text-[9px] font-black uppercase shrink-0">
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{m.rollNo}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0-100"
                          value={marksInput[m.rollNo] || ''}
                          onChange={(e) => setMarksInput({ ...marksInput, [m.rollNo]: e.target.value })}
                          className="w-20 px-3 py-1.5 bg-white border border-[#E2E8E4] rounded-xl text-xs font-black text-slate-900 text-center focus:outline-none focus:border-mint-500 shadow-2xs"
                        />
                        <span className="text-slate-400 font-bold text-xs">/ 100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisor Remarks */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Advisor Evaluation Critique &amp; Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={advisorRemarks}
                  onChange={(e) => setAdvisorRemarks(e.target.value)}
                  placeholder="e.g. Thorough formulation and good progress on prototype development..."
                  className="w-full p-3 bg-[#EFF3F1]/70 border border-[#E2E8E4] rounded-2xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400 shadow-2xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#E2E8E4] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMarksModalOpen(false)}
                  className="px-4 py-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 font-bold text-xs rounded-xl border border-[#E2E8E4] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check size={14} />
                  <span>Save Week {selectedWeek} Marks</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Change Guide Modal */}
      {isChangeGuideOpen && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E2E8E4] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                Reassign Project Guide &bull; {activeTeam.teamNo}
              </h3>
              <button
                type="button"
                onClick={() => setIsChangeGuideOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {guideError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs">
                {guideError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select New Faculty Guide:
              </label>
              <select
                value={selectedNewGuide}
                onChange={(e) => setSelectedNewGuide(e.target.value)}
                className="w-full p-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-mint-500 cursor-pointer"
              >
                <option value="">-- Select Guide --</option>
                {availableGuides.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name} &bull; {g.specialization || g.designation}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8E4]">
              <button
                type="button"
                onClick={() => setIsChangeGuideOpen(false)}
                className="px-4 py-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 font-bold text-xs rounded-xl border border-[#E2E8E4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmChangeGuide}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Manual Team Creation Modal */}
      <AdvisorManualTeamModal
        isOpen={isManualTeamModalOpen}
        onClose={() => setIsManualTeamModalOpen(false)}
        className={className}
        batch={batch}
        advisorName={advisorName}
        initialStudent={selectedStudent || null}
        onTeamCreated={(newTeam) => {
          setTeams(AdvisorService.getTeamsForClass(className));
          setSelectedTeamId(newTeam.teamId);
          setSelectedTeamOnly(true);
          setIsManualTeamModalOpen(false);
          onShowToast(`Successfully created ${newTeam.teamNo}.`);
        }}
        onShowToast={(msg) => onShowToast(msg)}
      />

    </div>
  );
};

export default AdvisorTeamsView;
