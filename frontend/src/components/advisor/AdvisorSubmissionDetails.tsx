import React from 'react';
import { FileCode, ExternalLink, XCircle } from 'lucide-react';
import { WeeklySubmission } from '../../types';
import { getSubmissionTitle } from '../../utils/titleUtils';

interface AdvisorSubmissionDetailsProps {
  submission: WeeklySubmission | null | undefined;
  teamTitle?: string;
}

export const AdvisorSubmissionDetails: React.FC<AdvisorSubmissionDetailsProps> = ({
  submission,
  teamTitle,
}) => {
  // Extract real submitted fields with no mock or hardcoded fallbacks
  const rawTitle = submission?.projectTitle || teamTitle || '';
  const displayTitle = getSubmissionTitle(rawTitle);
  const hasTitle = Boolean(rawTitle.trim() && displayTitle !== 'No Title Submitted' && displayTitle !== 'Title Approval Pending');

  const problemStatement = (submission?.problemStatement || '').trim();
  const solution = (submission?.solution || '').trim();
  const technologyUsed = (submission?.technologyUsed || '').trim();
  const obstaclesFaced = (submission?.obstaclesFaced || '').trim();
  const abstract = (submission?.abstract || '').trim();
  const repoUrl = (submission?.repoUrl || '').trim();
  const demoUrl = (submission?.demoUrl || '').trim();

  return (
    <div className="space-y-4 text-xs font-sans">
      <h4 className="font-extrabold text-sm text-slate-900 border-b border-[#D8CCBA] pb-2">
        Complete Student Submission Details
      </h4>

      {/* Project Title */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Project Title
          </span>
          {!hasTitle && (
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <XCircle size={12} className="text-rose-600" />
              Not Submitted
            </span>
          )}
        </div>
        {hasTitle ? (
          <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs font-bold text-slate-900">
            {displayTitle}
          </div>
        ) : (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
            <XCircle size={14} className="text-rose-600" />
            <span>Not Submitted</span>
          </div>
        )}
      </div>

      {/* Problem Statement */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Problem Statement
          </span>
          {!problemStatement && (
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <XCircle size={12} className="text-rose-600" />
              Not Submitted
            </span>
          )}
        </div>
        {problemStatement ? (
          <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {problemStatement}
          </div>
        ) : (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
            <XCircle size={14} className="text-rose-600" />
            <span>Not Submitted</span>
          </div>
        )}
      </div>

      {/* Proposed Solution & Technical Approach */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Proposed Solution &amp; Technical Approach
          </span>
          {!solution && (
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <XCircle size={12} className="text-rose-600" />
              Not Submitted
            </span>
          )}
        </div>
        {solution ? (
          <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {solution}
          </div>
        ) : (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
            <XCircle size={14} className="text-rose-600" />
            <span>Not Submitted</span>
          </div>
        )}
      </div>

      {/* Technologies Used */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Technologies Used
          </span>
          {!technologyUsed && (
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <XCircle size={12} className="text-rose-600" />
              Not Submitted
            </span>
          )}
        </div>
        {technologyUsed ? (
          <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 font-mono font-bold">
            {technologyUsed}
          </div>
        ) : (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
            <XCircle size={14} className="text-rose-600" />
            <span>Not Submitted</span>
          </div>
        )}
      </div>

      {/* Obstacles Faced */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Obstacles Faced
          </span>
          {!obstaclesFaced && (
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <XCircle size={12} className="text-rose-600" />
              Not Submitted
            </span>
          )}
        </div>
        {obstaclesFaced ? (
          <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {obstaclesFaced}
          </div>
        ) : (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
            <XCircle size={14} className="text-rose-600" />
            <span>Not Submitted</span>
          </div>
        )}
      </div>

      {/* Project Abstract */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Project Abstract
          </span>
          {!abstract && (
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <XCircle size={12} className="text-rose-600" />
              Not Submitted
            </span>
          )}
        </div>
        {abstract ? (
          <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {abstract}
          </div>
        ) : (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
            <XCircle size={14} className="text-rose-600" />
            <span>Not Submitted</span>
          </div>
        )}
      </div>

      {/* Repository & Live Deployment Links */}
      <div>
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
          Repository &amp; Live Deployment Links
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Source Code Repository */}
          {repoUrl ? (
            <div className="p-3.5 rounded-2xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <FileCode size={18} />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block">GitHub Source Code</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] sm:max-w-[200px] block">
                    {repoUrl}
                  </span>
                </div>
              </div>
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
              >
                <ExternalLink size={12} />
                <span>Visit</span>
              </a>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                  <FileCode size={18} />
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">GitHub Source Code</span>
                  <span className="text-[10px] text-slate-400">Repository</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                <XCircle size={12} />
                <span>Not Submitted</span>
              </span>
            </div>
          )}

          {/* Live Deployment */}
          {demoUrl ? (
            <div className="p-3.5 rounded-2xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center shrink-0">
                  <ExternalLink size={18} />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block">Live Deployment</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] sm:max-w-[200px] block">
                    {demoUrl}
                  </span>
                </div>
              </div>
              <a
                href={demoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
              >
                <ExternalLink size={12} />
                <span>Demo</span>
              </a>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                  <ExternalLink size={18} />
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Live Deployment</span>
                  <span className="text-[10px] text-slate-400">Web Demo</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                <XCircle size={12} />
                <span>Not Submitted</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvisorSubmissionDetails;
