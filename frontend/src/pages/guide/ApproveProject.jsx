import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Users, CheckCircle2, XCircle, Clock, AlertCircle, 
  Eye, RefreshCw, ChevronDown, ChevronUp, FileText, Presentation, 
  Github, ExternalLink, Download, Award, Send, X, Lock, CheckSquare, 
  Sparkles, RotateCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { MarksService } from '../../services/marksService';
import { StudentService } from '../../services/studentService';
import { formatProjectTitle } from '../../utils/titleUtils';
import { hasAnyDetailSubmitted } from '../../utils/submissionUtils';

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
  const [expandedTeamId, setExpandedTeamId] = useState(null);

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

  // Listen to marks updates
  const [, setTick] = useState(0);
  useEffect(() => {
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
    const pending = subs.find(s => 
      s.status === 'Pending' || 
      s.status === 'Submitted' || 
      s.evaluationStatus === 'Pending' || 
      s.evaluationStatus === 'Submitted' ||
      s.status === 'Changes Requested' ||
      s.evaluationStatus === 'Revision Required' ||
      s.status === 'Rejected'
    );
    if (pending) {
      const weekNum = pending.weekNumber !== undefined ? pending.weekNumber : (pending.week !== undefined ? pending.week : 1);
      return {
        ...pending,
        weekNumber: weekNum,
        submissionNumber: Math.max(1, Number(weekNum || 1)),
        isCurrentWait: true
      };
    }

    // If title is pending or details submitted, but not approved
    if (team.titleStatus !== 'Approved' && (team.titleStatus === 'Pending' || hasAnyDetailSubmitted(team) || team.projectTitle)) {
      const w0 = subs[0];
      return {
        weekNumber: w0?.weekNumber || 1,
        submissionNumber: 1,
        title: team.projectTitle || '',
        status: team.titleStatus || 'Pending',
        evaluationStatus: team.titleStatus || 'Pending',
        submissionDate: team.submittedDate || 'Submitted for Review',
        problemStatement: team.problemStatement || '',
        proposedSolution: team.proposedSolution || '',
        abstractSummary: team.abstract || team.projectDescription || '',
        technologiesUsed: team.technologiesUsed || [],
        githubUrl: team.githubUrl || '',
        liveDemoUrl: team.liveDemoUrl || '',
        reportUrl: team.reportUrl || '',
        presentationFileName: team.presentationFileName || '',
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
      
      const isApproved = sub.status === 'Approved' || sub.evaluationStatus === 'Approved' || (team.titleStatus === 'Approved' && !sub.isCurrentWait);
      if (isApproved) return false;

      const teamClass = team.classSection || (team.class && team.section ? `${team.class}-${team.section}` : team.class) || '';
      const matchesClass = classFilter === 'ALL' || teamClass === classFilter;

      const subStatus = sub?.status || sub?.evaluationStatus || team.titleStatus || 'Pending';
      let matchesStatus = true;
      if (statusFilter === 'PENDING') {
        matchesStatus = subStatus === 'Pending' || subStatus === 'Submitted';
      } else if (statusFilter === 'REVISION') {
        matchesStatus = subStatus === 'Revision Required' || subStatus === 'Changes Requested';
      } else if (statusFilter === 'REJECTED') {
        matchesStatus = subStatus === 'Rejected';
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
    
    // Initialize individual marks for all members with empty string
    const initMarks = {};
    (team.members || []).forEach(m => {
      initMarks[m.rollNo] = '';
    });
    setIndividualMarks(initMarks);

    setGuideRemarks('');
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

    const subNumber = inspectedSub.submissionNumber || inspectedSub.weekNumber || 1;
    const weekNum = inspectedSub.weekNumber !== undefined ? inspectedSub.weekNumber : subNumber;

    // Convert to numerical dictionary
    const finalMemberMarks = {};
    members.forEach(m => {
      finalMemberMarks[m.rollNo] = Number(individualMarks[m.rollNo]);
    });

    // 1. Save individual marks & calculated average to MarksService
    MarksService.saveWeeklyMarks(
      inspectedTeam.teamId,
      subNumber,
      finalMemberMarks,
      guideRemarks.trim() || 'Satisfactory deliverables. Approved by Faculty Guide.',
      facultyProfile?.name || 'Faculty Guide'
    );

    // 2. Mark submission as evaluated & approved in GuideContext
    if (evaluateWeeklySubmission) {
      evaluateWeeklySubmission(inspectedTeam.teamId, weekNum, guideRemarks.trim() || 'Approved by Faculty Guide.');
    }
    if (approveTitle) {
      approveTitle(inspectedTeam.teamId);
    }

    showToast(`Submission ${subNumber} for Team #${inspectedTeam.teamNumber} approved with average score (${calculatedTeamAverage}/100).`, 'success');
    setInspectModalOpen(false);
  };

  // Handle Request Revision
  const handleConfirmRevision = () => {
    if (!mandatoryReason.trim()) {
      setDecisionError('Revision instructions are mandatory. Specify required changes.');
      return;
    }

    if (!inspectedTeam || !inspectedSub) return;
    const weekNum = inspectedSub.weekNumber !== undefined ? inspectedSub.weekNumber : (inspectedSub.submissionNumber || 1);

    if (requestWeeklyRevision) {
      requestWeeklyRevision(inspectedTeam.teamId, weekNum, mandatoryReason.trim());
    }

    showToast(`Revision requested for Submission ${inspectedSub.submissionNumber || weekNum}.`, 'warning');
    setInspectModalOpen(false);
  };

  // Handle Reject
  const handleConfirmReject = () => {
    if (!mandatoryReason.trim()) {
      setDecisionError('Rejection justification is mandatory. Specify reasons for rejection.');
      return;
    }

    if (!inspectedTeam || !inspectedSub) return;
    const weekNum = inspectedSub.weekNumber !== undefined ? inspectedSub.weekNumber : (inspectedSub.submissionNumber || 1);

    if (rejectWeeklySubmission) {
      rejectWeeklySubmission(inspectedTeam.teamId, weekNum, mandatoryReason.trim());
    } else if (rejectTitle) {
      rejectTitle(inspectedTeam.teamId, mandatoryReason.trim());
    }

    showToast(`Submission ${inspectedSub.submissionNumber || weekNum} rejected.`, 'error');
    setInspectModalOpen(false);
  };

  // Download PPT/PDF
  const handleDownloadFile = (fileName, fileType, sub, e) => {
    if (e) e.stopPropagation();

    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    const formattedTitle = formatProjectTitle(inspectedTeam?.projectTitle, sub.status || inspectedTeam?.titleStatus);

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${inspectedTeam?.guide || 'Faculty Guide'}) >>
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
(Milestone Deliverable Dossier: Submission ${sub.submissionNumber || sub.weekNumber} - ${sub.title || 'Technical Report'}) Tj
0 -20 Td
(Project Title: ${formattedTitle}) Tj
0 -20 Td
(Lead Student: ${inspectedTeam?.teamLeader} | Roll No: ${inspectedTeam?.leaderRollNo}) Tj
0 -20 Td
(Faculty Guide: ${inspectedTeam?.guide || 'Faculty Guide'} | Status: ${sub.status || sub.evaluationStatus || 'Submitted'}) Tj
0 -20 Td
(Submitted Date: ${sub.submissionDate || new Date().toLocaleDateString()}) Tj
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
Milestone: Submission ${sub.submissionNumber || sub.weekNumber} - ${sub.title || 'Presentation Deck'}
Project: ${formattedTitle}
Lead Student: ${inspectedTeam?.teamLeader} (${inspectedTeam?.leaderRollNo})
Faculty Guide: ${inspectedTeam?.guide || 'Faculty Guide'}
Submission Date: ${sub.submissionDate || new Date().toLocaleDateString()}
Status: ${sub.status || sub.evaluationStatus || 'Submitted'}`;
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
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700">
          <Download size={14} className="text-mint-400" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* 1. FILTERING TOOLBAR ONLY (Starts directly from filtering) */}
      <div className="bg-white p-4 rounded-2xl border border-[#D8CCBA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        
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
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#EDE7DB] text-[#111111] uppercase font-extrabold text-[10px] tracking-wider border-b border-[#D8CCBA]">
                <tr>
                  <th className="p-4 text-center w-28">Team No</th>
                  <th className="p-4 text-center w-28">Class</th>
                  <th className="p-4">Title</th>
                  <th className="p-4 text-center w-40">Submission Number</th>
                  <th className="p-4 text-center w-36">Status</th>
                  <th className="p-4 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBA]">
                {filteredTeams.map((team) => {
                  const teamClass = team.classSection || (team.class && team.section ? `${team.class}-${team.section}` : team.class) || 'CSE-B';
                  const activeSub = getTeamActiveSubmission(team);
                  const isExpanded = expandedTeamId === team.teamId;

                  const subNumber = activeSub?.submissionNumber || 1;
                  const status = activeSub?.status || activeSub?.evaluationStatus || team.titleStatus || 'Pending';

                  const isRevision = status === 'Revision Required' || status === 'Changes Requested';
                  const isRejected = status === 'Rejected';
                  const isPending = !isRevision && !isRejected;

                  return (
                    <React.Fragment key={team.teamId}>
                      {/* Main Table Row */}
                      <tr 
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.teamId)}
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
                          <div className="font-serif font-bold text-[#111111] text-xs leading-snug line-clamp-2">
                            {formatProjectTitle(team.projectTitle, activeSub?.status || team.titleStatus)}
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
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </td>
                      </tr>

                      {/* Accordion: ONLY Team Members First, with [Check Submission] Button (No Designation Column) */}
                      {isExpanded && (
                        <tr className="bg-[#FAF7F2] border-y border-[#D8CCBA] animate-fadeIn">
                          <td colSpan={6} className="p-5">
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
                                      <th className="p-3">Institutional Email</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#D8CCBA]">
                                    {(team.members || []).map((m, idx) => (
                                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F5EE]/50'}>
                                        <td className="p-3 font-mono font-bold text-[#111111]">{m.rollNo}</td>
                                        <td className="p-3 font-bold text-[#111111]">{m.name}</td>
                                        <td className="p-3 font-mono text-[11px] text-[#75695A]">{m.email}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

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
                    {formatProjectTitle(inspectedTeam.projectTitle, inspectedSub.status || inspectedTeam.titleStatus)}
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
                    {formatProjectTitle(inspectedTeam.projectTitle, inspectedSub.status || inspectedTeam.titleStatus)}
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
                {Array.isArray(inspectedSub.technologiesUsed) && inspectedSub.technologiesUsed.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {inspectedSub.technologiesUsed.map((tech, i) => (
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
                  Deliverables &amp; Artifacts
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
                    {inspectedSub.presentationFileName || inspectedSub.pptUrl || inspectedSub.presentationFile ? (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(`Team_${inspectedTeam.teamNumber}_Submission_${inspectedSub.submissionNumber || 1}.pptx`, 'ppt', inspectedSub, e)}
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
                    {inspectedSub.reportUrl || inspectedSub.reportFile ? (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(`Team_${inspectedTeam.teamNumber}_Submission_${inspectedSub.submissionNumber || 1}.pdf`, 'pdf', inspectedSub, e)}
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

              {/* 4. GUIDE DECISION FORMS: INDIVIDUAL MARKS PER MEMBER */}
              {activeDecision === 'approve' && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <Award size={16} className="text-emerald-700" />
                      <span>Assign Individual Student Marks &amp; Approve</span>
                    </div>
                    <div className="px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-900 font-extrabold text-xs">
                      Team Average: {calculatedTeamAverage} / 100
                    </div>
                  </div>

                  {decisionError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{decisionError}</span>
                    </div>
                  )}

                  {/* Individual Marks for Every Team Member */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                      Individual Member Scores (0 - 100) <span className="text-rose-600">*</span>
                    </label>
                    <div className="space-y-2">
                      {(inspectedTeam.members || []).map((member) => (
                        <div key={member.rollNo} className="flex items-center justify-between p-2.5 bg-white border border-emerald-300 rounded-xl gap-3">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs block truncate">{member.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{member.rollNo}</span>
                          </div>
                          <div className="flex items-center gap-1.5 w-28 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              required
                              value={individualMarks[member.rollNo] ?? ''}
                              onChange={(e) => {
                                setIndividualMarks(prev => ({
                                  ...prev,
                                  [member.rollNo]: e.target.value
                                }));
                                if (decisionError) setDecisionError('');
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#EFF3F1] border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <span className="text-xs text-slate-500 font-bold">/100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Guide Remarks */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Evaluation Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={guideRemarks}
                      onChange={(e) => setGuideRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                    <button
                      type="button"
                      onClick={() => setActiveDecision(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmApprove}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Confirm Approval ({calculatedTeamAverage} Avg)</span>
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

                {/* Accept / Approve Option with Individual Marks */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDecision('approve');
                    setDecisionError('');
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-mint-500 hover:bg-mint-600 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 size={15} />
                  <span>Approve &amp; Assign Marks</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ApproveProject;
