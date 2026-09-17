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
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        {/* Header */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
              <XCircle size={20} />
            </div>
            <div>
              <h3 id="reject-modal-title" className="text-sm font-serif font-bold text-[#111111] tracking-wide">
                Mandate Title Revision
              </h3>
              <p className="text-[11px] text-[#75695A] font-semibold">Team #{team.teamNumber} &bull; {team.teamLeader}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-lg hover:bg-[#EDE7DB] transition cursor-pointer"
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
              <label className="text-xs font-bold text-[#111111]">
                Quick Preset Feedback Snippets:
              </label>
              <span className="text-[10px] text-[#75695A]">Click to autofill</span>
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
                  className="w-full text-left text-[11px] p-2.5 bg-[#F8F5EE] hover:bg-[#EDE7DB] border border-[#D8CCBA] rounded-xl text-[#111111] transition leading-snug cursor-pointer"
                >
                  "{preset}"
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">
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
              className="w-full p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
            />
            {error && <p className="text-[11px] text-rose-600 font-semibold mt-1">{error}</p>}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#D8CCBA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#111111] hover:text-black bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
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
