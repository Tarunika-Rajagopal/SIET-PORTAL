import React, { useState, useEffect } from 'react';
import { StudentService, StudentDeliverableState } from '../../services/studentService';
import { MarksService } from '../../services/marksService';
import { FileText, Image, Upload, Bell, Clock, MapPin, AlertTriangle, Lock, Check, Edit3, Send } from 'lucide-react';

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

  const [deliverables, setDeliverables] = useState<StudentDeliverableState>(() =>
    StudentService.getDeliverables(weekText)
  );

  const [submissions, setSubmissions] = useState(() => StudentService.getSubmissions());
  const currentSub = submissions.find(s => s.week === currentWeekNumber);
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
  }, [weekText]);

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

  // Field values state
  const [title, setTitle] = useState(deliverables.projectTitle || '');
  const [problemStatement, setProblemStatement] = useState(deliverables.problemStatement || '');
  const [solution, setSolution] = useState(deliverables.solution || '');
  const [technology, setTechnology] = useState(deliverables.technologyUsed || '');
  const [obstaclesFaced, setObstaclesFaced] = useState(deliverables.obstaclesFaced || '');
  const [abstract, setAbstract] = useState(deliverables.abstract || '');
  const [presentationFileName, setPresentationFileName] = useState(deliverables.presentationFile || '');
  const [reportFileName, setReportFileName] = useState(deliverables.reportFile || '');
  const [repoUrl, setRepoUrl] = useState(deliverables.repoUrl || '');
  const [demoUrl, setDemoUrl] = useState(deliverables.demoUrl || '');
  const [screenshotName, setScreenshotName] = useState(deliverables.screenshotFile || '');

  useEffect(() => {
    setTitle(deliverables.projectTitle || '');
    setProblemStatement(deliverables.problemStatement || '');
    setSolution(deliverables.solution || '');
    setTechnology(deliverables.technologyUsed || '');
    setObstaclesFaced(deliverables.obstaclesFaced || '');
    setAbstract(deliverables.abstract || '');
    setPresentationFileName(deliverables.presentationFile || '');
    setReportFileName(deliverables.reportFile || '');
    setRepoUrl(deliverables.repoUrl || '');
    setDemoUrl(deliverables.demoUrl || '');
    setScreenshotName(deliverables.screenshotFile || '');
  }, [deliverables]);

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

    return false;
  };

  const handleSaveAllChanges = () => {
    if (!isTeamLead) {
      alert('Only the designated Team Lead is permitted to perform milestone submissions.');
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
    // 0. Only the designated Team Lead can edit or upload deliverables
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
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-[#D8CCBA] space-y-6 font-sans">
      
      {/* Top Header Bar: Milestone Title, Date Input, Status Badge, Edit Submission */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#D8CCBA]">
        
        {/* Milestone Indicator & Date Field */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1 rounded-xl bg-[#111111] text-[#F8F5EE] font-serif font-bold text-xs">
            {weekText}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="submissionDateInput" className="text-xs font-bold text-[#75695A] whitespace-nowrap">
              Submission Date:
            </label>
            <input
              type="date"
              id="submissionDateInput"
              value={submissionDate}
              max={todayDateStr}
              disabled={!isTeamLead || (hasSubmission && !isEditing && !isRevisionRequired) || (isEvaluated && !isEditing)}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer disabled:cursor-default"
            />
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {currentStatus === 'Approved' ? (
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

          {/* Edit Submission Button (Only available to designated Team Lead) */}
          {isTeamLead && hasSubmission && (!isEvaluated || isEditing) && (
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

      {/* Team Lead Submission Access Notice for Non-Lead Members */}
      {!isTeamLead && (
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
                <Lock size={10} /> Locked &amp; Carried over from Approved Milestone
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
                <Lock size={10} /> Locked &amp; Carried over from Approved Milestone
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
                <Lock size={10} /> Locked &amp; Carried over from Approved Milestone
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

        {/* 12. Final Milestone Action Footer: Single Submit / Update Button at Bottom */}
        {(!isEvaluated || isEditing || isRevisionRequired) && (
          <div className="pt-5 border-t border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-4 rounded-2xl">
            <div className="text-xs text-[#75695A] font-medium">
              {!isTeamLead ? (
                <span className="text-[#75695A] font-semibold flex items-center gap-1.5">
                  <Lock size={14} className="text-[#8A6A32]" />
                  <span>Submission is restricted to the designated Team Lead ({teamLeadName}). View-only mode.</span>
                </span>
              ) : !hasSubmission ? (
                <span>Ready to submit? Verify your deliverables above and click Submit to send to Guide.</span>
              ) : (isEditing || isRevisionRequired) ? (
                <span className="text-amber-800 font-bold">Revision / Edit mode active. Update your deliverables above and click Update Submission.</span>
              ) : (
                <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  <span>{weekText} submitted successfully. Click &ldquo;Edit Submission&rdquo; at top to modify.</span>
                </span>
              )}
            </div>

            <div>
              {isTeamLead && (
                !hasSubmission ? (
                  <button
                    type="button"
                    id="btnSubmitMilestone"
                    onClick={handleSaveAllChanges}
                    className="px-6 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    <Send size={14} />
                    <span>Submit {weekText}</span>
                  </button>
                ) : (isEditing || isRevisionRequired) ? (
                  <button
                    type="button"
                    id="btnUpdateMilestone"
                    onClick={handleSaveAllChanges}
                    className="px-6 py-2.5 bg-[#111111] hover:bg-black text-[#F8F5EE] font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    <Check size={14} />
                    <span>Update {weekText}</span>
                  </button>
                ) : null
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default SubmissionView;
