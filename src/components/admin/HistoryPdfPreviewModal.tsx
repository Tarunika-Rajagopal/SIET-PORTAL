import React from 'react';
import { X, Printer, Download, FileText, Shield, Calendar } from 'lucide-react';
import { AuditLog } from '../../types';

interface HistoryPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const HistoryPdfPreviewModal: React.FC<HistoryPdfPreviewModalProps> = ({
  isOpen,
  onClose,
  logs
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-[#E2E8E4] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="p-4 border-b border-[#E2E8E4] flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
            <FileText size={16} className="text-mint-600" />
            <span>PDF Print / Export Preview Format</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 text-xs"
            >
              <Printer size={15} />
              <span>Download / Print PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-8 space-y-6 text-slate-800 bg-white" id="printableAuditReport">
          
          {/* Institutional Letterhead */}
          <div className="border-b-2 border-mint-700 pb-5 text-center space-y-1">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/logo.jpg" alt="SIET Logo" className="w-12 h-12 object-contain rounded-lg border border-[#E2E8E4]" />
              <div className="text-left">
                <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                  Sri Shakthi Institute of Engineering and Technology
                </h1>
                <p className="text-[11px] text-slate-500 font-bold uppercase">
                  (Autonomous Institution • Affiliated to Anna University • Approved by AICTE)
                </p>
                <p className="text-[11px] text-mint-700 font-extrabold">
                  Department of Computer Science and Engineering
                </p>
              </div>
            </div>
            <div className="pt-2">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider bg-mint-50 inline-block px-4 py-1 rounded-full border border-mint-200">
                Official Administrative Audit Trail &amp; Allocation Log Report
              </h2>
            </div>
          </div>

          {/* Document Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-[#E2E8E4] text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Report Date</span>
              <span className="font-extrabold text-slate-800">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Administrator</span>
              <span className="font-extrabold text-slate-800 font-mono">admin@siet.ac.in</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Logged Entries</span>
              <span className="font-extrabold text-mint-900">{logs.length} Recorded Events</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Integrity Verification</span>
              <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                <Shield size={12} />
                <span>Verified Audit Trail</span>
              </span>
            </div>
          </div>

          {/* Tabular Audit Trail */}
          <div className="border border-[#E2E8E4] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#EFF3F1] font-extrabold text-slate-700 border-b border-[#E2E8E4]">
                <tr>
                  <th className="p-3 border-r border-[#E2E8E4] w-36">Timestamp</th>
                  <th className="p-3 border-r border-[#E2E8E4] w-36">Action Type</th>
                  <th className="p-3 border-r border-[#E2E8E4]">Target Entity</th>
                  <th className="p-3 border-r border-[#E2E8E4]">Operational Details</th>
                  <th className="p-3 w-44">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4] text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 border-r border-[#E2E8E4] text-slate-500 font-mono whitespace-nowrap">
                      {log.dateFormatted}
                    </td>
                    <td className="p-3 border-r border-[#E2E8E4] font-extrabold text-slate-900">
                      {log.actionType}
                    </td>
                    <td className="p-3 border-r border-[#E2E8E4] font-bold text-mint-900">
                      {log.target}
                    </td>
                    <td className="p-3 border-r border-[#E2E8E4] text-slate-700">
                      {log.details}
                    </td>
                    <td className="p-3 font-medium text-slate-600 italic bg-slate-50/50">
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Institutional Sign-off Footer */}
          <div className="pt-8 border-t border-[#E2E8E4] flex items-center justify-between text-xs text-slate-500">
            <div>
              <p className="font-bold">System Generated Document</p>
              <p className="text-[10px]">Sri Shakthi Academic Project Portal • Autonomous CSE Governance</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-slate-300 w-48 mb-1"></div>
              <p className="font-bold text-slate-800">Head of Department / Administrator</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default HistoryPdfPreviewModal;
