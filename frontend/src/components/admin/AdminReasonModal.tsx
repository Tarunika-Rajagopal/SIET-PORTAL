import React, { useState } from 'react';
import { X, HelpCircle, Check, AlertTriangle,Loader2 } from 'lucide-react';
import {AdminService} from '../../services/adminService';

interface AdminReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  targetDescription: string;
  confirmLabel?: string;
  isDanger?: boolean;
  onClose: () => void;
}

export const AdminReasonModal: React.FC<AdminReasonModalProps> = ({
  isOpen,
  title,
  subtitle,
  targetDescription,
  confirmLabel = "Confirm Action",
  isDanger = false,
  onClose
}) => {
  if (!isOpen) return null;

  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading,setLoading] = useState<boolean>(false);
  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!reason.trim()) {
      setError('Please provide a reason to fulfill system audit compliance.');
      return;
    }
    try{
       await AdminService.deleteStudent(targetDescription.split(' ')[2].slice(1,-1));

    } catch(err){
      console.error(err)
      setError('Failed to delete student. Please try again.');
      return;
    } finally{
      setLoading(false);
      onClose();
    }
    console.log();
    setReason('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-[#D8CCBA] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold border ${
              isDanger ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-[#EDE7DB] text-[#111111] border-[#D8CCBA] shadow-xs'
            }`}>
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#111111]">{title}</h3>
              <p className="text-xs text-[#75695A]">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] text-[#111111] font-medium">
            {targetDescription}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[#75695A] font-medium mb-1">
              Reason / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8CCBA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#75695A] font-medium hover:text-[#111111] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2 ${
                isDanger ? 'bg-[#7C3838] hover:bg-[#682F2F]' : 'bg-[#111111] hover:bg-[#292725]'
              }`}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span>{confirmLabel}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AdminReasonModal;
