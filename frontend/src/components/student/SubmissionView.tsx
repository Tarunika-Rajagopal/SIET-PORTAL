import React, { useState, useEffect } from 'react';
import { StudentService, StudentDeliverableState } from '../../services/studentService';
import { MarksService } from '../../services/marksService';
import { FileText, Image, Upload, Bell, Clock, MapPin, AlertTriangle, Lock, Check, Edit3, Send } from 'lucide-react';

interface SubmissionViewProps {
  onSuccess?: (msg: string) => void;
}


export const SubmissionView: React.FC<SubmissionViewProps> = ({ onSuccess }) => {
  const [team, setTeam] = useState(() => StudentService.getTeam());
  const teamId = team?.id || 'TEAM-CSE-Y3-B04';
  const memberRollNos = team?.members?.map(m => m.rollNo) || [];

  // Determine active submission:
  // "Only until the marks are assigned , it should move to the submissions page if edit submission clicked , else edit submission should not show , instead it should move to the next submission and enable every submit button"
  const getActiveSubmissionWeek = () => {
    let weekIndex = 0;
    while (weekIndex <= 16) {
      const rec = MarksService.getWeeklyMarks(teamId, weekIndex, memberRollNos);
      const hasMarks = Boolean(
        rec && (
          rec.teamAverage !== undefined ||
          (rec.memberMarks && Object.keys(rec.memberMarks).length > 0)
        )
      );
      if (!hasMarks) {
        break;
      }
      weekIndex++;
    }
    return weekIndex;
  };

  const [currentWeekNumber, setCurrentWeekNumber] = useState(getActiveSubmissionWeek);
  const currentSubmissionNumber = currentWeekNumber + 1;
  const weekText = `Submission ${currentSubmissionNumber}`;

  const [deliverables, setDeliverables] = useState<StudentDeliverableState>(() =>
    StudentService.getDeliverables(weekText)
  );

  const [submissions, setSubmissions] = useState(() => StudentService.getSubmissions());
  const currentSub = submissions.find(s => s.week === currentWeekNumber);
  const isRevisionRequired = currentSub?.status === 'Changes Requested' || currentSub?.status === 'Rejected';

  const isTitleRejected = team?.guideApprovalStatus === 'Rejected';

  const isApproved = Boolean(
    team?.isTitleApproved ||
    team?.guideApprovalStatus === 'Approved' ||
    currentSub?.status === 'Approved'
  );

  const hasAnySubmittedField = Object.values(deliverables.submittedFields).some(Boolean);
  const hasSubmission = Boolean(currentSub || hasAnySubmittedField);

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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const checkEditMode = () => {
      if (localStorage.getItem('siet_student_start_edit_mode') === 'true') {
        setIsEditing(true);
        localStorage.removeItem('siet_student_start_edit_mode');
      }
    };
    checkEditMode();

    const handleNavSubmission = (e: any) => {
      if (e?.detail?.week !== undefined) {
        setCurrentWeekNumber(e.detail.week);
      }
      if (e?.detail?.edit) {
        setIsEditing(true);
      }
    };
    window.addEventListener('student_navigate_submission', handleNavSubmission);
    return () => {
      window.removeEventListener('student_navigate_submission', handleNavSubmission);
    };
  }, []);

  useEffect(() => {
    const handleSync = () => {
      const activeW = getActiveSubmissionWeek();
      setCurrentWeekNumber(activeW);
      const curWeekText = `Submission ${activeW + 1}`;
      setDeliverables(StudentService.getDeliverables(curWeekText));
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
  }, [teamId]);

  useEffect(() => {
    setDeliverables(StudentService.getDeliverables(weekText));
  }, [weekText]);

  // Check if Class Advisor has already awarded marks for this milestone submission
  const marksRecord = MarksService.getWeeklyMarks(teamId, currentWeekNumber, memberRollNos);
  const isMarksAssigned = Boolean(
    marksRecord && (
      marksRecord.teamAverage !== undefined ||
      (marksRecord.memberMarks && Object.keys(marksRecord.memberMarks).length > 0)
    )
  );

  // Submissions are evaluated if marks are assigned
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

  const handleFieldSubmit = (field: keyof StudentDeliverableState['submittedFields'], value: string) => {
    if (!value.trim()) return;
    const updated = StudentService.saveDeliverableField(weekText, field, value);
    setDeliverables({ ...updated });

    // Ensure submission date is stored
    try {
      if (submissionDate) {
        localStorage.setItem(`siet_submission_date_${weekText}`, submissionDate);
      }
    } catch (e) {}

    // If this week was in revision/rejected state or in edit mode, update submission status
    if (isRevisionRequired || isEditing) {
      StudentService.updateSubmission(currentWeekNumber, `Updated ${field}: ${value.substring(0, 40)}...`);
      setSubmissions(StudentService.getSubmissions());
    }

    if (isTitleRejected) {
      try {
        const studentTeam = StudentService.getTeam();
        studentTeam.guideApprovalStatus = 'Pending';
        studentTeam.rejectionReason = '';
        localStorage.setItem('siet_student_team_v6', JSON.stringify(studentTeam));
        setTeam({ ...studentTeam });

        const rawGuide = localStorage.getItem('siet_guide_portal_teams_v6');
        if (rawGuide) {
          const guideTeams = JSON.parse(rawGuide);
          const gt = guideTeams.find((t: any) => t.teamId === 'TEAM-CSE-Y3-B04' || t.id === 'TEAM-CSE-Y3-B04' || t.teamNumber === 4);
          if (gt) {
            gt.titleStatus = 'Pending';
            gt.rejectionReason = '';
            gt.latestSubmissionStatus = `${field.toUpperCase()} Resubmitted – Pending Guide Review`;
            localStorage.setItem('siet_guide_portal_teams_v6', JSON.stringify(guideTeams));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (onSuccess) {
      onSuccess(`Saved ${field.toUpperCase()} for ${weekText} successfully. Sent to Guide & Advisor.`);
    }
  };

  const handleSaveAllChanges = () => {
    if (title.trim()) StudentService.saveDeliverableField(weekText, 'title', title);
    if (problemStatement.trim()) StudentService.saveDeliverableField(weekText, 'problemStatement', problemStatement);
    if (solution.trim()) StudentService.saveDeliverableField(weekText, 'solution', solution);
    if (technology.trim()) StudentService.saveDeliverableField(weekText, 'technologyUsed', technology);
    if (obstaclesFaced.trim()) StudentService.saveDeliverableField(weekText, 'obstaclesFaced', obstaclesFaced);
    if (abstract.trim()) StudentService.saveDeliverableField(weekText, 'abstract', abstract);
    if (presentationFileName.trim()) StudentService.saveDeliverableField(weekText, 'presentation', presentationFileName);
    if (reportFileName.trim()) StudentService.saveDeliverableField(weekText, 'report', reportFileName);
    if (repoUrl.trim()) StudentService.saveDeliverableField(weekText, 'repoUrl', repoUrl);
    if (demoUrl.trim()) StudentService.saveDeliverableField(weekText, 'demoUrl', demoUrl);
    if (screenshotName.trim()) StudentService.saveDeliverableField(weekText, 'screenshot', screenshotName);

    try {
      if (submissionDate) {
        localStorage.setItem(`siet_submission_date_${weekText}`, submissionDate);
      }
    } catch (e) {}

    StudentService.updateSubmission(currentWeekNumber, `Updated milestone deliverables for ${weekText}`);
    setDeliverables(StudentService.getDeliverables(weekText));
    setSubmissions(StudentService.getSubmissions());
    setIsEditing(false);
    if (onSuccess) onSuccess(`All changes saved for ${weekText} successfully.`);
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

  // When edit mode is active, or if field is not submitted yet, inputs are enabled
  const isInputDisabled = (field: keyof StudentDeliverableState['submittedFields']): boolean => {
    if (isEvaluated) return true;
    const submitted = isFieldSubmitted(field);
    if (!submitted) return false; // Not submitted yet -> ALWAYS enabled
    // If submitted, enabled when student is editing or revision is required
    return !isEditing && !isRevisionRequired && !isTitleRejected;
  };

  // Helper to check if field button should be visible
  const shouldShowFieldButton = (field: keyof StudentDeliverableState['submittedFields']): boolean => {
    if (isEvaluated) return false;
    const submitted = isFieldSubmitted(field);
    if (!submitted) return true; // Details that are not submitted yet ALWAYS have a Submit button enabled
    // Submitted details have an Update button when in edit mode or revision required
    return isEditing || isRevisionRequired || isTitleRejected;
  };

  // Button label: "Update" for already submitted details, "Submit" for details not submitted yet
  const getFieldButtonLabel = (field: keyof StudentDeliverableState['submittedFields']): string => {
    const submitted = isFieldSubmitted(field);
    if (submitted) return 'Update';
    return 'Submit';
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-[#D8CCBA] space-y-6 font-sans">
      
      {/* Top Header Bar: Date Input (replaces current week), Status Badge, Edit Submission */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#D8CCBA]">
        
        {/* Date Field with Calendar Picker (up to today's date) */}
        <div className="flex items-center gap-2">
          <label htmlFor="submissionDateInput" className="text-xs font-bold text-[#75695A] whitespace-nowrap">
            Submission Date:
          </label>
          <input
            id="submissionDateInput"
            type="date"
            max={todayDateStr}
            value={submissionDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-3 py-1.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
          />
        </div>

        {/* Right side: Status of Submitted Details & Edit Submission */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Badge */}
          {!hasSubmission ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFE6] text-[#75695A] border border-[#D8CCBA] text-xs font-bold select-none">
              <Clock size={12} className="text-[#75695A]" />
              <span>No Submission</span>
            </div>
          ) : isApproved ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1EC] text-[#4A5844] border border-[#C4D1C2] text-xs font-bold select-none">
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

          {/* Edit Submission Button (Available before evaluation) */}
          {hasSubmission && !isEvaluated && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isEditing
                  ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                  : 'bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] border-[#D8CCBA]'
              }`}
              title="Edit your submitted details before evaluation"
            >
              <Edit3 size={13} />
              <span>{isEditing ? 'Finish Editing' : 'Edit Submission'}</span>
            </button>
          )}

          {isEvaluated && (
            <div className="px-3 py-1.5 rounded-xl border border-[#D8CCBA] bg-[#EDE7DB] text-[#75695A] text-xs font-bold flex items-center gap-1.5 select-none" title="Evaluation completed. Submission is locked.">
              <Lock size={13} />
              <span>Evaluated (Locked)</span>
            </div>
          )}
        </div>
      </div>



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
            Fields are unlocked below. Please update your proposal and deliverables as requested, and click Submit on the revised fields.
          </p>
        </div>
      )}

      {/* Guide Consultation Notice (Updated directly in weekly submission) */}
      {currentSub?.guideNotice && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-900">
              <Bell size={14} className="text-amber-600 animate-bounce" />
              <span>Guide Consultation Notice for Submission {currentSubmissionNumber}</span>
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

      {/* Form Fields */}
      <div className="space-y-5 text-xs">
        
        {/* 1. Project Title */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Project Title</label>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="text"
              id="inputProjectTitle"
              value={title}
              disabled={isInputDisabled('title')}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {shouldShowFieldButton('title') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('title', title)}
                disabled={!title.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>{getFieldButtonLabel('title')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Problem Statement */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Problem Statement</label>
          <textarea
            rows={4}
            value={problemStatement}
            disabled={isInputDisabled('problemStatement')}
            onChange={(e) => setProblemStatement(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          {shouldShowFieldButton('problemStatement') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('problemStatement', problemStatement)}
                disabled={!problemStatement.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{getFieldButtonLabel('problemStatement')}</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Proposed Solution */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Proposed Solution &amp; Technical Approach</label>
          <textarea
            rows={4}
            value={solution}
            disabled={isInputDisabled('solution')}
            onChange={(e) => setSolution(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          {shouldShowFieldButton('solution') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('solution', solution)}
                disabled={!solution.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{getFieldButtonLabel('solution')}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Technologies Used */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Technologies Used</label>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="text"
              value={technology}
              disabled={isInputDisabled('technologyUsed')}
              onChange={(e) => setTechnology(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {shouldShowFieldButton('technologyUsed') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('technologyUsed', technology)}
                disabled={!technology.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>{getFieldButtonLabel('technologyUsed')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Obstacles Faced */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Obstacles Faced</label>
          <textarea
            rows={4}
            value={obstaclesFaced}
            disabled={isInputDisabled('obstaclesFaced')}
            onChange={(e) => setObstaclesFaced(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          {shouldShowFieldButton('obstaclesFaced') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('obstaclesFaced', obstaclesFaced)}
                disabled={!obstaclesFaced.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{getFieldButtonLabel('obstaclesFaced')}</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Abstract */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Project Abstract</label>
          <textarea
            rows={3}
            value={abstract}
            disabled={isInputDisabled('abstract')}
            onChange={(e) => setAbstract(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
          />
          {shouldShowFieldButton('abstract') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('abstract', abstract)}
                disabled={!abstract.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{getFieldButtonLabel('abstract')}</span>
              </button>
            </div>
          )}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
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
                {shouldShowFieldButton('presentation') && (
                  <button
                    type="button"
                    onClick={() => handleFieldSubmit('presentation', presentationFileName)}
                    disabled={!presentationFileName}
                    className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    <span>{getFieldButtonLabel('presentation')}</span>
                  </button>
                )}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
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
                {shouldShowFieldButton('report') && (
                  <button
                    type="button"
                    onClick={() => handleFieldSubmit('report', reportFileName)}
                    disabled={!reportFileName}
                    className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    <span>{getFieldButtonLabel('report')}</span>
                  </button>
                )}
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
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="url"
              value={repoUrl}
              disabled={isInputDisabled('repoUrl')}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {shouldShowFieldButton('repoUrl') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('repoUrl', repoUrl)}
                disabled={!repoUrl.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>{getFieldButtonLabel('repoUrl')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 9. Live Demo Link */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Live Deployment / Demo URL</label>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="url"
              value={demoUrl}
              disabled={isInputDisabled('demoUrl')}
              onChange={(e) => setDemoUrl(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {shouldShowFieldButton('demoUrl') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('demoUrl', demoUrl)}
                disabled={!demoUrl.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>{getFieldButtonLabel('demoUrl')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 10. Output Screenshot */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#D8CCBA] space-y-2">
          <label className="font-bold text-slate-800 block">Output Screenshot Upload</label>
          <div className="flex items-center gap-3">
            {isInputDisabled('screenshot') ? (
              <span className="px-4 py-2 rounded-xl bg-slate-100 border border-[#D8CCBA] text-slate-700 font-bold text-xs flex items-center gap-2 cursor-default">
                <Image size={14} className="text-slate-500" />
                <span>{screenshotName || "Screenshot Uploaded"}</span>
              </span>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
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
                {shouldShowFieldButton('screenshot') && (
                  <button
                    type="button"
                    onClick={() => handleFieldSubmit('screenshot', screenshotName)}
                    disabled={!screenshotName}
                    className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    <span>{getFieldButtonLabel('screenshot')}</span>
                  </button>
                )}
              </div>
            )}
            {screenshotName && isInputDisabled('screenshot') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{screenshotName}</span>
            )}
          </div>
        </div>

        {/* 11. Final Milestone Submission Action */}
        {!isEvaluated && (
          <div className="pt-4 border-t border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-[#75695A] font-medium">
              Submit all milestone deliverables for Guide review
            </span>
            <button
              type="button"
              onClick={handleSaveAllChanges}
              className="px-6 py-2.5 bg-mint-600 hover:bg-mint-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer self-end sm:self-auto shrink-0"
            >
              <Send size={14} />
              <span>Submit Milestone</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default SubmissionView;
