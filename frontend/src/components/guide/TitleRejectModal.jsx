import React, { useState } from 'react';
import { XCircle, AlertCircle, X, Send } from 'lucide-react';

const PRESET_REASONS = [
  "Lacks clear hardware specs for UHF RFID readers vs HF tags. Re-frame problem statement with inventory search benchmarks before resubmitting.",
  "Project scope overlaps with previous academic batch capstone. Differentiate technical novelty or algorithmic complexity.",
  "Methodology lacks measurable benchmark evaluation metrics. Define concrete accuracy or latency targets.",
  "Dataset acquisition pipeline is ambiguous. Detail consented data sources and regulatory compliance."
];

export const TitleRejectModal = ({ isOpen, onClose, team, onReject }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !team) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a mandatory rejection justification for the team.');
      return;
    }
    const success = onReject(team.teamId, reason.trim());
    if (success !== false) {
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
              <XCircle size={20} />
            </div>
            <div>
              <h3 id="reject-modal-title" className="text-sm font-extrabold text-slate-900 tracking-wide">
                Mandate Title Revision
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">Team #{team.teamNumber} &bull; {team.teamLeader}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900">
            <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
            <p>
              Students will receive this feedback instantaneously on their portal dashboard. They will be required to edit their problem statement and re-submit for your review.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-extrabold text-slate-800">
                Quick Preset Feedback Snippets:
              </label>
              <span className="text-[10px] text-slate-400">Click to autofill</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {PRESET_REASONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setReason(preset);
                    setError('');
                  }}
                  className="w-full text-left text-[11px] p-2.5 bg-slate-50 hover:bg-rose-50/60 border border-[#E2E8E4] hover:border-rose-300 rounded-xl text-slate-700 transition leading-snug"
                >
                  "{preset}"
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1">
              Mandatory Revision Instructions &amp; Action Items <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Detail specifically what technical specifications, literature review, or architecture changes the team must address..."
              className="w-full p-3 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition"
            />
            {error && <p className="text-[11px] text-rose-600 font-semibold mt-1">{error}</p>}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2E8E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
            >
              <Send size={14} />
              <span>Reject Title &amp; Send Feedback</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TitleRejectModal;
