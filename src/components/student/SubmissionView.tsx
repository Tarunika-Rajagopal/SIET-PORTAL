import React, { useState } from 'react';
import { StudentService, StudentDeliverableState } from '../../services/studentService';
import { Send, FileText, Check, Image, Upload } from 'lucide-react';

interface SubmissionViewProps {
  onSuccess?: (msg: string) => void;
}

// Exactly matches user screenshot 2: Pill badge with subtle border, green check, and slate text
const SubmittedBadge = () => (
  <div className="px-3.5 py-1.5 rounded-full bg-slate-50 border border-[#E2E8E4] text-slate-500 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-2xs select-none cursor-default shrink-0">
    <Check size={14} className="text-emerald-500" />
    <span>Submitted</span>
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

  // Field values state
  const [title, setTitle] = useState(deliverables.projectTitle || '');
  const [problemStatement, setProblemStatement] = useState(deliverables.problemStatement || '');
  const [solution, setSolution] = useState(deliverables.solution || '');
  const [technology, setTechnology] = useState(deliverables.technologyUsed || '');
  const [obstaclesFaced, setObstaclesFaced] = useState(deliverables.obstaclesFaced || '');
  const [abstract, setAbstract] = useState(deliverables.abstract || '');
  const [presentationFileName, setPresentationFileName] = useState(deliverables.presentationFile || '');
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
    handleFieldSubmit('presentation', file.name);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotName(file.name);
    handleFieldSubmit('screenshot', file.name);
  };

  // Helper to check if field can be edited/submitted
  const isFieldSubmitted = (field: keyof StudentDeliverableState['submittedFields']) => {
    return Boolean(deliverables.submittedFields[field]) && !isRevisionRequired;
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-[#E2E8E4] space-y-6 font-sans">
      
      {/* Header and Current Week Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8E4]">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Milestone Submission Form</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isRevisionRequired
              ? "Guide has requested revisions. Update necessary fields and submit again."
              : "Submit project deliverables for active evaluation"}
          </p>
        </div>

        {/* Current Week Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Current Week:</span>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 text-xs font-black shadow-xs">
            <span className="w-2 h-2 rounded-full bg-mint-500 animate-pulse"></span>
            <span>Week {currentWeekNumber}</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-5 text-xs">
        
        {/* 1. Project Title */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Project Title</label>
            {isFieldSubmitted('title') && <SubmittedBadge />}
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
            {isFieldSubmitted('title') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-not-allowed opacity-90 w-full sm:w-auto"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('title', title)}
                disabled={!title.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Send size={13} />
                <span>Submit Title</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Problem Statement */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Problem Statement</label>
            {isFieldSubmitted('problemStatement') && <SubmittedBadge />}
          </div>
          <textarea
            rows={4}
            value={problemStatement}
            disabled={isFieldSubmitted('problemStatement')}
            onChange={(e) => setProblemStatement(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          <div className="flex justify-end">
            {isFieldSubmitted('problemStatement') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-not-allowed opacity-90"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('problemStatement', problemStatement)}
                disabled={!problemStatement.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={13} />
                <span>Submit Problem Statement</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Proposed Solution */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Proposed Solution &amp; Technical Approach</label>
            {isFieldSubmitted('solution') && <SubmittedBadge />}
          </div>
          <textarea
            rows={4}
            value={solution}
            disabled={isFieldSubmitted('solution')}
            onChange={(e) => setSolution(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          <div className="flex justify-end">
            {isFieldSubmitted('solution') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-not-allowed opacity-90"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('solution', solution)}
                disabled={!solution.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={13} />
                <span>Submit Solution</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Technologies Used */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Technologies Used</label>
            {isFieldSubmitted('technologyUsed') && <SubmittedBadge />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="text"
              value={technology}
              disabled={isFieldSubmitted('technologyUsed')}
              onChange={(e) => setTechnology(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {isFieldSubmitted('technologyUsed') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-not-allowed opacity-90 w-full sm:w-auto"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('technologyUsed', technology)}
                disabled={!technology.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Send size={13} />
                <span>Submit Technologies</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Obstacles Faced */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Obstacles Faced</label>
            {isFieldSubmitted('obstaclesFaced') && <SubmittedBadge />}
          </div>
          <textarea
            rows={4}
            value={obstaclesFaced}
            disabled={isFieldSubmitted('obstaclesFaced')}
            onChange={(e) => setObstaclesFaced(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          />
          <div className="flex justify-end">
            {isFieldSubmitted('obstaclesFaced') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-not-allowed opacity-90"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('obstaclesFaced', obstaclesFaced)}
                disabled={!obstaclesFaced.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={13} />
                <span>Submit Obstacles Faced</span>
              </button>
            )}
          </div>
        </div>

        {/* 6. Abstract */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Project Abstract</label>
            {isFieldSubmitted('abstract') && <SubmittedBadge />}
          </div>
          <textarea
            rows={3}
            value={abstract}
            disabled={isFieldSubmitted('abstract')}
            onChange={(e) => setAbstract(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
          />
          <div className="flex justify-end">
            {isFieldSubmitted('abstract') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-not-allowed opacity-90"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('abstract', abstract)}
                disabled={!abstract.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={13} />
                <span>Submit Abstract</span>
              </button>
            )}
          </div>
        </div>

        {/* 7. Presentation File: PPT / PPTX only */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-bold text-slate-800">Presentation Deck (PowerPoint Only)</label>
              <span className="text-[11px] text-slate-400 block mt-0.5">Strictly .ppt or .pptx format required</span>
            </div>
            {isFieldSubmitted('presentation') && <SubmittedBadge />}
          </div>

          <div className="flex items-center gap-3">
            {isFieldSubmitted('presentation') ? (
              <span className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-2 cursor-default">
                <Check size={14} className="text-emerald-600" />
                <span>{presentationFileName || "Presentation Submitted"}</span>
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
              </div>
            )}
            {presentationFileName && isFieldSubmitted('presentation') && (
              <span className="text-[11px] font-mono text-slate-500 font-bold">{presentationFileName}</span>
            )}
          </div>
        </div>

        {/* 8. Repository Link (GitHub) */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Source Code Repository URL</label>
            {isFieldSubmitted('repoUrl') && <SubmittedBadge />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="url"
              value={repoUrl}
              disabled={isFieldSubmitted('repoUrl')}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {isFieldSubmitted('repoUrl') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-not-allowed opacity-90 w-full sm:w-auto"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('repoUrl', repoUrl)}
                disabled={!repoUrl.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Send size={13} />
                <span>Submit Repo</span>
              </button>
            )}
          </div>
        </div>

        {/* 9. Live Demo Link */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Live Deployment / Demo URL</label>
            {isFieldSubmitted('demoUrl') && <SubmittedBadge />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="url"
              value={demoUrl}
              disabled={isFieldSubmitted('demoUrl')}
              onChange={(e) => setDemoUrl(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-mint-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {isFieldSubmitted('demoUrl') ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-not-allowed opacity-90 w-full sm:w-auto"
              >
                <Check size={13} className="text-emerald-600" />
                <span>Submitted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldSubmit('demoUrl', demoUrl)}
                disabled={!demoUrl.trim()}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Send size={13} />
                <span>Submit Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* 10. Output Screenshot */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Output Screenshot Upload</label>
            {isFieldSubmitted('screenshot') && <SubmittedBadge />}
          </div>
          <div className="flex items-center gap-3">
            {isFieldSubmitted('screenshot') ? (
              <span className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-2 cursor-default">
                <Check size={14} className="text-emerald-600" />
                <span>{screenshotName || "Screenshot Submitted"}</span>
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
