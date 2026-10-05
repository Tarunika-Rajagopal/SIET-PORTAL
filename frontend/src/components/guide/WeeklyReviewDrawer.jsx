import React from 'react';
import { 
  X, ExternalLink, Github, Bell, CheckCircle2, Clock, Calendar
} from 'lucide-react';
import { formatProjectTitle, getSubmissionTitle } from '../../utils/titleUtils';

export const WeeklyReviewDrawer = ({
  isOpen,
  onClose,
  team,
  submission,
  onOpenDocPreview,
  onOpenImageViewer,
  onOpenNotify
}) => {
  if (!isOpen || !team || !submission) return null;

  const hasAbstract = Boolean(submission.abstractSummary && submission.abstractSummary.trim());
  const hasObstacles = Boolean((submission.obstaclesFaced || submission.problemsFaced) && (submission.obstaclesFaced || submission.problemsFaced).trim());
  const hasNextPlan = Boolean(submission.nextWeekPlan && submission.nextWeekPlan.trim());
  const hasGithub = Boolean((team.githubUrl || submission.githubUrl) && (team.githubUrl || submission.githubUrl).trim());
  const hasDemo = Boolean((team.liveDemoUrl || submission.liveDemoUrl) && (team.liveDemoUrl || submission.liveDemoUrl).trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-fadeIn font-sans">
      <div 
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-xl border border-[#D8CCBA] flex flex-col overflow-hidden transform transition-all duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-drawer-title"
      >
        {/* Drawer Header */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs">
              Week {submission.weekNumber}
            </span>
            <div>
              <h3 id="review-drawer-title" className="text-sm font-serif font-bold text-[#111111] tracking-wide">
                Milestone Deliverables Inspection
              </h3>
              <p className="text-[11px] text-[#75695A] font-semibold">
                Team #{team.teamNumber} &bull; {getSubmissionTitle(team.projectTitle)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Drawer Body: View what all they have submitted, red Not Submitted badges */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Section 1: Project Information */}
          <div className="border border-[#D8CCBA] rounded-2xl p-4 bg-[#F8F5EE] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#75695A]">Project Context</span>
              <div className="flex items-center gap-2">
                {hasGithub ? (
                  <a
                    href={team.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#111111] hover:underline font-bold text-[11px]"
                  >
                    <Github size={12} />
                    <span>Repo</span>
                  </a>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[10px]">
                    Repo Not Submitted
                  </span>
                )}
                {hasDemo ? (
                  <a
                    href={team.liveDemoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-mint-700 hover:underline font-bold text-[11px]"
                  >
                    <ExternalLink size={12} />
                    <span>Live Demo</span>
                  </a>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[10px]">
                    Demo Not Submitted
                  </span>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-xs">
                {team.projectTitle || null}
              </h4>
              {team.problemStatement && (
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  {team.problemStatement}
                </p>
              )}
            </div>

            {(() => {
              const raw = team.technologiesUsed || team.technologyUsed || team.techStack || submission.technologiesUsed || submission.technologyUsed || submission.techStack;
              const list = Array.isArray(raw)
                ? raw
                : (typeof raw === 'string' && raw.trim() ? raw.split(',').map(s => s.trim()).filter(Boolean) : []);
              return list.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {list.map((tech, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold text-[10px] border border-[#D8CCBA]">
                      {tech}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}
          </div>

          {/* Section 2: Weekly Deliverables */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#D8CCBA]">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Week {submission.weekNumber} Deliverables &amp; Artifacts
              </h4>
              <span className="text-[11px] text-slate-400">
                Logged on {submission.submissionDate || 'N/A'}
              </span>
            </div>

            {/* Abstract Summary */}
            <div className="p-4 bg-slate-50 border border-[#D8CCBA] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700 text-xs">Sprint Abstract Summary:</span>
                {hasAbstract ? (
                  <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Submitted</span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded text-[10px]">Not Submitted</span>
                )}
              </div>
              {hasAbstract && (
                <p className="text-slate-700 leading-relaxed text-xs">
                  {submission.abstractSummary}
                </p>
              )}
            </div>

            {/* Problems Faced & Next Week Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 text-[10px] uppercase tracking-wider">
                    Obstacles Faced
                  </span>
                  {hasObstacles ? (
                    <span className="text-emerald-700 font-extrabold text-[9px]">Submitted</span>
                  ) : (
                    <span className="text-rose-600 font-bold text-[9px]">Not Submitted</span>
                  )}
                </div>
                {hasObstacles && (
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {submission.obstaclesFaced || submission.problemsFaced}
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-mint-50/70 border border-mint-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-mint-900 text-[10px] uppercase tracking-wider">
                    Next Sprint Target
                  </span>
                  {hasNextPlan ? (
                    <span className="text-emerald-700 font-extrabold text-[9px]">Submitted</span>
                  ) : (
                    <span className="text-rose-600 font-bold text-[9px]">Not Submitted</span>
                  )}
                </div>
                {hasNextPlan && (
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {submission.nextWeekPlan}
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Drawer Bottom Footer: NO approve/reject, just View & Notify Team */}
        <div className="bg-[#F8F5EE] px-6 py-3.5 border-t border-[#D8CCBA] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenNotify) onOpenNotify(team, submission.weekNumber);
            }}
            className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Bell size={14} className="text-amber-700" />
            <span>Notify Team (Week {submission.weekNumber})</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReviewDrawer;
