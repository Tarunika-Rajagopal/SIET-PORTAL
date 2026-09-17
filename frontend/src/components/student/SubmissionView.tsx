import React, { useState, useEffect } from 'react';
import { StudentService, StudentDeliverableState } from '../../services/studentService';
import { MarksService } from '../../services/marksService';
import { FileText, Image, Upload, Bell, Clock, MapPin, Trash2, AlertTriangle, Lock, Check } from 'lucide-react';

interface SubmissionViewProps {
  onSuccess?: (msg: string) => void;
}

// Clean Pill badge with Approved or Pending status
const SubmittedBadge = ({ isApproved }: { isApproved?: boolean }) => (
  <div className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center justify-center shadow-xs select-none cursor-default shrink-0 gap-1.5 ${
    isApproved
      ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
      : 'bg-amber-50 border border-amber-300 text-amber-800'
  }`}>
    {isApproved ? <Check size={12} className="text-emerald-600" /> : <Clock size={12} className="text-amber-600" />}
    <span>{isApproved ? 'Approved' : 'Pending'}</span>
  </div>
);

export const SubmissionView: React.FC<SubmissionViewProps> = ({ onSuccess }) => {
  const currentWeekNumber = StudentService.getCurrentAcademicWeek();
  const weekText = `Week ${currentWeekNumber}`;
  const [deliverables, setDeliverables] = useState<StudentDeliverableState>(() =>
    StudentService.getDeliverables(weekText)
  );

  const [submissions, setSubmissions] = useState(() => StudentService.getSubmissions());
  const currentSub = submissions.find(s => s.week === currentWeekNumber);
  const isRevisionRequired = currentSub?.status === 'Changes Requested' || currentSub?.status === 'Rejected';

  const [team, setTeam] = useState(() => StudentService.getTeam());
  const isTitleRejected = team?.guideApprovalStatus === 'Rejected';

  const isApproved = Boolean(
    team?.isTitleApproved ||
    team?.guideApprovalStatus === 'Approved' ||
    currentSub?.status === 'Approved'
  );

  const hasAnySubmittedField = Object.values(deliverables.submittedFields).some(Boolean);
  const hasSubmission = Boolean(currentSub || hasAnySubmittedField);

  useEffect(() => {
    const handleSync = () => {
      setDeliverables(StudentService.getDeliverables(weekText));
      setSubmissions(StudentService.getSubmissions());
      setTeam(StudentService.getTeam());
    };
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [weekText]);

  // Check if Class Advisor has already awarded marks for this milestone week
  const marksRecord = MarksService.getWeeklyMarks(team?.id || 'TEAM-CSE-Y3-B04', currentWeekNumber);
  const isMarksAssigned = Boolean(
    marksRecord && (
      marksRecord.teamAverage !== undefined ||
      (marksRecord.memberMarks && Object.keys(marksRecord.memberMarks).length > 0)
    )
  );

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

  const handleFieldSubmit = (field: keyof StudentDeliverableState['submittedFields'], value: string) => {
    if (!value.trim()) return;
    const updated = StudentService.saveDeliverableField(weekText, field, value);
    setDeliverables({ ...updated });

    // If this week was in revision/rejected state, update submission status to 'Submitted'
    if (isRevisionRequired) {
      StudentService.updateSubmission(currentWeekNumber, `Revised ${field}: ${value.substring(0, 40)}...`);
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
      onSuccess(`Submitted ${field.toUpperCase()} for ${weekText} successfully. Sent to Guide & Advisor.`);
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

  // Helper to check if field can be edited/submitted
  const isFieldSubmitted = (field: keyof StudentDeliverableState['submittedFields']) => {
    return Boolean(deliverables.submittedFields[field]) && !isRevisionRequired && !isTitleRejected;
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-[#E2E8E4] space-y-6 font-sans">
      
      {/* Header and Current Week Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8E4]">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Milestone Submission Form</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isTitleRejected
              ? "Guide has rejected the current proposal. Please review the reason below, update the required fields, and re-submit."
              : isRevisionRequired
              ? "Guide has requested revisions. Update necessary fields and submit again."
              : "Submit project deliverables for active evaluation"}
          </p>
        </div>

        {/* Current Week Badge & Delete Action */}
        <div className="flex items-center gap-3">
          {currentSub && (currentSub.status === 'Submitted' || Object.values(deliverables.submittedFields).some(Boolean)) && (
            <button
              type="button"
              disabled={isMarksAssigned}
              onClick={() => {
                if (isMarksAssigned) {
                  alert(`Cannot delete submission: Marks have already been evaluated and assigned by the Class Advisor for Week ${currentWeekNumber} (Average Score: ${marksRecord?.teamAverage}/100).`);
                  return;
                }
                if (confirm(`Delete the current submission for Week ${currentWeekNumber}? This will unsubmit and reset all fields.`)) {
                  StudentService.deleteSubmission(currentWeekNumber);
                  const reset = StudentService.getDeliverables(weekText);
                  setDeliverables({ ...reset });
                  setTitle('');
                  setProblemStatement('');
                  setSolution('');
                  setTechnology('');
                  setObstaclesFaced('');
                  setAbstract('');
                  setPresentationFileName('');
                  setReportFileName('');
                  setRepoUrl('');
                  setDemoUrl('');
                  setScreenshotName('');
                  setSubmissions(StudentService.getSubmissions());
                  if (onSuccess) onSuccess(`Week ${currentWeekNumber} submission deleted successfully.`);
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                isMarksAssigned
                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-75'
                  : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer'
              }`}
              title={isMarksAssigned ? `Submission locked: Marks (${marksRecord?.teamAverage}/100) have been awarded by Class Advisor.` : "Delete current submission"}
            >
              {isMarksAssigned ? <Lock size={13} className="text-slate-400" /> : <Trash2 size={13} />}
              <span>{isMarksAssigned ? 'Submission Locked (Marks Assigned)' : 'Delete Submission'}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Current Week:</span>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 text-xs font-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-mint-500 animate-pulse"></span>
              <span>Week {currentWeekNumber}</span>
            </div>

            {/* Overall Status Pill Badge */}
            {!hasSubmission ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-xs font-black select-none">
                <Clock size={12} className="text-slate-500" />
                <span>No Submission</span>
              </div>
            ) : isApproved ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black select-none">
                <Check size={12} className="text-emerald-600" />
                <span>Approved</span>
              </div>
            ) : isRevisionRequired ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-xs font-black select-none">
                <AlertTriangle size={12} className="text-rose-600" />
                <span>Changes Requested</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-black select-none">
                <Clock size={12} className="text-amber-600" />
                <span>Pending</span>
              </div>
            )}
          </div>
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
              <span>Guide Consultation Notice for Week {currentWeekNumber}</span>
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
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Project Title</label>
            {isFieldSubmitted('title') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="text"
              id="inputProjectTitle"
              value={title}
              disabled={isFieldSubmitted('title')}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {!isFieldSubmitted('title') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('title', title)}
                disabled={!title.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Problem Statement */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Problem Statement</label>
            {isFieldSubmitted('problemStatement') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <textarea
            rows={4}
            value={problemStatement}
            disabled={isFieldSubmitted('problemStatement')}
            onChange={(e) => setProblemStatement(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          {!isFieldSubmitted('problemStatement') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('problemStatement', problemStatement)}
                disabled={!problemStatement.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Submit</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Proposed Solution */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Proposed Solution &amp; Technical Approach</label>
            {isFieldSubmitted('solution') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <textarea
            rows={4}
            value={solution}
            disabled={isFieldSubmitted('solution')}
            onChange={(e) => setSolution(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          {!isFieldSubmitted('solution') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('solution', solution)}
                disabled={!solution.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Submit</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Technologies Used */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Technologies Used</label>
            {isFieldSubmitted('technologyUsed') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="text"
              value={technology}
              disabled={isFieldSubmitted('technologyUsed')}
              onChange={(e) => setTechnology(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {!isFieldSubmitted('technologyUsed') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('technologyUsed', technology)}
                disabled={!technology.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Obstacles Faced */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Obstacles Faced</label>
            {isFieldSubmitted('obstaclesFaced') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <textarea
            rows={4}
            value={obstaclesFaced}
            disabled={isFieldSubmitted('obstaclesFaced')}
            onChange={(e) => setObstaclesFaced(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          {!isFieldSubmitted('obstaclesFaced') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('obstaclesFaced', obstaclesFaced)}
                disabled={!obstaclesFaced.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Submit</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Abstract */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Project Abstract</label>
            {isFieldSubmitted('abstract') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <textarea
            rows={3}
            value={abstract}
            disabled={isFieldSubmitted('abstract')}
            onChange={(e) => setAbstract(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
          />
          {!isFieldSubmitted('abstract') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleFieldSubmit('abstract', abstract)}
                disabled={!abstract.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Submit</span>
              </button>
            </div>
          )}
        </div>

        {/* 7. Presentation File: PPT / PPTX only */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-bold text-slate-800">Presentation Deck (PowerPoint Only)</label>
              <span className="text-[11px] text-slate-400 block mt-0.5">Strictly .ppt or .pptx format required</span>
            </div>
            {isFieldSubmitted('presentation') && <SubmittedBadge isApproved={isApproved} />}
          </div>

          <div className="flex items-center gap-3">
            {isFieldSubmitted('presentation') ? (
              <span className="px-4 py-2 rounded-xl bg-slate-100 border border-[#E2E8E4] text-slate-700 font-bold text-xs flex items-center gap-2 cursor-default">
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
                <button
                  type="button"
                  onClick={() => handleFieldSubmit('presentation', presentationFileName)}
                  disabled={!presentationFileName}
                  className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <span>Submit</span>
                </button>
              </div>
            )}
            {presentationFileName && isFieldSubmitted('presentation') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{presentationFileName}</span>
            )}
          </div>
        </div>

        {/* 8. Technical Project Report: PDF only */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-bold text-slate-800">Technical Report Document (PDF Only)</label>
              <span className="text-[11px] text-slate-400 block mt-0.5">Strictly .pdf format required</span>
            </div>
            {isFieldSubmitted('report') && <SubmittedBadge isApproved={isApproved} />}
          </div>

          <div className="flex items-center gap-3">
            {isFieldSubmitted('report') ? (
              <span className="px-4 py-2 rounded-xl bg-slate-100 border border-[#E2E8E4] text-slate-700 font-bold text-xs flex items-center gap-2 cursor-default">
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
                <button
                  type="button"
                  onClick={() => handleFieldSubmit('report', reportFileName)}
                  disabled={!reportFileName}
                  className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <span>Submit</span>
                </button>
              </div>
            )}
            {reportFileName && isFieldSubmitted('report') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{reportFileName}</span>
            )}
          </div>
        </div>

        {/* 9. Repository Link (GitHub) */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Source Code Repository URL</label>
            {isFieldSubmitted('repoUrl') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="url"
              value={repoUrl}
              disabled={isFieldSubmitted('repoUrl')}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {!isFieldSubmitted('repoUrl') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('repoUrl', repoUrl)}
                disabled={!repoUrl.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* 9. Live Demo Link */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Live Deployment / Demo URL</label>
            {isFieldSubmitted('demoUrl') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="url"
              value={demoUrl}
              disabled={isFieldSubmitted('demoUrl')}
              onChange={(e) => setDemoUrl(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {!isFieldSubmitted('demoUrl') && (
              <button
                type="button"
                onClick={() => handleFieldSubmit('demoUrl', demoUrl)}
                disabled={!demoUrl.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span>Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* 10. Output Screenshot */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Output Screenshot Upload</label>
            {isFieldSubmitted('screenshot') && <SubmittedBadge isApproved={isApproved} />}
          </div>
          <div className="flex items-center gap-3">
            {isFieldSubmitted('screenshot') ? (
              <span className="px-4 py-2 rounded-xl bg-slate-100 border border-[#E2E8E4] text-slate-700 font-bold text-xs flex items-center gap-2 cursor-default">
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
                <button
                  type="button"
                  onClick={() => handleFieldSubmit('screenshot', screenshotName)}
                  disabled={!screenshotName}
                  className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <span>Submit</span>
                </button>
              </div>
            )}
            {screenshotName && isFieldSubmitted('screenshot') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{screenshotName}</span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default SubmissionView;
