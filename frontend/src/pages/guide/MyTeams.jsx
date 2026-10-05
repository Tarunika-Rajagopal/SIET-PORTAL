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
  
  // Multi-row expanded team accordions (supports multiple rows toggled at the same time)
  const [expandedTeamIds, setExpandedTeamIds] = useState(new Set());
  const [submissionsExpandedTeamIds, setSubmissionsExpandedTeamIds] = useState(new Set());

  const toggleTeamExpand = (teamId) => {
    setExpandedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const toggleSubmissionsExpand = (teamId) => {
    setSubmissionsExpandedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  // Active week/submission inspection modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null);
  const [activeTeamForModal, setActiveTeamForModal] = useState(null);
  const [downloadToast, setDownloadToast] = useState(null);

  // Current academic week
  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();

  // Marks listener & initial fetch
  const [, setMarksTick] = useState(0);
  useEffect(() => {
    MarksService.fetchAllMarks().catch(() => {});
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

  // Fetch team-specific marks whenever teams change or modal opens
  useEffect(() => {
    if (teams && teams.length > 0) {
      teams.forEach(t => {
        const tid = t.teamId || t.id;
        if (tid) {
          MarksService.fetchTeamMarks(tid).catch(() => {});
        }
      });
    }
  }, [teams]);

  useEffect(() => {
    if (detailModalOpen && activeTeamForModal) {
      const tid = activeTeamForModal.teamId || activeTeamForModal.id;
      if (tid) {
        MarksService.fetchTeamMarks(tid).catch(() => {});
      }
    }
  }, [detailModalOpen, activeTeamForModal]);

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
    const teamMarks = MarksService.getAllTeamMarks(team.teamId || team.id, memberRolls);

    return ALL_SUBMISSIONS.filter(s => s.submissionNumber <= Math.max(4, currentAcademicWeek)).map(def => {
      // Find matching submission in team.submissions
      const existing = (team.submissions || []).find(s => 
        (s.weekNumber === def.weekNumber) || 
        (s.week === def.weekNumber) ||
        (s.submissionNumber === def.submissionNumber) ||
        (def.submissionNumber === 1 && (s.weekNumber === 0 || s.weekNumber === 1))
      );

      // Marks for this submission: check MarksService, existing.score, or existing.memberMarks
      const recordedMark = teamMarks[def.weekNumber] || 
                           (def.weekNumber === 1 ? teamMarks[0] : null);

      const scoreFromBackend = (existing?.score !== null && existing?.score !== undefined) ? Number(existing.score) : null;
      const scoreFromMarks = (recordedMark && typeof recordedMark.teamAverage === 'number' && recordedMark.teamAverage > 0) ? recordedMark.teamAverage : null;
      const finalScore = scoreFromMarks ?? scoreFromBackend;

      const memberMarksObj = (recordedMark?.memberMarks && Object.keys(recordedMark.memberMarks).length > 0)
        ? recordedMark.memberMarks
        : (existing?.memberMarks && Object.keys(existing.memberMarks).length > 0 ? existing.memberMarks : {});

      const hasMarks = Boolean(
        (finalScore !== null && finalScore !== undefined && finalScore > 0) ||
        (memberMarksObj && Object.keys(memberMarksObj).length > 0)
      );

      const isApproved = existing?.status === 'Approved' || 
                         existing?.evaluationStatus === 'Approved' || 
                         existing?.submissionStatus === 'Approved';

      if (existing) {
        const rawTech = existing.technologiesUsed || existing.technologyUsed || existing.techStack || team.technologiesUsed || team.technologyUsed || team.techStack;
        const techArr = Array.isArray(rawTech)
          ? rawTech
          : (typeof rawTech === 'string' && rawTech.trim()
              ? rawTech.split(',').map(s => s.trim()).filter(Boolean)
              : []);
        const techStr = typeof rawTech === 'string' ? rawTech : techArr.join(', ');

        const hasRealContent = Boolean(
          existing.hasContent !== undefined
            ? existing.hasContent
            : (
                existing.submissionDate &&
                (existing.abstractSummary || existing.problemStatement || existing.proposedSolution || techStr || existing.obstaclesFaced || existing.githubUrl || existing.liveDemoUrl)
              )
        );

        const isUploaded = Boolean(isApproved || hasRealContent);

        return {
          ...existing,
          technologiesUsed: techArr,
          technologyUsed: techStr,
          techStack: techStr,
          submissionNumber: def.submissionNumber,
          weekNumber: def.weekNumber,
          title: existing.title || def.defaultTitle,
          isUploaded,
          status: isApproved ? 'Approved' : (hasRealContent ? (existing.status === 'Revision Required' || existing.evaluationStatus === 'Revision Required' ? 'Revision Required' : (existing.status || 'Submitted')) : 'Not Uploaded'),
          evaluationStatus: isApproved ? 'Approved' : (hasRealContent ? (existing.evaluationStatus || 'Pending') : 'Pending'),
          submissionStatus: isApproved ? 'Approved' : (hasRealContent ? (existing.submissionStatus || 'Submitted') : 'Not Uploaded'),
          hasMarks,
          marksScore: finalScore,
          memberMarks: memberMarksObj,
          marksRemarks: recordedMark?.remarks || existing.guideRemarks || existing.comments || ''
        };
      }

      // If team has recorded marks for this week even without explicit submission row
      if (hasMarks) {
        const teamRawTech = team.technologiesUsed || team.technologyUsed || team.techStack;
        const teamTechArr = Array.isArray(teamRawTech)
          ? teamRawTech
          : (typeof teamRawTech === 'string' && teamRawTech.trim()
              ? teamRawTech.split(',').map(s => s.trim()).filter(Boolean)
              : []);
        const teamTechStr = typeof teamRawTech === 'string' ? teamRawTech : teamTechArr.join(', ');

        return {
          submissionNumber: def.submissionNumber,
          weekNumber: def.weekNumber,
          title: (def.submissionNumber === 1 && team.projectTitle) ? team.projectTitle : def.defaultTitle,
          isUploaded: true,
          status: 'Approved',
          evaluationStatus: 'Approved',
          submissionStatus: 'Approved',
          submissionDate: recordedMark?.gradedAt ? new Date(recordedMark.gradedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
          hasMarks: true,
          marksScore: finalScore,
          memberMarks: memberMarksObj,
          marksRemarks: recordedMark?.remarks || '',
          abstractSummary: (def.submissionNumber === 1 ? (team.abstract || team.projectDescription || '') : ''),
          problemStatement: (def.submissionNumber === 1 ? (team.problemStatement || '') : ''),
          proposedSolution: (def.submissionNumber === 1 ? (team.proposedSolution || '') : ''),
          technologiesUsed: teamTechArr,
          technologyUsed: teamTechStr,
          techStack: teamTechStr,
          githubUrl: team.githubUrl || '',
          liveDemoUrl: team.liveDemoUrl || ''
        };
      }

      // If team proposal details exist and this is Submission 1
      if (def.submissionNumber === 1 && (team.projectTitle || team.problemStatement)) {
        const rawTech = team.technologiesUsed || team.technologyUsed || team.techStack;
        const techArr = Array.isArray(rawTech)
          ? rawTech
          : (typeof rawTech === 'string' && rawTech.trim()
              ? rawTech.split(',').map(s => s.trim()).filter(Boolean)
              : []);
        const techStr = typeof rawTech === 'string' ? rawTech : techArr.join(', ');

        return {
          submissionNumber: 1,
          weekNumber: 1,
          title: team.projectTitle || def.defaultTitle,
          isUploaded: true,
          status: team.titleStatus || 'Pending',
          submissionDate: team.submittedDate || new Date().toISOString().split('T')[0],
          hasMarks,
          marksScore: finalScore,
          memberMarks: memberMarksObj,
          marksRemarks: recordedMark?.remarks || team.guideFeedback || '',
          problemStatement: team.problemStatement || '',
          proposedSolution: team.proposedSolution || '',
          abstractSummary: team.abstract || team.projectDescription || '',
          technologiesUsed: techArr,
          technologyUsed: techStr,
          techStack: techStr,
          githubUrl: team.githubUrl || '',
          liveDemoUrl: team.liveDemoUrl || ''
        };
      }

      const teamRawTech = team.technologiesUsed || team.technologyUsed || team.techStack;
      const teamTechArr = Array.isArray(teamRawTech)
        ? teamRawTech
        : (typeof teamRawTech === 'string' && teamRawTech.trim()
            ? teamRawTech.split(',').map(s => s.trim()).filter(Boolean)
            : []);
      const teamTechStr = typeof teamRawTech === 'string' ? teamRawTech : teamTechArr.join(', ');

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
        technologiesUsed: teamTechArr,
        technologyUsed: teamTechStr,
        techStack: teamTechStr
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

  return (
    <div className="space-y-5 pb-12 animate-fadeIn font-sans">

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
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '44%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead className="bg-[#EDE7DB] text-[#111111] uppercase font-extrabold text-[10px] tracking-wider border-b border-[#D8CCBA]">
                <tr>
                  <th className="p-4 text-center">Team No</th>
                  <th className="p-4 text-center">Class</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Team Leader</th>
                  <th className="p-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredTeams.map((team) => {
                  const teamClass = team.classSection || (team.class && team.section ? `${team.class}-${team.section}` : team.class) || 'CSE-B';
                  const isExpanded = expandedTeamIds.has(team.teamId);
                  const isSubmissionsShown = submissionsExpandedTeamIds.has(team.teamId);

                  return (
                    <React.Fragment key={team.teamId}>
                      {/* Main Table Row */}
                      <tr 
                        onClick={() => toggleTeamExpand(team.teamId)}
                        className={`transition-colors duration-300 ease-out cursor-pointer select-none border-b border-[#D8CCBA] ${
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
                            const isSub1Approved = team.titleStatus === 'Approved' || team.isTitleApproved;
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
                            <ChevronDown 
                              size={16} 
                              className={`transition-transform duration-450 ease-out ${
                                isExpanded ? 'rotate-180 text-[#111111]' : 'rotate-0 text-[#75695A]'
                              }`} 
                            />
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Container: Team Members First -> Then [View Submissions] Button & List (NO designation column) */}
                      <tr className={isExpanded ? 'border-b border-[#D8CCBA]' : 'border-0'}>
                        <td colSpan={5} className="p-0 border-0">
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateRows: isExpanded ? '1fr' : '0fr',
                              opacity: isExpanded ? 1 : 0,
                              transition: 'grid-template-rows 460ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                              pointerEvents: isExpanded ? 'auto' : 'none',
                            }}
                          >
                            <div style={{ overflow: 'hidden', minHeight: 0 }}>
                              <div className="bg-[#FAF7F2] border-y border-[#D8CCBA] p-5">
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
                                        toggleSubmissionsExpand(team.teamId);
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
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveTeamForModal(team);
                                                  setActiveSubModal(sub);
                                                  setDetailModalOpen(true);
                                                }}
                                                className="text-[11px] font-bold text-[#111111] hover:underline flex items-center gap-1 cursor-pointer"
                                              >
                                                <span>View Details</span>
                                                <Eye size={12} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
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
                {(() => {
                  const raw = activeSubModal.technologiesUsed || activeSubModal.technologyUsed || activeSubModal.techStack || activeTeamForModal?.technologiesUsed || activeTeamForModal?.technologyUsed || activeTeamForModal?.techStack;
                  const list = Array.isArray(raw)
                    ? raw
                    : (typeof raw === 'string' && raw.trim() ? raw.split(',').map(s => s.trim()).filter(Boolean) : []);
                  return list.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((tech, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-[#F8F5EE] border border-[#D8CCBA] text-[#111111] text-[11px] font-bold">
                          {tech}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-rose-600 font-bold text-xs">Not Submitted</span>
                  );
                })()}
              </div>

              {/* 6. Artifacts: GitHub, Demo */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Submitted Deliverables &amp; Artifacts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

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
                const subNum = Number(activeSubModal.weekNumber !== undefined ? activeSubModal.weekNumber : (activeSubModal.week !== undefined ? activeSubModal.week : (activeSubModal.submissionNumber || 1)));
                const memberRolls = activeTeamForModal.members?.map(m => m.rollNo);
                const marksRec = MarksService.getWeeklyMarks(activeTeamForModal.teamId || activeTeamForModal.id, subNum, memberRolls) ||
                                 (subNum === 1 ? MarksService.getWeeklyMarks(activeTeamForModal.teamId || activeTeamForModal.id, 0, memberRolls) : null);
                
                const teamAvg = (marksRec && marksRec.teamAverage > 0) ? marksRec.teamAverage : (activeSubModal.marksScore ?? activeSubModal.score ?? null);
                const memMarks = (marksRec && marksRec.memberMarks && Object.keys(marksRec.memberMarks).length > 0)
                  ? marksRec.memberMarks
                  : (activeSubModal.memberMarks && Object.keys(activeSubModal.memberMarks).length > 0 ? activeSubModal.memberMarks : null);

                if (teamAvg === null && !memMarks) return null;

                const gradedByText = marksRec?.gradedBy || 'Faculty Guide';
                const remarksText = marksRec?.remarks || activeSubModal.marksRemarks || activeSubModal.guideRemarks || activeSubModal.comments;

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
                        Team Average: {teamAvg ?? 0} / 100
                      </span>
                    </div>

                    {/* Individual Marks Roster */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(activeTeamForModal.members || []).map((member) => {
                        const mScore = memMarks?.[member.rollNo] ?? teamAvg;
                        return (
                          <div key={member.rollNo} className="p-2.5 bg-white rounded-xl border border-[#BFCEB9] flex items-center justify-between gap-2">
                            <div className="truncate">
                              <span className="font-bold text-[#111111] text-xs block truncate">{member.name}</span>
                              <span className="font-mono text-[10px] text-[#75695A]">{member.rollNo}</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-[#EBF0E9] border border-[#BFCEB9] font-extrabold text-xs text-[#4A5844] shrink-0">
                              {typeof mScore === 'number' ? `${mScore} / 100` : '-- / 100'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {remarksText && (
                      <p className="text-xs text-[#4A5844] font-medium pt-1 border-t border-[#BFCEB9]/60 italic">
                        &ldquo;{remarksText}&rdquo; &bull; Evaluated by {gradedByText}
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
