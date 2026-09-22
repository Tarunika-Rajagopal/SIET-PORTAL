import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, CheckCircle2, Clock, AlertCircle, 
  ExternalLink, Github, FileText, Download, X, Award, Presentation, 
  Image as ImageIcon, XCircle, ChevronDown, ChevronUp, Eye, RotateCcw
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { MarksService } from '../../services/marksService';
import { StudentService } from '../../services/studentService';
import { formatProjectTitle, getSubmissionTitle } from '../../utils/titleUtils';

export const ALL_SUBMISSIONS = [
  { submissionNumber: 1, weekNumber: 1, defaultTitle: 'Project Initiation & Title Proposal' },
  { submissionNumber: 2, weekNumber: 2, defaultTitle: 'Domain Exploration & Problem Formulation' },
  { submissionNumber: 3, weekNumber: 3, defaultTitle: 'Literature Survey & Feasibility Study' },
  { submissionNumber: 4, weekNumber: 4, defaultTitle: 'System Architecture & Requirements Specification' },
  { submissionNumber: 5, weekNumber: 5, defaultTitle: 'Hardware Component Selection & Circuit Schema' },
  { submissionNumber: 6, weekNumber: 6, defaultTitle: 'Module 1 Implementation & Core Testing' },
  { submissionNumber: 7, weekNumber: 7, defaultTitle: 'Module 2 Implementation & Protocol Integration' },
  { submissionNumber: 8, weekNumber: 8, defaultTitle: 'System Integration & Field Trial Diagnostics' },
];

export const MyTeams = () => {
  const { teams = [] } = useGuide();

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  
  // Expanded team row accordion
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  // Toggle to show submissions for expanded team
  const [submissionsExpandedTeamId, setSubmissionsExpandedTeamId] = useState(null);

  // Active week/submission inspection modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null);
  const [activeTeamForModal, setActiveTeamForModal] = useState(null);
  const [downloadToast, setDownloadToast] = useState(null);

  // Current academic week
  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();

  // Marks listener
  const [, setMarksTick] = useState(0);
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

  // Extract unique batches dynamically
  const availableBatches = useMemo(() => {
    const set = new Set();
    teams.forEach(t => {
      if (t.batch) set.add(t.batch);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Extract unique classes dynamically
  const availableClasses = useMemo(() => {
    const set = new Set();
    teams.forEach(t => {
      const cls = t.classSection || (t.class && t.section ? `${t.class}-${t.section}` : t.class);
      if (cls) set.add(cls);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Filter teams by batch, class, and name
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const teamClass = team.classSection || (team.class && team.section ? `${team.class}-${team.section}` : team.class) || '';
      const matchesClass = classFilter === 'ALL' || teamClass === classFilter;
      const matchesBatch = batchFilter === 'ALL' || team.batch === batchFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() ||
        `team ${team.teamNumber}`.includes(q) ||
        `#${team.teamNumber}`.includes(q) ||
        (team.projectTitle || '').toLowerCase().includes(q) ||
        (team.teamLeader || '').toLowerCase().includes(q) ||
        (team.leaderRollNo || '').includes(q) ||
        teamClass.toLowerCase().includes(q) ||
        (team.members || []).some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q));

      return matchesClass && matchesBatch && matchesSearch;
    });
  }, [teams, classFilter, batchFilter, searchTerm]);

  // Helper to get all submissions up to current academic week for a team
  const getTeamSubmissionsList = (team) => {
    const memberRolls = (team.members || []).map(m => m.rollNo);
    const teamMarks = MarksService.getAllTeamMarks(team.teamId, memberRolls);

    return ALL_SUBMISSIONS.filter(s => s.submissionNumber <= Math.max(4, currentAcademicWeek)).map(def => {
      // Find matching submission in team.submissions
      const existing = (team.submissions || []).find(s => 
        (s.submissionNumber === def.submissionNumber) || 
        (s.weekNumber === def.weekNumber) || 
        (s.weekNumber === def.submissionNumber) ||
        (def.submissionNumber === 1 && (s.weekNumber === 0 || s.weekNumber === 1))
      );

      // Marks for this submission
      const recordedMark = teamMarks[def.submissionNumber] || 
                           teamMarks[def.weekNumber] || 
                           (def.submissionNumber === 1 ? teamMarks[0] : null);
      const hasMarks = Boolean(recordedMark && (
        (typeof recordedMark.teamAverage === 'number' && recordedMark.teamAverage > 0) ||
        (recordedMark.memberMarks && Object.keys(recordedMark.memberMarks).length > 0)
      ));

      const isApproved = hasMarks || 
                         existing?.evaluationStatus === 'Approved' || 
                         existing?.status === 'Approved' || 
                         existing?.submissionStatus === 'Approved';

      if (existing) {
        return {
          ...existing,
          submissionNumber: def.submissionNumber,
          weekNumber: def.weekNumber,
          title: existing.title || def.defaultTitle,
          isUploaded: true,
          status: isApproved ? 'Approved' : (existing.status === 'Revision Required' || existing.evaluationStatus === 'Revision Required' ? 'Revision Required' : (existing.status || 'Submitted')),
          evaluationStatus: isApproved ? 'Approved' : (existing.evaluationStatus || 'Pending'),
          submissionStatus: isApproved ? 'Approved' : (existing.submissionStatus || 'Submitted'),
          hasMarks,
          marksScore: hasMarks ? (recordedMark.teamAverage ?? existing.score) : (existing.score ?? null),
          marksRemarks: recordedMark?.remarks || existing.guideRemarks || existing.comments || ''
        };
      }

      // If team proposal details exist and this is Submission 1
      if (def.submissionNumber === 1 && (team.projectTitle || team.problemStatement)) {
        return {
          submissionNumber: 1,
          weekNumber: 1,
          title: team.projectTitle || def.defaultTitle,
          isUploaded: true,
          status: team.titleStatus || 'Pending',
          submissionDate: team.submittedDate || new Date().toISOString().split('T')[0],
          hasMarks,
          marksScore: hasMarks ? recordedMark.teamAverage : null,
          marksRemarks: recordedMark?.remarks || team.guideFeedback || '',
          problemStatement: team.problemStatement || '',
          proposedSolution: team.proposedSolution || '',
          abstractSummary: team.abstract || team.projectDescription || '',
          technologiesUsed: team.technologiesUsed || [],
          githubUrl: team.githubUrl || '',
          liveDemoUrl: team.liveDemoUrl || '',
          reportUrl: team.reportUrl || '',
          presentationFileName: team.presentationFileName || ''
        };
      }

      return {
        submissionNumber: def.submissionNumber,
        weekNumber: def.weekNumber,
        title: def.defaultTitle,
        isUploaded: false,
        status: 'Not Uploaded Yet',
        submissionDate: null,
        hasMarks: false,
        marksScore: null,
        marksRemarks: '',
        abstractSummary: '',
        obstaclesFaced: '',
        technologiesUsed: team.technologiesUsed || []
      };
    });
  };

  // Open inspection modal for a submission
  const handleOpenSubmissionDetail = (team, sub, e) => {
    if (e) e.stopPropagation();
    setActiveTeamForModal(team);
    setActiveSubModal(sub);
    setDetailModalOpen(true);
  };

  // Real file download for PPT and PDF
  const handleDownloadFile = (fileName, fileType, sub, e) => {
    if (e) e.stopPropagation();

    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    const formattedTitle = getSubmissionTitle(activeTeamForModal?.projectTitle);

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${activeTeamForModal?.guide || 'Faculty Guide'}) >>
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
(Milestone Deliverable Dossier: Submission ${sub.submissionNumber} - ${sub.title}) Tj
0 -20 Td
(Project Title: ${formattedTitle}) Tj
0 -20 Td
(Lead Student: ${activeTeamForModal?.teamLeader} | Roll No: ${activeTeamForModal?.leaderRollNo}) Tj
0 -20 Td
(Project Guide: ${activeTeamForModal?.guide || 'Faculty Guide'} | Status: ${sub.status}) Tj
0 -20 Td
(Submitted Date: ${sub.submissionDate || 'N/A'}) Tj
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
Milestone: Submission ${sub.submissionNumber} - ${sub.title}
Project: ${formattedTitle}
Lead Student: ${activeTeamForModal?.teamLeader} (${activeTeamForModal?.leaderRollNo})
Project Guide: ${activeTeamForModal?.guide || 'Faculty Guide'}
Submission Date: ${sub.submissionDate || 'N/A'}
Evaluation Status: ${sub.status}
Guide Feedback: ${sub.marksRemarks || sub.guideRemarks || 'Evaluated by Faculty Guide'}`;
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
    setTimeout(() => {
      setDownloadToast(null);
    }, 3000);
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn font-sans">
      
      {/* Toast */}
      {downloadToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-fadeIn">
          <Download size={14} className="text-mint-400" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* 1. FILTERING TOOLBAR ONLY (Starts directly from filtering: batch, class, name) */}
      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D8CCBA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        
        {/* Search by Name / Team / Title */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
          />
        </div>

        {/* Filters Group: Batch & Class */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Batch Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#75695A] hidden sm:inline">Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              {availableBatches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#75695A] hidden sm:inline">Class:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
            >
              <option value="ALL">All Classes</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-slate-700 hover:text-black border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh page"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 2. TEAMS TABLE: Shows team no, class, title, leader (NO status column) */}
      <div className="bg-white rounded-3xl border border-[#D8CCBA] shadow-xs overflow-hidden">
        {filteredTeams.length === 0 ? (
          <div className="p-12 text-center text-[#75695A] space-y-2">
            <Search size={24} className="mx-auto text-[#75695A]" />
            <p className="font-bold text-[#111111] text-sm">No teams found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#EDE7DB] text-[#111111] uppercase font-extrabold text-[10px] tracking-wider border-b border-[#D8CCBA]">
                <tr>
                  <th className="p-4 text-center w-28">Team No</th>
                  <th className="p-4 text-center w-28">Class</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Team Leader</th>
                  <th className="p-4 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBA]">
                {filteredTeams.map((team) => {
                  const teamClass = team.classSection || (team.class && team.section ? `${team.class}-${team.section}` : team.class) || 'CSE-B';
                  const isExpanded = expandedTeamId === team.teamId;
                  const isSubmissionsShown = submissionsExpandedTeamId === team.teamId;

                  return (
                    <React.Fragment key={team.teamId}>
                      {/* Main Table Row */}
                      <tr 
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedTeamId(null);
                            setSubmissionsExpandedTeamId(null);
                          } else {
                            setExpandedTeamId(team.teamId);
                            setSubmissionsExpandedTeamId(null);
                          }
                        }}
                        className={`transition cursor-pointer ${
                          isExpanded 
                            ? 'bg-[#F8F5EE]' 
                            : 'hover:bg-[#FAF7F2] bg-white'
                        }`}
                      >
                        {/* 1. Team No */}
                        <td className="p-4 text-center font-extrabold text-[#111111]">
                          <span className="px-2.5 py-1 rounded-xl bg-[#EDE7DB] border border-[#D8CCBA] font-extrabold text-xs shadow-2xs">
                            Team #{team.teamNumber}
                          </span>
                        </td>

                        {/* 2. Class */}
                        <td className="p-4 text-center font-bold text-[#111111]">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#EFF3F1] border border-[#E2E8E4] text-[11px] font-mono font-bold">
                            {teamClass}
                          </span>
                        </td>

                        {/* 3. Title */}
                        <td className="p-4">
                          {(() => {
                            const isSub1Approved = team.titleStatus === 'Approved' || team.isTitleApproved || StudentService.isSubmission1Approved(team.teamId || team.id);
                            const formatted = formatProjectTitle(team.projectTitle, isSub1Approved ? 'Approved' : team.titleStatus, isSub1Approved);
                            const isApproved = formatted !== 'No Title Submitted' && formatted !== 'Title Approval Pending';
                            const isPending = formatted === 'Title Approval Pending';
                            if (isApproved) {
                              return (
                                <div className="font-serif font-bold text-[#111111] text-xs leading-snug line-clamp-2">
                                  {formatted}
                                </div>
                              );
                            } else if (isPending) {
                              return (
                                <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                  <Clock size={11} /> Title Approval Pending
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                                  No Title Submitted
                                </span>
                              );
                            }
                          })()}
                          <span className="text-[10px] text-[#75695A] block mt-1">
                            Batch: <strong>{team.batch}</strong> &bull; Advisor: <strong>{team.advisor}</strong>
                          </span>
                        </td>

                        {/* 4. Team Leader */}
                        <td className="p-4">
                          <span className="font-bold text-[#111111] block">{team.teamLeader}</span>
                          <span className="text-[10px] text-[#75695A] font-mono">{team.leaderRollNo}</span>
                        </td>

                        {/* Chevron Indicator */}
                        <td className="p-4 text-center text-[#75695A]">
                          <div className="p-1 rounded-lg hover:bg-[#EDE7DB] transition inline-block">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Container: Team Members First -> Then [View Submissions] Button & List (NO designation column) */}
                      {isExpanded && (
                        <tr className="bg-[#FAF7F2] border-y border-[#D8CCBA] animate-fadeIn">
                          <td colSpan={5} className="p-5">
                            <div className="space-y-4 max-w-5xl mx-auto">
                              
                              {/* 1. TEAM MEMBERS FIRST */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D8CCBA]">
                                <div className="flex items-center gap-2">
                                  <Users size={16} className="text-[#111111]" />
                                  <h4 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                                    Enrolled Team Members ({team.members?.length || 4} Students)
                                  </h4>
                                </div>

                                {/* [View Submissions] Toggle Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubmissionsExpandedTeamId(isSubmissionsShown ? null : team.teamId);
                                  }}
                                  className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-95"
                                >
                                  <Eye size={14} className="text-[#F8F5EE]" />
                                  <span>{isSubmissionsShown ? 'Hide Submissions' : 'View Submissions'}</span>
                                </button>
                              </div>

                              {/* Members Table (NO Designation column) */}
                              <div className="border border-[#D8CCBA] rounded-2xl overflow-hidden bg-white shadow-2xs">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#EDE7DB] text-[#111111] uppercase font-bold text-[10px] border-b border-[#D8CCBA]">
                                    <tr>
                                      <th className="p-3">Roll No</th>
                                      <th className="p-3">Student Candidate</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#D8CCBA]">
                                    {(team.members || []).map((m, idx) => (
                                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F5EE]/50'}>
                                        <td className="p-3 font-mono font-bold text-[#111111]">{m.rollNo}</td>
                                        <td className="p-3 font-bold text-[#111111]">{m.name}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* 2. ALL WEEKS' SUBMISSIONS (Shown when [View Submissions] is clicked) */}
                              {isSubmissionsShown && (
                                <div className="pt-3 border-t border-[#D8CCBA] space-y-3 animate-fadeIn">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                                      <Clock size={15} className="text-[#111111]" />
                                      <span>Milestone Submissions</span>
                                    </h5>
                                    <span className="text-[11px] text-[#75695A]">
                                      Click any submission to view full details &amp; artifacts
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {getTeamSubmissionsList(team).map((sub) => {
                                      const isSubUploaded = sub.isUploaded;
                                      const isSubApproved = sub.status === 'Approved';
                                      const isSubRevision = sub.status === 'Revision Required' || sub.status === 'Changes Requested';
                                      const isSubPending = isSubUploaded && !isSubApproved && !isSubRevision && sub.status !== 'Rejected';

                                      return (
                                        <div
                                          key={sub.submissionNumber}
                                          onClick={(e) => {
                                            if (isSubUploaded) {
                                              handleOpenSubmissionDetail(team, sub, e);
                                            }
                                          }}
                                          className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                                            isSubUploaded
                                              ? 'bg-white border-[#D8CCBA] hover:border-[#111111] hover:shadow-xs cursor-pointer'
                                              : 'bg-[#F8F5EE]/40 border-dashed border-[#D8CCBA] opacity-60 cursor-not-allowed'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <span className="px-2 py-0.5 rounded-md bg-[#111111] text-[#F8F5EE] text-[9px] font-bold uppercase tracking-wider inline-block mb-1">
                                                Submission {sub.submissionNumber}
                                              </span>
                                              <h6 className="font-serif font-bold text-xs text-[#111111] line-clamp-1">
                                                {sub.title}
                                              </h6>
                                              {sub.submissionDate && (
                                                <span className="text-[10px] text-[#75695A] block mt-0.5">
                                                  Date: {sub.submissionDate}
                                                </span>
                                              )}
                                            </div>

                                            {/* Status Badge */}
                                            <div>
                                              {isSubUploaded ? (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-flex items-center gap-1 ${
                                                  isSubApproved
                                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                                    : isSubRevision
                                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                                    : isSubPending
                                                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                                                    : 'bg-rose-50 text-rose-900 border-rose-200'
                                                }`}>
                                                  {isSubApproved && <CheckCircle2 size={10} className="text-emerald-700" />}
                                                  {isSubRevision && <RotateCcw size={10} className="text-amber-600" />}
                                                  {isSubPending && <Clock size={10} className="text-blue-600" />}
                                                  <span>{sub.status}</span>
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EDE7DB] text-[#75695A] border border-[#D8CCBA]">
                                                  Not Uploaded
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Footer: Marks & View Details */}
                                          <div className="flex items-center justify-between pt-2 border-t border-[#D8CCBA]/60 text-xs">
                                            <div>
                                              {sub.hasMarks ? (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-extrabold text-[10px]">
                                                  Marks: {sub.marksScore}/100
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-[#75695A] italic">
                                                  Marks: Unassigned
                                                </span>
                                              )}
                                            </div>

                                            {isSubUploaded && (
                                              <span className="text-[11px] font-bold text-[#111111] hover:underline flex items-center gap-1">
                                                <span>View Details</span>
                                                <Eye size={12} />
                                              </span>
                                            )}
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. SUBMISSION DETAILS MODAL: Exact submitted details or red "Not Submitted" */}
      {detailModalOpen && activeTeamForModal && activeSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-3xl rounded-3xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Top Header */}
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs shadow-2xs">
                  Team #{activeTeamForModal.teamNumber}
                </span>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#111111] truncate max-w-md sm:max-w-lg">
                    {getSubmissionTitle(activeTeamForModal.projectTitle)}
                  </h3>
                  <p className="text-[11px] text-[#75695A] font-semibold">
                    Class {activeTeamForModal.classSection || `${activeTeamForModal.class}-${activeTeamForModal.section}`} &bull; Submission {activeSubModal.submissionNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Deliverables and Details */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Submission Status Pill & Marks */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA]">
                <div>
                  <span className="text-[10px] text-[#75695A] font-bold uppercase block">Milestone Title</span>
                  <span className="font-serif font-bold text-[#111111] text-xs">
                    Submission {activeSubModal.submissionNumber} - {activeSubModal.title}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#75695A] font-bold uppercase block">Awarded Score</span>
                  {activeSubModal.hasMarks ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs inline-block">
                      {activeSubModal.marksScore} / 100
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Guide Remarks if evaluated */}
              {(activeSubModal.marksRemarks || activeSubModal.guideRemarks) && (
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block">
                    Guide Evaluation Remarks
                  </span>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    {activeSubModal.marksRemarks || activeSubModal.guideRemarks}
                  </p>
                </div>
              )}

              {/* 1. Project Title */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-[#D8CCBA]">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Project Title
                </h4>
                {activeTeamForModal.projectTitle && activeTeamForModal.projectTitle.trim() ? (
                  <p className="text-xs font-bold text-[#111111] leading-relaxed">
                    {getSubmissionTitle(activeTeamForModal.projectTitle)}
                  </p>
                ) : (
                  <span className="text-rose-600 font-bold text-xs">Not Submitted</span>
                )}
              </div>

              {/* 2. Problem Statement */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-[#D8CCBA]">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Problem Statement
                </h4>
                {activeSubModal.problemStatement && activeSubModal.problemStatement.trim() ? (
                  <p className="text-xs text-[#111111] leading-relaxed">
                    {activeSubModal.problemStatement}
                  </p>
                ) : (
                  <span className="text-rose-600 font-bold text-xs">Not Submitted</span>
                )}
              </div>

              {/* 3. Proposed Solution */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-[#D8CCBA]">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Proposed Solution &amp; Technical Approach
                </h4>
                {activeSubModal.proposedSolution && activeSubModal.proposedSolution.trim() ? (
                  <p className="text-xs text-[#111111] leading-relaxed">
                    {activeSubModal.proposedSolution}
                  </p>
                ) : (
                  <span className="text-rose-600 font-bold text-xs">Not Submitted</span>
                )}
              </div>

              {/* 4. Abstract */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-[#D8CCBA]">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Executive Abstract
                </h4>
                {activeSubModal.abstractSummary && activeSubModal.abstractSummary.trim() ? (
                  <p className="text-xs text-[#111111] leading-relaxed">
                    {activeSubModal.abstractSummary}
                  </p>
                ) : (
                  <span className="text-rose-600 font-bold text-xs">Not Submitted</span>
                )}
              </div>

              {/* 5. Technologies */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-[#D8CCBA]">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Technologies &amp; Frameworks
                </h4>
                {Array.isArray(activeSubModal.technologiesUsed) && activeSubModal.technologiesUsed.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {activeSubModal.technologiesUsed.map((tech, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-[#F8F5EE] border border-[#D8CCBA] text-[#111111] text-[11px] font-bold">
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-rose-600 font-bold text-xs">Not Submitted</span>
                )}
              </div>

              {/* 6. Artifacts: Presentation PPT, PDF, GitHub, Demo */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Submitted Deliverables &amp; Artifacts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  {/* Presentation PPT */}
                  <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <Presentation size={18} className="text-amber-700 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-[#111111] text-xs block truncate">Presentation Deck</span>
                        <span className="text-[10px] text-[#75695A]">PowerPoint (.pptx)</span>
                      </div>
                    </div>
                    {activeSubModal.presentationFileName || activeSubModal.pptUrl || activeSubModal.presentationFile ? (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(`Team_${activeTeamForModal.teamNumber}_Submission_${activeSubModal.submissionNumber}.pptx`, 'ppt', activeSubModal, e)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#D8CCBA] hover:bg-[#EDE7DB] text-xs font-bold text-[#111111] flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    ) : (
                      <span className="text-rose-600 font-bold text-xs shrink-0">Not Submitted</span>
                    )}
                  </div>

                  {/* PDF Technical Report */}
                  <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText size={18} className="text-rose-700 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-[#111111] text-xs block truncate">Technical Report</span>
                        <span className="text-[10px] text-[#75695A]">Documentation (.pdf)</span>
                      </div>
                    </div>
                    {activeSubModal.reportUrl || activeSubModal.reportFile ? (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(`Team_${activeTeamForModal.teamNumber}_Submission_${activeSubModal.submissionNumber}.pdf`, 'pdf', activeSubModal, e)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#D8CCBA] hover:bg-[#EDE7DB] text-xs font-bold text-[#111111] flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    ) : (
                      <span className="text-rose-600 font-bold text-xs shrink-0">Not Submitted</span>
                    )}
                  </div>

                  {/* GitHub Repo */}
                  <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <Github size={18} className="text-[#111111] shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-[#111111] text-xs block truncate">Source Code Repo</span>
                        <span className="text-[10px] text-[#75695A] truncate block">{activeSubModal.githubUrl || 'Repository URL'}</span>
                      </div>
                    </div>
                    {activeSubModal.githubUrl && activeSubModal.githubUrl.trim() ? (
                      <a
                        href={activeSubModal.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#D8CCBA] hover:bg-[#EDE7DB] text-xs font-bold text-[#111111] flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>Open</span>
                      </a>
                    ) : (
                      <span className="text-rose-600 font-bold text-xs shrink-0">Not Submitted</span>
                    )}
                  </div>

                  {/* Live Demo */}
                  <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <ExternalLink size={18} className="text-emerald-700 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-[#111111] text-xs block truncate">Live Prototype</span>
                        <span className="text-[10px] text-[#75695A] truncate block">{activeSubModal.liveDemoUrl || 'Deployment Link'}</span>
                      </div>
                    </div>
                    {activeSubModal.liveDemoUrl && activeSubModal.liveDemoUrl.trim() ? (
                      <a
                        href={activeSubModal.liveDemoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#D8CCBA] hover:bg-[#EDE7DB] text-xs font-bold text-[#111111] flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>Launch</span>
                      </a>
                    ) : (
                      <span className="text-rose-600 font-bold text-xs shrink-0">Not Submitted</span>
                    )}
                  </div>

                </div>
              </div>

              {/* 7. Assigned Milestone Evaluation & Individual Student Marks Breakdown */}
              {(() => {
                const subNum = activeSubModal.submissionNumber || (activeSubModal.weekNumber !== undefined ? activeSubModal.weekNumber + 1 : 1);
                const memberRolls = activeTeamForModal.members?.map(m => m.rollNo);
                const marksRec = MarksService.getWeeklyMarks(activeTeamForModal.teamId, subNum, memberRolls) ||
                                 MarksService.getWeeklyMarks(activeTeamForModal.teamId, activeSubModal.weekNumber, memberRolls) ||
                                 (subNum === 1 || activeSubModal.weekNumber === 0 ? MarksService.getWeeklyMarks(activeTeamForModal.teamId, 0, memberRolls) : null);
                if (!marksRec) return null;

                return (
                  <div className="space-y-3 p-4 rounded-2xl bg-[#EBF0E9] border border-[#BFCEB9]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award size={16} className="text-[#4A5844]" />
                        <h4 className="text-xs font-serif font-bold text-[#111111] uppercase tracking-wider">
                          Evaluation Scores &amp; Individual Student Marks
                        </h4>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-white border border-[#BFCEB9] font-extrabold text-xs text-[#4A5844]">
                        Team Average: {marksRec.teamAverage} / 100
                      </span>
                    </div>

                    {/* Individual Marks Roster */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(activeTeamForModal.members || []).map((member) => {
                        const mScore = marksRec.memberMarks?.[member.rollNo] ?? marksRec.teamAverage;
                        return (
                          <div key={member.rollNo} className="p-2.5 bg-white rounded-xl border border-[#BFCEB9] flex items-center justify-between gap-2">
                            <div className="truncate">
                              <span className="font-bold text-[#111111] text-xs block truncate">{member.name}</span>
                              <span className="font-mono text-[10px] text-[#75695A]">{member.rollNo}</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-[#EBF0E9] border border-[#BFCEB9] font-extrabold text-xs text-[#4A5844] shrink-0">
                              {mScore} / 100
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {marksRec.remarks && (
                      <p className="text-xs text-[#4A5844] font-medium pt-1 border-t border-[#BFCEB9]/60 italic">
                        &ldquo;{marksRec.remarks}&rdquo; &bull; Evaluated by {marksRec.gradedBy}
                      </p>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer */}
            <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MyTeams;
