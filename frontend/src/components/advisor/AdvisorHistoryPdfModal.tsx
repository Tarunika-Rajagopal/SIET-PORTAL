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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl border border-[#D8CCBA] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Bar (Hidden during print - Shows "Format Alone" preview notification) */}
        <div className="p-4 border-b border-[#D8CCBA] flex flex-wrap items-center justify-between gap-3 bg-[#F8F5EE] print:hidden">
          <div className="flex items-center gap-2 text-[#111111] font-medium text-xs">
            <FileText size={16} className="text-[#111111]" />
            <span>Document Format Preview (Review layout before downloading)</span>
          </div>

          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="text-xs text-[#111111] font-medium flex items-center gap-1 bg-[#EDE7DB] px-2.5 py-1 rounded-lg border border-[#D8CCBA] animate-fadeIn">
                <CheckCircle2 size={13} />
                <span>Downloaded Successfully!</span>
              </span>
            )}

            <button
              type="button"
              onClick={handlePrint}
              title="Print directly"
              className="px-3 py-2 bg-white hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] font-medium rounded-xl border border-[#D8CCBA] transition flex items-center gap-1.5 text-xs cursor-pointer shadow-2xs"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
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
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Container: Displays Document Format Alone */}
        <div className="p-6 sm:p-10 space-y-6 text-[#111111] bg-white" id="printableAdvisorReport">
          
          {/* Institutional Letterhead */}
          <div className="border-b-2 border-[#111111] pb-5 text-center space-y-1">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/logo.jpg" alt="SIET Logo" className="w-12 h-12 object-contain rounded-lg border border-[#D8CCBA]" />
              <div className="text-left">
                <h1 className="text-base sm:text-lg font-serif font-bold text-[#111111] uppercase tracking-wide">
                  Sri Shakthi Institute of Engineering and Technology
                </h1>
                <p className="text-xs text-[#75695A] font-medium">
                  Department of Computer Science and Engineering
                </p>
              </div>
            </div>
            <h2 className="text-sm font-serif font-bold text-[#111111] tracking-wider uppercase pt-1">
              Multi-Role Activity History &amp; Evaluation Audit Dossier
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#75695A] font-normal pt-1">
              <span><strong>Designated Class Advisor:</strong> {advisorName}</span>
              <span>&bull;</span>
              <span><strong>Class &amp; Section:</strong> Class {className}</span>
              <span>&bull;</span>
              <span><strong>Generated On:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Filter Summary Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] font-medium">
              {(dateRange.from || dateRange.to) && (
                <span className="text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] py-0.5 px-2.5 rounded-md">
                  Date Range: {dateRange.from || 'Start'} to {dateRange.to || 'Present'}
                </span>
              )}
              {selectedRole && selectedRole !== 'All Roles' && (
                <span className="text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] py-0.5 px-2.5 rounded-md">
                  Filtered Role: {selectedRole}
                </span>
              )}
              {selectedAction && selectedAction !== 'All Actions' && (
                <span className="text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] py-0.5 px-2.5 rounded-md">
                  Action: {selectedAction}
                </span>
              )}
              <span className="text-[#75695A] bg-[#EDE7DB] border border-[#D8CCBA] py-0.5 px-2.5 rounded-md">
                Total Records: {logs.length}
              </span>
            </div>
          </div>

          {/* Table of Records */}
          <div className="border border-[#D8CCBA] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EDE7DB] text-[#75695A] font-semibold border-b border-[#D8CCBA] uppercase text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Operational Details</th>
                  <th className="p-3">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBA] text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#75695A]">
                      No evaluation or management records found matching the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8F5EE]/50">
                      <td className="p-3 whitespace-nowrap font-mono text-[#75695A]">{log.dateFormatted}</td>
                      <td className="p-3 whitespace-nowrap font-medium text-[#111111]">{log.role || 'Class Advisor'}</td>
                      <td className="p-3 whitespace-nowrap font-medium text-[#111111]">{log.actionType}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-[#111111]">{log.target}</td>
                      <td className="p-3 text-[#292725] leading-relaxed">{log.details}</td>
                      <td className="p-3 whitespace-nowrap text-[#75695A] font-medium">{log.actorName || log.advisorName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Institutional Signature Lines */}
          <div className="pt-8 border-t border-[#D8CCBA] flex items-center justify-between text-xs text-[#75695A]">
            <div className="text-center">
              <div className="w-44 border-b border-[#75695A] mb-1"></div>
              <span className="font-bold text-[#111111] block">{advisorName}</span>
              <span className="text-[10px] text-[#75695A]">Class Advisor Signature</span>
            </div>
            <div className="text-center">
              <div className="w-44 border-b border-[#75695A] mb-1"></div>
              <span className="font-bold text-[#111111] block">Head of Department</span>
              <span className="text-[10px] text-[#75695A]">CSE Department Seal &amp; Signature</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdvisorHistoryPdfModal;
