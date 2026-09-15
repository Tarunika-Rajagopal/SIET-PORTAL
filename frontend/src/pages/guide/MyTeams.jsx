import React, { useState } from 'react';
import { 
  Users, Search, RefreshCw, CheckCircle2, Clock, AlertCircle, 
  ExternalLink, Github, FileText, FileCode, Download, Calendar, 
  X, Check, AlertTriangle, ArrowRight, User, Send, CheckSquare,
  Lock, Award
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { MarksService } from '../../services/marksService';

export const ALL_WEEKS = [
  { weekNumber: 1, defaultTitle: 'Domain Exploration & Problem Formulation' },
  { weekNumber: 2, defaultTitle: 'Literature Survey & Feasibility Study' },
  { weekNumber: 3, defaultTitle: 'System Architecture & Requirements Specification' },
  { weekNumber: 4, defaultTitle: 'Hardware Component Selection & Circuit Schema' },
  { weekNumber: 5, defaultTitle: 'Module 1 Implementation & Core Testing' },
  { weekNumber: 6, defaultTitle: 'Module 2 Implementation & Protocol Integration' },
  { weekNumber: 7, defaultTitle: 'System Integration & Field Trial Diagnostics' },
  { weekNumber: 8, defaultTitle: 'Final Prototype Verification & Review 1 Pre-Audit' },
];

export const MyTeams = () => {
  const { teams, evaluateWeeklySubmission, requestWeeklyRevision, stats } = useGuide();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Selected team state (defaults to first team)
  const [selectedTeamId, setSelectedTeamId] = useState(() => teams[0]?.teamId || null);

  // Week selector for inspecting Advisor Marks (Week-wise)
  const [marksViewWeek, setMarksViewWeek] = useState(1);

  // Active week detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeWeekSub, setActiveWeekSub] = useState(null);
  const [guideRemarks, setGuideRemarks] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'revision'
  const [downloadToast, setDownloadToast] = useState(null);
  const [error, setError] = useState('');

  // Filter teams
  const filteredTeams = teams.filter(team => {
    const matchesStatus = statusFilter === 'ALL' || team.titleStatus === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      `team ${team.teamNumber}`.includes(q) ||
      `#${team.teamNumber}`.includes(q) ||
      team.projectTitle.toLowerCase().includes(q) ||
      team.teamLeader.toLowerCase().includes(q) ||
      team.leaderRollNo.includes(q);

    return matchesStatus && matchesSearch;
  });

  // Selected team object
  const activeTeam = teams.find(t => t.teamId === selectedTeamId) || filteredTeams[0] || teams[0];

  // Map weeks up to current week (showing submitted weeks as well as unuploaded weeks)
  const currentAcademicWeek = 6;
  const weeksToRender = ALL_WEEKS.filter(w => w.weekNumber <= currentAcademicWeek).map(w => {
    const existing = (activeTeam?.submissions || []).find(s => s.weekNumber === w.weekNumber);
    if (existing) {
      return { ...existing, isUploaded: true };
    }
    return {
      weekNumber: w.weekNumber,
      title: w.defaultTitle,
      isUploaded: false,
      evaluationStatus: 'Not Uploaded Yet',
      submissionDate: null,
      guideRemarks: '',
      abstract: 'Milestone deliverables have not been uploaded by the student team yet.',
      problemsFaced: '',
      technologiesUsed: activeTeam?.technologiesUsed || []
    };
  });

  // Open week detail modal
  const handleOpenWeek = (sub) => {
    setActiveWeekSub(sub);
    setGuideRemarks(sub.guideRemarks || '');
    setRevisionReason('');
    setActiveTab('review');
    setError('');
    setDetailModalOpen(true);
  };

  // Guide approves week
  const handleApproveWeek = () => {
    if (!activeTeam || !activeWeekSub) return;
    evaluateWeeklySubmission(activeTeam.teamId, activeWeekSub.weekNumber, guideRemarks);
    setDetailModalOpen(false);
  };

  // Guide requests technical revision
  const handleRevisionWeek = () => {
    if (!activeTeam || !activeWeekSub) return;
    if (!revisionReason.trim()) {
      setError('Please specify mandatory revision instructions for the students.');
      return;
    }
    requestWeeklyRevision(activeTeam.teamId, activeWeekSub.weekNumber, revisionReason.trim());
    setDetailModalOpen(false);
  };

  // Real file download for PPT and PDF matching student portal
  const handleDownloadFile = (fileName, fileType, sub, e) => {
    if (e) e.stopPropagation();

    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${activeTeam?.guide || 'Faculty Guide'}) >>
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
(Milestone Deliverable Dossier: Week ${sub.weekNumber} - ${sub.title}) Tj
0 -20 Td
(Project Title: ${activeTeam?.projectTitle || 'Capstone Project'}) Tj
0 -20 Td
(Lead Student: ${activeTeam?.teamLeader} | Roll No: ${activeTeam?.leaderRollNo}) Tj
0 -20 Td
(Project Guide: ${activeTeam?.guide || 'Faculty Guide'} | Status: ${sub.evaluationStatus}) Tj
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
Milestone: Week ${sub.weekNumber} - ${sub.title}
Project: ${activeTeam?.projectTitle || 'Capstone Project'}
Lead Student: ${activeTeam?.teamLeader} (${activeTeam?.leaderRollNo})
Project Guide: ${activeTeam?.guide || 'Faculty Guide'}
Submission Date: ${sub.submissionDate || 'N/A'}
Evaluation Status: ${sub.evaluationStatus}
Guide Feedback: ${sub.guideRemarks || 'Evaluated by Faculty Guide'}`;
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
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      
      {/* Toast */}
      {downloadToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Download size={14} className="text-mint-400" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Assigned Capstone Teams &amp; Weekly Milestone Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate, provide critique, and endorse each week's capstone milestone deliverables for your assigned teams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-xs font-extrabold shadow-xs">
            {teams.length} Assigned Teams
          </span>
        </div>
      </div>

      {/* 2. Controls Toolbar with Search, Filter & Refresh Button */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8E4] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by team number, student, project title..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-mint-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Statuses ({teams.length})</option>
            <option value="Approved">Approved Only ({stats.approvedTitlesCount})</option>
            <option value="Pending">Pending Review ({stats.pendingTitleApprovalsCount})</option>
            <option value="Rejected">Revision Required ({stats.rejectedTitlesCount})</option>
          </select>

          {/* Refresh button that reloads page */}
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
      </div>

      {/* 3. All Teams are Visible (Horizontal Selector / Cards) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            All Assigned Teams ({filteredTeams.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Select any team below to inspect student members and weekly submissions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTeams.map((team) => {
            const isSelected = activeTeam?.teamId === team.teamId;
            const isApproved = team.titleStatus === 'Approved';

            return (
              <div
                key={team.teamId}
                onClick={() => setSelectedTeamId(team.teamId)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-mint-50/50 border-mint-500 ring-2 ring-mint-400/30 shadow-md'
                    : 'bg-white border-[#E2E8E4] hover:border-mint-300 shadow-card hover:shadow-hover'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs">
                      Team #{team.teamNumber}
                    </span>
                    <span className="text-slate-500 text-[11px] font-semibold">
                      Class {team.class}-{team.section} &bull; {team.batch}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isApproved ? 'bg-mint-100 text-mint-900 border-mint-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    {team.titleStatus}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug">
                    {team.projectTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    Lead: <strong className="text-slate-700">{team.teamLeader}</strong> ({team.leaderRollNo})
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8E4] text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {team.members?.length || 4} Students &bull; {(team.submissions || []).length} Weeks Logged
                  </span>
                  {isSelected && (
                    <span className="text-mint-700 font-extrabold flex items-center gap-1">
                      <span>Active</span>
                      <Check size={13} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Team Overview: Team Members Visible (No Assigned Role) */}
      {activeTeam && (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] space-y-5 animate-fadeIn">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8E4]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs">
                  Team #{activeTeam.teamNumber}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Class {activeTeam.class}-{activeTeam.section} &bull; Batch {activeTeam.batch}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                {activeTeam.projectTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {activeTeam.problemStatement}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeTeam.githubUrl && (
                <a
                  href={activeTeam.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Github size={13} />
                  <span>GitHub</span>
                  <ExternalLink size={10} />
                </a>
              )}
              {activeTeam.liveDemoUrl && (
                <a
                  href={activeTeam.liveDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-900 border border-mint-200 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  <span>Live Demo</span>
                </a>
              )}
            </div>
          </div>

          {/* Team Members List (NO ASSIGNED ROLES - Just Name and Roll No) */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-mint-600" />
              <span>Enrolled Students ({activeTeam.members?.length || 4} Students)</span>
            </h4>

            <div className="border border-[#E2E8E4] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-slate-500 uppercase font-bold text-[10px] border-b border-[#E2E8E4]">
                  <tr>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E4] font-medium">
                  {(activeTeam.members || []).map((m, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="p-3 font-mono font-bold text-slate-900">{m.rollNo}</td>
                      <td className="p-3 font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.name === activeTeam.teamLeader && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-mint-100 text-mint-900 border border-mint-200 font-extrabold uppercase">
                            Lead
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{m.email}</td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{m.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 4.5. Advisor Milestone Marks (Week-wise View for Guide - Strictly Read-Only) */}
      {activeTeam && (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] space-y-5 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-mint-500 to-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
                <Award size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Class Advisor Milestone Marks (Week-wise)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-black uppercase">
                    Team #{activeTeam.teamNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official milestone evaluations assigned by Class Advisor <strong>{activeTeam.advisor || 'Dr. R. Karthikeyan'}</strong>
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
              {[1, 2, 3, 4, 5, 6, 7, 8].filter(w => w <= currentAcademicWeek).map((w) => {
                const isSelected = w === marksViewWeek;
                const wMarks = MarksService.getWeeklyMarks(activeTeam.teamId, w);

                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setMarksViewWeek(w)}
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
            const marks = MarksService.getWeeklyMarks(activeTeam.teamId, marksViewWeek);

            if (!marks) {
              return (
                <div className="p-8 rounded-2xl bg-slate-50/70 border border-dashed border-slate-300 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700">
                    Advisor has not entered marks for Week {marksViewWeek} yet.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Marks will be visible here once evaluated by Class Advisor ({activeTeam.advisor || 'Dr. R. Karthikeyan'}).
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
                      Team Milestone Assessment &bull; Week {marksViewWeek}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                      Calculated Team Score: <span className="text-mint-800">{marks.teamAverage}</span> / 100
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Evaluated by <strong>{marks.gradedBy || activeTeam.advisor || 'Class Advisor'}</strong>
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
                    Individual Student Marks &bull; Week {marksViewWeek} ({activeTeam.members?.length || 4} Students):
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
                              {m.name === activeTeam.teamLeader && (
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
                            <span className="text-[10px] text-slate-500 font-bold">Week {marksViewWeek} Mark:</span>
                            <span className="px-2 py-0.5 rounded-lg bg-mint-100 text-mint-950 font-black text-xs border border-mint-200">
                              {typeof score === 'number' ? `${score} / 100` : '-- / 100'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Advisor Feedback & Critique */}
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
      )}

      {/* 5. All the Weeks Visible (Formatted Identically to Student's My Submission) */}
      {activeTeam && (
        <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
          <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Weekly Sprint Submissions &amp; Milestone Audits
              </span>
              <span className="text-[11px] font-bold text-mint-800 bg-mint-100 px-2.5 py-0.5 rounded-full border border-mint-200">
                {(activeTeam.submissions || []).length} Weeks Logged
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Click any week to view student submission &amp; review or endorse
            </span>
          </div>

          <div className="divide-y divide-[#E2E8E4]">
            {weeksToRender.map((sub) => {
              const isEvaluated = sub.evaluationStatus === 'Evaluated';
              const isRevision = sub.evaluationStatus === 'Revision Required';
              const isUploaded = sub.isUploaded;

              return (
                <div
                  key={sub.weekNumber}
                  onClick={() => handleOpenWeek(sub)}
                  className="p-5 sm:p-6 hover:bg-mint-50/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    
                    {/* Week Badge */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs transition group-hover:scale-105 ${
                      !isUploaded ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                      isEvaluated ? 'bg-mint-500 text-white' :
                      isRevision ? 'bg-rose-500 text-white' :
                      'bg-amber-500 text-white'
                    }`}>
                      W{sub.weekNumber}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-mint-800 transition">
                          {sub.title}
                        </h4>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          !isUploaded ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          isEvaluated ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          isRevision ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {!isUploaded ? 'Not Uploaded Yet' : isEvaluated ? 'Evaluated & Endorsed' : isRevision ? 'Needs Technical Revision' : 'Pending Evaluation'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium text-xs">
                        {isUploaded ? (
                          <>
                            <span className="flex items-center gap-1">
                              <Calendar size={13} className="text-slate-400" />
                              <span>Submitted on {sub.submissionDate || 'N/A'}</span>
                            </span>

                            <span>&bull;</span>
                            <span className="text-mint-700 font-bold flex items-center gap-1 font-mono">
                              <FileText size={13} />
                              <span>SIET_Milestone_W{sub.weekNumber}.pptx</span>
                            </span>

                            <span>&bull;</span>
                            <span className="text-rose-700 font-bold flex items-center gap-1 font-mono">
                              <FileCode size={13} />
                              <span>PDF Dossier</span>
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            <span>Deliverables not uploaded yet &bull; Awaiting student team upload</span>
                          </span>
                        )}
                      </div>

                      {/* Technologies Used & Obstacles Faced info */}
                      {isUploaded && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          {activeTeam.technologiesUsed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EFF3F1] border border-[#E2E8E4] text-slate-700 font-semibold text-[10px]">
                              <span className="font-bold text-slate-500">Technologies:</span> <span className="font-mono">{activeTeam.technologiesUsed.slice(0, 3).join(', ')}</span>
                            </span>
                          )}
                          {sub.problemsFaced && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-800 text-[10px] font-semibold line-clamp-1 max-w-sm sm:max-w-md">
                              <span className="font-bold text-rose-900 shrink-0">Obstacles:</span> <span className="truncate">{sub.problemsFaced}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Brief Preview of Guide Comment */}
                      {isUploaded && sub.guideRemarks && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic mt-1">
                          &ldquo;{sub.guideRemarks}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenWeek(sub);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                        !isUploaded
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : !isEvaluated 
                          ? 'bg-mint-500 hover:bg-mint-600 text-white shadow-sm'
                          : 'bg-mint-50 hover:bg-mint-100 text-mint-900 border border-mint-200'
                      }`}
                    >
                      {!isUploaded ? (
                        <>
                          <Clock size={13} />
                          <span>Inspect Status</span>
                        </>
                      ) : !isEvaluated ? (
                        <>
                          <CheckSquare size={14} />
                          <span>Evaluate &amp; Approve</span>
                        </>
                      ) : (
                        <>
                          <span>Inspect Deliverables</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Comprehensive Week Submission & Guide Review Modal (Centrally Rendered) */}
      {detailModalOpen && activeWeekSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-[#E2E8E4] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm text-white shadow-xs ${
                  activeWeekSub.evaluationStatus === 'Evaluated' ? 'bg-mint-500' :
                  activeWeekSub.evaluationStatus === 'Revision Required' ? 'bg-rose-500' :
                  'bg-amber-500'
                }`}>
                  W{activeWeekSub.weekNumber}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    Week {activeWeekSub.weekNumber}: {activeWeekSub.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>Team #{activeTeam?.teamNumber} &bull; {activeTeam?.projectTitle}</span>
                    <span>&bull;</span>
                    <span className={`font-bold ${
                      activeWeekSub.evaluationStatus === 'Evaluated' ? 'text-emerald-700' :
                      activeWeekSub.evaluationStatus === 'Revision Required' ? 'text-rose-700' :
                      'text-amber-700'
                    }`}>
                      {activeWeekSub.evaluationStatus}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
              
              {/* Advisor Marks Summary (Visible to Guide, Advisor, HOD) */}
              {(() => {
                const marks = MarksService.getWeeklyMarks(activeTeam.teamId, activeWeekSub.weekNumber);
                if (!marks) return null;
                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50 to-emerald-50 border border-mint-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-mint-900 flex items-center gap-1.5">
                        <Award size={15} className="text-mint-700" />
                        <span>Class Advisor Milestone Evaluation &bull; Week {activeWeekSub.weekNumber}</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-mint-200 text-mint-950 font-black text-xs">
                        Team Average: {marks.teamAverage} / 100
                      </span>
                    </div>
                    {marks.remarks && (
                      <p className="text-slate-600 text-[11px] italic leading-relaxed">
                        Advisor Critique: &ldquo;{marks.remarks}&rdquo;
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {activeTeam.members?.map((m) => {
                        const score = marks.memberMarks?.[m.rollNo];
                        return (
                          <div key={m.rollNo} className="bg-white p-2 rounded-xl border border-mint-200 text-[11px]">
                            <div className="font-bold text-slate-800 truncate">{m.name}</div>
                            <div className="text-mint-900 font-black mt-0.5">
                              {typeof score === 'number' ? `${score} / 100` : '-- / 100'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Part 1: Review Made by Guide & Approval Actions */}
              <div className="bg-[#EFF3F1]/80 rounded-2xl p-5 border border-mint-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-mint-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Review by Faculty Guide
                      </span>
                      <span className="text-[10px] text-mint-700 font-bold">Faculty Research Mentorship</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase border ${
                    activeWeekSub.evaluationStatus === 'Evaluated' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    activeWeekSub.evaluationStatus === 'Revision Required' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {activeWeekSub.evaluationStatus}
                  </span>
                </div>

                {activeWeekSub.guideRemarks && (
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Recorded Guide Evaluation Critique &amp; Remarks:
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#E2E8E4]">
                      "{activeWeekSub.guideRemarks}"
                    </p>
                  </div>
                )}

                {/* Guide Weekly Approval / Revision Evaluation Form */}
                <div className="pt-2 border-t border-mint-200/60 space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('review'); setError(''); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        activeTab === 'review'
                          ? 'bg-mint-500 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-[#E2E8E4]'
                      }`}
                    >
                      Approve & Lock
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('revision'); setError(''); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        activeTab === 'revision'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-[#E2E8E4]'
                      }`}
                    >
                      Request Revision
                    </button>
                  </div>

                  {activeTab === 'review' ? (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-extrabold text-slate-700">
                        Faculty Guide Endorsement Remarks:
                      </label>
                      <textarea
                        rows={2}
                        value={guideRemarks}
                        onChange={(e) => setGuideRemarks(e.target.value)}
                        placeholder="e.g. Approved. Thorough documentation and verified prototype latency benchmarks..."
                        className="w-full p-3 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-mint-500"
                      />
                      <button
                        type="button"
                        onClick={handleApproveWeek}
                        className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={15} />
                        <span>Approve & Lock Milestone Week {activeWeekSub.weekNumber}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-extrabold text-rose-900">
                        Specify Technical Revision Remarks for Student Team:
                      </label>
                      <textarea
                        rows={2}
                        value={revisionReason}
                        onChange={(e) => {
                          setRevisionReason(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="e.g. Model latency exceeds acceptable 25ms threshold. Quantize neural network weights before Review 1..."
                        className="w-full p-3 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                      />
                      {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
                      <button
                        type="button"
                        onClick={handleRevisionWeek}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send size={15} />
                        <span>Request Revision - Send Instructions</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Part 2: Complete Submission by Students */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-[#E2E8E4] pb-2">
                  Complete Student Submission Details
                </h4>

                {/* Project Title */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Project Title
                  </span>
                  <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900">
                    {activeTeam.projectTitle}
                  </div>
                </div>

                {/* Problem Statement */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Problem Statement
                  </span>
                  <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                    {activeTeam.problemStatement}
                  </div>
                </div>

                {/* Proposed Solution */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Proposed Solution &amp; Technical Approach
                  </span>
                  <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                    {activeTeam.proposedSolution}
                  </div>
                </div>

                {/* Technologies Used */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Technologies Used
                  </span>
                  <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 font-mono font-bold">
                    {(activeTeam.technologiesUsed || []).join(', ')}
                  </div>
                </div>

                {/* Obstacles Faced */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Obstacles Faced
                  </span>
                  {activeWeekSub.problemsFaced ? (
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-slate-800 leading-relaxed">
                      {activeWeekSub.problemsFaced}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400 italic">
                      ✕ Not Uploaded / No Obstacles Reported
                    </div>
                  )}
                </div>

                {/* Abstract Summary */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Sprint Abstract Summary
                  </span>
                  <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                    {activeWeekSub.abstractSummary}
                  </div>
                </div>

                {/* Authentic Download Buttons for PPT & PDF */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    Submitted Milestone Deliverable Files
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* PPT Presentation Download */}
                    <div className="p-3.5 bg-[#EFF3F1]/70 border border-[#E2E8E4] rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block text-xs">
                            SIET_Milestone_W{activeWeekSub.weekNumber}.pptx
                          </span>
                          <span className="text-[10px] text-slate-500">PowerPoint Presentation</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(`SIET_Milestone_W${activeWeekSub.weekNumber}.pptx`, 'ppt', activeWeekSub, e)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-[#E2E8E4] font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>

                    {/* PDF Dossier Download */}
                    <div className="p-3.5 bg-[#EFF3F1]/70 border border-[#E2E8E4] rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                          <FileCode size={16} />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block text-xs">
                            Technical_Dossier_W{activeWeekSub.weekNumber}.pdf
                          </span>
                          <span className="text-[10px] text-slate-500">PDF Technical Dossier</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(`Technical_Dossier_W${activeWeekSub.weekNumber}.pdf`, 'pdf', activeWeekSub, e)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-[#E2E8E4] font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* External Repository & Live Demo Links */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {activeTeam.githubUrl && (
                    <a
                      href={activeTeam.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition"
                    >
                      <Github size={14} />
                      <span>{activeTeam.githubUrl}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {activeTeam.liveDemoUrl && (
                    <a
                      href={activeTeam.liveDemoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-mint-800 bg-mint-50 hover:bg-mint-100 border border-mint-200 px-3.5 py-2 rounded-xl transition"
                    >
                      <ExternalLink size={14} />
                      <span>{activeTeam.liveDemoUrl}</span>
                    </a>
                  )}
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-[#F8FAF9] px-6 py-3.5 border-t border-[#E2E8E4] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
              >
                Close Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MyTeams;
