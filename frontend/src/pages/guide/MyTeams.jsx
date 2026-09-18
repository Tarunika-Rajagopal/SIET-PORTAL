import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, CheckCircle2, Clock, AlertCircle, 
  ExternalLink, Github, FileText, FileCode, Download, Calendar, 
  X, Check, AlertTriangle, ArrowRight, ArrowLeft, User, Send, 
  CheckSquare, Lock, Award, Bell, Presentation, Image as ImageIcon,
  XCircle
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { MarksService } from '../../services/marksService';
import { StudentService } from '../../services/studentService';
import NotifyTeamModal from '../../components/guide/NotifyTeamModal';

export const ALL_WEEKS = [
  { weekNumber: 0, defaultTitle: 'Project Initiation & Title Proposal' },
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
  const { teams = [], notifyTeam } = useGuide();

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  
  // Selected team state (defaults to null so initially only teams and members are shown)
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // Week selector for inspecting Advisor Marks (Week-wise, defaults to current academic week)
  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();
  const [marksViewWeek, setMarksViewWeek] = useState(() => currentAcademicWeek);
  const [, setMarksTick] = useState(0);

  // Available weeks strictly until current week
  const availableWeeks = useMemo(() => {
    return Array.from({ length: currentAcademicWeek + 1 }, (_, i) => i);
  }, [currentAcademicWeek]);

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

  // Active week detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeWeekSub, setActiveWeekSub] = useState(null);
  const [downloadToast, setDownloadToast] = useState(null);

  // Notify team modal state
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyTargetTeam, setNotifyTargetTeam] = useState(null);

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

  // Filter teams by batch, class and search
  const filteredTeams = teams.filter(team => {
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
      (team.members || []).some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q));

    return matchesClass && matchesBatch && matchesSearch;
  });

  // Selected team object (only exists when a team has been clicked)
  const activeTeam = teams.find(t => t.teamId === selectedTeamId) || null;

  // Auto-align selected milestone marks week with current week
  useEffect(() => {
    if (activeTeam) {
      if (marksViewWeek > currentAcademicWeek) {
        setMarksViewWeek(currentAcademicWeek);
      }
    }
  }, [selectedTeamId, activeTeam?.teamId, currentAcademicWeek]);

  // Map weeks up to current week for active team
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
      abstractSummary: '',
      obstaclesFaced: '',
      nextWeekPlan: '',
      technologiesUsed: activeTeam?.technologiesUsed || []
    };
  });

  // Open week detail modal (view-only)
  const handleOpenWeek = (sub) => {
    setActiveWeekSub(sub);
    setDetailModalOpen(true);
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
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#111111] tracking-tight">
            Assigned Capstone Teams
          </h1>
          <p className="text-xs text-[#75695A] mt-0.5">
            View assigned teams, inspect student rosters, advisor marks, and weekly milestone submissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-bold shadow-2xs">
            {teams.length} Assigned Teams
          </span>
        </div>
      </div>

      {/* 2. Controls Toolbar: Filter option based on CLASSES (not based on status) */}
      <div className="bg-white p-4 rounded-2xl border border-[#D8CCBA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by team number, student, project title..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch-based Filter Dropdown */}
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

          {/* Class-based Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#75695A] hidden sm:inline">Class:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
            >
              <option value="ALL">All Classes ({teams.length})</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh page"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-slate-700 hover:text-black border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh page"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 3. CONDITIONAL RENDERING: 
          If NO team is clicked at starting -> ONLY show the team and the members.
          If a team IS clicked -> ONLY show the marks assigned by advisor and their weekly submission.
      */}

      {!activeTeam ? (
        /* ================= STATE A: NO TEAM CLICKED (ONLY TEAM & MEMBERS) ================= */
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-mint-600" />
              <span>Assigned Teams &amp; Members ({filteredTeams.length} Teams)</span>
            </span>
            <span className="text-xs text-[#75695A]">
              Click any team to view advisor marks &amp; weekly submissions
            </span>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#D8CCBA] p-12 text-center text-[#75695A] space-y-2 shadow-xs">
              <Search size={24} className="mx-auto text-[#75695A]" />
              <p className="font-bold text-[#111111] text-sm">No teams found matching your batch, class or search filters.</p>
              <p className="text-xs text-[#75695A]">Try selecting "All Batches" and "All Classes" or clearing the search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTeams.map((team) => {
                const teamClass = team.classSection || `${team.class}-${team.section}`;

                return (
                  <div
                    key={team.teamId}
                    onClick={() => setSelectedTeamId(team.teamId)}
                    className="bg-white rounded-3xl border border-[#D8CCBA] shadow-xs hover:border-[#111111] transition cursor-pointer overflow-hidden group"
                  >
                    {/* Team Header */}
                    <div className="p-5 border-b border-[#D8CCBA] bg-[#F8F5EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs shadow-2xs">
                          Team #{team.teamNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#D8CCBA] text-[#111111] text-xs font-bold">
                          Class {teamClass}
                        </span>
                        <span className="text-[#75695A] text-xs font-medium">
                          &bull; Batch {team.batch}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const isApp = team.titleStatus === 'Approved';
                          const isNoSub = team.titleStatus === 'No Submission' || (!team.projectTitle && !isApp);
                          const isPending = !isApp && !isNoSub;

                          return (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                              isApp
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-[#F8F5EE] text-[#75695A] border-[#D8CCBA]'
                            }`}>
                              {isApp && <CheckCircle2 size={11} className="text-emerald-700" />}
                              {isPending && <Clock size={11} className="text-amber-600" />}
                              {isNoSub && <XCircle size={11} className="text-[#75695A]" />}
                              <span>{isApp ? 'Approved' : isPending ? 'Pending' : 'No Submission'}</span>
                            </span>
                          );
                        })()}
                        <span className="text-xs font-bold text-[#111111] group-hover:underline flex items-center gap-1">
                          <span>View Marks &amp; Submissions</span>
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>

                    {/* Team Title */}
                    <div className="px-6 py-4 bg-white border-b border-[#D8CCBA]">
                      <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                        Project Title
                      </span>
                      <h3 className="text-sm sm:text-base font-serif font-bold text-[#111111] leading-snug">
                        {team.projectTitle ? (
                          team.projectTitle
                        ) : (
                          <span className="text-slate-400 italic font-normal">Awaiting Student Title Proposal Submission</span>
                        )}
                      </h3>
                      <p className="text-[11px] text-[#75695A] mt-1">
                        Class Advisor: <strong className="text-[#111111]">{team.advisor}</strong>
                      </p>
                    </div>

                    {/* Team Members List (Only Team & Members shown) */}
                    <div className="p-6 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={14} className="text-[#111111]" />
                          <span>Enrolled Students ({team.members?.length || 4} Members)</span>
                        </h4>
                        <span className="text-[11px] text-[#75695A]">Click card to drill down</span>
                      </div>

                      <div className="border border-[#D8CCBA] rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#EDE7DB] text-[#111111] uppercase font-bold text-[10px] border-b border-[#D8CCBA]">
                            <tr>
                              <th className="p-3">Roll No</th>
                              <th className="p-3">Student Name</th>
                              <th className="p-3">Role</th>
                              <th className="p-3">Institutional Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D8CCBA] font-medium">
                            {(team.members || []).map((m, idx) => {
                              const isLead = m.name === team.teamLeader || m.role?.toLowerCase().includes('lead');
                              return (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F5EE]/60'}>
                                  <td className="p-3 font-mono font-bold text-[#111111]">{m.rollNo}</td>
                                  <td className="p-3 font-bold text-[#111111]">{m.name}</td>
                                  <td className="p-3">
                                    {isLead ? (
                                      <span className="px-2 py-0.5 rounded text-[9px] bg-[#111111] text-[#F8F5EE] font-black uppercase">
                                        Team Lead
                                      </span>
                                    ) : (
                                      <span className="text-[#75695A] text-[11px]">Member</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-[#75695A] font-mono text-[11px]">{m.email}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= STATE B: TEAM CLICKED (ONLY ADVISOR MARKS & WEEKLY SUBMISSION) ================= */
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top Bar: Back to All Teams Navigation & Active Team Switcher */}
          <div className="bg-white p-4 rounded-2xl border border-[#D8CCBA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedTeamId(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#111111] bg-[#F8F5EE] hover:bg-[#EDE7DB] border border-[#D8CCBA] transition flex items-center gap-2 cursor-pointer self-start"
            >
              <ArrowLeft size={16} />
              <span>Back to All Teams</span>
            </button>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-[#75695A] whitespace-nowrap">Switch Team:</span>
              {filteredTeams.map((t) => (
                <button
                  key={t.teamId}
                  onClick={() => setSelectedTeamId(t.teamId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    t.teamId === activeTeam.teamId
                      ? 'bg-[#111111] text-[#F8F5EE] shadow-xs'
                      : 'bg-[#F8F5EE] text-[#111111] hover:bg-[#EDE7DB] border border-[#D8CCBA]'
                  }`}
                >
                  Team #{t.teamNumber} ({t.classSection || `${t.class}-${t.section}`})
                </button>
              ))}
            </div>
          </div>

          {/* Active Team Summary Banner */}
          <div className="bg-white p-6 rounded-3xl border border-[#D8CCBA] shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs">
                  Team #{activeTeam.teamNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#F8F5EE] border border-[#D8CCBA] text-[#111111] text-xs font-bold">
                  Class {activeTeam.classSection || `${activeTeam.class}-${activeTeam.section}`} &bull; {activeTeam.batch}
                </span>
                <span className="text-xs text-[#75695A]">
                  Lead: <strong className="text-[#111111]">{activeTeam.teamLeader}</strong> ({activeTeam.leaderRollNo})
                </span>
              </div>

              {(() => {
                const isApp = activeTeam.titleStatus === 'Approved';
                const isNoSub = activeTeam.titleStatus === 'No Submission' || (!activeTeam.projectTitle && !isApp);
                const isPending = !isApp && !isNoSub;

                return (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                    isApp
                      ? 'bg-mint-100 text-mint-900 border-mint-200'
                      : isPending
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isApp && <CheckCircle2 size={13} className="text-mint-700" />}
                    {isPending && <Clock size={13} className="text-amber-600" />}
                    {isNoSub && <XCircle size={13} className="text-slate-400" />}
                    <span>{isApp ? 'Approved' : isPending ? 'Pending' : 'No Submission'}</span>
                  </span>
                );
              })()}
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {activeTeam.projectTitle || <span className="text-slate-400 italic">No Title Submitted Yet</span>}
            </h2>

            {/* If the team was rejected, the reason behind rejection is prominently displayed */}
            {activeTeam.titleStatus === 'Rejected' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-extrabold text-rose-800 uppercase tracking-wider text-[11px]">
                  <AlertCircle size={15} className="text-rose-600 shrink-0" />
                  <span>Project Scope Endorsement: Rejected (Revision Required)</span>
                </div>
                <p className="text-rose-950 font-medium pl-6 leading-relaxed">
                  <strong>Mandated Revision Reason:</strong> &ldquo;{activeTeam.rejectionReason || 'Project scope and problem statement lack technical benchmarks. Revisions mandated before approval.'}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* 1. Marks Assigned by Advisor (Week-wise) */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#D8CCBA] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CCBA] pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-2xs shrink-0 mt-0.5">
                  <Award size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-[#111111]">
                      Marks Assigned by Class Advisor
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[10px] font-bold uppercase">
                      Team #{activeTeam.teamNumber}
                    </span>
                  </div>
                  <p className="text-xs text-[#75695A] mt-0.5">
                    Official milestone evaluations recorded by Class Advisor <strong>{activeTeam.advisor || 'Dr. R. Karthikeyan'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F8F5EE] border border-[#D8CCBA] text-[#75695A] text-xs font-bold shadow-2xs shrink-0 self-start sm:self-center">
                <Lock size={13} className="text-[#75695A]" />
                <span>Read-Only</span>
              </div>
            </div>

            {/* Week Selector Tabs */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">
                Select Milestone Week to Inspect Advisor Marks:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {availableWeeks.map((w) => {
                  const isSelected = w === marksViewWeek;
                  const wMarks = MarksService.getWeeklyMarks(activeTeam.teamId, w);

                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setMarksViewWeek(w)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-[#111111] text-[#F8F5EE] shadow-sm font-bold'
                          : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]'
                      }`}
                    >
                      <span>Week {w}</span>
                      {wMarks ? (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          isSelected ? 'bg-white text-[#111111]' : 'bg-[#EDE7DB] text-[#111111]'
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
                  <div className="p-8 text-center bg-[#F8F5EE] rounded-2xl border border-dashed border-[#D8CCBA] space-y-2">
                    <AlertCircle size={24} className="mx-auto text-[#75695A]" />
                    <p className="font-bold text-[#111111] text-xs">
                      No Marks Assigned Yet for Week {marksViewWeek}
                    </p>
                    <p className="text-[11px] text-[#75695A] max-w-sm mx-auto">
                      Class Advisor has not yet finalized evaluation rubrics and scores for this sprint week.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Mark summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA]">
                      <span className="text-[10px] font-bold text-[#75695A] uppercase block">Team Average</span>
                      <span className="text-xl font-bold text-[#111111]">{marks.teamAverage} / 100</span>
                    </div>
                    <div className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA]">
                      <span className="text-[10px] font-bold text-[#75695A] uppercase block">Evaluated By</span>
                      <span className="text-xs font-bold text-[#111111] truncate block">{marks.gradedBy || marks.evaluatedBy || activeTeam.advisor}</span>
                    </div>
                    <div className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA]">
                      <span className="text-[10px] font-bold text-[#75695A] uppercase block">Status</span>
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-700" />
                        <span>Finalized</span>
                      </span>
                    </div>
                    <div className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA]">
                      <span className="text-[10px] font-bold text-[#75695A] uppercase block">Evaluation Date</span>
                      <span className="text-xs font-bold text-[#111111]">
                        {marks.gradedAt ? new Date(marks.gradedAt).toLocaleDateString('en-GB') : (marks.date || 'Recorded')}
                      </span>
                    </div>
                  </div>

                  {/* Individual Student Scores */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
                      Individual Student Marks (Week {marksViewWeek}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(activeTeam.members || []).map((m, idx) => {
                        const score = marks.memberMarks?.[m.rollNo] ?? marks.studentScores?.[m.rollNo] ?? marks.teamAverage;
                        return (
                          <div 
                            key={idx}
                            className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] flex flex-col justify-between gap-2 shadow-2xs"
                          >
                            <div>
                              <span className="font-bold text-[#111111] text-xs block truncate">{m.name}</span>
                              <span className="text-[10px] text-[#75695A] font-mono">{m.rollNo}</span>
                            </div>
                            <div className="pt-2 border-t border-[#D8CCBA] flex items-center justify-between">
                              <span className="text-[10px] text-[#75695A] font-bold">Week {marksViewWeek} Mark:</span>
                              <span className="px-2 py-0.5 rounded-lg bg-[#EDE7DB] text-[#111111] font-bold text-xs border border-[#D8CCBA]">
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
                    <div className="p-4 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] text-xs space-y-1">
                      <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">
                        Class Advisor Evaluation Critique &amp; Remarks:
                      </span>
                      <p className="text-[#111111] font-medium italic leading-relaxed">
                        &ldquo;{marks.remarks}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 2. Their Weekly Submissions */}
          <div className="bg-white rounded-3xl shadow-xs border border-[#D8CCBA] overflow-hidden">
            <div className="p-5 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#111111] uppercase tracking-wider">
                  Weekly Sprint Submissions
                </span>
                <span className="text-[11px] font-bold text-[#111111] bg-[#EDE7DB] px-2.5 py-0.5 rounded-full border border-[#D8CCBA]">
                  {(activeTeam.submissions || []).length} Weeks Logged
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Click any week to view student deliverables
              </span>
            </div>

            <div className="divide-y divide-[#D8CCBA]">
              {weeksToRender.map((sub) => {
                const isUploaded = sub.isUploaded;
                const isApproved = sub.evaluationStatus === 'Approved' || activeTeam?.titleStatus === 'Approved';
                const isNoSubmission = !isUploaded;
                const isPending = isUploaded && !isApproved;

                return (
                  <div
                    key={sub.weekNumber}
                    onClick={() => handleOpenWeek(sub)}
                    className="p-5 sm:p-6 hover:bg-mint-50/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Week Badge */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs transition group-hover:scale-105 ${
                        isApproved
                          ? 'bg-emerald-500 text-white'
                          : isPending
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        W{sub.weekNumber}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-mint-800 transition">
                            {sub.title}
                          </h4>
                          
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-flex items-center gap-1 ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isPending
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {isApproved && <CheckCircle2 size={11} className="text-emerald-700" />}
                            {isPending && <Clock size={11} className="text-amber-600" />}
                            {isNoSubmission && <XCircle size={11} className="text-slate-400" />}
                            <span>{isApproved ? 'Approved' : isPending ? 'Pending' : 'No Submission'}</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium text-xs">
                          {isUploaded ? (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar size={13} className="text-slate-400" />
                                <span>Submitted on {sub.submissionDate || 'N/A'}</span>
                              </span>

                              {sub.pptUrl && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-mint-700 font-bold flex items-center gap-1 font-mono">
                                    <FileText size={13} />
                                    <span>{sub.presentationFileName || `Milestone_W${sub.weekNumber}.pptx`}</span>
                                  </span>
                                </>
                              )}

                              {sub.reportUrl && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-rose-700 font-bold flex items-center gap-1 font-mono">
                                    <FileCode size={13} />
                                    <span>PDF Dossier</span>
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              <span>Deliverables not uploaded yet &bull; Awaiting student team upload</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWeek(sub);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs ${
                          !isUploaded 
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                            : 'bg-mint-50 hover:bg-mint-100 text-mint-900 border border-mint-200'
                        }`}
                      >
                        <span>View Deliverables</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Week Submission Inspection Modal (View-Only, Red 'Not Submitted' badges, Notify option) */}
      {detailModalOpen && activeWeekSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-[#D8CCBA] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-[#F8F5EE] bg-[#111111] shadow-2xs">
                  W{activeWeekSub.weekNumber}
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#111111] leading-snug">
                    Week {activeWeekSub.weekNumber}: {activeWeekSub.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#75695A]">
                    <span>Team #{activeTeam?.teamNumber} &bull; {activeTeam?.projectTitle}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body: View what they have submitted, Red Not Submitted badges */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#111111] flex-1">
              
              {/* Sprint Abstract */}
              <div className="p-4 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111111] text-xs">Sprint Abstract &amp; Milestone Summary:</span>
                  {activeWeekSub.abstractSummary ? (
                    <span className="text-emerald-800 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Submitted</span>
                  ) : (
                    <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">Not Submitted</span>
                  )}
                </div>
                {activeWeekSub.abstractSummary && (
                  <p className="text-[#111111] leading-relaxed text-xs">
                    {activeWeekSub.abstractSummary}
                  </p>
                )}
              </div>

              {/* Technical Report & Presentation Slides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PPT */}
                <div className="p-4 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111111] text-xs flex items-center gap-1.5">
                      <Presentation size={14} className="text-amber-700" />
                      <span>Sprint Presentation (PPT)</span>
                    </span>
                    {activeWeekSub.pptUrl ? (
                      <span className="text-emerald-800 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Submitted</span>
                    ) : (
                      <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">Not Submitted</span>
                    )}
                  </div>
                  {activeWeekSub.pptUrl && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-[#111111] text-[11px] truncate">
                        {activeWeekSub.presentationFileName || `SIET_Milestone_W${activeWeekSub.weekNumber}.pptx`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(activeWeekSub.presentationFileName || `Milestone_W${activeWeekSub.weekNumber}.pptx`, 'ppt', activeWeekSub, e)}
                        className="px-2.5 py-1 bg-white border border-[#D8CCBA] hover:bg-[#EDE7DB] rounded-lg text-[#111111] font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  )}
                </div>

                {/* Report PDF */}
                <div className="p-4 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111111] text-xs flex items-center gap-1.5">
                      <FileText size={14} className="text-rose-700" />
                      <span>Technical Report (PDF)</span>
                    </span>
                    {activeWeekSub.reportUrl ? (
                      <span className="text-emerald-800 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Submitted</span>
                    ) : (
                      <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">Not Submitted</span>
                    )}
                  </div>
                  {activeWeekSub.reportUrl && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-[#111111] text-[11px] truncate">
                        Technical_Dossier_W{activeWeekSub.weekNumber}.pdf
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(`Technical_Dossier_W${activeWeekSub.weekNumber}.pdf`, 'pdf', activeWeekSub, e)}
                        className="px-2.5 py-1 bg-white border border-[#D8CCBA] hover:bg-[#EDE7DB] rounded-lg text-[#111111] font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware / Prototype Captures */}
              <div className="p-4 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111111] text-xs flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-[#111111]" />
                    <span>Prototype Captures &amp; Bench Visuals</span>
                  </span>
                  {activeWeekSub.images && activeWeekSub.images.length > 0 ? (
                    <span className="text-emerald-800 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Submitted</span>
                  ) : (
                    <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">Not Submitted</span>
                  )}
                </div>
                {activeWeekSub.images && activeWeekSub.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {activeWeekSub.images.map((img, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-[#D8CCBA] aspect-video">
                        <img src={img} alt="Capture" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Obstacles & Next Week Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111111] text-xs">Obstacles Faced:</span>
                    {activeWeekSub.obstaclesFaced || activeWeekSub.problemsFaced ? (
                      <span className="text-emerald-800 font-bold text-[10px]">Submitted</span>
                    ) : (
                      <span className="text-rose-700 font-bold text-[10px]">Not Submitted</span>
                    )}
                  </div>
                  {(activeWeekSub.obstaclesFaced || activeWeekSub.problemsFaced) && (
                    <p className="text-[#111111] text-xs leading-relaxed">
                      {activeWeekSub.obstaclesFaced || activeWeekSub.problemsFaced}
                    </p>
                  )}
                </div>

                <div className="p-3.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111111] text-xs">Next Week Sprint Plan:</span>
                    {activeWeekSub.nextWeekPlan ? (
                      <span className="text-emerald-800 font-bold text-[10px]">Submitted</span>
                    ) : (
                      <span className="text-rose-700 font-bold text-[10px]">Not Submitted</span>
                    )}
                  </div>
                  {activeWeekSub.nextWeekPlan && (
                    <p className="text-[#111111] text-xs leading-relaxed">
                      {activeWeekSub.nextWeekPlan}
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer: NO approval or reject option, just View & Notify option */}
            <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  setNotifyTargetTeam(activeTeam);
                  setIsNotifyOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Bell size={14} className="text-amber-700" />
                <span>Notify Team (Week {activeWeekSub.weekNumber})</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Notify Team Modal */}
      <NotifyTeamModal
        isOpen={isNotifyOpen}
        onClose={() => setIsNotifyOpen(false)}
        team={notifyTargetTeam}
        onNotify={(teamId, data) => notifyTeam(teamId, data)}
      />

    </div>
  );
};

export default MyTeams;
