import React, { useState, useEffect } from 'react';
import { HodService, HodTeamDetails } from '../../services/hodService';
import { MarksService } from '../../services/marksService';
import { formatProjectTitle } from '../../utils/titleUtils';
import { 
  Search, UserCheck, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, 
  Users, FolderGit2, FileText, Download, ExternalLink, Github, Award,
  Edit3, Save, X, Clock, Eye
} from 'lucide-react';
import { WeeklySubmission } from '../../types';

interface HodStudentsViewProps {
  selectedBatch?: string;
  selectedClass?: string;
  initialBatch?: string;
  initialClass?: string;
  onSelectStudent?: (studentRollNo: string, batch: string, className: string) => void;
}

export const HodStudentsView: React.FC<HodStudentsViewProps> = ({
  selectedBatch,
  selectedClass,
  initialBatch,
  initialClass
}) => {
  const [batchFilter, setBatchFilter] = useState(selectedBatch || initialBatch || 'ALL');
  const [classFilter, setClassFilter] = useState(selectedClass || initialClass || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [, setMarksTick] = useState(0);

  // Accordion state
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [inspectingTeamId, setInspectingTeamId] = useState<string | null>(null);

  // Modal inspection state
  const [activeModalTeam, setActiveModalTeam] = useState<HodTeamDetails | null>(null);
  const [activeModalSub, setActiveModalSub] = useState<WeeklySubmission | null>(null);

  // Edit marks state inside modal
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const [draftMemberMarks, setDraftMemberMarks] = useState<Record<string, number>>({});
  const [draftRemarks, setDraftRemarks] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Subscribe to real-time marks updates
  useEffect(() => {
    const unsub = MarksService.subscribe(() => {
      setMarksTick(n => n + 1);
    });
    const handleSync = () => {
      setMarksTick(n => n + 1);
    };
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      unsub();
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Update filters when props change
  useEffect(() => {
    if (selectedBatch) setBatchFilter(selectedBatch);
    else if (initialBatch) setBatchFilter(initialBatch);
    if (selectedClass) setClassFilter(selectedClass);
    else if (initialClass) setClassFilter(initialClass);
  }, [selectedBatch, selectedClass, initialBatch, initialClass]);

  const teams = HodService.getTeams(batchFilter, classFilter, searchTerm);
  const advisors = HodService.getAdvisors(batchFilter, classFilter);
  const currentAdvisor = advisors.find(a => a.assignedClass === classFilter);

  // Helper to get initials
  const getUserInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to open view submission modal
  const handleOpenSubmissionModal = (team: HodTeamDetails, sub: WeeklySubmission) => {
    setActiveModalTeam(team);
    setActiveModalSub(sub);
    setIsEditingMarks(false);
    setSaveSuccessMsg('');

    // Pre-populate marks draft
    const wMarks = MarksService.getWeeklyMarks(team.id, sub.week, team.members.map(m => m.rollNo));
    const initialMarks: Record<string, number> = {};
    team.members.forEach(m => {
      initialMarks[m.rollNo] = wMarks?.memberMarks?.[m.rollNo] ?? (wMarks?.teamAverage || 0);
    });
    setDraftMemberMarks(initialMarks);
    setDraftRemarks(wMarks?.remarks || '');
  };

  // Live auto-calculated average
  const draftValues = Object.values(draftMemberMarks);
  const draftAverage = draftValues.length > 0
    ? Math.round((draftValues.reduce((acc, v) => acc + (Number(v) || 0), 0) / draftValues.length) * 10) / 10
    : 0;

  // Handle save marks from HOD
  const handleSaveMarks = () => {
    if (!activeModalTeam || !activeModalSub) return;

    // 1. Save to MarksService
    MarksService.saveWeeklyMarks(
      activeModalTeam.id,
      activeModalSub.week,
      draftMemberMarks,
      draftRemarks,
      'HOD Evaluation'
    );

    // 2. Sync to guide portal storage
    try {
      const guideRaw = localStorage.getItem('siet_guide_portal_teams_v6');
      if (guideRaw) {
        const gTeams = JSON.parse(guideRaw);
        if (Array.isArray(gTeams)) {
          let updated = false;
          gTeams.forEach((gt: any) => {
            if (
              gt.teamId === activeModalTeam.id ||
              gt.id === activeModalTeam.id ||
              (gt.teamNumber && activeModalTeam.teamNo.includes(String(gt.teamNumber)))
            ) {
              if (Array.isArray(gt.submissions)) {
                const s = gt.submissions.find((sub: any) => (sub.weekNumber ?? sub.week) === activeModalSub.week);
                if (s) {
                  s.marks = draftAverage;
                  s.comments = draftRemarks;
                  updated = true;
                }
              }
            }
          });
          if (updated) {
            localStorage.setItem('siet_guide_portal_teams_v6', JSON.stringify(gTeams));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Sync to student portal storage
    try {
      const studentRaw = localStorage.getItem('siet_student_submissions_v6');
      if (studentRaw) {
        const sSubs = JSON.parse(studentRaw);
        if (Array.isArray(sSubs)) {
          const s = sSubs.find((sub: any) => sub.week === activeModalSub.week);
          if (s) {
            s.score = draftAverage;
            s.comments = draftRemarks;
            localStorage.setItem('siet_student_submissions_v6', JSON.stringify(sSubs));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 4. Dispatch events
    window.dispatchEvent(new Event('siet_marks_updated'));
    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));

    setIsEditingMarks(false);
    setSaveSuccessMsg('Marks saved and synchronized successfully to Student, Advisor, and Guide portals.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Helper to trigger file downloads
  const handleDownloadFile = (fileName: string, fileType: 'pdf' | 'ppt', team: HodTeamDetails, sub: WeeklySubmission) => {
    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';
    const formattedTitle = formatProjectTitle(team.projectTitle, team.status);

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${team.guide?.name || 'Faculty Guide'}) >>
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
(SRI SHAKTHI INSTITUTE OF ENGINEERING & TECHNOLOGY) Tj
/F1 11 Tf
0 -24 Td
(Department of Computer Science & Engineering) Tj
0 -20 Td
(PROJECT DOSSIER: ${formattedTitle}) Tj
0 -20 Td
(Team: ${team.teamNo} | Class: ${team.classSection} | Batch: ${team.batch}) Tj
0 -20 Td
(Milestone: Submission ${sub.week} | Status: ${sub.status}) Tj
0 -20 Td
(Abstract: ${(sub.abstract || 'Approved academic milestone deliverable submitted by student team.').substring(0, 80)}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000128 00000 n 
0000000185 00000 n 
0000000282 00000 n 
trailer
<< /Size 6 /Root 2 0 R >>
startxref
554
%%EOF`;
    } else {
      content = `SIET Presentation Deliverable
Project: ${formattedTitle}
Team: ${team.teamNo} | Class: ${team.classSection}
Milestone: Submission ${sub.week}
Guide: ${team.guide?.name || 'Dr. P. Manimegalai'}
Advisor: ${team.advisor?.name || 'Dr. R. Karthikeyan'}
Generated for Academic Verification.`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${team.teamNo}_Submission_${sub.week}.${fileType === 'pdf' ? 'pdf' : 'pptx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      
      {/* Filter Option Row */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#D8CCBA] flex flex-wrap items-center gap-3">
        
        {/* Batch Filter */}
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
        >
          <option value="ALL">All Batches</option>
          <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
          <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
          <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
        </select>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
        >
          <option value="ALL">All Classes</option>
          <option value="CSE-A">Class CSE-A</option>
          <option value="CSE-B">Class CSE-B</option>
          <option value="CSE-C">Class CSE-C</option>
        </select>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team, title, or student..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]"
          />
        </div>

        {/* Refresh button */}
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

      {/* Class Advisor Banner if specific class selected */}
      {classFilter !== 'ALL' && (
        <div className="p-4 rounded-2xl bg-white border border-[#D8CCBA] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#75695A] uppercase tracking-wider">Designated Class Advisor:</span>
                <span className="text-xs font-extrabold text-[#111111]">
                  {currentAdvisor ? currentAdvisor.name : 'Dr. R. Karthikeyan'}
                </span>
                <span className="text-[11px] text-[#75695A] font-mono">
                  ({currentAdvisor ? currentAdvisor.email : 'dr.karthik@siet.ac.in'})
                </span>
              </div>
              <p className="text-[11px] text-[#75695A] mt-0.5 font-medium">
                Class: <strong className="text-[#111111]">{classFilter}</strong> &bull; Batch: <strong className="text-[#111111]">{batchFilter}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Teams Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4 whitespace-nowrap">Team Number</th>
                <th className="p-4 whitespace-nowrap">Class</th>
                <th className="p-4">Title</th>
                <th className="p-4 whitespace-nowrap">Submissions Made Until Now</th>
                <th className="p-4 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-medium">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#75695A]">
                    No project teams match the selected filters.
                  </td>
                </tr>
              ) : (
                teams.map((team) => {
                  const isExpanded = expandedTeamId === team.id;
                  const isInspecting = inspectingTeamId === team.id;
                  const formattedTitle = formatProjectTitle(team.projectTitle, team.status, team.guideApprovalStatus === 'Approved');
                  const isTitleApproved = formattedTitle !== 'No Title Submitted' && formattedTitle !== 'Title Approval Pending';
                  const isTitlePending = formattedTitle === 'Title Approval Pending';
                  const submissionsCount = team.submissions?.length || 0;

                  return (
                    <React.Fragment key={team.id}>
                      {/* Main Team Row */}
                      <tr
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-[#F8F5EE]' : 'hover:bg-[#F8F5EE]/60'
                        }`}
                      >
                        {/* Team Number */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-serif font-bold text-xs">
                              {team.teamNo}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#75695A] block mt-1 font-medium">
                            Guide: {team.guide?.name || 'Dr. P. Manimegalai'}
                          </span>
                        </td>

                        {/* Class */}
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md bg-[#EDE7DB] text-[#111111] font-semibold border border-[#D8CCBA]">
                            Class {team.classSection}
                          </span>
                          <span className="text-[10px] text-[#75695A] block mt-1 font-mono">
                            {team.batch}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="p-4 max-w-md">
                          {isTitleApproved ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#111111] text-xs">
                                {formattedTitle}
                              </span>
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            </div>
                          ) : isTitlePending ? (
                            <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                              <Clock size={11} /> Title Approval Pending
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                              No Title Submitted
                            </span>
                          )}
                        </td>

                        {/* Submissions Made Until Now */}
                        <td className="p-4 whitespace-nowrap">
                          {submissionsCount > 0 ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-xs inline-flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>{submissionsCount} {submissionsCount === 1 ? 'Submission' : 'Submissions'}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-[#EDE7DB] text-[#75695A] border border-[#D8CCBA] font-semibold text-[11px]">
                              No Submissions Yet
                            </span>
                          )}
                        </td>

                        {/* Action Chevron */}
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            className="p-1.5 rounded-xl bg-[#EDE7DB] text-[#111111] hover:bg-[#D8CCBA] transition"
                            aria-label="Toggle team view"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Accordion: Team Members & Inspect Submissions */}
                      {isExpanded && (
                        <tr className="bg-[#FAF8F4] border-t border-[#D8CCBA]">
                          <td colSpan={5} className="p-5">
                            <div className="space-y-4">
                              
                              {/* Team Members Header & Inspect Submissions Action Button */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#D8CCBA]">
                                <div className="flex items-center gap-2">
                                  <Users size={16} className="text-[#75695A]" />
                                  <span className="font-serif font-bold text-[#111111] text-xs uppercase tracking-wider">
                                    Team Members Roster ({team.members.length} Candidates)
                                  </span>
                                </div>

                                {/* Inspect Submissions Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingTeamId(isInspecting ? null : team.id);
                                  }}
                                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-2xs ${
                                    isInspecting
                                      ? 'bg-[#111111] text-[#F8F5EE] border border-[#292725]'
                                      : 'bg-white text-[#111111] border border-[#D8CCBA] hover:bg-[#EDE7DB]'
                                  }`}
                                >
                                  <FolderGit2 size={14} />
                                  <span>{isInspecting ? 'Hide Submissions' : 'Inspect Submissions'}</span>
                                </button>
                              </div>

                              {/* Members Table: STUDENT NAME is Left-Aligned */}
                              <div className="bg-white rounded-2xl border border-[#D8CCBA] overflow-hidden shadow-2xs">
                                <table className="w-full text-xs">
                                  <thead className="bg-[#EDE7DB]/80 text-[#75695A] uppercase tracking-wider font-mono font-bold text-[10px] border-b border-[#D8CCBA]">
                                    <tr>
                                      <th className="p-3 text-center w-36 whitespace-nowrap">REGISTER NUMBER</th>
                                      <th className="p-3 text-left">STUDENT NAME</th>
                                      <th className="p-3 text-left">INSTITUTIONAL EMAIL</th>
                                      <th className="p-3 text-center w-28">ROLE</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#EAE2D5] font-medium">
                                    {team.members.map((m) => (
                                      <tr key={m.rollNo} className="hover:bg-[#FAF8F4] transition-colors">
                                        {/* Register Number */}
                                        <td className="p-3 text-center whitespace-nowrap">
                                          <span className="font-mono font-bold text-[#111111]">
                                            {m.rollNo}
                                          </span>
                                        </td>

                                        {/* Student Name: Strictly Left Aligned */}
                                        <td className="p-3 text-left whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-[#111111] text-[#F8F5EE] font-bold text-[9px] flex items-center justify-center shrink-0">
                                              {getUserInitials(m.name)}
                                            </div>
                                            <span className="font-bold text-[#111111] text-xs">
                                              {m.name}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Institutional Email */}
                                        <td className="p-3 text-left font-mono text-[11px] text-[#75695A] whitespace-nowrap">
                                          {m.email}
                                        </td>

                                        {/* Role */}
                                        <td className="p-3 text-center whitespace-nowrap">
                                          {m.isLead ? (
                                            <span className="px-2 py-0.5 rounded-full bg-[#111111] text-amber-400 font-extrabold text-[9px] uppercase tracking-wider">
                                              Lead
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full bg-[#EDE7DB] text-[#75695A] font-semibold text-[9px]">
                                              Member
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Inspect Submissions Grid (shown when Inspect Submissions is clicked) */}
                              {isInspecting && (
                                <div className="mt-4 p-4 rounded-2xl bg-white border border-[#D8CCBA] shadow-xs space-y-3 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between pb-2 border-b border-[#D8CCBA]">
                                    <span className="font-serif font-bold text-[#111111] text-xs uppercase tracking-wider flex items-center gap-1.5">
                                      <FileText size={14} className="text-[#75695A]" />
                                      Weekly Milestone Submissions &amp; Evaluation Audit
                                    </span>
                                    <span className="text-[11px] text-[#75695A] font-medium">
                                      Click View Submission to inspect artifacts, guide marks &amp; edit marks
                                    </span>
                                  </div>

                                  {/* Submissions List */}
                                  {team.submissions && team.submissions.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {team.submissions.map((sub) => {
                                        const weekNum = sub.week;
                                        const wMarks = MarksService.getWeeklyMarks(team.id, weekNum, team.members.map(m => m.rollNo));
                                        const isApproved = sub.status === 'Approved';
                                        const isRejected = sub.status === 'Rejected' || sub.status === 'Changes Requested';

                                        return (
                                          <div
                                            key={weekNum}
                                            className="p-4 rounded-xl border border-[#D8CCBA] bg-[#FAF8F4] hover:bg-[#F3EFE6] transition flex flex-col justify-between gap-3 shadow-2xs"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] font-bold text-[10px] uppercase border border-[#D8CCBA]">
                                                    Submission {weekNum}
                                                  </span>
                                                  <span className="text-[11px] font-mono text-[#75695A]">
                                                    {sub.submissionDate || 'Submitted'}
                                                  </span>
                                                </div>
                                                <h5 className="font-bold text-[#111111] text-xs mt-1.5 line-clamp-1">
                                                  {sub.title || `Milestone Submission ${weekNum}`}
                                                </h5>
                                              </div>

                                              {/* Status Badge */}
                                              {isApproved ? (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[10px] shrink-0">
                                                  Approved
                                                </span>
                                              ) : isRejected ? (
                                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-extrabold text-[10px] shrink-0">
                                                  Revision Required
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px] shrink-0">
                                                  Pending
                                                </span>
                                              )}
                                            </div>

                                            {/* Marks & View Submission Button */}
                                            <div className="pt-2 border-t border-[#D8CCBA] flex items-center justify-between gap-2">
                                              <div>
                                                {wMarks && wMarks.teamAverage > 0 ? (
                                                  <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                                                    <Award size={11} /> Avg: {wMarks.teamAverage}/100
                                                  </span>
                                                ) : (
                                                  <span className="text-[11px] text-slate-400 italic font-medium">
                                                    Ungraded
                                                  </span>
                                                )}
                                              </div>

                                              {/* View Submission Action Button */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenSubmissionModal(team, sub);
                                                }}
                                                className="px-3 py-1 rounded-lg bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                              >
                                                <Eye size={12} />
                                                <span>View Submission</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="p-6 text-center text-[#75695A] bg-[#FAF8F4] rounded-xl border border-[#D8CCBA]">
                                      <p className="font-semibold text-xs">No deliverables submitted by this team yet.</p>
                                    </div>
                                  )}
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

      {/* Submission Details Modal with Exact Deliverables, Individual Marks & Edit Marks */}
      {activeModalTeam && activeModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#D8CCBA] overflow-hidden flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs">
                  {activeModalTeam.teamNo} &bull; Submission {activeModalSub.week}
                </span>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#111111] truncate max-w-md">
                    {activeModalSub.title || `Milestone Submission ${activeModalSub.week}`}
                  </h3>
                  <p className="text-[11px] text-[#75695A] font-semibold">
                    Class {activeModalTeam.classSection} &bull; Batch {activeModalTeam.batch} &bull; Guide: {activeModalTeam.guide?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveModalTeam(null);
                  setActiveModalSub(null);
                  setIsEditingMarks(false);
                }}
                className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">

              {/* Toast Success Message inside Modal */}
              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Section: Deliverables Breakdown (exact or red Not Submitted) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#D8CCBA]">
                  <span className="font-extrabold text-[#111111] uppercase tracking-wider text-xs">
                    Student Deliverables &amp; Artifacts Checklist
                  </span>
                  <span className="text-[11px] text-[#75695A]">
                    Items missing are marked in red as Not Submitted
                  </span>
                </div>

                {/* 1. Project Title */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">1. Project Title</span>
                    {activeModalTeam.projectTitle ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalTeam.projectTitle && (
                    <p className="text-slate-900 font-bold text-xs">
                      {formatProjectTitle(activeModalTeam.projectTitle, activeModalTeam.status)}
                    </p>
                  )}
                </div>

                {/* 2. Problem Statement */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">2. Problem Statement</span>
                    {activeModalSub.problemStatement ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.problemStatement && (
                    <p className="text-slate-800 text-xs leading-relaxed font-medium">
                      {activeModalSub.problemStatement}
                    </p>
                  )}
                </div>

                {/* 3. Proposed Solution */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">3. Proposed Solution &amp; Technical Approach</span>
                    {activeModalSub.solution ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.solution && (
                    <p className="text-slate-800 text-xs leading-relaxed font-medium">
                      {activeModalSub.solution}
                    </p>
                  )}
                </div>

                {/* 4. Abstract */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">4. Executive Abstract</span>
                    {activeModalSub.abstract ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.abstract && (
                    <p className="text-slate-800 text-xs leading-relaxed font-medium">
                      {activeModalSub.abstract}
                    </p>
                  )}
                </div>

                {/* 5. Tech Stack */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">5. Technologies &amp; Frameworks</span>
                    {activeModalSub.technologyUsed ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.technologyUsed && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeModalSub.technologyUsed.split(',').map((tech, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] rounded-md font-mono text-[11px]">
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. PPT Presentation */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">6. Presentation Slide Deck (PPT)</span>
                    {activeModalSub.presentationFile ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.presentationFile ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs text-slate-800 truncate max-w-sm">
                        {activeModalSub.presentationFile}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(activeModalSub.presentationFile || 'presentation.pptx', 'ppt', activeModalTeam, activeModalSub)}
                        className="px-2.5 py-1 rounded-lg bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download size={12} /> Download PPT
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* 7. PDF Report */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">7. Technical Milestone Report (PDF)</span>
                    {activeModalSub.pdfFile ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.pdfFile ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs text-slate-800 truncate max-w-sm">
                        {activeModalSub.pdfFile}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(activeModalSub.pdfFile || 'report.pdf', 'pdf', activeModalTeam, activeModalSub)}
                        className="px-2.5 py-1 rounded-lg bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download size={12} /> Download PDF
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* 8. GitHub Repository */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">8. GitHub Repository</span>
                    {activeModalSub.repoUrl ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.repoUrl ? (
                    <div className="pt-1">
                      <a
                        href={activeModalSub.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-700 hover:text-indigo-900 font-mono text-xs underline flex items-center gap-1"
                      >
                        <Github size={13} /> {activeModalSub.repoUrl}
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* 9. Live Demo */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">9. Live Demo / Deployment</span>
                    {activeModalSub.demoUrl ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.demoUrl ? (
                    <div className="pt-1">
                      <a
                        href={activeModalSub.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-700 hover:text-indigo-900 font-mono text-xs underline flex items-center gap-1"
                      >
                        <ExternalLink size={13} /> {activeModalSub.demoUrl}
                      </a>
                    </div>
                  ) : null}
                </div>

              </div>

              {/* Section: Individual Member Marks Assigned by Guide & Average Score */}
              <div className="pt-4 border-t border-[#D8CCBA] space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#D8CCBA]">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-[#111111]" />
                    <span className="font-serif font-bold text-[#111111] text-xs uppercase tracking-wider">
                      Student Individual Marks &amp; Auto-Calculated Team Average
                    </span>
                  </div>

                  {!isEditingMarks && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMarks(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit3 size={13} /> Edit Marks
                    </button>
                  )}
                </div>

                {/* View Mode */}
                {!isEditingMarks ? (
                  <div className="space-y-3">
                    <div className="bg-[#FAF8F4] rounded-2xl p-4 border border-[#D8CCBA] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeModalTeam.members.map((m) => {
                          const wMarks = MarksService.getWeeklyMarks(activeModalTeam.id, activeModalSub.week, activeModalTeam.members.map(x => x.rollNo));
                          const score = wMarks?.memberMarks?.[m.rollNo];

                          return (
                            <div
                              key={m.rollNo}
                              className="p-3 bg-white rounded-xl border border-[#D8CCBA] flex items-center justify-between shadow-2xs"
                            >
                              <div>
                                <span className="font-bold text-[#111111] text-xs block">
                                  {m.name}
                                </span>
                                <span className="font-mono text-[10px] text-[#75695A]">
                                  {m.rollNo} {m.isLead && '• Lead'}
                                </span>
                              </div>

                              <div>
                                {score !== undefined ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 font-black text-xs border border-emerald-200">
                                    {score} / 100
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

                      {/* Average Score Banner */}
                      {(() => {
                        const wMarks = MarksService.getWeeklyMarks(activeModalTeam.id, activeModalSub.week, activeModalTeam.members.map(x => x.rollNo));
                        return (
                          <div className="pt-2 border-t border-[#D8CCBA] flex items-center justify-between text-xs">
                            <span className="text-[#75695A] font-bold uppercase tracking-wider text-[11px]">
                              Team Calculated Average Score:
                            </span>
                            <span className="text-sm font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300 shadow-2xs">
                              {wMarks && wMarks.teamAverage > 0 ? `${wMarks.teamAverage} / 100` : 'Unassigned'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Edit Marks Mode */
                  <div className="bg-[#FAF8F4] rounded-2xl p-4 border border-[#D8CCBA] space-y-4">
                    <p className="text-[11px] text-[#75695A] font-medium">
                      Enter marks individually for each student candidate (0-100). The average score is auto-calculated and synchronized immediately to Student, Advisor, and Guide portals.
                    </p>

                    <div className="space-y-2.5">
                      {activeModalTeam.members.map((m) => {
                        const val = draftMemberMarks[m.rollNo] ?? 0;

                        return (
                          <div
                            key={m.rollNo}
                            className="p-3 bg-white rounded-xl border border-[#D8CCBA] flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div>
                              <span className="font-bold text-[#111111] text-xs block">
                                {m.name}
                              </span>
                              <span className="font-mono text-[10px] text-[#75695A]">
                                {m.rollNo} {m.isLead && '• Lead'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={val}
                                onChange={(e) => {
                                  const num = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                  setDraftMemberMarks(prev => ({
                                    ...prev,
                                    [m.rollNo]: num
                                  }));
                                }}
                                className="w-16 px-2 py-1 bg-[#F8F5EE] border border-[#D8CCBA] rounded-lg text-center font-bold text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                              />
                              <span className="text-slate-500 font-bold text-xs">/ 100</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Calculated Average */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider">
                        Auto-Calculated Average Score:
                      </span>
                      <span className="text-base font-black text-emerald-950">
                        {draftAverage} / 100
                      </span>
                    </div>

                    {/* Remarks Input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#75695A] uppercase tracking-wider">
                        Evaluation Remarks / Guide Feedback:
                      </label>
                      <textarea
                        rows={2}
                        value={draftRemarks}
                        onChange={(e) => setDraftRemarks(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8CCBA]">
                      <button
                        type="button"
                        onClick={() => setIsEditingMarks(false)}
                        className="px-4 py-2 rounded-xl border border-[#D8CCBA] text-[#75695A] hover:bg-[#EDE7DB] font-bold text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMarks}
                        className="px-5 py-2 rounded-xl bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Modal Bottom Bar */}
            <div className="bg-[#F8F5EE] px-6 py-3 border-t border-[#D8CCBA] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#75695A]">
                Academic Project Governance Dossier &bull; SIET CSE Portal
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveModalTeam(null);
                  setActiveModalSub(null);
                  setIsEditingMarks(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-white border border-[#D8CCBA] text-[#111111] hover:bg-[#EDE7DB] font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default HodStudentsView;
