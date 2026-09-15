import React, { useState } from 'react';
import { X, Printer, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AdvisorHistoryLog } from '../../services/advisorHistoryService';

interface AdvisorHistoryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AdvisorHistoryLog[];
  advisorName: string;
  className: string;
  dateRange: { from: string; to: string };
  selectedRole?: string;
  selectedAction?: string;
}

export const AdvisorHistoryPdfModal: React.FC<AdvisorHistoryPdfModalProps> = ({
  isOpen,
  onClose,
  logs,
  advisorName,
  className,
  dateRange,
  selectedRole,
  selectedAction
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // Generate and download actual PDF file
  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('printableAdvisorReport');
    if (!reportElement) return;

    try {
      setIsGeneratingPdf(true);

      // Render the DOM element to high-res canvas
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

      // Additional pages if report exceeds one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Download file directly as .pdf
      const fileName = `SIET_Audit_History_${className}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
      // Fallback to browser print if canvas generation encounters an unexpected error
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-[#E2E8E4] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Bar (Hidden during print - Shows "Format Alone" preview notification) */}
        <div className="p-4 border-b border-[#E2E8E4] flex flex-wrap items-center justify-between gap-3 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <FileText size={16} className="text-mint-600" />
            <span>Document Format Preview (Review layout before downloading)</span>
          </div>

          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="text-xs text-mint-700 font-bold flex items-center gap-1 bg-mint-50 px-2.5 py-1 rounded-lg border border-mint-200 animate-fadeIn">
                <CheckCircle2 size={13} />
                <span>Downloaded Successfully!</span>
              </span>
            )}

            <button
              type="button"
              onClick={handlePrint}
              title="Print directly"
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-[#E2E8E4] transition flex items-center gap-1.5 text-xs cursor-pointer shadow-2xs"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 text-xs cursor-pointer disabled:opacity-50"
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
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Container: Displays Document Format Alone */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-800 bg-white" id="printableAdvisorReport">
          
          {/* Institutional Letterhead */}
          <div className="border-b-2 border-mint-700 pb-5 text-center space-y-1">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/logo.jpg" alt="SIET Logo" className="w-12 h-12 object-contain rounded-lg border border-[#E2E8E4]" />
              <div className="text-left">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                  Sri Shakthi Institute of Engineering and Technology
                </h1>
                <p className="text-xs text-mint-700 font-bold">
                  Department of Computer Science and Engineering
                </p>
              </div>
            </div>
            <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase pt-1">
              Multi-Role Activity History &amp; Evaluation Audit Dossier
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 font-medium pt-1">
              <span><strong>Designated Class Advisor:</strong> {advisorName}</span>
              <span>&bull;</span>
              <span><strong>Class &amp; Section:</strong> Class {className}</span>
              <span>&bull;</span>
              <span><strong>Generated On:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Filter Summary Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] font-bold">
              {(dateRange.from || dateRange.to) && (
                <span className="text-mint-900 bg-mint-50 border border-mint-200 py-0.5 px-2.5 rounded-md">
                  Date Range: {dateRange.from || 'Start'} to {dateRange.to || 'Present'}
                </span>
              )}
              {selectedRole && selectedRole !== 'All Roles' && (
                <span className="text-blue-900 bg-blue-50 border border-blue-200 py-0.5 px-2.5 rounded-md">
                  Filtered Role: {selectedRole}
                </span>
              )}
              {selectedAction && selectedAction !== 'All Actions' && (
                <span className="text-purple-900 bg-purple-50 border border-purple-200 py-0.5 px-2.5 rounded-md">
                  Action: {selectedAction}
                </span>
              )}
              <span className="text-slate-600 bg-slate-100 border border-slate-200 py-0.5 px-2.5 rounded-md">
                Total Records: {logs.length}
              </span>
            </div>
          </div>

          {/* Table of Records */}
          <div className="border border-[#E2E8E4] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-slate-700 font-extrabold border-b border-[#E2E8E4] uppercase text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Operational Details</th>
                  <th className="p-3">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4] text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No evaluation or management records found matching the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap font-mono text-slate-500">{log.dateFormatted}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-slate-800">{log.role || 'Class Advisor'}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-mint-800">{log.actionType}</td>
                      <td className="p-3 whitespace-nowrap font-extrabold text-slate-900">{log.target}</td>
                      <td className="p-3 text-slate-700 leading-relaxed">{log.details}</td>
                      <td className="p-3 whitespace-nowrap text-slate-600 font-medium">{log.actorName || log.advisorName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Institutional Signature Lines */}
          <div className="pt-8 border-t border-[#E2E8E4] flex items-center justify-between text-xs text-slate-600">
            <div className="text-center">
              <div className="w-44 border-b border-slate-400 mb-1"></div>
              <span className="font-bold block">{advisorName}</span>
              <span className="text-[10px] text-slate-400">Class Advisor Signature</span>
            </div>
            <div className="text-center">
              <div className="w-44 border-b border-slate-400 mb-1"></div>
              <span className="font-bold block">Head of Department</span>
              <span className="text-[10px] text-slate-400">CSE Department Seal &amp; Signature</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdvisorHistoryPdfModal;
