import React, { useState, useEffect, useCallback } from 'react';
import { StudentService, StudentDeliverableState } from '../../services/studentService';
import { MarksService } from '../../services/marksService';
import { ApiClient } from '../../services/apiClient';
import { Bell, Clock, MapPin, AlertTriangle, Lock, Unlock, Check, Edit3, Send, RefreshCw } from 'lucide-react';

interface SubmissionViewProps {
  onSuccess?: (msg: string) => void;
}

export const SubmissionView: React.FC<SubmissionViewProps> = ({ onSuccess }) => {
  const [team, setTeam] = useState(() => StudentService.getTeam());
  const isTeamLead = StudentService.isCurrentUserTeamLead(team);
  const teamLeadMember = StudentService.getTeamLead(team);
  const teamLeadName = teamLeadMember ? `${teamLeadMember.name}${teamLeadMember.rollNo ? ` (${teamLeadMember.rollNo})` : ''}` : 'the designated Team Lead';
  const teamId = team?.id || '';
  const memberRollNos = team?.members?.map(m => m.rollNo) || [];

  // 1-based canonical week selection: 1, 2, 3, 4
  const [currentSubmissionNumber, setCurrentSubmissionNumber] = useState<number>(() => {
    try {
      const targetW = localStorage.getItem('siet_student_target_week');
      if (targetW !== null) {
        localStorage.removeItem('siet_student_target_week');
        const parsed = parseInt(targetW, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) return parsed;
      }
      const savedSelected = sessionStorage.getItem('siet_student_selected_week');
      if (savedSelected !== null) {
        const parsed = parseInt(savedSelected, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) return parsed;
      }
    } catch (e) {}
    return StudentService.getTeamActiveSubmissionNumber(teamId);
  });
  const weekText = `Submission ${currentSubmissionNumber}`;

  // Backend-controlled weekly release status (Week 1..4 -> boolean)
  const [weekReleases, setWeekReleases] = useState<Record<number, boolean>>(() => {
    try {
      const stored = localStorage.getItem('siet_week_release_status');
      if (stored) {
        const p = JSON.parse(stored);
        return { 1: Boolean(p['1']), 2: Boolean(p['2']), 3: Boolean(p['3']), 4: Boolean(p['4']) };
      }
    } catch (e) {}
    return { 1: true, 2: true, 3: false, 4: false };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const loadReleases = useCallback(async () => {
    try {
      const rels = await StudentService.fetchWeekReleases();
      if (rels) {
        setWeekReleases({
          1: Boolean(rels['1']),
          2: Boolean(rels['2']),
          3: Boolean(rels['3']),
          4: Boolean(rels['4']),
        });
      }
    } catch (e) {
      console.warn('Could not fetch student week releases:', e);
    }
  }, []);

  useEffect(() => {
    loadReleases();

    // Cross-tab real-time sync with BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('siet_milestone_releases');
        bc.onmessage = (event) => {
          if (event.data?.releases) {
            const r = event.data.releases;
            setWeekReleases({
              1: Boolean(r['1']),
              2: Boolean(r['2']),
              3: Boolean(r['3']),
              4: Boolean(r['4']),
            });
          }
        };
      }
    } catch (e) {}

    const handleReleaseUpdated = (e: any) => {
      if (e?.detail?.week !== undefined && e?.detail?.released !== undefined) {
        setWeekReleases(prev => ({
          ...prev,
          [e.detail.week]: Boolean(e.detail.released)
        }));
      } else {
        loadReleases();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'siet_week_release_status' && e.newValue) {
        try {
          const r = JSON.parse(e.newValue);
          setWeekReleases({
            1: Boolean(r['1']),
            2: Boolean(r['2']),
            3: Boolean(r['3']),
            4: Boolean(r['4']),
          });
        } catch (err) {}
      }
    };

    const handleFocus = () => {
      loadReleases();
    };

    window.addEventListener('siet_release_updated', handleReleaseUpdated);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(loadReleases, 3000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('siet_release_updated', handleReleaseUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [loadReleases]);

  const isCurrentWeekReleased = Boolean(weekReleases[currentSubmissionNumber]);

  const [submissions, setSubmissions] = useState<any[]>(() => StudentService.getSubmissions());
  const currentSub = submissions.find(s => s.week === currentSubmissionNumber);
  const isRevisionRequired = currentSub?.status === 'Changes Requested' || currentSub?.status === 'Rejected' || currentSub?.status === 'Revision Required';
  const isTitleRejected = team?.guideApprovalStatus === 'Rejected';

  const isSubmission1Approved = StudentService.isSubmission1Approved(teamId);
  const isCurrentSubApproved = StudentService.isSubmissionApproved(currentSubmissionNumber, teamId);

  const isApproved = Boolean(
    isCurrentSubApproved ||
    (currentSubmissionNumber === 1 && (team?.isTitleApproved || team?.guideApprovalStatus === 'Approved')) ||
    currentSub?.status === 'Approved'
  );

  // Deliverable fields state - Directly backed by backend
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [solution, setSolution] = useState('');
  const [technology, setTechnology] = useState('');
  const [obstaclesFaced, setObstaclesFaced] = useState('');
  const [abstract, setAbstract] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');

  // Date selection logic: up to today's date
  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDateStr = getTodayDateStr();

  const [submissionDate, setSubmissionDate] = useState<string>(() => {
    if (currentSub?.submissionDate && currentSub.submissionDate <= todayDateStr) return currentSub.submissionDate;
    return todayDateStr;
  });

  const handleDateChange = (val: string) => {
    if (!isTeamLead) return;
    if (!val) {
      setSubmissionDate(todayDateStr);
      return;
    }
    if (val > todayDateStr) {
      alert(`Date cannot exceed today's date (${todayDateStr}). Only dates up to the current date are accepted.`);
      return;
    }
    setSubmissionDate(val);
  };

  // Edit submission state before evaluation
  const [isEditing, setIsEditing] = useState(() => {
    try {
      if (localStorage.getItem('siet_student_start_edit_mode') === 'true') {
        localStorage.removeItem('siet_student_start_edit_mode');
        return StudentService.isCurrentUserTeamLead();
      }
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    const checkEditMode = () => {
      if (localStorage.getItem('siet_student_start_edit_mode') === 'true') {
        if (StudentService.isCurrentUserTeamLead(team)) {
          setIsEditing(true);
        }
        localStorage.removeItem('siet_student_start_edit_mode');
      }
    };
    checkEditMode();

    const handleNavSubmission = (e: any) => {
      if (e?.detail?.week !== undefined) {
        const w = Number(e.detail.week);
        const canonicalWeek = (w >= 1 && w <= 4) ? w : (w + 1 >= 1 && w + 1 <= 4) ? w + 1 : 1;
        setCurrentSubmissionNumber(canonicalWeek);
      }
      if (e?.detail?.edit && StudentService.isCurrentUserTeamLead(team)) {
        setIsEditing(true);
      }
    };
    window.addEventListener('student_navigate_submission', handleNavSubmission);
    return () => {
      window.removeEventListener('student_navigate_submission', handleNavSubmission);
    };
  }, [team]);

  // Retrieve saved milestone submission directly from the backend/database on load or week change
  // Database is the sole source of truth! No fallback to localStorage for deliverable contents.
  useEffect(() => {
    let isMounted = true;
    const fetchSavedSubmission = async () => {
      try {
        const [backendSub, serverSubs, serverTeam, sub1] = await Promise.all([
          ApiClient.getStudentSubmissionByWeek(currentSubmissionNumber).catch(() => null),
          ApiClient.getStudentSubmissions().catch(() => []),
          ApiClient.getStudentTeam().catch(() => null),
          currentSubmissionNumber > 1 ? ApiClient.getStudentSubmissionByWeek(1).catch(() => null) : Promise.resolve(null)
        ]);
        if (!isMounted) return;

        if (serverTeam) {
          setTeam(serverTeam);
        }
        if (Array.isArray(serverSubs) && serverSubs.length > 0) {
          setSubmissions(serverSubs);
        }

        // Canonical anchor values from Submission 1 or team
        const anchorTitle = (sub1?.projectTitle || serverTeam?.projectTitle || team?.projectTitle || team?.submittedTitle || '').trim();
        const anchorProblem = (sub1?.problemStatement || (serverTeam as any)?.problemStatement || (team as any)?.problemStatement || '').trim();
        const anchorSolution = (sub1?.solution || (serverTeam as any)?.proposedSolution || (team as any)?.proposedSolution || '').trim();

        if (backendSub) {
          if (currentSubmissionNumber > 1) {
            setProblemStatement(anchorProblem || backendSub.problemStatement || '');
            setSolution(anchorSolution || backendSub.solution || '');
            setTitle(anchorTitle || backendSub.projectTitle || '');
          } else {
            setProblemStatement(backendSub.problemStatement || '');
            setSolution(backendSub.solution || '');
            setTitle(backendSub.projectTitle || anchorTitle || '');
          }
          setTechnology(backendSub.technologyUsed || '');
          setObstaclesFaced(backendSub.obstaclesFaced || '');
          setAbstract(backendSub.abstract || '');
          setRepoUrl(backendSub.repoUrl || '');
          setDemoUrl(backendSub.demoUrl || '');
          if (backendSub.submissionDate) {
            setSubmissionDate(backendSub.submissionDate);
          }
        } else {
          // Fresh milestone without submission
          if (currentSubmissionNumber > 1) {
            setProblemStatement(anchorProblem);
            setSolution(anchorSolution);
            setTitle(anchorTitle);
          } else {
            setProblemStatement('');
            setSolution('');
            setTitle(anchorTitle);
          }
          setTechnology('');
          setObstaclesFaced('');
          setAbstract('');
          setRepoUrl('');
          setDemoUrl('');
        }
      } catch (err) {
        console.warn('Could not fetch saved submission from backend:', err);
      }
    };

    fetchSavedSubmission();

    return () => {
      isMounted = false;
    };
  }, [currentSubmissionNumber, teamId]);

  const hasMilestoneBeenSubmitted = Boolean(
    (currentSub && (currentSub.status === 'Submitted' || currentSub.status === 'Approved' || isRevisionRequired)) ||
    problemStatement ||
    solution ||
    technology ||
    obstaclesFaced ||
    abstract ||
    repoUrl ||
    demoUrl
  );
  const hasSubmission = hasMilestoneBeenSubmitted;

  const currentStatus: 'Approved' | 'Requested Revision' | 'Pending' =
    isApproved ? 'Approved' : (isRevisionRequired || isTitleRejected) ? 'Requested Revision' : 'Pending';

  const marksRecord = MarksService.getWeeklyMarks(teamId, currentSubmissionNumber, memberRollNos);
  const isMarksAssigned = Boolean(
    marksRecord && (
      (marksRecord.teamAverage !== undefined && marksRecord.teamAverage > 0) ||
      (marksRecord.memberMarks && Object.keys(marksRecord.memberMarks).length > 0)
    )
  );
  const isEvaluated = Boolean(
    (currentSub?.score !== null && currentSub?.score !== undefined) ||
    isMarksAssigned
  );

  // Bug 1 Fix: Once evaluated or approved (and not requested revision), milestone is strictly locked
  const isFinalLocked = Boolean(
    (isApproved || isEvaluated) && !isRevisionRequired && !isTitleRejected
  );

  // Bug 2 Fix: In submissions 2, 3, 4, project title, problem statement, and solution are anchored to Submission 1
  const isCarriedOverLocked = (field: string): boolean => {
    if (currentSubmissionNumber <= 1) return false;
    if (field === 'title' || field === 'problemStatement' || field === 'solution') {
      return true;
    }
    return false;
  };

  const handleSaveAllChanges = async () => {
    if (!isTeamLead) {
      alert('Only the designated Team Lead is permitted to perform milestone submissions.');
      return;
    }

    if (isFinalLocked) {
      const msg = `Week ${currentSubmissionNumber} has already been evaluated and approved by your Faculty Guide. Modifications are not permitted.`;
      setBackendError(msg);
      alert(msg);
      return;
    }

    if (!isCurrentWeekReleased) {
      const msg = `Week ${currentSubmissionNumber} is locked by the Head of Department. Submissions cannot be accepted.`;
      setBackendError(msg);
      alert(msg);
      return;
    }

    setIsSubmitting(true);
    setBackendError(null);

    // Call real backend API: POST /api/v1/student/submissions/{week}
    // Exactly ONE authoritative submission write!
    try {
      const savedSub = await ApiClient.submitStudentDeliverables(currentSubmissionNumber, {
        projectTitle: title,
        problemStatement,
        solution,
        technologyUsed: technology,
        obstaclesFaced,
        abstract,
        repoUrl,
        demoUrl,
        isSubmit: true
      });

      if (savedSub) {
        setProblemStatement(savedSub.problemStatement || '');
        setSolution(savedSub.solution || '');
        setTechnology(savedSub.technologyUsed || '');
        setObstaclesFaced(savedSub.obstaclesFaced || '');
        setAbstract(savedSub.abstract || '');
        setRepoUrl(savedSub.repoUrl || '');
        setDemoUrl(savedSub.demoUrl || '');
        if (savedSub.projectTitle) {
          setTitle(savedSub.projectTitle);
        }
        if (savedSub.submissionDate) {
          setSubmissionDate(savedSub.submissionDate);
        }
      }

      // Refresh submissions list from backend
      try {
        const freshSubs = await ApiClient.getStudentSubmissions();
        if (Array.isArray(freshSubs)) {
          setSubmissions(freshSubs);
        }
      } catch (subListErr) {
        console.warn('Could not refresh submissions list:', subListErr);
      }

      setIsEditing(false);
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(`Milestone deliverables for ${weekText} submitted successfully.`);
      }
    } catch (apiErr: any) {
      console.error('Backend submission rejected:', apiErr);
      const errMsg = apiErr.message || 'Submission rejected by server.';
      setBackendError(errMsg);
      alert(`Submission rejected: ${errMsg}`);
      setIsSubmitting(false);
    }
  };

  const isFieldSubmitted = (field: string): boolean => {
    if (!hasMilestoneBeenSubmitted) return false;
    if (field === 'title') return Boolean(title && title.trim());
    if (field === 'problemStatement') return Boolean(problemStatement && problemStatement.trim());
    if (field === 'solution') return Boolean(solution && solution.trim());
    if (field === 'technologyUsed') return Boolean(technology && technology.trim());
    if (field === 'obstaclesFaced') return Boolean(obstaclesFaced && obstaclesFaced.trim());
    if (field === 'abstract') return Boolean(abstract && abstract.trim());
    if (field === 'repoUrl') return Boolean(repoUrl && repoUrl.trim());
    if (field === 'demoUrl') return Boolean(demoUrl && demoUrl.trim());
    return false;
  };

  const isInputDisabled = (field: string): boolean => {
    if (!isCurrentWeekReleased) return true;
    if (!isTeamLead) return true;
    if (isCarriedOverLocked(field)) return true;
    if (isFinalLocked) return true;
    if (isEditing || isRevisionRequired || isTitleRejected) return false;
    if (!hasSubmission) return false;
    return isFieldSubmitted(field);
  };

  return (
    <div className="space-y-4 font-sans">

      {/* Milestone Selection Bar with HOD Release Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4].map(wNum => {
            const isRel = Boolean(weekReleases[wNum]);
            const isSelected = currentSubmissionNumber === wNum;
            return (
              <button
                key={`milestone-btn-${wNum}`}
                id={`milestone-btn-${wNum}`}
                type="button"
                onClick={() => {
                  setCurrentSubmissionNumber(wNum);
                  try {
                    sessionStorage.setItem('siet_student_selected_week', String(wNum));
                  } catch (e) {}
                  setIsEditing(false);
                  setBackendError(null);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs ${
                  isSelected
                    ? 'bg-[#111111] text-[#F8F5EE] border border-[#111111]'
                    : 'bg-white hover:bg-[#F3EFE6] text-[#75695A] border border-[#D8CCBA]'
                }`}
              >
                <span>Submission {wNum}</span>
                {isRel ? (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-emerald-500/25 text-emerald-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    <Unlock size={11} />
                    <span>Released</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-amber-500/25 text-amber-200' : 'bg-[#EDE7DB] text-[#75695A] border border-[#D8CCBA]'
                  }`}>
                    <Lock size={11} />
                    <span>Locked</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Submission Form Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-[#D8CCBA] space-y-6">
        
        {/* Top Header Bar: Milestone Title, Date Input, Status Badge, Edit Submission */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#D8CCBA]">
          
          {/* Milestone Indicator & Date Field */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1 rounded-xl bg-[#111111] text-[#F8F5EE] font-serif font-bold text-xs">
              {weekText}
            </div>

            {/* Department Release Status Pill */}
            {isCurrentWeekReleased ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF0E9] text-[#2E6930] border border-[#BFCEB9] text-xs font-bold select-none">
                <Unlock size={12} className="text-[#2E6930]" />
                <span>Released</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE7DB] text-[#75695A] border border-[#D8CCBA] text-xs font-bold select-none">
                <Lock size={12} className="text-[#75695A]" />
                <span>Locked by Department</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="submissionDateInput" className="text-xs font-bold text-[#75695A] whitespace-nowrap">
                Submission Date:
              </label>
              <input
                type="date"
                id="submissionDateInput"
                value={submissionDate}
                max={todayDateStr}
                disabled={!isCurrentWeekReleased || !isTeamLead || isFinalLocked || (hasSubmission && !isEditing && !isRevisionRequired)}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer disabled:cursor-default"
              />
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            {!isCurrentWeekReleased ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE7DB] text-[#75695A] border border-[#D8CCBA] text-xs font-bold select-none">
                <Lock size={12} className="text-[#75695A]" />
                <span>Locked</span>
              </div>
            ) : currentStatus === 'Approved' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF0E9] text-[#4A5844] border border-[#BFCEB9] text-xs font-bold select-none">
                <Check size={12} className="text-[#4A5844]" />
                <span>Approved</span>
              </div>
            ) : (isRevisionRequired || isTitleRejected) ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8EEEE] text-[#7C3838] border border-[#D9AEAE] text-xs font-bold select-none">
                <AlertTriangle size={12} className="text-[#7C3838]" />
                <span>Requested Revision</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7F2E7] text-[#8A6A32] border border-[#DBCFA8] text-xs font-bold select-none">
                <Clock size={12} className="text-[#8A6A32]" />
                <span>Pending</span>
              </div>
            )}

            {/* Edit Submission Button (Only available to designated Team Lead when week is released and NOT final locked) */}
            {isCurrentWeekReleased && isTeamLead && hasSubmission && !isFinalLocked && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isEditing
                    ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                    : 'bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] border-[#D8CCBA]'
                }`}
                title="Edit your submitted details"
              >
                <Edit3 size={13} />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Submission'}</span>
              </button>
            )}

            {isFinalLocked && (
              <div className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-1.5 select-none shadow-xs" title="Milestone evaluated and approved by guide. Read-only.">
                <Lock size={13} className="text-emerald-700" />
                <span>
                  {currentSub?.score !== null && currentSub?.score !== undefined
                    ? `Evaluated & Approved (Score: ${currentSub.score}/100)`
                    : marksRecord?.teamAverage !== undefined && marksRecord.teamAverage > 0
                    ? `Evaluated & Approved (Score: ${marksRecord.teamAverage}/100)`
                    : 'Milestone Approved (Read-Only)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Department Locked Banner when HOD has not released the week */}
        {!isCurrentWeekReleased && (
          <div className="p-4 rounded-2xl bg-[#EDE7DB] border border-[#D8CCBA] text-[#5A5044] flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-white border border-[#D8CCBA] text-[#75695A] shrink-0">
              <Lock size={18} />
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-[#111111] block text-sm mb-0.5">
                Week {currentSubmissionNumber} Submission Locked by Department
              </span>
              This milestone has not been released by the Head of Department yet. Submissions are temporarily closed until the department authorizes release. All input fields are disabled in compliance with project governance.
            </div>
          </div>
        )}

        {/* Backend Error Banner */}
        {backendError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs font-semibold">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{backendError}</span>
          </div>
        )}

        {/* Team Lead Submission Access Notice for Non-Lead Members */}
        {isCurrentWeekReleased && !isTeamLead && (
          <div className="p-4 rounded-2xl bg-[#F7F2E7] border border-[#DBCFA8] text-[#75695A] flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-white border border-[#DBCFA8] text-[#8A6A32] shrink-0">
              <Lock size={16} />
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-[#111111] block">Milestone Submission Restricted to Team Lead</span>
              You are viewing this milestone in read-only mode. Only your designated Team Lead (<strong className="text-[#111111]">{teamLeadName}</strong>) is authorized to submit or modify project deliverables.
            </div>
          </div>
        )}

      {/* Guide Rejection Notice Banner */}
      {isTitleRejected && (
        <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-rose-900">
              <AlertTriangle size={16} className="text-rose-600 animate-bounce" />
              <span>Proposal Revision Required by Faculty Guide</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black uppercase tracking-wider">
              Rejected
            </span>
          </div>
          <p className="text-xs text-rose-900 font-semibold leading-relaxed">
            Your Faculty Guide has reviewed your submitted project proposal and requested modifications before it can be endorsed.
          </p>
          {team.rejectionReason && (
            <div className="p-3.5 rounded-xl bg-white border border-rose-200 text-xs text-rose-950 font-medium">
              <span className="font-extrabold text-rose-900 block mb-1">Guide Feedback &amp; Reason:</span>
              <p className="italic leading-relaxed">"{team.rejectionReason}"</p>
            </div>
          )}
          <p className="text-[11px] text-rose-700 font-bold pt-1">
            Fields are unlocked below. Please update your proposal and deliverables as requested, and click Update at the bottom of the page.
          </p>
        </div>
      )}

      {/* Guide Consultation Notice */}
      {currentSub?.guideNotice && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-900">
              <Bell size={14} className="text-amber-600 animate-bounce" />
              <span>Guide Consultation Notice for {weekText}</span>
            </div>
            <span className="text-[11px] font-bold text-amber-700">{currentSub.guideNotice.date}</span>
          </div>
          <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
            {currentSub.guideNotice.comment}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold pt-1.5 border-t border-amber-200/80 text-amber-900">
            <div className="flex items-center gap-1.5 bg-amber-100/90 px-3 py-1 rounded-xl">
              <Clock size={13} className="text-amber-700" />
              <span>Timing: {currentSub.guideNotice.timing}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-100/90 px-3 py-1 rounded-xl">
              <MapPin size={13} className="text-amber-700" />
              <span>Location: {currentSub.guideNotice.location}</span>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields: NO individual submit buttons */}
      <div className="space-y-5 text-xs">
        
        {/* 1. Project Title */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 block">Project Title</label>
            {isCarriedOverLocked('title') && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Lock size={10} /> Carried from Submission 1 (Read-only)
              </span>
            )}
          </div>
          <input
            type="text"
            id="inputProjectTitle"
            value={title}
            disabled={isInputDisabled('title')}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
          />
        </div>

        {/* 2. Problem Statement */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 block">Problem Statement</label>
            {isCarriedOverLocked('problemStatement') && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Lock size={10} /> Carried from Submission 1 (Read-only)
              </span>
            )}
          </div>
          <textarea
            rows={4}
            value={problemStatement}
            disabled={isInputDisabled('problemStatement')}
            onChange={(e) => setProblemStatement(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
          />
        </div>

        {/* 3. Proposed Solution */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 block">Proposed Solution &amp; Technical Approach</label>
            {isCarriedOverLocked('solution') && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Lock size={10} /> Carried from Submission 1 (Read-only)
              </span>
            )}
          </div>
          <textarea
            rows={4}
            value={solution}
            disabled={isInputDisabled('solution')}
            onChange={(e) => setSolution(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
          />
        </div>

        {/* 4. Technologies Used */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Technologies Used</label>
          <input
            type="text"
            value={technology}
            disabled={isInputDisabled('technologyUsed')}
            onChange={(e) => setTechnology(e.target.value)}
            placeholder="e.g. React, Node.js, Python, TensorFlow, PostgreSQL"
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* 5. Obstacles Faced */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Obstacles Faced</label>
          <textarea
            rows={4}
            value={obstaclesFaced}
            disabled={isInputDisabled('obstaclesFaced')}
            onChange={(e) => setObstaclesFaced(e.target.value)}
            placeholder="Describe technical bottlenecks or implementation challenges..."
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* 6. Abstract */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Project Abstract</label>
          <textarea
            rows={3}
            value={abstract}
            disabled={isInputDisabled('abstract')}
            onChange={(e) => setAbstract(e.target.value)}
            placeholder="Executive summary of current phase accomplishments..."
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* 7. Repository Link (GitHub) */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Source Code Repository URL</label>
          <input
            type="url"
            value={repoUrl}
            disabled={isInputDisabled('repoUrl')}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* 8. Live Demo Link */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Live Deployment / Demo URL</label>
          <input
            type="url"
            value={demoUrl}
            disabled={isInputDisabled('demoUrl')}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://demo.app.com"
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* 12. Final Milestone Action Footer */}
        {/* Always show footer when week is released OR locked */}
        {(!isEvaluated || isEditing || isRevisionRequired || !isCurrentWeekReleased || isCurrentWeekReleased) && (
          <div className="pt-5 border-t border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-4 rounded-2xl">
            <div className="text-xs text-[#75695A] font-medium">
              {!isCurrentWeekReleased ? (
                <span className="text-[#75695A] font-semibold flex items-center gap-1.5">
                  <Lock size={14} className="text-[#8A6A32]" />
                  <span>Submissions for Week {currentSubmissionNumber} are currently locked. Awaiting release by the Head of Department.</span>
                </span>
              ) : isFinalLocked ? (
                <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-700" />
                  <span>
                    Week {currentSubmissionNumber} has been evaluated and approved by your Faculty Guide. All deliverables are locked in read-only mode.
                  </span>
                </span>
              ) : !isTeamLead ? (
                <span className="text-[#75695A] font-semibold flex items-center gap-1.5">
                  <Lock size={14} className="text-[#8A6A32]" />
                  <span>Submission is restricted to the designated Team Lead ({teamLeadName}). View-only mode.</span>
                </span>
              ) : !hasSubmission ? (
                <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                  <Unlock size={14} className="text-emerald-700" />
                  <span>Week {currentSubmissionNumber} is released for submission. Verify deliverables above and click Submit.</span>
                </span>
              ) : (isEditing || isRevisionRequired) ? (
                <span className="text-amber-800 font-bold">Revision / Edit mode active. Update your deliverables above and click Update Submission.</span>
              ) : (
                <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  <span>{weekText} submitted successfully. Click &ldquo;Edit Submission&rdquo; at top or use Re-Submit below.</span>
                </span>
              )}
            </div>

            <div>
              {!isCurrentWeekReleased ? (
                <button
                  type="button"
                  disabled
                  className="px-6 py-2.5 bg-[#EDE7DB] text-[#75695A] font-extrabold text-xs rounded-xl border border-[#D8CCBA] cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto select-none"
                  title="Awaiting HOD Release"
                >
                  <Lock size={14} />
                  <span>Week {currentSubmissionNumber} Locked</span>
                </button>
              ) : isFinalLocked ? (
                <div
                  className="px-6 py-2.5 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-xl border border-emerald-300 flex items-center justify-center gap-2 w-full sm:w-auto select-none"
                  title="Milestone Approved & Evaluated"
                >
                  <Check size={14} className="text-emerald-700" />
                  <span>Approved & Evaluated (Locked)</span>
                </div>
              ) : isTeamLead ? (
                !hasSubmission ? (
                  <button
                    type="button"
                    id="btnSubmitMilestone"
                    onClick={handleSaveAllChanges}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#111111] hover:bg-black text-[#F8F5EE] font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Submit {weekText}</span>
                  </button>
                ) : (isEditing || isRevisionRequired) ? (
                  <button
                    type="button"
                    id="btnUpdateMilestone"
                    onClick={handleSaveAllChanges}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#111111] hover:bg-black text-[#F8F5EE] font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>Update {weekText}</span>
                  </button>
                ) : (
                  /* Previously submitted and not in edit mode: show Re-Submit button only if not locked */
                  <button
                    type="button"
                    id="btnResubmitMilestone"
                    onClick={() => { setIsEditing(true); }}
                    className="px-6 py-2.5 bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] font-extrabold text-xs rounded-xl border border-[#D8CCBA] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    <Edit3 size={14} />
                    <span>Edit & Re-Submit {weekText}</span>
                  </button>
                )
              ) : null}
            </div>
          </div>
        )}

      </div>

    </div>

    </div>
  );
};

export default SubmissionView;
