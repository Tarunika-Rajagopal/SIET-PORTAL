import React, { useState, useEffect } from 'react';
import { 
  X, Users, Code, ExternalLink, Github, FileText, CheckCircle2, 
  Clock, AlertCircle, XCircle, Send, CheckSquare, Presentation, 
  Image as ImageIcon, Lock, Bell
} from 'lucide-react';

export const TeamDetailsModal = ({ 
  isOpen, 
  onClose, 
  team, 
  onApprove, 
  onReject, 
  onOpenNotify 
}) => {
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRejecting(false);
      setRejectionReason('');
      setRejectError('');
    }
  }, [isOpen, team?.teamId]);

  if (!isOpen || !team) return null;

  const isApproved = team.titleStatus === 'Approved';

  // Submission checks
  const hasTitle = Boolean(team.projectTitle && team.projectTitle.trim());
  const hasProblemStatement = Boolean(team.problemStatement && team.problemStatement.trim());
  const hasSolution = Boolean(team.proposedSolution && team.proposedSolution.trim());
  const hasAbstract = Boolean((team.abstract || team.projectDescription) && (team.abstract || team.projectDescription).trim());
  const hasTechStack = Boolean(team.technologiesUsed && team.technologiesUsed.length > 0);
  const hasGithub = Boolean(team.githubUrl && team.githubUrl.trim());
  const hasDemo = Boolean(team.liveDemoUrl && team.liveDemoUrl.trim());

  // Week 0 or latest deliverable files
  const firstSub = team.submissions?.[0];
  const hasPpt = Boolean(firstSub?.pptUrl || firstSub?.presentationFileName);
  const hasReport = Boolean(firstSub?.reportUrl);
  const hasImages = Boolean(firstSub?.images && firstSub.images.length > 0);

  const handleConfirmReject = (e) => {
    e?.preventDefault();
    if (!rejectionReason || !rejectionReason.trim()) {
      setRejectError('Rejection reason is mandatory. Please state specifically what needs revision.');
      return;
    }
    if (onReject) {
      const res = onReject(team.teamId, rejectionReason.trim());
      if (res !== false) {
        setRejecting(false);
        setRejectionReason('');
        onClose();
      }
    }
  };

  const handleConfirmApprove = () => {
    if (onApprove) {
      onApprove(team.teamId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-details-title"
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs">
              Team #{team.teamNumber}
            </span>
            <div>
              <h3 id="team-details-title" className="text-sm font-extrabold text-slate-900 truncate max-w-lg">
                {hasTitle ? team.projectTitle : <span className="text-rose-600 font-bold">Title Not Submitted</span>}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Class {team.class}-{team.section} &bull; Batch {team.batch} &bull; Advisor: {team.advisor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content: What all they have submitted */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          
          {/* Status & Overall Verification Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#EFF3F1]/60 border border-[#E2E8E4]">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-slate-700 text-xs">Current Endorsement Status:</span>
              <span className={`px-3 py-1 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5 border ${
                team.titleStatus === 'Approved'
                  ? 'bg-mint-100 text-mint-900 border-mint-200'
                  : team.titleStatus === 'Pending'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {team.titleStatus === 'Approved' && <CheckCircle2 size={13} className="text-mint-700" />}
                {team.titleStatus === 'Pending' && <Clock size={13} className="text-amber-600" />}
                {team.titleStatus === 'Rejected' && <AlertCircle size={13} className="text-rose-600" />}
                <span>{team.titleStatus === 'Approved' ? 'Approved' : team.titleStatus === 'Rejected' ? 'Revision Required' : 'Pending Review'}</span>
              </span>
            </div>

            {team.rejectionReason && team.titleStatus === 'Rejected' && (
              <div className="w-full mt-1 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
                <span className="font-extrabold text-rose-800 uppercase tracking-wider text-[10px] block">Previous Mandated Revision Reason:</span>
                <p className="mt-0.5 leading-relaxed font-medium">"{team.rejectionReason}"</p>
              </div>
            )}
          </div>

          {/* Section: Submissions Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#E2E8E4]">
              <span className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                Student Deliverables &amp; Artifacts Checklist
              </span>
              <span className="text-[11px] text-slate-400">
                Items missing are marked in red as Not Submitted
              </span>
            </div>

            {/* 1. Project Title */}
            <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs">1. Capstone Project Title</span>
                {hasTitle ? (
                  <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Submitted
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                    Not Submitted
                  </span>
                )}
              </div>
              {hasTitle && (
                <p className="text-slate-900 font-bold text-xs">
                  {team.projectTitle}
                </p>
              )}
            </div>

            {/* 2. Problem Statement */}
            <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs">2. Problem Statement</span>
                {hasProblemStatement ? (
                  <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Submitted
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                    Not Submitted
                  </span>
                )}
              </div>
              {hasProblemStatement && (
                <p className="text-slate-800 leading-relaxed text-xs">
                  {team.problemStatement}
                </p>
              )}
            </div>

            {/* 3. Proposed Solution Architecture */}
            <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs">3. Proposed Solution Architecture</span>
                {hasSolution ? (
                  <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Submitted
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                    Not Submitted
                  </span>
                )}
              </div>
              {hasSolution && (
                <p className="text-slate-800 leading-relaxed text-xs">
                  {team.proposedSolution}
                </p>
              )}
            </div>

            {/* 4. Project Abstract / Scope */}
            <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs">4. Project Abstract &amp; Scope</span>
                {hasAbstract ? (
                  <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Submitted
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                    Not Submitted
                  </span>
                )}
              </div>
              {hasAbstract && (
                <p className="text-slate-700 leading-relaxed italic text-xs">
                  "{team.abstract || team.projectDescription}"
                </p>
              )}
            </div>

            {/* 5. Technologies Used */}
            <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs">5. Technologies &amp; Hardware Stack</span>
                {hasTechStack ? (
                  <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Submitted
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                    Not Submitted
                  </span>
                )}
              </div>
              {hasTechStack && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {team.technologiesUsed.map((tech, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-lg bg-mint-50 text-mint-900 font-bold text-[11px] border border-mint-200">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 6 & 7: GitHub & Live Staging Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    <Github size={13} /> 6. GitHub Repository
                  </span>
                  {hasGithub ? (
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Submitted</span>
                  ) : (
                    <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[10px]">Not Submitted</span>
                  )}
                </div>
                {hasGithub && (
                  <a href={team.githubUrl} target="_blank" rel="noreferrer" className="text-mint-700 hover:underline font-bold text-xs truncate block">
                    {team.githubUrl}
                  </a>
                )}
              </div>

              <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    <ExternalLink size={13} /> 7. Live Demo URL
                  </span>
                  {hasDemo ? (
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Submitted</span>
                  ) : (
                    <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[10px]">Not Submitted</span>
                  )}
                </div>
                {hasDemo && (
                  <a href={team.liveDemoUrl} target="_blank" rel="noreferrer" className="text-mint-700 hover:underline font-bold text-xs truncate block">
                    {team.liveDemoUrl}
                  </a>
                )}
              </div>
            </div>

            {/* 8 & 9: Presentation & Report Dossier Files */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    <Presentation size={13} /> 8. Proposal Slides (PPT)
                  </span>
                  {hasPpt ? (
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Submitted</span>
                  ) : (
                    <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[10px]">Not Submitted</span>
                  )}
                </div>
                {hasPpt && (
                  <span className="text-slate-800 font-mono font-bold text-xs truncate block">
                    {firstSub?.presentationFileName || 'Proposal_Presentation.pptx'}
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    <FileText size={13} /> 9. Technical Report (PDF)
                  </span>
                  {hasReport ? (
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Submitted</span>
                  ) : (
                    <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[10px]">Not Submitted</span>
                  )}
                </div>
                {hasReport && (
                  <span className="text-slate-800 font-mono font-bold text-xs truncate block">
                    {firstSub?.reportUrl && !firstSub.reportUrl.startsWith('mock_') ? firstSub.reportUrl : 'Technical_Dossier_W0.pdf'}
                  </span>
                )}
              </div>
            </div>

            {/* 10. Prototype / Hardware Captures */}
            <div className="p-3.5 bg-slate-50/70 border border-[#E2E8E4] rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                  <ImageIcon size={13} /> 10. Prototype Bench / Hardware Captures
                </span>
                {hasImages ? (
                  <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Submitted</span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[10px]">Not Submitted</span>
                )}
              </div>
              {hasImages && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {firstSub.images.map((img, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-[#E2E8E4] aspect-video">
                      <img src={img} alt="Capture" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mandatory Rejection Form Section (Appears when guide chooses to reject) */}
          {rejecting && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-start gap-2 text-xs text-rose-900">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-rose-900 block">Mandatory Revision Justification Required:</span>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    State specifically why the submissions are not acceptable and what changes or benchmarks are mandated.
                  </p>
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectError) setRejectError('');
                  }}
                  placeholder="e.g. Problem statement lacks clear comparative benchmarks with existing research; resubmit with dataset specifications..."
                  className="w-full p-3 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                {rejectError && <p className="text-[11px] text-rose-600 font-bold mt-1">{rejectError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Confirm Rejection (Mandatory Reason)</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenNotify && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNotify(team);
                }}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Bell size={14} className="text-amber-700" />
                <span>Notify Team</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Guide Decision Options */}
          <div className="flex items-center gap-2.5">
            {isApproved ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 border border-mint-200 text-mint-900 font-extrabold text-xs">
                <Lock size={14} className="text-mint-700" />
                <span>Scope Endorsed &amp; Approved</span>
              </div>
            ) : (
              <>
                {!rejecting && (
                  <button
                    type="button"
                    onClick={() => setRejecting(true)}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <XCircle size={14} />
                    <span>Reject Submissions</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  className="px-5 py-2 text-xs font-bold text-white bg-mint-500 hover:bg-mint-600 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>Approve Submissions</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeamDetailsModal;
