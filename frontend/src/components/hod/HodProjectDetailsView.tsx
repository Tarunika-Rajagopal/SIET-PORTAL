import React, { useState, useEffect } from 'react';
import { HodService, HodTeamDetails } from '../../services/hodService';
import { WeeklySubmission } from '../../types';
import { getUserInitials } from '../../services/authService';
import { MarksService } from '../../services/marksService';
import { StudentService } from '../../services/studentService';
import { formatProjectTitle } from '../../utils/titleUtils';
import { 
  Users, 
  BookOpen, 
  Compass, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Calendar, 
  MessageSquare,
  AlertTriangle,
  FolderGit2,
  Download,
  FileCode,
  ExternalLink,
  Github,
  Image as ImageIcon,
  User,
  XCircle,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface HodProjectDetailsViewProps {
  initialBatch?: string;
  initialClass?: string;
  initialStudentRollNo?: string;
}

export const HodProjectDetailsView: React.FC<HodProjectDetailsViewProps> = ({
  initialBatch = 'ALL',
  initialClass = 'ALL',
  initialStudentRollNo
}) => {
  const [batchFilter, setBatchFilter] = useState(initialBatch);
  const [classFilter, setClassFilter] = useState(initialClass);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // All matching teams based on batch/class filters and search
  const matchingTeams = HodService.getTeams(batchFilter, classFilter, searchTerm);

  // Selected team state (null initially; details only visible when a team is clicked)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    if (initialStudentRollNo) {
      const team = HodService.getTeamByStudent(initialStudentRollNo);
      if (team) return team.id;
    }
    return null;
  });
  const [selectedTeamOnly, setSelectedTeamOnly] = useState<boolean>(Boolean(initialStudentRollNo));

  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();

  // Selected sprint week for week-wise details (defaults to current academic week)
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return StudentService.getCurrentAcademicWeek();
  });
  const [, setMarksTick] = useState<number>(0);

  useEffect(() => {
    const unsubMarks = MarksService.subscribe(() => {
      setMarksTick(n => n + 1);
    });
    const handleSync = () => {
      setMarksTick(n => n + 1);
    };
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      unsubMarks();
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // When initial props change (e.g. from student row click)
  useEffect(() => {
    if (initialBatch) setBatchFilter(initialBatch);
    if (initialClass) setClassFilter(initialClass);
    if (initialStudentRollNo) {
      const team = HodService.getTeamByStudent(initialStudentRollNo);
      if (team) {
        setSelectedTeamId(team.id);
        setSelectedTeamOnly(true);
        setSearchTerm(team.members.find(m => m.rollNo === initialStudentRollNo)?.name || '');
      }
    } else {
      setSelectedTeamId(null);
      setSelectedTeamOnly(false);
    }
  }, [initialBatch, initialClass, initialStudentRollNo]);

  // Keep selected team synced (only when a team is selected)
  const activeTeam = selectedTeamId
    ? (matchingTeams.find(t => t.id === selectedTeamId) || 
       HodService.getTeams().find(t => t.id === selectedTeamId) || 
       null)
    : null;

  // Teams to display in the grid: if a team is clicked, do not show the remaining teams
  const displayedTeams = selectedTeamOnly && selectedTeamId
    ? matchingTeams.filter(t => t.id === selectedTeamId)
    : matchingTeams;

  // Active team members roll numbers for precise marks lookup
  const activeMemberRollNos = activeTeam?.members?.map(m => m.rollNo) || [];
  const activeTeamMarks = activeTeam ? MarksService.getAllTeamMarks(activeTeam.id, activeMemberRollNos) : {};
  const gradedWeeks = Object.keys(activeTeamMarks).map(Number);
  const submissionWeeks = (activeTeam?.submissions || []).map(s => s.week);

  // Available weeks strictly up to current academic week (no future weeks)
  const availableWeeks = Array.from({ length: currentAcademicWeek + 1 }, (_, i) => i);

  // Active submission strictly for the selected week (no fallback to other weeks)
  const availableSubmissions: WeeklySubmission[] = activeTeam?.submissions || [];
  const activeSubmission: WeeklySubmission | undefined = availableSubmissions.find(s => s.week === selectedWeek);

  // Automatically align selectedWeek with current academic week when activeTeam changes
  useEffect(() => {
    if (!activeTeam) return;
    setSelectedWeek(currentAcademicWeek);
  }, [activeTeam?.id, currentAcademicWeek]);

  // Reset batch and class to ALL when search is initiated and clear search text
  const handleSearchClick = () => {
    setBatchFilter('ALL');
    setClassFilter('ALL');
    setSearchTerm('');
  };

  // Real file download trigger for PPT and PDF (matching Student Portal)
  const handleDownloadFile = (fileName: string, fileType: 'ppt' | 'pdf', sub?: WeeklySubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const weekNum = sub?.week || selectedWeek;
    const weekTitle = sub?.title || `Milestone ${weekNum}`;
    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${activeTeam?.guide?.name || 'Faculty Guide'}) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 220 >>
stream
BT
/F1 14 Tf
50 720 Td
(Sri Shakthi Institute of Engineering and Technology - Department of CSE) Tj
0 -25 Td
(HOD Milestone Audit Dossier: Week ${weekNum} - ${weekTitle}) Tj
0 -20 Td
(Project Title: ${formatProjectTitle(sub?.projectTitle || activeTeam?.projectTitle, sub?.status || activeTeam?.status)}) Tj
0 -20 Td
(Team: ${activeTeam?.teamNo || 'Team'} | Class: ${activeTeam?.classSection || 'CSE'}) Tj
0 -20 Td
(Guide: ${activeTeam?.guide?.name || 'Faculty Guide'} | Status: ${sub?.status || 'Approved'}) Tj
0 -20 Td
(Submitted Date: ${sub?.submissionDate || 'N/A'}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 2 0 R >>
startxref
500
%%EOF`;
    } else {
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      content = `SIET PowerPoint Milestone Presentation
Milestone: Week ${weekNum} - ${weekTitle}
Project: ${formatProjectTitle(sub?.projectTitle || activeTeam?.projectTitle, sub?.status || activeTeam?.status)}
Team: ${activeTeam?.teamNo || 'Team'}
Faculty Guide: ${activeTeam?.guide?.name || 'Faculty Guide'}
Submission Date: ${sub?.submissionDate || 'N/A'}
Evaluation Status: ${sub?.status || 'Approved'}
Critique: ${sub?.comments || 'Evaluated by Faculty Guide'}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadToast(`Downloaded ${fileName}`);
    setTimeout(() => setDownloadToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {downloadToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Download size={14} className="text-mint-400" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* 1. Filter Option Row (Clean, no extra marketing/banner content) */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E2E8E4] flex flex-wrap items-center gap-3">
        
        {/* Class Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Class:</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Classes</option>
            <option value="CSE-A">Class CSE-A</option>
            <option value="CSE-B">Class CSE-B</option>
            <option value="CSE-C">Class CSE-C</option>
          </select>
        </div>

        {/* Batch Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Batch:</label>
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
        </div>

        {/* Search Bar - Clicking or pressing search automatically sets class and batch to ALL */}
        <div className="relative flex-1 min-w-[220px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onClick={handleSearchClick}
            onFocus={handleSearchClick}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate, roll no, or title..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={handleSearchClick}
          className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Search size={13} />
          <span>Search</span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => {
            setSelectedTeamId(null);
            setSelectedTeamOnly(false);
            setSearchTerm('');
            setBatchFilter('ALL');
            setClassFilter('ALL');
          }}
          title="Refresh and show all teams"
          className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Refresh and show all teams"
        >
          <RefreshCw size={14} />
        </button>

      </div>

      {/* 2. Teams in Selected Class */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] space-y-3">
        <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              {selectedTeamOnly ? 'Selected Team' : (classFilter === 'ALL' ? 'All Student Teams' : `Teams in Class ${classFilter}`)}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-black">
              {displayedTeams.length} {displayedTeams.length === 1 ? 'Team' : 'Teams'}
            </span>
          </div>
          {selectedTeamOnly && (
            <button
              type="button"
              onClick={() => setSelectedTeamOnly(false)}
              className="text-xs font-bold text-mint-700 hover:text-mint-800 underline cursor-pointer"
            >
              Show all teams
            </button>
          )}
        </div>

        {displayedTeams.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No teams found for the selected class or filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedTeams.map((team) => {
              const isSelected = activeTeam?.id === team.id;
              const leadMember = team.members.find(m => m.isLead) || team.members[0];

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setSelectedTeamOnly(true);
                    
                    const mRolls = team.members?.map(m => m.rollNo) || [];
                    const tMarks = MarksService.getAllTeamMarks(team.id, mRolls);
                    const weeksWithPositiveMarks = Object.keys(tMarks)
                      .map(Number)
                      .filter(w => tMarks[w]?.teamAverage > 0);

                    if (weeksWithPositiveMarks.length > 0) {
                      setSelectedWeek(Math.max(...weeksWithPositiveMarks));
                    } else if (team.submissions && team.submissions.length > 0) {
                      setSelectedWeek(Math.max(...team.submissions.map(s => s.week)));
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
                      team.status === 'Approved' ? 'text-emerald-700' :
                      team.status === 'Review Required' ? 'text-amber-700' : 'text-slate-600'
                    }`}>
                      {team.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs line-clamp-1">
                      {formatProjectTitle(team.projectTitle, team.status)}
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

      {/* 3. Selected Team Details & Submissions View */}
      {activeTeam && (
        <div className="space-y-6">
          
          {/* 3.1. Team Header & Members Merged Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                    {activeTeam.teamNo}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {formatProjectTitle(activeTeam.projectTitle, activeTeam.status)}
                </h2>
                <span className="text-xs text-slate-500 block">
                  Batch: {activeTeam.batch}
                </span>
                {activeTeam.rejectionReason && activeTeam.status === 'Review Required' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-rose-800 block text-[10px] uppercase tracking-wide">
                        Guide Project Proposal Rejection Reason:
                      </span>
                      <p className="italic font-medium mt-0.5">&ldquo;{activeTeam.rejectionReason}&rdquo;</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className={`text-sm font-extrabold ${
                    activeTeam.status === 'Approved' ? 'text-emerald-700' :
                    activeTeam.status === 'Review Required' ? 'text-amber-700' : 'text-slate-600'
                  }`}>
                    {activeTeam.status}
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
                  <span className="font-extrabold text-slate-900 block">{activeTeam.advisor?.name}</span>
                  <span className="text-[10px] text-slate-500">{activeTeam.advisor?.email}</span>
                </div>
              </div>

              <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-900 flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Project Technical Guide</span>
                  <span className="font-extrabold text-slate-900 block">{activeTeam.guide?.name}</span>
                  <span className="text-[10px] text-slate-500">{activeTeam.guide?.email}</span>
                </div>
              </div>
            </div>

            {/* Team Members (Merged Directly Inside Container) */}
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

          {/* 3.3. Week-Wise Milestone Assessment & Deliverables */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-6 animate-fadeIn">
            
            {/* Milestone Week Dropdown (Left side alone, only weeks up to evaluated/current week) */}
            <div className="flex items-center gap-3 border-b border-[#E2E8E4] pb-4">
              <label htmlFor="hodMilestoneWeekSelect" className="text-xs font-extrabold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                Select Milestone Week:
              </label>
              <select
                id="hodMilestoneWeekSelect"
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

            {/* MARKS ASSIGNED BY CLASS ADVISOR (Shown First At The Top of the Week View) */}
            <div className="space-y-3">

              {(() => {
                const memberRollNos = activeTeam?.members?.map(m => m.rollNo) || [];
                const marks = MarksService.getWeeklyMarks(activeTeam.id, selectedWeek, memberRollNos);

                const isBlankZeroRecord = marks && marks.teamAverage === 0 && 
                  (!marks.remarks || marks.remarks.trim() === '') && 
                  Object.values(marks.memberMarks || {}).every(v => v === 0);

                if (!marks || isBlankZeroRecord) {
                  return (
                    <div className="p-6 rounded-2xl bg-slate-50/80 border border-dashed border-slate-300 text-center space-y-1">
                      <p className="text-xs font-bold text-slate-700">
                        Class Advisor ({activeTeam.advisor?.name || 'Class Advisor'}) has not assigned marks for Week {selectedWeek} yet.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Evaluations and marks recorded by the advisor will appear here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Team Milestone Assessment Score Banner (Showing Team Average as Team Score) */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50 via-emerald-50 to-teal-50 border border-mint-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-[10px] text-mint-800 font-extrabold uppercase tracking-wider block">
                          Team Milestone Assessment Score &bull; Week {selectedWeek}
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                          Team Score: <span className="text-mint-800">{marks.teamAverage}</span> / 100
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Evaluated by <strong>{marks.gradedBy || activeTeam.advisor?.name || 'Class Advisor'}</strong>
                          {marks.gradedAt && ` on ${new Date(marks.gradedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                        </span>
                      </div>
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
                        Guide: <strong className="text-slate-800">{activeSubmission.guideName || activeTeam.guide?.name || 'Project Technical Guide'}</strong>
                      </span>
                    </div>

                    {(activeSubmission.status === 'Changes Requested' || activeSubmission.status === 'Rejected') ? (
                      <div className="p-3 bg-white rounded-xl border border-rose-200 text-rose-950 font-medium space-y-1">
                        <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider block">
                          Guide Rejection Reason &bull; Feedback:
                        </span>
                        <p className="leading-relaxed italic">
                          &ldquo;{activeSubmission.comments || activeTeam.rejectionReason || 'Guide has requested technical revisions on the submitted milestone deliverables before approval.'}&rdquo;
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
                          Milestone work has been received and is awaiting review and evaluation from {activeSubmission.guideName || activeTeam.guide?.name || 'Faculty Guide'}.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Student-Entered Details */}
                  <div className="space-y-3">
                    
                    {/* Project Title */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Project Title
                      </span>
                      <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900">
                        {activeSubmission.projectTitle || activeTeam.projectTitle || (
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

                    {/* Submitted Files, Repositories & Media */}
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        Submitted Files, Repositories &amp; Media
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
                                  PowerPoint (.pptx)
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDownloadFile(activeSubmission.fileName || activeSubmission.presentationFile || `Week_${activeSubmission.week}_Presentation.pptx`, 'ppt', activeSubmission, e)}
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
                                <span className="text-[10px] text-slate-400 font-mono">PDF Document</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDownloadFile(activeSubmission.pdfFile || `Week_${activeSubmission.week}_Report.pdf`, 'pdf', activeSubmission, e)}
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
                                <span className="font-bold text-slate-900 block">GitHub Repository</span>
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
                                <span className="font-bold text-slate-500 block">Live Deployment</span>
                                <span className="text-[10px] text-slate-400">Demo URL</span>
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
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-300 mb-2 select-none">
                    <Clock size={12} className="text-slate-500" />
                    <span>No Submission</span>
                  </span>
                  <p>No milestone deliverables submitted by students for Week {selectedWeek} yet.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default HodProjectDetailsView;
