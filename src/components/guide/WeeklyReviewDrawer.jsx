import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, FileText, Presentation, Image as ImageIcon, 
  ExternalLink, Github, Send, ShieldAlert, Lock, Clock, Calendar, CheckSquare
} from 'lucide-react';

export const WeeklyReviewDrawer = ({
  isOpen,
  onClose,
  team,
  submission,
  onEvaluate,
  onRequestRevision,
  onOpenDocPreview,
  onOpenImageViewer
}) => {
  const [remarks, setRemarks] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'revision'
  const [error, setError] = useState('');

  useEffect(() => {
    if (submission) {
      setRemarks(submission.guideRemarks || '');
      setRevisionReason('');
      setActiveTab('review');
      setError('');
    }
  }, [submission, isOpen]);

  if (!isOpen || !team || !submission) return null;

  const isAlreadyEvaluated = submission.evaluationStatus === 'Evaluated';

  const handleApprove = () => {
    onEvaluate(team.teamId, submission.weekNumber, remarks);
    onClose();
  };

  const handleRevision = () => {
    if (!revisionReason.trim()) {
      setError('Please provide specific revision feedback for the students.');
      return;
    }
    const success = onRequestRevision(team.teamId, submission.weekNumber, revisionReason.trim());
    if (success !== false) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-modal border border-[#E2E8E4] flex flex-col overflow-hidden transform transition-all duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-drawer-title"
      >
        {/* Drawer Header in White & Mint */}
        <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs">
              Week {submission.weekNumber}
            </span>
            <div>
              <h3 id="review-drawer-title" className="text-sm font-extrabold text-slate-900 tracking-wide">
                Milestone Evaluation &amp; Deliverables Audit
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Team #{team.teamNumber} &bull; {team.projectTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Section 1: Project Information */}
          <div className="border border-[#E2E8E4] rounded-2xl p-4 bg-[#EFF3F1]/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">1. Project Context</span>
              <div className="flex items-center gap-2">
                {team.githubUrl && (
                  <a
                    href={team.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-bold text-[11px]"
                  >
                    <Github size={12} />
                    <span>Repo</span>
                  </a>
                )}
                {team.liveDemoUrl && (
                  <a
                    href={team.liveDemoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-mint-700 hover:underline font-bold text-[11px]"
                  >
                    <ExternalLink size={12} />
                    <span>Live Demo</span>
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-xs">{team.projectTitle}</h4>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">{team.problemStatement}</p>
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {team.technologiesUsed?.map((tech, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold text-[10px] border border-[#E2E8E4]">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Section 2: Weekly Deliverables */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                2. Week {submission.weekNumber} Deliverables &amp; Artifacts
              </h4>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                submission.evaluationStatus === 'Evaluated'
                  ? 'bg-mint-100 text-mint-900 border-mint-200'
                  : submission.evaluationStatus === 'Revision Required'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {submission.evaluationStatus}
              </span>
            </div>

            {/* Abstract Summary */}
            <div className="p-4 bg-slate-50 border border-[#E2E8E4] rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs">Sprint Abstract Summary:</span>
                <span className="text-[10px] text-slate-400 font-mono">Logged: {submission.submissionDate}</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-xs">{submission.abstractSummary}</p>
            </div>

            {/* Document Cards: Technical Report & Slide Deck */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-white border border-[#E2E8E4] rounded-xl hover:border-mint-500 transition shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-mint-50 text-mint-700 border border-mint-200 flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Technical Report</h5>
                    <span className="text-[10px] text-slate-400">PDF &bull; 4 Pages</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocPreview('report')}
                  className="w-full py-1.5 text-center font-bold text-mint-900 bg-mint-50 border border-mint-200 hover:bg-mint-100 rounded-lg transition text-[11px]"
                >
                  View Full Report
                </button>
              </div>

              <div className="p-3.5 bg-white border border-[#E2E8E4] rounded-xl hover:border-mint-500 transition shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                    <Presentation size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Sprint Slide Deck</h5>
                    <span className="text-[10px] text-slate-400">PPTX &bull; 8 Slides</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocPreview('ppt')}
                  className="w-full py-1.5 text-center font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition text-[11px]"
                >
                  View Slide Deck
                </button>
              </div>
            </div>

            {/* Image Thumbnails Lightbox */}
            {submission.images && submission.images.length > 0 && (
              <div>
                <span className="font-extrabold text-slate-700 text-xs block mb-1.5 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-mint-600" />
                  <span>Hardware &amp; Software Artifact Captures (Click to expand):</span>
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {submission.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onOpenImageViewer(idx)}
                      className="group relative rounded-xl overflow-hidden border border-[#E2E8E4] aspect-video hover:border-mint-500 shadow-xs transition"
                    >
                      <img
                        src={img}
                        alt={`Capture ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-[10px]">
                        Inspect HD
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Problems Faced & Next Week Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
                <span className="font-bold text-rose-900 text-[10px] uppercase tracking-wider block">
                  Obstacles Faced
                </span>
                <p className="text-slate-700 text-xs leading-relaxed">
                  {submission.obstaclesFaced || submission.problemsFaced || 'No blockers reported.'}
                </p>
              </div>

              <div className="p-3 bg-mint-50/70 border border-mint-200 rounded-xl space-y-1">
                <span className="font-bold text-mint-900 text-[10px] uppercase tracking-wider block">
                  Next Sprint Target
                </span>
                <p className="text-slate-700 text-xs leading-relaxed">
                  {submission.nextWeekPlan || 'Next phase milestones.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Guide Evaluation Form */}
          <div className="border-t border-[#E2E8E4] pt-5 space-y-4">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={14} className="text-mint-600" />
              <span>3. Guide Milestone Evaluation &amp; Endorsement</span>
            </h4>

            {isAlreadyEvaluated ? (
              /* Already Evaluated Read-Only State */
              <div className="p-4 rounded-xl bg-mint-50/80 border border-mint-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-mint-900 font-extrabold text-xs">
                    <Lock size={14} className="text-mint-700" />
                    <span>Evaluated &amp; Locked by Faculty Guide</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-mint-800">
                    {submission.evaluatedDate}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-mint-200 text-xs text-slate-800 font-medium leading-relaxed">
                  "{submission.guideRemarks}"
                </div>
                <p className="text-[11px] text-mint-800 font-bold">
                  &check; Academic credit endorsed for institutional project records.
                </p>
              </div>
            ) : (
              /* Interactive Review Form */
              <div className="space-y-3">
                <div className="flex gap-2 border-b border-[#E2E8E4] pb-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('review'); setError(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === 'review'
                        ? 'bg-mint-500 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Endorse / Approve Deliverables
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('revision'); setError(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === 'revision'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Request Technical Revision
                  </button>
                </div>

                {activeTab === 'review' ? (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 mb-1">
                        Faculty Guide Endorsement Remarks:
                      </label>
                      <textarea
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="e.g. Approved. Thorough documentation and verified prototype latency benchmarks..."
                        className="w-full p-3 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-mint-500 focus:bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="w-full py-2.5 text-xs font-bold text-white bg-mint-500 hover:bg-mint-600 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <CheckCircle2 size={16} />
                      <span>Approve &amp; Lock Milestone {submission.weekNumber}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>
                        The milestone will be marked as <strong>Revision Required</strong>. The team will be notified to correct and resubmit their deliverables.
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 mb-1">
                        Mandatory Revision Deficiencies <span className="text-rose-600">*</span>:
                      </label>
                      <textarea
                        rows={3}
                        value={revisionReason}
                        onChange={(e) => {
                          setRevisionReason(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="e.g. FPS dropped below acceptable 25 FPS threshold. Quantize neural network weights with TensorRT..."
                        className="w-full p-3 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                      />
                      {error && <p className="text-[11px] text-rose-600 font-semibold mt-1">{error}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={handleRevision}
                      className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Send size={15} />
                      <span>Submit Revision Instructions to Students</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Bottom Close */}
        <div className="bg-[#F8FAF9] px-6 py-3.5 border-t border-[#E2E8E4] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReviewDrawer;
