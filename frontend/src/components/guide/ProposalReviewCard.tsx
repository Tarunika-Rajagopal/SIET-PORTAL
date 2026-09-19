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
    <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#D8CCBA]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D8CCBA]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#111111] bg-[#EDE7DB] px-2.5 py-0.5 rounded-full border border-[#D8CCBA]">
              {team.teamId}
            </span>
            <span className="text-xs text-[#75695A] font-semibold">({team.class} &bull; {team.batch})</span>
          </div>
          <h3 className="text-base font-serif font-bold text-[#111111] mt-1">
            {team.title || team.projectTitle}
          </h3>
          <p className="text-xs text-[#75695A] mt-0.5">Lead Candidate: {team.leadStudent}</p>
        </div>

        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isApproved ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}>
            {isApproved ? <CheckCircle2 size={14} className="text-emerald-700" /> : <Clock size={14} className="text-amber-700" />}
            <span>{isApproved ? 'Proposal Approved' : 'Sign-off Pending'}</span>
          </span>
        </div>
      </div>

      {/* Review Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#75695A]">
          Last Submission: <strong className="text-[#111111]">{team.lastSubmission || 'Recently updated'}</strong>
        </div>

        <div className="flex items-center gap-2">
          {!isApproved && (
            <>
              <button
                type="button"
                onClick={() => setIsRevisionMode(!isRevisionMode)}
                className="px-4 py-2 rounded-xl bg-[#F8F5EE] hover:bg-[#EDE7DB] border border-[#D8CCBA] text-[#111111] text-xs font-bold transition cursor-pointer"
              >
                Request Revisions
              </button>
              <button
                type="button"
                onClick={onApprove}
                className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Approve Proposal</span>
              </button>
            </>
          )}
          {isApproved && (
            <span className="text-xs text-emerald-900 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
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
