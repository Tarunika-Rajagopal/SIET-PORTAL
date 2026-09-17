import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Calendar, CheckCircle2, Clock, AlertCircle, FileText, 
  Presentation, Image as ImageIcon, Github, ExternalLink, ArrowRight, 
  Users, Shield, CheckSquare, Eye, Download, Printer, Search, Filter,
  XCircle, Bell, Sparkles
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { StudentService } from '../../services/studentService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import WeeklyReviewDrawer from '../../components/guide/WeeklyReviewDrawer';
import DocumentPreviewModal from '../../components/guide/DocumentPreviewModal';
import ImageViewerModal from '../../components/guide/ImageViewerModal';

export const SubmissionHistory = () => {
  const { teams, facultyProfile, evaluateWeeklySubmission, requestWeeklyRevision } = useGuide();

  const [historyMode, setHistoryMode] = useState('guide-audit'); // 'guide-audit' | 'team-submissions'
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.teamId || 'team-1');

  // Active team object for team-submissions mode
  const activeTeam = teams.find(t => t.teamId === selectedTeamId) || teams[0];

  // Drawer / Modal States
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('report');

  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Guide Audit Logs State
  const [guideLogs, setGuideLogs] = useState(() => 
    AdvisorHistoryService.getGuideHistory(facultyProfile?.name)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    const syncLogs = () => {
      setGuideLogs(AdvisorHistoryService.getGuideHistory(facultyProfile?.name));
    };
    syncLogs();
    const unsub = AdvisorHistoryService.subscribe(syncLogs);
    window.addEventListener('siet_data_updated', syncLogs);
    return () => {
      unsub();
      window.removeEventListener('siet_data_updated', syncLogs);
    };
  }, [facultyProfile?.name]);

  const handleOpenReview = (sub) => {
    setSelectedSubmission(sub);
    setIsDrawerOpen(true);
  };

  const handleOpenDocPreview = (type) => {
    setDocType(type);
    setDocModalOpen(true);
  };

  const handleOpenImageViewer = (index) => {
    setActiveImgIndex(index);
    setImgModalOpen(true);
  };

  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();
  const submissions = (activeTeam?.submissions || []).filter(sub => sub.weekNumber <= currentAcademicWeek);

  // Filter Guide Logs
  const filteredLogs = useMemo(() => {
    return guideLogs.filter(log => {
      // 1. Action Type Filter
      if (actionFilter === 'APPROVAL') {
        const isApprove = log.actionType === 'Project Approval' && !log.details.toLowerCase().includes('reject');
        const isMilestoneApprove = log.actionType === 'Milestone Review' && log.details.toLowerCase().includes('approved');
        if (!isApprove && !isMilestoneApprove) return false;
      } else if (actionFilter === 'REJECTION') {
        const isReject = log.details.toLowerCase().includes('reject') || log.details.toLowerCase().includes('revision');
        if (!isReject) return false;
      } else if (actionFilter === 'NOTICES') {
        if (!log.actionType.includes('Notice')) return false;
      } else if (actionFilter === 'MILESTONES') {
        if (!log.actionType.includes('Milestone')) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTarget = (log.target || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchActor = (log.actorName || '').toLowerCase().includes(q);
        const matchAction = (log.actionType || '').toLowerCase().includes(q);
        return matchTarget || matchDetails || matchActor || matchAction;
      }

      return true;
    });
  }, [guideLogs, actionFilter, searchQuery]);

  // Download CSV Action
  const handleDownloadCsv = () => {
    if (guideLogs.length === 0) {
      alert("No guide audit history logs available to download.");
      return;
    }

    const headers = [
      "Log ID",
      "Timestamp",
      "Formatted Date",
      "Action Type",
      "Target / Team",
      "Details & Remarks",
      "Faculty Guide",
      "Class Section"
    ];

    const rows = filteredLogs.map(log => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${log.dateFormatted || log.date}"`,
      `"${log.actionType}"`,
      `"${(log.target || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${log.actorName || 'Faculty Guide'}"`,
      `"${log.classSection || 'CSE-B'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `faculty_guide_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const getLogBadge = (log) => {
    const det = (log.details || '').toLowerCase();
    const act = (log.actionType || '').toLowerCase();

    if (det.includes('rejected')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0">
          <XCircle size={12} className="text-rose-600" />
          <span>Title Rejected</span>
        </span>
      );
    }
    if (det.includes('needs revision') || det.includes('requested revision')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
          <AlertCircle size={12} className="text-amber-600" />
          <span>Revision Requested</span>
        </span>
      );
    }
    if (act.includes('notice') || det.includes('consultation')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1 shrink-0">
          <Bell size={12} className="text-sky-600" />
          <span>Notice Dispatched</span>
        </span>
      );
    }
    if (act.includes('milestone') && det.includes('approved')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
          <CheckSquare size={12} className="text-emerald-700" />
          <span>Milestone Approved</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-mint-100 text-mint-900 border border-mint-200 flex items-center gap-1 shrink-0">
        <CheckCircle2 size={12} className="text-mint-700" />
        <span>Title Approved</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      
      {/* 1. Page Header with Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            History &amp; Audit Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit Faculty Guide actions, approvals, rejections, consultation notices, and chronological team progress.
          </p>
        </div>

        {/* Segmented Mode Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E2E8E4] shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setHistoryMode('guide-audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              historyMode === 'guide-audit'
                ? 'bg-mint-500 text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:bg-mint-50'
            }`}
          >
            Guide Action History ({guideLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setHistoryMode('team-submissions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              historyMode === 'team-submissions'
                ? 'bg-mint-500 text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:bg-mint-50'
            }`}
          >
            Team Milestone Timeline
          </button>
        </div>
      </div>

      {/* Mode 1: Dedicated Guide Action History Log */}
      {historyMode === 'guide-audit' ? (
        <div className="space-y-4">
          {/* Controls Bar: Search, Action Filter, Download, Print */}
          <div className="bg-white p-4 rounded-3xl border border-[#E2E8E4] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guide history..."
                  className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-mint-500 focus:bg-white transition font-medium"
                />
              </div>

              {/* Action Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { key: 'ALL', label: 'All Actions' },
                  { key: 'APPROVAL', label: 'Approvals' },
                  { key: 'REJECTION', label: 'Rejections' },
                  { key: 'NOTICES', label: 'Notices' },
                  { key: 'MILESTONES', label: 'Milestones' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActionFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      actionFilter === tab.key
                        ? 'bg-mint-100 text-mint-900 border border-mint-300 shadow-2xs font-extrabold'
                        : 'bg-slate-50 text-slate-600 border border-[#E2E8E4] hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Download CSV & Print PDF */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E4] hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Print or Save PDF"
              >
                <Printer size={14} className="text-slate-500" />
                <span>Print Report</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-4 py-2 rounded-xl bg-mint-500 hover:bg-mint-600 text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Download Guide Audit History CSV"
              >
                <Download size={14} />
                <span>Download History (CSV)</span>
              </button>
            </div>
          </div>

          {/* Audit Logs List */}
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E2E8E4] p-12 text-center text-slate-500 space-y-2 shadow-card">
              <Clock size={32} className="mx-auto text-slate-400" />
              <h3 className="text-sm font-extrabold text-slate-800">No Guide Actions Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Actions performed by the Faculty Guide (project approvals, rejections, weekly reviews, and consultation notices) will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl border border-[#E2E8E4] p-5 shadow-card hover:shadow-hover transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8E4] pb-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {getLogBadge(log)}
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {log.target}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                        Class {log.classSection || 'CSE-B'}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{log.dateFormatted || log.date}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed font-medium bg-[#F8FAF9] p-3.5 rounded-xl border border-[#E2E8E4]">
                    {log.details}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Shield size={13} className="text-mint-600" />
                      <span>Authorized Faculty Guide: <strong className="text-slate-800">{log.actorName || facultyProfile.name}</strong></span>
                    </span>
                    <span className="font-mono text-slate-400">
                      Ref: {log.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: Team Milestone Timeline */
        <>
          {/* Horizontal Team Carousel */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8E4] shadow-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Select Student Team Portfolio Ledger:
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {teams.map((team) => {
                const isSelected = team.teamId === selectedTeamId;
                const weekCount = (team.submissions || []).filter(s => s.weekNumber <= currentAcademicWeek).length;

                return (
                  <button
                    key={team.teamId}
                    onClick={() => setSelectedTeamId(team.teamId)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 shrink-0 border ${
                      isSelected
                        ? 'bg-mint-100 text-mint-900 border-mint-300 shadow-sm font-extrabold'
                        : 'bg-white text-slate-700 border-[#E2E8E4] hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-mint-600"></span>
                    )}
                    <span>Team #{team.teamNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-mint-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {weekCount} {weekCount === 1 ? 'Week' : 'Weeks'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Summary Banner */}
          {activeTeam && (
            <div className="bg-white rounded-2xl border border-[#E2E8E4] p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs shadow-xs">
                    Team #{activeTeam.teamNumber}
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">{activeTeam.projectTitle}</h2>
                    <span className="text-xs text-slate-500">
                      {activeTeam.class}-{activeTeam.section} &bull; Batch {activeTeam.batch}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Team Leader</span>
                  <span className="font-extrabold text-slate-900 mt-0.5 block">{activeTeam.teamLeader}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{activeTeam.leaderRollNo}</span>
                </div>

                <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Students</span>
                  <span className="font-extrabold text-slate-900 mt-0.5 block">{activeTeam.membersCount || 4} Enrolled</span>
                  <span className="text-[10px] text-slate-500">4th Year Capstone</span>
                </div>

                <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Class Advisor</span>
                  <span className="font-extrabold text-slate-900 mt-0.5 block">{activeTeam.advisor}</span>
                  <span className="text-[10px] text-slate-500">Section Supervisor</span>
                </div>

                <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Sprints</span>
                  <span className="font-extrabold text-mint-700 mt-0.5 block">{submissions.length} Logged (up to Week {currentAcademicWeek})</span>
                  <span className="text-[10px] text-slate-500">IEEE Deliverables</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Ledger */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <History size={14} className="text-mint-600" />
              <span>Chronological Milestone Timeline (Sprint Progress)</span>
            </h3>

            {submissions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E2E8E4] p-12 text-center text-slate-500 space-y-2 shadow-card">
                <Clock size={28} className="mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-800">No weekly sprint logs submitted yet.</p>
                <p className="text-[11px] text-slate-400">Team will begin weekly logs once initial setup is complete.</p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-8 border-l-2 border-mint-200 space-y-6">
                {submissions.map((sub, idx) => {
                  const isApproved = sub.evaluationStatus === 'Approved' || sub.evaluationStatus === 'Evaluated' || activeTeam?.titleStatus === 'Approved';
                  const isRevision = sub.evaluationStatus === 'Revision Required';
                  const isPending = !isApproved && !isRevision;

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Node Bullet */}
                      <div className={`absolute -left-[31px] sm:-left-[39px] top-4 w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[11px] shadow-sm border-2 ${
                        isApproved
                          ? 'bg-mint-500 text-white border-white'
                          : isPending
                          ? 'bg-amber-500 text-white border-white'
                          : 'bg-rose-500 text-white border-white'
                      }`}>
                        W{sub.weekNumber}
                      </div>

                      {/* Card Container */}
                      <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5 shadow-card hover:shadow-hover transition space-y-3">
                        
                        {/* Week Title & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8E4] pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-mint-50 text-mint-900 font-bold text-xs border border-mint-200">
                                Week {sub.weekNumber}
                              </span>
                              <h4 className="text-sm font-extrabold text-slate-900">{sub.title || `Milestone Sprint ${sub.weekNumber}`}</h4>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              Submitted on {sub.submissionDate}
                            </span>
                          </div>

                          <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                            isApproved
                              ? 'bg-mint-100 text-mint-900 border-mint-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-rose-50 text-rose-900 border-rose-200'
                          }`}>
                            {isApproved && <CheckCircle2 size={13} className="text-mint-700" />}
                            {isPending && <Clock size={13} className="text-amber-600" />}
                            {isRevision && <AlertCircle size={13} className="text-rose-600" />}
                            <span>{isApproved ? 'Approved' : isPending ? 'Pending' : 'Revision Required'}</span>
                          </span>
                        </div>

                        {/* Abstract */}
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                          {sub.abstractSummary}
                        </p>

                        {/* Recorded Guide Remarks Box */}
                        {sub.guideRemarks ? (
                          <div className="p-3.5 bg-mint-50/70 border border-mint-200 rounded-xl text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-mint-900 text-[11px]">
                                Recorded Guide Feedback &amp; Endorsement:
                              </span>
                              {sub.evaluatedDate && (
                                <span className="text-[10px] text-mint-800 font-mono font-bold">
                                  Evaluated: {sub.evaluatedDate}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 italic">
                              "{sub.guideRemarks}"
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                            <Clock size={14} className="text-amber-600 shrink-0" />
                            <span className="font-semibold">Pending guide evaluation and remarks entry.</span>
                          </div>
                        )}

                        {/* Artifact Summary Icons & Open Review Drawer */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-mint-50 text-mint-900 border border-mint-200 text-[11px] font-bold">
                              <FileText size={12} className="text-mint-700" />
                              <span>PDF Report</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                              <Presentation size={12} className="text-slate-600" />
                              <span>Slides</span>
                            </span>
                            {sub.images && sub.images.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                                <ImageIcon size={12} className="text-slate-600" />
                                <span>{sub.images.length} Captures</span>
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleOpenReview(sub)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-mint-900 bg-mint-50 hover:bg-mint-100 border border-mint-200 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Inspect Deliverables</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Review Drawer */}
      <WeeklyReviewDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        team={activeTeam}
        submission={selectedSubmission}
        onEvaluate={(teamId, weekNumber, remarks) => {
          evaluateWeeklySubmission(teamId, weekNumber, remarks);
        }}
        onRequestRevision={(teamId, weekNumber, reason) => {
          return requestWeeklyRevision(teamId, weekNumber, reason);
        }}
        onOpenDocPreview={handleOpenDocPreview}
        onOpenImageViewer={handleOpenImageViewer}
      />

      {/* Document Viewer Modal */}
      <DocumentPreviewModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        documentType={docType}
        submission={selectedSubmission}
        team={activeTeam}
      />

      {/* Image Lightbox Modal */}
      <ImageViewerModal
        isOpen={imgModalOpen}
        onClose={() => setImgModalOpen(false)}
        images={selectedSubmission?.images || []}
        initialIndex={activeImgIndex}
        title={activeTeam?.projectTitle}
      />

    </div>
  );
};

export default SubmissionHistory;
