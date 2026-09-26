import React, { useState, useEffect, useCallback } from 'react';
import { StudentService, StudentDeliverableState } from '../../services/studentService';
import { MarksService } from '../../services/marksService';
import { ApiClient } from '../../services/apiClient';
import { FileText, Image, Upload, Bell, Clock, MapPin, AlertTriangle, Lock, Unlock, Check, Edit3, Send, RefreshCw } from 'lucide-react';

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

  // Determine active submission:
  // If submission 1 is approved, automatically shift to submission 2, then 3, then 4
  const getActiveSubmissionWeek = () => {
    const activeSubNum = StudentService.getTeamActiveSubmissionNumber(teamId);
    return Math.max(0, activeSubNum - 1);
  };

  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(() => {
    try {
      const targetW = localStorage.getItem('siet_student_target_week');
      if (targetW !== null) {
        localStorage.removeItem('siet_student_target_week');
        const parsed = parseInt(targetW, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {}
    return getActiveSubmissionWeek();
  });
  const currentSubmissionNumber = currentWeekNumber + 1;
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

    // Heartbeat poll every 3 seconds for bulletproof real-time sync
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

  const [deliverables, setDeliverables] = useState<StudentDeliverableState>(() =>
    StudentService.getDeliverables(weekText)
  );

  const [submissions, setSubmissions] = useState(() => StudentService.getSubmissions());
  // Match both 0-based (legacy frontend) and 1-based (backend DB) week numbering
  const currentSub = submissions.find(s => s.week === currentWeekNumber || s.week === currentSubmissionNumber);
  const isRevisionRequired = currentSub?.status === 'Changes Requested' || currentSub?.status === 'Rejected';
  const isTitleRejected = team?.guideApprovalStatus === 'Rejected';

  const isSubmission1Approved = StudentService.isSubmission1Approved(teamId);
  const isCurrentSubApproved = StudentService.isSubmissionApproved(currentSubmissionNumber, teamId);

  const isApproved = Boolean(
    isCurrentSubApproved ||
    (currentSubmissionNumber === 1 && (team?.isTitleApproved || team?.guideApprovalStatus === 'Approved')) ||
    currentSub?.status === 'Approved'
  );

  const hasMilestoneBeenSubmitted = Boolean(
    (currentSub && currentSub.submissionDate && (currentSub.status === 'Submitted' || currentSub.status === 'Approved' || currentSub.status === 'Changes Requested')) ||
    (currentSubmissionNumber === 1
      ? Boolean(deliverables.submittedFields.title || deliverables.submittedFields.presentation || deliverables.submittedFields.report)
      : Boolean(
          deliverables.submittedFields.technologyUsed ||
          deliverables.submittedFields.obstaclesFaced ||
          deliverables.submittedFields.abstract ||
          deliverables.submittedFields.presentation ||
          deliverables.submittedFields.report ||
          deliverables.submittedFields.repoUrl ||
          deliverables.submittedFields.demoUrl ||
          deliverables.submittedFields.screenshot
        )
    )
  );
  const hasSubmission = hasMilestoneBeenSubmitted;

  // Status of submitted details
  const currentStatus: 'Approved' | 'Requested Revision' | 'Pending' = 
    isApproved ? 'Approved' : (isRevisionRequired || isTitleRejected) ? 'Requested Revision' : 'Pending';

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
    try {
      const saved = localStorage.getItem(`siet_submission_date_${weekText}`);
      if (saved && saved <= todayDateStr) return saved;
      if (currentSub?.submissionDate && currentSub.submissionDate <= todayDateStr) return currentSub.submissionDate;
    } catch (e) {}
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
    try {
      localStorage.setItem(`siet_submission_date_${weekText}`, val);
    } catch (err) {}
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
        setCurrentWeekNumber(e.detail.week);
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

  useEffect(() => {
    const handleSync = () => {
      setDeliverables(StudentService.getDeliverables(weekText));
      setSubmissions(StudentService.getSubmissions());
      setTeam(StudentService.getTeam());
      if (localStorage.getItem('siet_student_start_edit_mode') === 'true') {
        setIsEditing(true);
        localStorage.removeItem('siet_student_start_edit_mode');
      }
    };
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [teamId, weekText]);

  useEffect(() => {
    setDeliverables(StudentService.getDeliverables(weekText));
    setBackendError(null);
    try {
      const saved = localStorage.getItem(`siet_submission_date_${weekText}`);
      if (saved && saved <= todayDateStr) {
        setSubmissionDate(saved);
      } else {
        const sub = submissions.find(s => s.week === currentWeekNumber || s.week === currentSubmissionNumber);
        if (sub?.submissionDate && sub.submissionDate <= todayDateStr) {
          setSubmissionDate(sub.submissionDate);
        } else {
          setSubmissionDate(todayDateStr);
        }
      }
    } catch (e) {}
  }, [weekText, currentWeekNumber, submissions, todayDateStr]);

  // Check if Class Advisor or Guide has already awarded marks for THIS specific milestone submission
  // Submission 1: check subNumber 1 or legacy 0
  // Submission 2: strictly check subNumber 2
  // Submission 3: strictly check subNumber 3
  // Submission 4: strictly check subNumber 4
  const marksRecord = MarksService.getWeeklyMarks(teamId, currentSubmissionNumber, memberRollNos) ||
                      (currentSubmissionNumber === 1 ? MarksService.getWeeklyMarks(teamId, 0, memberRollNos) : null);
  const isMarksAssigned = Boolean(
    marksRecord && (
      (marksRecord.teamAverage !== undefined && marksRecord.teamAverage > 0) ||
      (marksRecord.memberMarks && Object.keys(marksRecord.memberMarks).length > 0)
    )
  );

  // Submissions are evaluated if marks are assigned for THIS milestone
  const isEvaluated = isMarksAssigned;

  // Helper: get carried-over value from any previous submission (used for initial state)
  const getInitialCarriedOver = (currentVal: string, field: 'title' | 'problemStatement' | 'solution'): string => {
    if (currentVal) return currentVal;
    if (currentSubmissionNumber <= 1) return '';
    for (let sNum = currentSubmissionNumber - 1; sNum >= 1; sNum--) {
      const d = StudentService.getDeliverables(`Submission ${sNum}`);
      const dLeg = sNum === 1 ? StudentService.getDeliverables('Week 0') : null;
      if (field === 'title') {
        const v = (d.projectTitle || dLeg?.projectTitle || '').trim();
        if (v && v !== 'No Title Submitted' && v !== 'Title Approval Pending') return v;
      } else if (field === 'problemStatement') {
        const v = (d.problemStatement || dLeg?.problemStatement || '').trim();
        if (v) return v;
      } else if (field === 'solution') {
        const v = (d.solution || dLeg?.solution || '').trim();
        if (v) return v;
      }
    }
    if (field === 'title') {
      const tv = (team.projectTitle || team.submittedTitle || '').trim();
      if (tv && tv !== 'No Title Submitted' && tv !== 'Title Approval Pending') return tv;
    }
    return '';
  };

  // Field values state
  const [title, setTitle] = useState(() => getInitialCarriedOver(deliverables.projectTitle || '', 'title'));
  const [problemStatement, setProblemStatement] = useState(() => getInitialCarriedOver(deliverables.problemStatement || '', 'problemStatement'));
  const [solution, setSolution] = useState(() => getInitialCarriedOver(deliverables.solution || '', 'solution'));
  const [technology, setTechnology] = useState(deliverables.technologyUsed || '');
  const [obstaclesFaced, setObstaclesFaced] = useState(deliverables.obstaclesFaced || '');
  const [abstract, setAbstract] = useState(deliverables.abstract || '');
  const [presentationFileName, setPresentationFileName] = useState(deliverables.presentationFile || '');
  const [reportFileName, setReportFileName] = useState(deliverables.reportFile || '');
  const [repoUrl, setRepoUrl] = useState(deliverables.repoUrl || '');
  const [demoUrl, setDemoUrl] = useState(deliverables.demoUrl || '');
  const [screenshotName, setScreenshotName] = useState(deliverables.screenshotFile || '');

  useEffect(() => {
    // For title, problemStatement, solution: if current week has no value, carry over from previous milestones
    const resolveCarriedOver = (currentVal: string, field: 'title' | 'problemStatement' | 'solution'): string => {
      if (currentVal) return currentVal;
      if (currentSubmissionNumber <= 1) return '';
      // Search previous milestones from most recent to earliest
      for (let subNum = currentSubmissionNumber - 1; subNum >= 1; subNum--) {
        const d = StudentService.getDeliverables(`Submission ${subNum}`);
        const dLegacy = subNum === 1 ? StudentService.getDeliverables('Week 0') : null;
        if (field === 'title') {
          const val = (d.projectTitle || dLegacy?.projectTitle || '').trim();
          if (val && val !== 'No Title Submitted' && val !== 'Title Approval Pending') return val;
        } else if (field === 'problemStatement') {
          const val = (d.problemStatement || dLegacy?.problemStatement || '').trim();
          if (val) return val;
        } else if (field === 'solution') {
          const val = (d.solution || dLegacy?.solution || '').trim();
          if (val) return val;
        }
      }
      // Fallback for title: team-level data
      if (field === 'title') {
        const teamVal = (team.projectTitle || team.submittedTitle || '').trim();
        if (teamVal && teamVal !== 'No Title Submitted' && teamVal !== 'Title Approval Pending') return teamVal;
      }
      return '';
    };

    setTitle(resolveCarriedOver(deliverables.projectTitle || '', 'title'));
    setProblemStatement(resolveCarriedOver(deliverables.problemStatement || '', 'problemStatement'));
    setSolution(resolveCarriedOver(deliverables.solution || '', 'solution'));
    setTechnology(deliverables.technologyUsed || '');
    setObstaclesFaced(deliverables.obstaclesFaced || '');
    setAbstract(deliverables.abstract || '');
    setPresentationFileName(deliverables.presentationFile || '');
    setReportFileName(deliverables.reportFile || '');
    setRepoUrl(deliverables.repoUrl || '');
    setDemoUrl(deliverables.demoUrl || '');
    setScreenshotName(deliverables.screenshotFile || '');
  }, [deliverables, currentSubmissionNumber]);

  // Granular proposal locking rule:
  // If any one of title, problem statement, solution was NOT submitted in week 1 (or prior approved weeks),
  // then that detail alone is NOT locked for next week. Once submitted and approved in any milestone, it is locked.
  const isCarriedOverLocked = (field: 'title' | 'problemStatement' | 'solution'): boolean => {
    if (currentSubmissionNumber <= 1) {
      return false; // Submission 1 is always unlocked for proposal entry until submitted/evaluated
    }

    // Check all previous milestones (1 up to currentSubmissionNumber - 1)
    for (let subNum = 1; subNum < currentSubmissionNumber; subNum++) {
      const isApproved = StudentService.isSubmissionApproved(subNum, teamId);
      if (isApproved) {
        const d = StudentService.getDeliverables(`Submission ${subNum}`);
        const dLegacy = subNum === 1 ? StudentService.getDeliverables('Week 0') : null;

        if (field === 'title') {
          const val = (d.projectTitle || dLegacy?.projectTitle || team.projectTitle || team.submittedTitle || '').trim();
          if (val && val !== 'No Title Submitted' && val !== 'Title Approval Pending') {
            return true;
          }
        } else if (field === 'problemStatement') {
          const val = (d.problemStatement || dLegacy?.problemStatement || '').trim();
          if (val) {
            return true;
          }
        } else if (field === 'solution') {
          const val = (d.solution || dLegacy?.solution || '').trim();
          if (val) {
            return true;
          }
        }
      }
    }

    // Even if not "approved", still try to carry over from any previous milestone that had data
    // (e.g. Submission 1 submitted but HOD locked it – still show the data as read-only)
    for (let subNum = 1; subNum < currentSubmissionNumber; subNum++) {
      const d = StudentService.getDeliverables(`Submission ${subNum}`);
      const dLegacy = subNum === 1 ? StudentService.getDeliverables('Week 0') : null;

      if (field === 'title') {
        const val = (d.projectTitle || dLegacy?.projectTitle || team.projectTitle || team.submittedTitle || '').trim();
        if (val && val !== 'No Title Submitted' && val !== 'Title Approval Pending') {
          return true;
        }
      } else if (field === 'problemStatement') {
        const val = (d.problemStatement || dLegacy?.problemStatement || '').trim();
        if (val) return true;
      } else if (field === 'solution') {
        const val = (d.solution || dLegacy?.solution || '').trim();
        if (val) return true;
      }
    }

    return false;
  };

  // Returns the actual carried-over value from a previous milestone so it can be displayed
  const getCarriedOverValue = (field: 'title' | 'problemStatement' | 'solution'): string => {
    if (currentSubmissionNumber <= 1) return '';

    // Search previous milestones from most recent to earliest
    for (let subNum = currentSubmissionNumber - 1; subNum >= 1; subNum--) {
      const d = StudentService.getDeliverables(`Submission ${subNum}`);
      const dLegacy = subNum === 1 ? StudentService.getDeliverables('Week 0') : null;

      if (field === 'title') {
        const val = (d.projectTitle || dLegacy?.projectTitle || '').trim();
        if (val && val !== 'No Title Submitted' && val !== 'Title Approval Pending') return val;
      } else if (field === 'problemStatement') {
        const val = (d.problemStatement || dLegacy?.problemStatement || '').trim();
        if (val) return val;
      } else if (field === 'solution') {
        const val = (d.solution || dLegacy?.solution || '').trim();
        if (val) return val;
      }
    }

    // Fallback: check team-level data for title
    if (field === 'title') {
      const teamVal = (team.projectTitle || team.submittedTitle || '').trim();
      if (teamVal && teamVal !== 'No Title Submitted' && teamVal !== 'Title Approval Pending') return teamVal;
    }

    return '';
  };

  const handleSaveAllChanges = async () => {
    if (!isTeamLead) {
      alert('Only the designated Team Lead is permitted to perform milestone submissions.');
      return;
    }

    // Role-based workflow validation: strictly block if HOD has not released this milestone
    if (!isCurrentWeekReleased) {
      const msg = `Week ${currentSubmissionNumber} is locked by the Head of Department. Submissions cannot be accepted.`;
      setBackendError(msg);
      alert(msg);
      return;
    }

    setIsSubmitting(true);
    setBackendError(null);

    // Call real backend API: POST /api/v1/student/submissions/{week}
    // Backend strictly enforces get_week_releases() and returns 403 Forbidden if locked
    try {
      await ApiClient.submitStudentDeliverables(currentSubmissionNumber, {
        problemStatement,
        solution,
        technologyUsed: technology,
        obstaclesFaced,
        abstract,
        repoUrl,
        demoUrl,
        isSubmit: true
      });
    } catch (apiErr: any) {
      console.error('Backend submission rejected:', apiErr);
      const errMsg = apiErr.message || 'Submission rejected by server.';
      setBackendError(errMsg);
      alert(`Submission rejected: ${errMsg}`);
      setIsSubmitting(false);
      return;
    }

    const updated = StudentService.saveAllDeliverables(weekText, {
      projectTitle: title,
      problemStatement,
      solution,
      technologyUsed: technology,
      obstaclesFaced,
      abstract,
      presentationFile: presentationFileName,
      reportFile: reportFileName,
      repoUrl,
      demoUrl,
      screenshotFile: screenshotName,
      submissionDate
    });

    try {
      if (submissionDate) {
        localStorage.setItem(`siet_submission_date_${weekText}`, submissionDate);
      }
    } catch (e) {}

    // If this week was in revision/rejected state or in edit mode, update submission status
    if (isRevisionRequired || isEditing) {
      StudentService.updateSubmission(currentWeekNumber, `Updated deliverables for ${weekText}`);
    }

    setDeliverables(updated);
    setSubmissions(StudentService.getSubmissions());
    setIsEditing(false);
    setIsSubmitting(false);

    if (onSuccess) {
      onSuccess(`Milestone deliverables for ${weekText} submitted successfully.`);
    }
  };

  const handlePptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.ppt') && !file.name.endsWith('.pptx')) {
      alert("Only PowerPoint presentations (.ppt or .pptx) are permitted.");
      return;
    }
    setPresentationFileName(file.name);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert("Only PDF documents (.pdf) are permitted for the technical report.");
      return;
    }
    setReportFileName(file.name);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotName(file.name);
  };

  // Helper to check if a field was previously submitted
  const isFieldSubmitted = (field: keyof StudentDeliverableState['submittedFields']): boolean => {
    return Boolean(deliverables.submittedFields[field]);
  };

  // Input disabling logic
  const isInputDisabled = (field: keyof StudentDeliverableState['submittedFields']): boolean => {
    // 0. If this week has NOT been released by HOD, ALL fields are locked!
    if (!isCurrentWeekReleased) {
      return true;
    }
    // 0b. Only the designated Team Lead can edit or upload deliverables
    if (!isTeamLead) {
      return true;
    }
    // 1. Title, Problem Statement, Solution are carried over & locked in Submissions 2, 3, 4
    if ((field === 'title' || field === 'problemStatement' || field === 'solution') && isCarriedOverLocked(field)) {
      return true;
    }
    // 2. If user is in Edit Mode or Revision Required, ALL other details are unlocked!
    if (isEditing || isRevisionRequired || isTitleRejected) {
      return false;
    }
    // 3. If milestone is not submitted yet, ALL other details are completely unlocked!
    if (!hasSubmission) {
      return false;
    }
    // 4. If milestone is already evaluated (and not in edit mode), lock fields
    if (isEvaluated) {
      return true;
    }
    // 5. If submitted and not in edit mode, locked until user clicks "Edit Submission"
    const submitted = isFieldSubmitted(field);
    if (!submitted) return false;
    return true;
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
                  setCurrentWeekNumber(wNum - 1);
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
                disabled={!isCurrentWeekReleased || !isTeamLead || (hasSubmission && !isEditing && !isRevisionRequired) || (isEvaluated && !isEditing)}
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

            {/* Edit Submission Button (Only available to designated Team Lead when week is released) */}
            {isCurrentWeekReleased && isTeamLead && hasSubmission && (!isEvaluated || isEditing) && (
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

            {isEvaluated && !isEditing && (
              <div className="px-3 py-1.5 rounded-xl border border-[#D8CCBA] bg-[#EDE7DB] text-[#75695A] text-xs font-bold flex items-center gap-1.5 select-none" title="Evaluation completed.">
                <Lock size={13} />
                <span>Evaluated (Score: {marksRecord?.teamAverage}/100)</span>
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
                <Lock size={10} /> Carried from Previous Submission (Read-only)
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
                <Lock size={10} /> Carried from Previous Submission (Read-only)
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
                <Lock size={10} /> Carried from Previous Submission (Read-only)
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

        {/* 7. Presentation File: PPT / PPTX only */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <div>
            <label className="font-bold text-slate-800">Presentation Deck (PowerPoint Only)</label>
            <span className="text-[11px] text-slate-400 block mt-0.5">Strictly .ppt or .pptx format required</span>
          </div>

          <div className="flex items-center gap-3">
            {isInputDisabled('presentation') ? (
              <span className="px-4 py-2 rounded-xl bg-slate-100 border border-[#D8CCBA] text-slate-700 font-bold text-xs flex items-center gap-2 cursor-default">
                <FileText size={14} className="text-slate-500" />
                <span>{presentationFileName || "Presentation File Uploaded"}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2.5">
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border-2 border-dashed border-mint-400 hover:border-mint-600 text-mint-900 font-extrabold text-xs transition flex items-center gap-2 shadow-xs hover:bg-mint-50/40 shrink-0">
                  <Upload size={15} className="text-mint-600" />
                  <span>{presentationFileName ? presentationFileName : "Choose Presentation (.ppt/.pptx)"}</span>
                  <input
                    type="file"
                    accept=".ppt,.pptx"
                    className="hidden"
                    onChange={handlePptUpload}
                  />
                </label>
              </div>
            )}
            {presentationFileName && isInputDisabled('presentation') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{presentationFileName}</span>
            )}
          </div>
        </div>

        {/* 8. Technical Project Report: PDF only */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <div>
            <label className="font-bold text-slate-800">Technical Report Document (PDF Only)</label>
            <span className="text-[11px] text-slate-400 block mt-0.5">Strictly .pdf format required</span>
          </div>

          <div className="flex items-center gap-3">
            {isInputDisabled('report') ? (
              <span className="px-4 py-2 rounded-xl bg-slate-100 border border-[#D8CCBA] text-slate-700 font-bold text-xs flex items-center gap-2 cursor-default">
                <FileText size={14} className="text-slate-500" />
                <span>{reportFileName || deliverables.reportFile || "Technical Report Uploaded"}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2.5">
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border-2 border-dashed border-mint-400 hover:border-mint-600 text-mint-900 font-extrabold text-xs transition flex items-center gap-2 shadow-xs hover:bg-mint-50/40 shrink-0">
                  <Upload size={15} className="text-mint-600" />
                  <span>{reportFileName ? reportFileName : "Choose Technical Report (.pdf)"}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                </label>
              </div>
            )}
            {reportFileName && isInputDisabled('report') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{reportFileName}</span>
            )}
          </div>
        </div>

        {/* 9. Repository Link (GitHub) */}
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

        {/* 10. Live Demo Link */}
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

        {/* 11. Output Screenshot */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Output Screenshot Upload</label>
          <div className="flex items-center gap-3">
            {isInputDisabled('screenshot') ? (
              <span className="px-4 py-2 rounded-xl bg-slate-100 border border-[#D8CCBA] text-slate-700 font-bold text-xs flex items-center gap-2 cursor-default">
                <Image size={14} className="text-slate-500" />
                <span>{screenshotName || "Screenshot Uploaded"}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2.5">
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border-2 border-dashed border-mint-400 hover:border-mint-600 text-mint-900 font-extrabold text-xs transition flex items-center gap-2 shadow-xs hover:bg-mint-50/40 shrink-0">
                  <Image size={15} className="text-mint-600" />
                  <span>{screenshotName ? screenshotName : "Upload Screenshot Image (.png/.jpg)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotUpload}
                  />
                </label>
              </div>
            )}
            {screenshotName && isInputDisabled('screenshot') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{screenshotName}</span>
            )}
          </div>
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
                  /* Previously submitted and not in edit mode: show Re-Submit button */
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
