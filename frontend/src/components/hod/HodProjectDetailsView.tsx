import React, { useState, useEffect } from 'react';
import { HodService, HodTeamDetails } from '../../services/hodService';
import { WeeklySubmission } from '../../types';
import { getUserInitials } from '../../services/authService';
import { MarksService } from '../../services/marksService';
import { StudentService } from '../../services/studentService';
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
  RefreshCw,
  Award,
  Lock
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

  // Selected team state
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    if (initialStudentRollNo) {
      const team = HodService.getTeamByStudent(initialStudentRollNo);
      if (team) return team.id;
    }
    return matchingTeams[0]?.id || "TEAM-CSE-Y3-B04";
  });

  // Selected sprint week for week-wise details
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
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
        setSearchTerm(team.members.find(m => m.rollNo === initialStudentRollNo)?.name || '');
      }
    }
  }, [initialBatch, initialClass, initialStudentRollNo]);

  // Keep selected team synced
  const activeTeam = matchingTeams.find(t => t.id === selectedTeamId) || 
    HodService.getTeams().find(t => t.id === selectedTeamId) || 
    matchingTeams[0] || 
    HodService.getTeams()[0];

  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();

  // Active submission for the selected week (Strictly authentic student submissions)
  const availableSubmissions: WeeklySubmission[] = activeTeam?.submissions || [];
  const activeSubmission: WeeklySubmission | undefined = availableSubmissions.find(s => s.week === selectedWeek) || 
    availableSubmissions[0];

  // Auto-align selected week if team changes or week not in submissions
  useEffect(() => {
    if (availableSubmissions.length > 0 && !availableSubmissions.some(s => s.week === selectedWeek)) {
      setSelectedWeek(availableSubmissions[0].week);
    }
  }, [selectedTeamId, availableSubmissions, selectedWeek]);

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
(Project Title: ${sub?.projectTitle || activeTeam?.projectTitle || 'Capstone Project'}) Tj
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
Project: ${sub?.projectTitle || activeTeam?.projectTitle || 'Capstone Project'}
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
          onClick={() => window.location.reload()}
          title="Refresh page"
          className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Refresh page"
        >
          <RefreshCw size={14} />
        </button>

      </div>

      {/* 2. Teams in Selected Class */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] space-y-3">
        <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              {classFilter === 'ALL' ? 'All Student Teams' : `Teams in Class ${classFilter}`}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-black">
              {matchingTeams.length} {matchingTeams.length === 1 ? 'Team' : 'Teams'}
            </span>
          </div>
        </div>

        {matchingTeams.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No teams found for the selected class or filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchingTeams.map((team) => {
              const isSelected = activeTeam?.id === team.id;
              const leadMember = team.members.find(m => m.isLead) || team.members[0];

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setSelectedWeek(team.submissions?.[0]?.week || 1);
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
                    <span className="text-[10px] text-slate-400 font-mono">
                      Class {team.classSection}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs line-clamp-1">
                      {team.projectTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Lead: {leadMember?.name || 'Student'} ({leadMember?.rollNo})
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-[#E2E8E4]/60 pt-2 mt-0.5">
                    <span>Guide: {team.guide?.name?.split(' ')?.[0] || 'Guide'}</span>
                    <span className="font-extrabold text-mint-700">{team.status}</span>
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
          
          {/* Team Header Summary Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                    {activeTeam.teamNo}
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                    {activeTeam.id}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {activeTeam.projectTitle}
                </h2>
                <span className="text-xs text-slate-500">
                  Batch: {activeTeam.batch} &bull; Section: Class {activeTeam.classSection}
                </span>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className="text-sm font-extrabold text-mint-700">{activeTeam.status}</span>
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

            {/* Team Members */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                Team Members ({activeTeam.members?.length || 4}):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {activeTeam.members?.map((m) => {
                  const memberMark = MarksService.getMemberMark(activeTeam.id, selectedWeek, m.rollNo);

                  return (
                    <div key={m.rollNo} className="p-2.5 rounded-xl bg-slate-50 border border-[#E2E8E4] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">{m.name}</span>
                          {m.isLead && (
                            <span className="px-1.5 py-0.2 rounded bg-mint-100 text-mint-900 text-[9px] font-black uppercase">
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{m.rollNo}</span>
                      </div>

                      {typeof memberMark === 'number' && (
                        <div className="mt-2 pt-1.5 border-t border-[#E2E8E4]/60 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold">W{selectedWeek} Mark:</span>
                          <span className="font-extrabold text-mint-900 bg-mint-100 px-1.5 py-0.2 rounded border border-mint-200">
                            {memberMark} / 100
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3.5. Class Advisor Milestone Marks (Week-wise View for HOD - Strictly Read-Only) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-mint-500 to-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
                  <Award size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Class Advisor Milestone Marks (Week-wise Assessment)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-black uppercase">
                      {activeTeam.teamNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official milestone evaluation recorded by Class Advisor <strong>{activeTeam.advisor?.name || 'Class Advisor'}</strong> for Class {activeTeam.classSection}
                  </p>
                </div>
              </div>

              {/* Read-Only Notice Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-extrabold shadow-2xs shrink-0 self-start sm:self-center">
                <Lock size={13} className="text-slate-500" />
                <span>Read-Only</span>
              </div>
            </div>

            {/* Week Selector Tabs */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Select Milestone Week to Inspect Evaluation:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((w) => {
                  const isSelected = w === selectedWeek;
                  const wMarks = MarksService.getWeeklyMarks(activeTeam.id, w);

                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSelectedWeek(w)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-mint-500 text-white shadow-sm font-extrabold ring-2 ring-mint-400/30'
                          : 'bg-slate-50 hover:bg-mint-50 text-slate-700 border border-[#E2E8E4]'
                      }`}
                    >
                      <span>Week {w}</span>
                      {wMarks ? (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                          isSelected ? 'bg-white text-mint-950' : 'bg-mint-100 text-mint-900'
                        }`}>
                          Avg: {wMarks.teamAverage}
                        </span>
                      ) : (
                        <span className={`text-[9px] font-medium ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          --
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Week Marks Details */}
            {(() => {
              const marks = MarksService.getWeeklyMarks(activeTeam.id, selectedWeek);

              if (!marks) {
                return (
                  <div className="p-8 rounded-2xl bg-slate-50/70 border border-dashed border-slate-300 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">
                      Class Advisor has not entered marks for Week {selectedWeek} yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Evaluations and marks will appear here once saved by Advisor ({activeTeam.advisor?.name || 'Class Advisor'}).
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 animate-fadeIn">
                  {/* Team Average Score Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50 via-emerald-50 to-teal-50 border border-mint-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-[10px] text-mint-800 font-extrabold uppercase tracking-wider block">
                        Team Milestone Assessment &bull; Week {selectedWeek}
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                        Calculated Team Score: <span className="text-mint-800">{marks.teamAverage}</span> / 100
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Evaluated by <strong>{marks.gradedBy || activeTeam.advisor?.name || 'Class Advisor'}</strong>
                        {marks.gradedAt && ` on ${new Date(marks.gradedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </span>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-white border border-mint-200 shadow-2xs self-start sm:self-center text-center">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Team Average</span>
                      <span className="text-sm font-black text-mint-700">{marks.teamAverage}%</span>
                    </div>
                  </div>

                  {/* Individual Student Marks Grid */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Individual Student Marks &bull; Week {selectedWeek} ({activeTeam.members?.length || 4} Students):
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {activeTeam.members?.map((m) => {
                        const score = marks.memberMarks?.[m.rollNo];
                        return (
                          <div
                            key={m.rollNo}
                            className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] flex flex-col justify-between gap-2 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-extrabold text-slate-900 text-xs truncate">
                                  {m.name}
                                </span>
                                {m.isLead && (
                                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-mint-100 text-mint-900 border border-mint-200 font-black uppercase shrink-0">
                                    Lead
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {m.rollNo}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-[#E2E8E4] flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 font-bold">Week {selectedWeek} Mark:</span>
                              <span className="px-2 py-0.5 rounded-lg bg-mint-100 text-mint-950 font-black text-xs border border-mint-200">
                                {typeof score === 'number' ? `${score} / 100` : '-- / 100'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Advisor Evaluation Remarks */}
                  {marks.remarks && (
                    <div className="p-4 bg-[#EFF3F1]/80 rounded-2xl border border-[#E2E8E4] text-xs space-y-1">
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

          {/* 4. Gentle Dropdown for Week-wise Details and Full Student Submission Display */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-[#E2E8E4] space-y-6">
            
            {/* Header with Gentle Dropdown for Sprint Weeks */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8E4] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Milestone Sprint Deliverables
                  </h3>
                  {(() => {
                    const avg = MarksService.getTeamAverage(activeTeam.id, selectedWeek);
                    if (avg !== null) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[11px] font-black flex items-center gap-1">
                          <Award size={12} className="text-mint-700" />
                          <span>Team Avg: {avg} / 100</span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Gentle Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="selectSprintWeek" className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  Milestone Week:
                </label>
                <div className="relative">
                  <select
                    id="selectSprintWeek"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="appearance-none pl-3.5 pr-8 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-mint-500 shadow-xs cursor-pointer"
                  >
                    {availableSubmissions.map((s) => (
                      <option key={s.week} value={s.week}>
                        Week {s.week}: {s.title} ({s.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Quick Week Pill Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {availableSubmissions.map((s) => {
                const isCurrentWeek = s.week === selectedWeek;
                return (
                  <button
                    key={s.week}
                    type="button"
                    onClick={() => setSelectedWeek(s.week)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      isCurrentWeek
                        ? 'bg-mint-500 text-white shadow-xs font-extrabold'
                        : 'bg-slate-100 hover:bg-mint-50 text-slate-700 border border-[#E2E8E4]'
                    }`}
                  >
                    Week {s.week}
                  </button>
                );
              })}
            </div>

            {/* Week Submission Details: FORMATTED EXACTLY LIKE STUDENT'S MY SUBMISSIONS PAGE */}
            {activeSubmission ? (
              <div className="space-y-6 pt-2 text-xs">
                
                {/* Part 1: Review Given by Guide */}
                <div className="bg-[#EFF3F1]/80 rounded-2xl p-5 border border-mint-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-mint-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold">
                        <User size={16} />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block text-xs">
                          Review by {activeSubmission.guideName || activeTeam.guide?.name || 'Faculty Guide'}
                        </span>
                        <span className="text-[10px] text-mint-700 font-bold">Faculty Project Guide</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase border ${
                      activeSubmission.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      activeSubmission.status === 'Changes Requested' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      (activeSubmission.status === 'Submitted' || activeSubmission.status === 'Pending') ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {activeSubmission.status === 'Submitted' ? 'Pending' : activeSubmission.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Guide Evaluation Critique &amp; Remarks:
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#E2E8E4]">
                      {activeSubmission.comments || 'Submission is under active evaluation by the project guide.'}
                    </p>
                  </div>
                </div>

                {/* Part 2: Complete Submission by Student */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-900 border-b border-[#E2E8E4] pb-2">
                    Complete Student Submission Details
                  </h4>

                  {/* Project Title */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Project Title
                    </span>
                    {activeSubmission.projectTitle || activeTeam.projectTitle ? (
                      <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900">
                        {activeSubmission.projectTitle || activeTeam.projectTitle}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-slate-400" />
                        <span>Not Uploaded / No Project Title specified</span>
                      </div>
                    )}
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
                                {activeSubmission.fileSize || '4.2 MB'} &bull; PowerPoint
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
                <p>No milestone deliverables submitted yet for Week {selectedWeek}.</p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default HodProjectDetailsView;
