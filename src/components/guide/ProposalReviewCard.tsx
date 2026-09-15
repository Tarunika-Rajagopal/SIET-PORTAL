import React, { useState } from 'react';
import { CheckCircle2, Clock, Send } from 'lucide-react';

interface ProposalReviewCardProps {
  team: any;
  onApprove: () => void;
  onRequestRevision: (remarks: string) => void;
}

export const ProposalReviewCard: React.FC<ProposalReviewCardProps> = ({
  team,
  onApprove,
  onRequestRevision
}) => {
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [remarks, setRemarks] = useState('');

  if (!team) return null;

  const isApproved = team.status === 'Approved' || team.guideApprovalStatus === 'Approved';

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) return;
    onRequestRevision(remarks);
    setIsRevisionMode(false);
    setRemarks('');
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8E4]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-mint-800 bg-mint-100 px-2.5 py-0.5 rounded-full border border-mint-200">
              {team.teamId}
            </span>
            <span className="text-xs text-slate-500 font-semibold">({team.class} &bull; {team.batch})</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            {team.title || team.projectTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Lead Candidate: {team.leadStudent}</p>
        </div>

        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isApproved ? 'bg-mint-100 text-mint-800 border border-mint-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {isApproved ? <CheckCircle2 size={14} className="text-mint-600" /> : <Clock size={14} />}
            <span>{isApproved ? 'Proposal Approved' : 'Sign-off Pending'}</span>
          </span>
        </div>
      </div>

      {/* Review Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Last Submission: <strong>{team.lastSubmission || 'Recently updated'}</strong>
        </div>

        <div className="flex items-center gap-2">
          {!isApproved && (
            <>
              <button
                type="button"
                onClick={() => setIsRevisionMode(!isRevisionMode)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Request Revisions
              </button>
              <button
                type="button"
                onClick={onApprove}
                className="px-5 py-2 rounded-xl bg-mint-500 hover:bg-mint-600 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>Approve Proposal</span>
              </button>
            </>
          )}
          {isApproved && (
            <span className="text-xs text-mint-800 font-bold bg-mint-50 px-3 py-1.5 rounded-full border border-mint-200">
              ✓ Proposal &amp; Title Formally Sanctioned
            </span>
          )}
        </div>
      </div>

      {/* Revision Input Mode */}
      {isRevisionMode && (
        <form onSubmit={handleRevisionSubmit} className="mt-4 p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-3">
          <label className="block text-xs font-bold text-amber-900">Specify Revision Remarks for Student Team</label>
          <textarea
            rows={2}
            required
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Scope needs clearer hardware quantization bounds before Review 1..."
            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:border-amber-600"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRevisionMode(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1"
            >
              <Send size={13} />
              <span>Send Revision Notice</span>
            </button>
          </div>
        </form>
      )}

    </div>
  );
};

export default ProposalReviewCard;
