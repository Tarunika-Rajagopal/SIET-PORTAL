import React, { useState } from 'react';
import { X, Download, FileText, Shield, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('printableAuditReport');
    if (!reportElement) return;

    try {
      setIsGeneratingPdf(true);

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `SIET_Admin_Audit_Governance_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl border border-[#D8CCBA] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Bar */}
        <div className="p-4 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE] print:hidden">
          <div className="flex items-center gap-2 text-[#111111] font-medium text-xs">
            <FileText size={16} className="text-[#111111]" />
            <span>PDF Format Preview</span>
          </div>

          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="text-xs text-[#111111] font-medium flex items-center gap-1 bg-[#EDE7DB] px-2.5 py-1 rounded-lg border border-[#D8CCBA] animate-fadeIn">
                <CheckCircle2 size={13} className="text-emerald-700" />
                <span>Downloaded Automatically!</span>
              </span>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2 text-xs cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download as PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-8 space-y-6 text-[#111111] bg-white" id="printableAuditReport">
          
          {/* Institutional Letterhead */}
          <div className="border-b-2 border-[#111111] pb-5 text-center space-y-1">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/logo.jpg" alt="SIET Logo" className="w-12 h-12 object-contain rounded-lg border border-[#D8CCBA]" />
              <div className="text-left">
                <h1 className="text-base font-serif font-bold text-[#111111] uppercase tracking-wide">
                  Sri Shakthi Institute of Engineering and Technology
                </h1>
                <p className="text-[11px] text-[#75695A] font-medium uppercase">
                  (Autonomous Institution • Affiliated to Anna University • Approved by AICTE)
                </p>
                <p className="text-[11px] text-[#75695A] font-semibold">
                  Department of Computer Science and Engineering
                </p>
              </div>
            </div>
            <div className="pt-2">
              <h2 className="text-sm font-serif font-bold text-[#111111] uppercase tracking-wider bg-[#F8F5EE] inline-block px-4 py-1 rounded-full border border-[#D8CCBA]">
                Official Administrative Audit Trail &amp; Allocation Log Report
              </h2>
            </div>
          </div>

          {/* Document Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] text-xs">
            <div>
              <span className="text-[10px] text-[#75695A] font-bold block uppercase">Report Date</span>
              <span className="font-bold text-[#111111]">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#75695A] font-bold block uppercase">Active Administrator</span>
              <span className="font-bold text-[#111111] font-mono">admin@siet.ac.in</span>
            </div>

            <div>
              <span className="text-[10px] text-[#75695A] font-bold block uppercase">Total Logged Entries</span>
              <span className="font-bold text-[#111111]">{logs.length} Recorded Events</span>
            </div>

            <div>
              <span className="text-[10px] text-[#75695A] font-bold block uppercase">Integrity Verification</span>
              <span className="font-bold text-[#111111] flex items-center gap-1">
                <Shield size={12} />
                <span>Verified Audit Trail</span>
              </span>
            </div>
          </div>

          {/* Tabular Audit Trail */}
          <div className="border border-[#D8CCBA] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#EDE7DB] font-semibold text-[#75695A] border-b border-[#D8CCBA]">
                <tr>
                  <th className="p-3 border-r border-[#D8CCBA] w-36">Timestamp</th>
                  <th className="p-3 border-r border-[#D8CCBA] w-36">Action Type</th>
                  <th className="p-3 border-r border-[#D8CCBA]">Target Entity</th>
                  <th className="p-3 border-r border-[#D8CCBA]">Operational Details</th>
                  <th className="p-3 w-44">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBA] text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8F5EE]/50">
                    <td className="p-3 border-r border-[#D8CCBA] text-[#75695A] font-mono whitespace-nowrap">
                      {log.dateFormatted}
                    </td>
                    <td className="p-3 border-r border-[#D8CCBA] font-bold text-[#111111]">
                      {log.actionType}
                    </td>
                    <td className="p-3 border-r border-[#D8CCBA] font-medium text-[#111111]">
                      {log.target}
                    </td>
                    <td className="p-3 border-r border-[#D8CCBA] text-[#292725]">
                      {log.details}
                    </td>
                    <td className="p-3 font-normal text-[#75695A] italic bg-[#F8F5EE]/40">
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Institutional Sign-off Footer */}
          <div className="pt-8 border-t border-[#D8CCBA] flex items-center justify-between text-xs text-[#75695A]">
            <div>
              <p className="font-bold text-[#111111]">System Generated Document</p>
              <p className="text-[10px]">Sri Shakthi Academic Project Portal • Autonomous CSE Governance</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-[#75695A] w-48 mb-1"></div>
              <p className="font-bold text-[#111111]">Head of Department / Administrator</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default HistoryPdfPreviewModal;
