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
        <div className="fixed top-20 right-6 z-50 bg-[#111111] text-[#F8F5EE] px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium border border-[#292725] animate-in fade-in slide-in-from-top-2">
          <Download size={14} className="text-[#D8CCBA]" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* 1. Filter Option Row */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#D8CCBA] flex flex-wrap items-center gap-3">
        
        {/* Class Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-[#75695A] whitespace-nowrap">Class:</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Classes</option>
            <option value="CSE-A">Class CSE-A</option>
            <option value="CSE-B">Class CSE-B</option>
            <option value="CSE-C">Class CSE-C</option>
          </select>
        </div>

        {/* Batch Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-[#75695A] whitespace-nowrap">Batch:</label>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Batches</option>
            <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
            <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
            <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onClick={handleSearchClick}
            onFocus={handleSearchClick}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate, roll no, or title..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]"
          />
        </div>

        <button
          type="button"
          onClick={handleSearchClick}
          className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Search size={13} />
          <span>Search</span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          title="Refresh page"
          className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Refresh page"
        >
          <RefreshCw size={14} />
        </button>

      </div>

      {/* 2. Teams in Selected Class */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#D8CCBA] space-y-3">
        <div className="flex items-center justify-between border-b border-[#D8CCBA] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-serif font-bold text-[#111111] uppercase tracking-wider">
              {classFilter === 'ALL' ? 'All Student Teams' : `Teams in Class ${classFilter}`}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[10px] font-bold">
              {matchingTeams.length} {matchingTeams.length === 1 ? 'Team' : 'Teams'}
            </span>
          </div>
        </div>

        {matchingTeams.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#75695A]">
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
                      ? 'bg-[#F8F5EE] border-[#111111] shadow-sm ring-1 ring-[#111111]'
                      : 'bg-white border-[#D8CCBA] hover:border-[#111111]/40 hover:bg-[#F8F5EE]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-bold">
                      {team.teamNo}
                    </span>
                    <span className="text-[10px] text-[#75695A] font-mono">
                      Class {team.classSection}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#111111] text-xs line-clamp-1">
                      {team.projectTitle}
                    </h4>
                    <p className="text-[11px] text-[#75695A] mt-0.5">
                      Lead: {leadMember?.name || 'Student'} ({leadMember?.rollNo})
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#75695A] border-t border-[#D8CCBA]/60 pt-2 mt-0.5">
                    <span>Guide: {team.guide?.name?.split(' ')?.[0] || 'Guide'}</span>
                    <span className="font-semibold text-[#4A5844]">{team.status}</span>
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
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-[#D8CCBA] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CCBA] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-1 rounded-xl bg-[#111111] text-[#F8F5EE] font-bold text-xs">
                    {activeTeam.teamNo}
                  </span>
                  <span className="text-xs text-[#75695A] font-mono font-medium bg-[#EDE7DB] px-2 py-0.5 rounded-md">
                    {activeTeam.id}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-serif font-bold text-[#111111]">
                  {activeTeam.projectTitle}
                </h2>
                <span className="text-xs text-[#75695A]">
                  Batch: {activeTeam.batch} &bull; Section: Class {activeTeam.classSection}
                </span>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-[#75695A] block">Status</span>
                  <span className="text-sm font-bold text-[#4A5844]">{activeTeam.status}</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>

            {/* Advisor & Guide quick summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F8F5EE] rounded-xl border border-[#D8CCBA] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                  <Compass size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-[#75695A] font-semibold uppercase tracking-wider block">Designated Class Advisor</span>
                  <span className="font-bold text-[#111111] block">{activeTeam.advisor?.name}</span>
                  <span className="text-[10px] text-[#75695A]">{activeTeam.advisor?.email}</span>
                </div>
              </div>

              <div className="p-3 bg-[#F8F5EE] rounded-xl border border-[#D8CCBA] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-[#75695A] font-semibold uppercase tracking-wider block">Project Technical Guide</span>
                  <span className="font-bold text-[#111111] block">{activeTeam.guide?.name}</span>
                  <span className="text-[10px] text-[#75695A]">{activeTeam.guide?.email}</span>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div>
              <span className="text-[10px] text-[#75695A] font-semibold uppercase tracking-wider block mb-2">
                Team Members ({activeTeam.members?.length || 4}):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {activeTeam.members?.map((m) => {
                  const memberMark = MarksService.getMemberMark(activeTeam.id, selectedWeek, m.rollNo);

                  return (
                    <div key={m.rollNo} className="p-2.5 rounded-xl bg-[#F8F5EE] border border-[#D8CCBA] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#111111] truncate">{m.name}</span>
                          {m.isLead && (
                            <span className="px-1.5 py-0.2 rounded bg-[#111111] text-[#F8F5EE] text-[9px] font-bold uppercase">
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#75695A] font-mono block mt-0.5">{m.rollNo}</span>
                      </div>

                      {typeof memberMark === 'number' && (
                        <div className="mt-2 pt-1.5 border-t border-[#D8CCBA]/60 flex items-center justify-between text-[10px]">
                          <span className="text-[#75695A] font-medium">W{selectedWeek} Mark:</span>
                          <span className="font-bold text-[#111111] bg-[#EDE7DB] px-1.5 py-0.2 rounded border border-[#D8CCBA]">
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
          {/* 3.5. Class Advisor Milestone Marks (Week-wise View for HOD - Strictly Read-Only) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-[#D8CCBA] space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CCBA] pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
                  <Award size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-[#111111]">
                      Class Advisor Milestone Marks (Week-wise Assessment)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[10px] font-bold uppercase">
                      {activeTeam.teamNo}
                    </span>
                  </div>
                  <p className="text-xs text-[#75695A] mt-0.5">
                    Official milestone evaluation recorded by Class Advisor <strong className="text-[#111111]">{activeTeam.advisor?.name || 'Class Advisor'}</strong> for Class {activeTeam.classSection}
                  </p>
                </div>
              </div>

              {/* Read-Only Notice Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDE7DB] border border-[#D8CCBA] text-[#75695A] text-xs font-semibold shadow-2xs shrink-0 self-start sm:self-center">
                <Lock size={13} className="text-[#75695A]" />
                <span>Read-Only</span>
              </div>
            </div>

            {/* Week Selector Tabs */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block">
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
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold ring-1 ring-[#111111]'
                          : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA]'
                      }`}
                    >
                      <span>Week {w}</span>
                      {wMarks ? (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          isSelected ? 'bg-[#EDE7DB] text-[#111111]' : 'bg-[#EDE7DB] text-[#75695A]'
                        }`}>
                          Avg: {wMarks.teamAverage}
                        </span>
                      ) : (
                        <span className={`text-[9px] font-medium ${isSelected ? 'text-[#D8CCBA]' : 'text-[#75695A]'}`}>
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
                  <div className="p-8 rounded-2xl bg-[#F8F5EE] border border-dashed border-[#D8CCBA] text-center space-y-1">
                    <p className="text-xs font-semibold text-[#111111]">
                      Class Advisor has not entered marks for Week {selectedWeek} yet.
                    </p>
                    <p className="text-[11px] text-[#75695A]">
                      Evaluations and marks will appear here once saved by Advisor ({activeTeam.advisor?.name || 'Class Advisor'}).
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 animate-fadeIn">
                  {/* Team Average Score Banner */}
                  <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-[10px] text-[#75695A] font-semibold uppercase tracking-wider block">
                        Team Milestone Assessment &bull; Week {selectedWeek}
                      </span>
                      <span className="text-base sm:text-lg font-serif font-bold text-[#111111] mt-0.5 block">
                        Calculated Team Score: <span className="text-[#111111]">{marks.teamAverage}</span> / 100
                      </span>
                      <span className="text-[11px] text-[#75695A] block mt-0.5">
                        Evaluated by <strong className="text-[#111111]">{marks.gradedBy || activeTeam.advisor?.name || 'Class Advisor'}</strong>
                        {marks.gradedAt && ` on ${new Date(marks.gradedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </span>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-white border border-[#D8CCBA] shadow-2xs self-start sm:self-center text-center">
                      <span className="text-[10px] uppercase font-semibold text-[#75695A] block">Team Average</span>
                      <span className="text-sm font-bold text-[#111111]">{marks.teamAverage}%</span>
                    </div>
                  </div>

                  {/* Individual Student Marks Grid */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block">
                      Individual Student Marks &bull; Week {selectedWeek} ({activeTeam.members?.length || 4} Students):
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {activeTeam.members?.map((m) => {
                        const score = marks.memberMarks?.[m.rollNo];
                        return (
                          <div
                            key={m.rollNo}
                            className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] flex flex-col justify-between gap-2 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[#111111] text-xs truncate">
                                  {m.name}
                                </span>
                                {m.isLead && (
                                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-[#111111] text-[#F8F5EE] border border-[#111111] font-bold uppercase shrink-0">
                                    Lead
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#75695A] font-mono block mt-0.5">
                                {m.rollNo}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-[#D8CCBA] flex items-center justify-between">
                              <span className="text-[10px] text-[#75695A] font-medium">Week {selectedWeek} Mark:</span>
                              <span className="px-2 py-0.5 rounded-lg bg-white text-[#111111] font-bold text-xs border border-[#D8CCBA]">
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
                    <div className="p-4 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] text-xs space-y-1">
                      <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block">
                        Class Advisor Evaluation Critique &amp; Remarks:
                      </span>
                      <p className="text-[#292725] font-medium italic leading-relaxed">
                        &ldquo;{marks.remarks}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 4. Gentle Dropdown for Week-wise Details and Full Student Submission Display */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D8CCBA] space-y-6">
            
            {/* Header with Gentle Dropdown for Sprint Weeks */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CCBA] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-serif font-bold text-[#111111]">
                    Milestone Sprint Deliverables
                  </h3>
                  {(() => {
                    const avg = MarksService.getTeamAverage(activeTeam.id, selectedWeek);
                    if (avg !== null) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[11px] font-bold flex items-center gap-1">
                          <Award size={12} className="text-[#8A6A32]" />
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
                <label htmlFor="selectSprintWeek" className="text-xs font-semibold text-[#75695A] whitespace-nowrap">
                  Milestone Week:
                </label>
                <div className="relative">
                  <select
                    id="selectSprintWeek"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="appearance-none pl-3.5 pr-8 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs cursor-pointer"
                  >
                    {availableSubmissions.map((s) => (
                      <option key={s.week} value={s.week}>
                        Week {s.week}: {s.title} ({s.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                      isCurrentWeek
                        ? 'bg-[#111111] text-[#F8F5EE] shadow-xs font-bold'
                        : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA]'
                    }`}
                  >
                    Week {s.week}
                  </button>
                );
              })}
            </div>

            {/* Week Submission Details */}
            {activeSubmission ? (
              <div className="space-y-6 pt-2 text-xs">
                
                {/* Part 1: Review Given by Guide */}
                <div className="bg-[#F8F5EE] rounded-2xl p-5 border border-[#D8CCBA] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#D8CCBA] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold">
                        <User size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-[#111111] block text-xs">
                          Review by {activeSubmission.guideName || activeTeam.guide?.name || 'Faculty Guide'}
                        </span>
                        <span className="text-[10px] text-[#75695A] font-semibold">Faculty Project Guide</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${
                      activeSubmission.status === 'Approved' ? 'bg-[#4A5844]/10 text-[#4A5844] border-[#4A5844]/30' :
                      activeSubmission.status === 'Changes Requested' ? 'bg-[#7C3838]/10 text-[#7C3838] border-[#7C3838]/30' :
                      (activeSubmission.status === 'Submitted' || activeSubmission.status === 'Pending') ? 'bg-[#8A6A32]/10 text-[#8A6A32] border-[#8A6A32]/30' :
                      'bg-[#EDE7DB] text-[#75695A] border-[#D8CCBA]'
                    }`}>
                      {activeSubmission.status === 'Submitted' ? 'Pending' : activeSubmission.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-1">
                      Guide Evaluation Critique &amp; Remarks:
                    </span>
                    <p className="text-[#292725] font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#D8CCBA]">
                      {activeSubmission.comments || 'Submission is under active evaluation by the project guide.'}
                    </p>
                  </div>
                </div>

                {/* Part 2: Complete Submission by Student */}
                <div className="space-y-4">
                  <h4 className="font-serif font-bold text-sm text-[#111111] border-b border-[#D8CCBA] pb-2">
                    Complete Student Submission Details
                  </h4>

                  {/* Project Title */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-1">
                      Project Title
                    </span>
                    {activeSubmission.projectTitle || activeTeam.projectTitle ? (
                      <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111]">
                        {activeSubmission.projectTitle || activeTeam.projectTitle}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>Not Uploaded / No Project Title specified</span>
                      </div>
                    )}
                  </div>

                  {/* Problem Statement */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-1">
                      Problem Statement
                    </span>
                    {activeSubmission.problemStatement ? (
                      <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#292725] leading-relaxed">
                        {activeSubmission.problemStatement}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>Not Uploaded / No Problem Statement submitted for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* Proposed Solution */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-1">
                      Proposed Solution &amp; Technical Approach
                    </span>
                    {activeSubmission.solution ? (
                      <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#292725] leading-relaxed">
                        {activeSubmission.solution}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>Not Uploaded / No Technical Solution submitted for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* Technologies Used */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-1">
                      Technologies Used
                    </span>
                    {activeSubmission.technologyUsed ? (
                      <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#292725] font-mono font-bold">
                        {activeSubmission.technologyUsed}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>Not Uploaded / No Technologies specified</span>
                      </div>
                    )}
                  </div>

                  {/* Obstacles Faced */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-1">
                      Obstacles Faced
                    </span>
                    {activeSubmission.obstaclesFaced ? (
                      <div className="p-3.5 bg-[#7C3838]/10 border border-[#7C3838]/30 rounded-xl text-xs text-[#292725] leading-relaxed">
                        {activeSubmission.obstaclesFaced}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>Not Uploaded / No Obstacles Reported</span>
                      </div>
                    )}
                  </div>

                  {/* Abstract */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-1">
                      Project Abstract
                    </span>
                    {activeSubmission.abstract ? (
                      <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#292725] leading-relaxed">
                        {activeSubmission.abstract}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A] italic flex items-center gap-1.5">
                        <XCircle size={14} className="text-[#75695A]" />
                        <span>Not Uploaded / No Abstract provided for this milestone</span>
                      </div>
                    )}
                  </div>

                  {/* Submitted Files, Repositories & Media */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#75695A] uppercase tracking-wider block mb-2">
                      Submitted Files, Repositories &amp; Media
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Presentation PPT */}
                      {activeSubmission.fileName || activeSubmission.presentationFile ? (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-[#111111] block truncate max-w-[150px]">
                                {activeSubmission.fileName || activeSubmission.presentationFile}
                              </span>
                              <span className="text-[10px] text-[#75695A] font-mono">
                                {activeSubmission.fileSize || '4.2 MB'} &bull; PowerPoint
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadFile(activeSubmission.fileName || activeSubmission.presentationFile || `Week_${activeSubmission.week}_Presentation.pptx`, 'ppt', activeSubmission, e)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#75695A] flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div>
                              <span className="font-semibold text-[#75695A] block">Presentation Deck</span>
                              <span className="text-[10px] text-[#75695A]">PowerPoint (.pptx)</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#7C3838]/10 text-[#7C3838] border border-[#7C3838]/20 text-[10px] font-bold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* Technical Report PDF */}
                      {activeSubmission.pdfFile ? (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                              <FileCode size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-[#111111] block truncate max-w-[150px]">
                                {activeSubmission.pdfFile}
                              </span>
                              <span className="text-[10px] text-[#75695A] font-mono">PDF Document</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadFile(activeSubmission.pdfFile || `Week_${activeSubmission.week}_Report.pdf`, 'pdf', activeSubmission, e)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#75695A] flex items-center justify-center shrink-0">
                              <FileCode size={18} />
                            </div>
                            <div>
                              <span className="font-semibold text-[#75695A] block">Technical Dossier</span>
                              <span className="text-[10px] text-[#75695A]">Report (.pdf)</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#7C3838]/10 text-[#7C3838] border border-[#7C3838]/20 text-[10px] font-bold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* GitHub Repo Link */}
                      {activeSubmission.repoUrl ? (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                              <Github size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-[#111111] block">GitHub Repository</span>
                              <span className="text-[10px] text-[#75695A] truncate max-w-[150px] block font-mono">
                                {activeSubmission.repoUrl}
                              </span>
                            </div>
                          </div>
                          <a
                            href={activeSubmission.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <ExternalLink size={13} />
                            <span>Open</span>
                          </a>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#75695A] flex items-center justify-center shrink-0">
                              <Github size={18} />
                            </div>
                            <div>
                              <span className="font-semibold text-[#75695A] block">Source Code Repository</span>
                              <span className="text-[10px] text-[#75695A]">GitHub Link</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#7C3838]/10 text-[#7C3838] border border-[#7C3838]/20 text-[10px] font-bold flex items-center gap-1">
                            <XCircle size={12} />
                            <span>✕ Not Uploaded</span>
                          </span>
                        </div>
                      )}

                      {/* Live Demo Link */}
                      {activeSubmission.demoUrl ? (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0">
                              <ExternalLink size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-[#111111] block">Live Demo / Telemetry</span>
                              <span className="text-[10px] text-[#75695A] truncate max-w-[150px] block font-mono">
                                {activeSubmission.demoUrl}
                              </span>
                            </div>
                          </div>
                          <a
                            href={activeSubmission.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <ExternalLink size={13} />
                            <span>Launch</span>
                          </a>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-[#F8F5EE]/50 border border-dashed border-[#D8CCBA] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#75695A] flex items-center justify-center shrink-0">
                              <ExternalLink size={18} />
                            </div>
                            <div>
                              <span className="font-semibold text-[#75695A] block">Live Deployment</span>
                              <span className="text-[10px] text-[#75695A]">Demo URL</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#7C3838]/10 text-[#7C3838] border border-[#7C3838]/20 text-[10px] font-bold flex items-center gap-1">
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
              <div className="py-8 text-center text-xs text-[#75695A]">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#EDE7DB] text-[#75695A] border border-[#D8CCBA] mb-2 select-none">
                  <Clock size={12} className="text-[#75695A]" />
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
