import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Users, CheckCircle2, XCircle, Clock, AlertCircle, 
  Eye, RefreshCw, ChevronDown, ChevronUp, FileText, Presentation, 
  Github, ExternalLink, Download, Award, Send, X, Lock, CheckSquare, 
  Sparkles, RotateCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { MarksService } from '../../services/marksService';
import { formatProjectTitle, getSubmissionTitle } from '../../utils/titleUtils';
import { hasAnyDetailSubmitted } from '../../utils/submissionUtils';
import RubricEvaluationModal from '../../components/common/RubricEvaluationModal';

export const ApproveProject = () => {
  const { 
    teams, 
    facultyProfile, 
    approveTitle, 
    rejectTitle, 
    evaluateWeeklySubmission, 
    requestWeeklyRevision, 
    rejectWeeklySubmission,
    showToast 
  } = useGuide();

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  // Multi-row accordion state (supports multiple rows toggled at the same time)
  const [expandedTeamIds, setExpandedTeamIds] = useState(new Set());
  const toggleTeamExpand = (teamId) => {
    setExpandedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  // Active submission inspection modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedTeam, setInspectedTeam] = useState(null);
  const [inspectedSub, setInspectedSub] = useState(null);

  // Decision states inside modal
  const [activeDecision, setActiveDecision] = useState(null); // 'approve' | 'revision' | 'reject' | null
  
  // Individual student marks state: rollNo -> mark (0-100)
  const [individualMarks, setIndividualMarks] = useState({});
  const [guideRemarks, setGuideRemarks] = useState('');
  const [mandatoryReason, setMandatoryReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [downloadToast, setDownloadToast] = useState(null);
  const [rubricModalOpen, setRubricModalOpen] = useState(false);

  const handleRubricSuccess = (avg, rubrics) => {
    if (!inspectedTeam || !inspectedSub) return;
    const weekNum = Number(
      inspectedSub.weekNumber !== undefined 
        ? inspectedSub.weekNumber 
        : (inspectedSub.week !== undefined ? inspectedSub.week : (inspectedSub.submissionNumber || 1))
    );
    if (evaluateWeeklySubmission) {
      evaluateWeeklySubmission(
        inspectedTeam.teamId,
        weekNum,
        guideRemarks.trim() || 'Approved by Faculty Guide using official rubric.',
        avg,
        rubrics
      );
    }
    if (approveTitle && weekNum === 1) {
      approveTitle(inspectedTeam.teamId);
    }
    showToast(`Submission Week ${weekNum} for Team #${inspectedTeam.teamNumber} approved with average score (${avg} / 20).`, 'success');
    setInspectModalOpen(false);
    setRubricModalOpen(false);
  };

  // Listen to marks updates and fetch authoritative marks on mount
  const [, setTick] = useState(0);
  useEffect(() => {
    MarksService.fetchAllMarks().catch(() => {});
    const handleSync = () => setTick(n => n + 1);
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Available classes for filter
  const availableClasses = useMemo(() => {
    const set = new Set();
    teams.forEach(t => {
      const cls = t.classSection || (t.class && t.section ? `${t.class}-${t.section}` : t.class);
      if (cls) set.add(cls);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Helper to get active/current submission waiting or submitted for approval
  const getTeamActiveSubmission = (team) => {
    const subs = team.submissions || [];
    
    // Look for any pending/unapproved submission first
    const pending = subs.find(s => {
      // If marked approved or locked, skip
      if (s.evaluationStatus === 'Approved' || s.status === 'Approved' || s.isLocked) {
        return false;
      }
      // Only actual submission status determines if it is pending approval
      // Must have real deliverable content (not an empty placeholder)
      const hasRealContent = Boolean(
        s.hasContent !== undefined
          ? s.hasContent
          : (
              s.submissionDate &&
              (s.abstractSummary || s.problemStatement || s.proposedSolution || s.technologyUsed || s.technologiesUsed || s.techStack || s.obstaclesFaced || s.githubUrl || s.liveDemoUrl)
            )
      );

      if (!hasRealContent) {
        return false;
      }

      return (
        s.evaluationStatus === 'Pending' || 
        s.evaluationStatus === 'Submitted' || 
        s.evaluationStatus === 'Revision Required' || 
        s.status === 'Pending' || 
        s.status === 'Submitted' || 
        s.status === 'Changes Requested' || 
        s.status === 'Revision Required'
      );
    });

    if (pending) {
      const weekNum = Number(pending.weekNumber !== undefined ? pending.weekNumber : (pending.week !== undefined ? pending.week : (pending.submissionNumber || 1)));
      const rawTech = pending.technologiesUsed || pending.technologyUsed || pending.techStack || team.technologiesUsed || team.technologyUsed;
      const techArr = Array.isArray(rawTech)
        ? rawTech
        : (typeof rawTech === 'string' && rawTech.trim()
            ? rawTech.split(',').map(s => s.trim()).filter(Boolean)
            : []);
      const techStr = typeof rawTech === 'string' ? rawTech : techArr.join(', ');

      return {
        ...pending,
        technologiesUsed: techArr,
        technologyUsed: techStr,
        techStack: techStr,
        weekNumber: weekNum,
        submissionNumber: weekNum,
        isCurrentWait: true
      };
    }

    // If title is pending or details submitted, but not approved
    const titleMarks = MarksService.getWeeklyMarks(team.teamId, 1);
    const hasTitleMarks = Boolean(titleMarks && (titleMarks.teamAverage > 0 || (titleMarks.memberMarks && Object.keys(titleMarks.memberMarks).length > 0)));

    if (!hasTitleMarks && team.titleStatus !== 'Approved' && (team.titleStatus === 'Pending' || hasAnyDetailSubmitted(team) || team.projectTitle)) {
      const w0 = subs[0];
      const rawTech = w0?.technologiesUsed || w0?.technologyUsed || w0?.techStack || team.technologiesUsed || team.technologyUsed || team.techStack;
      const techArr = Array.isArray(rawTech)
        ? rawTech
        : (typeof rawTech === 'string' && rawTech.trim()
            ? rawTech.split(',').map(s => s.trim()).filter(Boolean)
            : []);
      const techStr = typeof rawTech === 'string' ? rawTech : techArr.join(', ');

      return {
        weekNumber: w0?.weekNumber || 1,
        submissionNumber: 1,
        title: team.projectTitle || '',
        status: team.titleStatus || 'Pending',
        evaluationStatus: team.titleStatus || 'Pending',
        submissionDate: team.submittedDate || 'Submitted for Review',
        problemStatement: team.problemStatement || w0?.problemStatement || '',
        proposedSolution: team.proposedSolution || w0?.proposedSolution || '',
        abstractSummary: team.abstract || team.projectDescription || w0?.abstractSummary || '',
        technologiesUsed: techArr,
        technologyUsed: techStr,
        techStack: techStr,
        githubUrl: team.githubUrl || w0?.githubUrl || '',
        liveDemoUrl: team.liveDemoUrl || w0?.liveDemoUrl || '',
        isCurrentWait: true
      };
    }

    return null;
  };

  // Filtered teams list: ONLY submissions that are NOT approved must be shown!
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const sub = getTeamActiveSubmission(team);
      // If there is no active unapproved submission, or if it is already approved, DO NOT SHOW!
      if (!sub) return false;
      
      const isApproved = sub.status === 'Approved' || sub.evaluationStatus === 'Approved';
      if (isApproved) return false;

      const teamClass = team.classSection || (team.class && team.section ? `${team.class}-${team.section}` : team.class) || '';
      const matchesClass = classFilter === 'ALL' || teamClass === classFilter;

      const subStatus = sub?.status || sub?.evaluationStatus || team.titleStatus || 'Pending';
      let matchesStatus = true;
      if (statusFilter === 'PENDING') {
        matchesStatus = subStatus === 'Pending' || subStatus === 'Submitted' || sub?.evaluationStatus === 'Pending' || sub?.submissionStatus === 'Submitted On Time' || sub?.submissionStatus === 'Submitted';
      } else if (statusFilter === 'REVISION') {
        matchesStatus = subStatus === 'Revision Required' || subStatus === 'Changes Requested' || sub?.evaluationStatus === 'Revision Required';
      } else if (statusFilter === 'REJECTED') {
        matchesStatus = subStatus === 'Rejected' || sub?.evaluationStatus === 'Rejected';
      }

      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() ||
        `team ${team.teamNumber}`.includes(q) ||
        `#${team.teamNumber}`.includes(q) ||
        (team.projectTitle || '').toLowerCase().includes(q) ||
        (team.teamLeader || '').toLowerCase().includes(q) ||
        (team.leaderRollNo || '').includes(q) ||
        teamClass.toLowerCase().includes(q) ||
        (team.members || []).some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q));

      return matchesClass && matchesStatus && matchesSearch;
    });
  }, [teams, searchTerm, classFilter, statusFilter]);

  // Handle open check submission modal
  const handleOpenCheckSubmission = (team, sub, e) => {
    if (e) e.stopPropagation();
    setInspectedTeam(team);
    setInspectedSub(sub);
    setActiveDecision(null);
    
    const weekNum = Number(
      sub.weekNumber !== undefined 
        ? sub.weekNumber 
        : (sub.week !== undefined ? sub.week : (sub.submissionNumber || 1))
    );
    const memberRolls = (team.members || []).map(m => m.rollNo);
    const existingRec = MarksService.getWeeklyMarks(team.teamId || team.id, weekNum, memberRolls) ||
                        (weekNum === 1 ? MarksService.getWeeklyMarks(team.teamId || team.id, 0, memberRolls) : null);

    // Initialize individual marks for all members (pre-fill with existing if evaluated)
    const initMarks = {};
    (team.members || []).forEach(m => {
      const prior = existingRec?.memberMarks?.[m.rollNo] ?? sub.memberMarks?.[m.rollNo] ?? (existingRec?.teamAverage || sub.score || '');
      initMarks[m.rollNo] = prior !== '' && prior !== undefined && prior !== null ? String(prior) : '';
    });
    setIndividualMarks(initMarks);

    setGuideRemarks(existingRec?.remarks || sub.comments || sub.guideRemarks || '');
    setMandatoryReason('');
    setDecisionError('');
    setInspectModalOpen(true);
  };

  // Calculate live team average from individual marks
  const calculatedTeamAverage = useMemo(() => {
    if (!inspectedTeam || !inspectedTeam.members || inspectedTeam.members.length === 0) return 0;
    const scores = inspectedTeam.members
      .map(m => Number(individualMarks[m.rollNo]))
      .filter(num => !isNaN(num) && num >= 0 && num <= 100);

    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }, [inspectedTeam, individualMarks]);

  // Handle Approve with Individual Marks
  const handleConfirmApprove = () => {
    if (!inspectedTeam || !inspectedSub) return;

    // Verify all members have a valid mark assigned
    const members = inspectedTeam.members || [];
    for (const m of members) {
      const val = individualMarks[m.rollNo];
      const num = Number(val);
      if (val === '' || val === undefined || isNaN(num) || num < 0 || num > 100) {
        setDecisionError(`Please assign a valid score between 0 and 100 for ${m.name} (${m.rollNo}).`);
        return;
      }
    }

    const weekNum = Number(
      inspectedSub.weekNumber !== undefined 
        ? inspectedSub.weekNumber 
        : (inspectedSub.week !== undefined ? inspectedSub.week : (inspectedSub.submissionNumber || 1))
    );
    const subNumber = Number(inspectedSub.submissionNumber || weekNum);

    // Convert to numerical dictionary and compute average
    const finalMemberMarks = {};
    let totalMarks = 0;
    members.forEach(m => {
      const val = Number(individualMarks[m.rollNo]);
      finalMemberMarks[m.rollNo] = val;
      totalMarks += val;
    });
    const calculatedTeamAverage = members.length > 0 
      ? Math.round((totalMarks / members.length) * 10) / 10 
      : 0;

    // 1. Mark submission as evaluated & approved in GuideContext (handles state, MarksService, and backend review)
    if (evaluateWeeklySubmission) {
      evaluateWeeklySubmission(
        inspectedTeam.teamId,
        weekNum,
        guideRemarks.trim() || 'Approved by Faculty Guide.',
        calculatedTeamAverage,
        finalMemberMarks
      );
    } else {
      MarksService.saveWeeklyMarks(
        inspectedTeam.teamId,
        weekNum,
        finalMemberMarks,
        guideRemarks.trim() || 'Satisfactory deliverables. Approved by Faculty Guide.',
        facultyProfile?.name || 'Faculty Guide'
      );
    }

    if (approveTitle && weekNum === 1) {
      approveTitle(inspectedTeam.teamId);
    }

    showToast(`Submission ${weekNum} for Team #${inspectedTeam.teamNumber} approved with average score (${calculatedTeamAverage}/100).`, 'success');
    setInspectModalOpen(false);
  };

  // Handle Request Revision
  const handleConfirmRevision = () => {
    if (!mandatoryReason.trim()) {
      setDecisionError('Revision instructions are mandatory. Specify required changes.');
      return;
    }

    if (!inspectedTeam || !inspectedSub) return;
    const weekNum = Number(inspectedSub.weekNumber !== undefined ? inspectedSub.weekNumber : (inspectedSub.week !== undefined ? inspectedSub.week : (inspectedSub.submissionNumber || 1)));

    if (requestWeeklyRevision) {
      requestWeeklyRevision(inspectedTeam.teamId, weekNum, mandatoryReason.trim());
    }

    showToast(`Revision requested for Submission ${weekNum}.`, 'warning');
    setInspectModalOpen(false);
  };

  // Handle Reject
  const handleConfirmReject = () => {
    if (!mandatoryReason.trim()) {
      setDecisionError('Rejection justification is mandatory. Specify reasons for rejection.');
      return;
    }

    if (!inspectedTeam || !inspectedSub) return;
    const weekNum = Number(inspectedSub.weekNumber !== undefined ? inspectedSub.weekNumber : (inspectedSub.week !== undefined ? inspectedSub.week : (inspectedSub.submissionNumber || 1)));

    if (rejectWeeklySubmission) {
      rejectWeeklySubmission(inspectedTeam.teamId, weekNum, mandatoryReason.trim());
    } else if (rejectTitle && weekNum === 1) {
      rejectTitle(inspectedTeam.teamId, mandatoryReason.trim());
    }

    showToast(`Submission ${weekNum} rejected.`, 'error');
    setInspectModalOpen(false);
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn font-sans">

      {/* 1. FILTERING TOOLBAR ONLY (Starts directly from filtering) */}
      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D8CCBA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        
        {/* Live Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          
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

          {/* Status Filter (Unapproved only) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#75695A] hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
            >
              <option value="ALL">All Pending Submissions</option>
              <option value="PENDING">Pending Review</option>
              <option value="REVISION">Revision Required</option>
              <option value="REJECTED">Rejected</option>
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

      {/* 2. SUBMISSIONS TABLE: team no, class, title, submission number */}
      <div className="bg-white rounded-3xl border border-[#D8CCBA] shadow-xs overflow-hidden">
        {filteredTeams.length === 0 ? (
          <div className="p-12 text-center text-[#75695A] space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
            <p className="font-bold text-[#111111] text-sm">All submissions have been approved or evaluated!</p>
            <p className="text-xs text-[#75695A]">Approved submissions are archived in My Teams and History.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead className="bg-[#EDE7DB] text-[#111111] uppercase font-extrabold text-[10px] tracking-wider border-b border-[#D8CCBA]">
                <tr>
                  <th className="p-4 text-center">Team No</th>
                  <th className="p-4 text-center">Class</th>
                  <th className="p-4">Title</th>
                  <th className="p-4 text-center">Submission Number</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredTeams.map((team) => {
                  const teamClass = team.classSection || (team.class && team.section ? `${team.class}-${team.section}` : team.class) || 'CSE-B';
                  const activeSub = getTeamActiveSubmission(team);
                  const isExpanded = expandedTeamIds.has(team.teamId);

                  const subNumber = activeSub?.submissionNumber || 1;
                  const status = activeSub?.status || activeSub?.evaluationStatus || team.titleStatus || 'Pending';

                  const isRevision = status === 'Revision Required' || status === 'Changes Requested';
                  const isRejected = status === 'Rejected';
                  const isPending = !isRevision && !isRejected;

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
                          <div className="font-serif font-bold text-[#111111] text-xs leading-snug line-clamp-2">
                            {getSubmissionTitle(team.projectTitle, 'No Title Submitted')}
                          </div>
                          <span className="text-[10px] text-[#75695A] block mt-0.5">
                            Lead: <strong>{team.teamLeader}</strong> ({team.leaderRollNo})
                          </span>
                        </td>

                        {/* 4. Submission Number */}
                        <td className="p-4 text-center">
                          <span className="px-3 py-1 rounded-xl bg-[#111111] text-[#F8F5EE] font-bold text-xs shadow-2xs inline-block">
                            Submission {subNumber}
                          </span>
                        </td>

                        {/* 5. Status Badge */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            isRevision
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : isRejected
                              ? 'bg-rose-50 text-rose-900 border-rose-200'
                              : 'bg-blue-50 text-blue-900 border-blue-200'
                          }`}>
                            {isRevision && <RotateCcw size={11} className="text-amber-600" />}
                            {isRejected && <XCircle size={11} className="text-rose-600" />}
                            {isPending && <Clock size={11} className="text-blue-600" />}
                            <span>
                              {isRevision ? 'Revision Req.' : isRejected ? 'Rejected' : 'Pending'}
                            </span>
                          </span>
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

                      {/* Accordion: ONLY Team Members First, with [Check Submission] Button (No Designation Column) */}
                      <tr className={isExpanded ? 'border-b border-[#D8CCBA]' : 'border-0'}>
                        <td colSpan={6} className="p-0 border-0">
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
                                  
                                  {/* Header inside accordion: Team Members count + Check Submission Button */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D8CCBA]">
                                    <div className="flex items-center gap-2">
                                      <Users size={16} className="text-[#111111]" />
                                      <h4 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                                        Team Members ({team.members?.length || 4} Students)
                                      </h4>
                                    </div>

                                    {/* Prominent [Check Submission] Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenCheckSubmission(team, activeSub, e)}
                                      className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-95"
                                    >
                                      <Eye size={14} className="text-[#F8F5EE]" />
                                      <span>Check Submission</span>
                                    </button>
                                  </div>

                                  {/* Team Members List (NO Designation column) */}
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

      {/* 3. CHECK SUBMISSION MODAL: Shows exact current submission waiting for approval */}
      {inspectModalOpen && inspectedTeam && inspectedSub && (
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
                  Team #{inspectedTeam.teamNumber}
                </span>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#111111] truncate max-w-md sm:max-w-lg">
                    {getSubmissionTitle(inspectedTeam.projectTitle)}
                  </h3>
                  <p className="text-[11px] text-[#75695A] font-semibold">
                    Class {inspectedTeam.classSection || `${inspectedTeam.class}-${inspectedTeam.section}`} &bull; Submission {inspectedSub.submissionNumber || 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Exact Submitted Deliverables or Bold Red "Not Submitted" */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Submission Status Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA]">
                <div>
                  <span className="text-[10px] text-[#75695A] font-bold uppercase block">Submission Milestone</span>
                  <span className="font-serif font-bold text-[#111111] text-xs">
                    Submission {inspectedSub.submissionNumber || 1} - {inspectedSub.title || 'Initiation & Implementation'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#75695A] font-bold uppercase block">Submission Date</span>
                  <span className="font-mono text-xs font-bold text-[#111111]">
                    {inspectedSub.submissionDate || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* 1. Project Title */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-[#D8CCBA]">
                <h4 className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider">
                  Project Title
                </h4>
                {inspectedTeam.projectTitle && inspectedTeam.projectTitle.trim() ? (
                  <p className="text-xs font-bold text-[#111111] leading-relaxed">
                    {getSubmissionTitle(inspectedTeam.projectTitle)}
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
                {inspectedSub.problemStatement && inspectedSub.problemStatement.trim() ? (
                  <p className="text-xs text-[#111111] leading-relaxed">
                    {inspectedSub.problemStatement}
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
                {inspectedSub.proposedSolution && inspectedSub.proposedSolution.trim() ? (
                  <p className="text-xs text-[#111111] leading-relaxed">
                    {inspectedSub.proposedSolution}
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
                {inspectedSub.abstractSummary && inspectedSub.abstractSummary.trim() ? (
                  <p className="text-xs text-[#111111] leading-relaxed">
                    {inspectedSub.abstractSummary}
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
                  const raw = inspectedSub.technologiesUsed || inspectedSub.technologyUsed || inspectedSub.techStack || inspectedTeam?.technologiesUsed || inspectedTeam?.technologyUsed || inspectedTeam?.techStack;
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
                  Deliverables &amp; Artifacts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                  {/* GitHub Repo */}
                  <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <Github size={18} className="text-[#111111] shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-[#111111] text-xs block truncate">Source Code Repo</span>
                        <span className="text-[10px] text-[#75695A] truncate block">{inspectedSub.githubUrl || 'Repository URL'}</span>
                      </div>
                    </div>
                    {inspectedSub.githubUrl && inspectedSub.githubUrl.trim() ? (
                      <a
                        href={inspectedSub.githubUrl}
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
                        <span className="text-[10px] text-[#75695A] truncate block">{inspectedSub.liveDemoUrl || 'Deployment Link'}</span>
                      </div>
                    </div>
                    {inspectedSub.liveDemoUrl && inspectedSub.liveDemoUrl.trim() ? (
                      <a
                        href={inspectedSub.liveDemoUrl}
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

              {/* 4. GUIDE DECISION FORMS: OFFICIAL RUBRIC EVALUATION */}
              {activeDecision === 'approve' && (
                <div id="marksAssignmentSection" className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <Award size={16} className="text-emerald-700" />
                      <span>Official 4-Part Evaluation Rubrics (Total 20 Marks)</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-emerald-200 text-center space-y-3">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Evaluate every team member individually across the 4 official criteria:
                      <br />
                      <span className="font-bold text-emerald-950">System Design (5)</span> &bull; <span className="font-bold text-emerald-950">Presentation &amp; Interaction (5)</span> &bull; <span className="font-bold text-emerald-950">Technical Skills (5)</span> &bull; <span className="font-bold text-emerald-950">Implementation Progress (5)</span>
                      <br />
                      <span className="text-[11px] text-slate-500 font-semibold">Total: 20 Marks per student</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => setRubricModalOpen(true)}
                      className="px-5 py-2.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Award size={15} />
                      <span>Launch 4-Criteria Rubric Evaluation Modal (20 M)</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                    <button
                      type="button"
                      onClick={() => setActiveDecision(null)}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {activeDecision === 'revision' && (
                <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <RotateCcw size={16} className="text-amber-700" />
                    <span>Mandate Submission Revision</span>
                  </div>

                  {decisionError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{decisionError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Mandatory Revision Instructions <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={mandatoryReason}
                      onChange={(e) => {
                        setMandatoryReason(e.target.value);
                        if (decisionError) setDecisionError('');
                      }}
                      className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => setActiveDecision(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRevision}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send size={13} />
                      <span>Send Revision Request</span>
                    </button>
                  </div>
                </div>
              )}

              {activeDecision === 'reject' && (
                <div className="p-4 bg-rose-50/70 border border-rose-300 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                    <XCircle size={16} className="text-rose-700" />
                    <span>Reject Milestone Submission</span>
                  </div>

                  {decisionError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{decisionError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Mandatory Rejection Justification <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={mandatoryReason}
                      onChange={(e) => {
                        setMandatoryReason(e.target.value);
                        if (decisionError) setDecisionError('');
                      }}
                      className="w-full p-3 bg-white border border-rose-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
                    <button
                      type="button"
                      onClick={() => setActiveDecision(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReject}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={13} />
                      <span>Confirm Rejection</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Bottom Footer Actions: Accept / Reject / Request Revision */}
            <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Reject Option */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDecision('reject');
                    setMandatoryReason('');
                    setDecisionError('');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <XCircle size={14} className="text-rose-600" />
                  <span>Reject</span>
                </button>

                {/* Request Revision Option */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDecision('revision');
                    setMandatoryReason('');
                    setDecisionError('');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw size={14} className="text-amber-700" />
                  <span>Request Revision</span>
                </button>

                {/* Accept / Approve Option with Official Rubrics */}
                <button
                  type="button"
                  onClick={() => {
                    setRubricModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-mint-500 hover:bg-mint-600 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Award size={15} />
                  <span>Evaluate Rubric &amp; Approve (20 M)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Rubric Evaluation Modal */}
      {rubricModalOpen && inspectedTeam && inspectedSub && (
        <RubricEvaluationModal
          isOpen={rubricModalOpen}
          onClose={() => setRubricModalOpen(false)}
          teamId={inspectedTeam.teamId}
          teamNo={String(inspectedTeam.teamNumber || '')}
          projectTitle={inspectedTeam.projectTitle || inspectedSub.projectTitle || ''}
          weekNumber={Number(
            inspectedSub.weekNumber !== undefined 
              ? inspectedSub.weekNumber 
              : (inspectedSub.week !== undefined ? inspectedSub.week : (inspectedSub.submissionNumber || 1))
          )}
          members={(inspectedTeam.members || []).map(m => ({
            rollNo: m.rollNo,
            name: m.name,
            isLead: m.role?.toLowerCase?.().includes('lead') || m.isLead
          }))}
          evaluatorRole="guide"
          evaluatorName={facultyProfile?.name || 'Faculty Guide'}
          initialRemarks={guideRemarks || inspectedSub.comments || ''}
          onSuccess={handleRubricSuccess}
        />
      )}

    </div>
  );
};

export default ApproveProject;
