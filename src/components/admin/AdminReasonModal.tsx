import React, { useState } from 'react';
import { X, HelpCircle, Check, AlertTriangle } from 'lucide-react';

interface AdminReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  targetDescription: string;
  confirmLabel?: string;
  isDanger?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const AdminReasonModal: React.FC<AdminReasonModalProps> = ({
  isOpen,
  title,
  subtitle,
  targetDescription,
  confirmLabel = "Confirm Action",
  isDanger = false,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason to fulfill system audit compliance.');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-6 border-b border-[#E2E8E4] flex items-center justify-between ${isDanger ? 'bg-red-50/60' : 'bg-mint-50/60'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isDanger ? 'bg-red-100 text-red-700' : 'bg-mint-500 text-white shadow-sm'
            }`}>
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] text-slate-800 font-bold">
            {targetDescription}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Reason / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this change being made? (Recorded in audit trail)..."
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl text-slate-800 focus:outline-none focus:border-mint-500 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 ${
                isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-mint-500 hover:bg-mint-600'
              }`}
            >
              <Check size={14} />
              <span>{confirmLabel}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AdminReasonModal;
