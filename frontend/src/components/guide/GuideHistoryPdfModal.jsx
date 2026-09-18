import React, { useState } from 'react';
import { X, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const GuideHistoryPdfModal = ({
  isOpen,
  onClose,
  logs = [],
  guideName = 'Dr. P. Manimegalai'
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('printableGuideReport');
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

      const fileName = `SIET_Guide_History_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Guide PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl border border-[#D8CCBA] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Bar */}
        <div className="p-4 border-b border-[#D8CCBA] flex flex-wrap items-center justify-between gap-3 bg-[#F8F5EE] print:hidden">
          <div className="flex items-center gap-2 text-[#111111] font-medium text-xs">
            <FileText size={16} className="text-[#111111]" />
            <span>Document Format Preview</span>
          </div>

          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="text-xs text-[#111111] font-medium flex items-center gap-1 bg-[#EDE7DB] px-2.5 py-1 rounded-lg border border-[#D8CCBA] animate-fadeIn">
                <CheckCircle2 size={13} className="text-emerald-700" />
                <span>Downloaded Automatically!</span>
              </span>
            )}

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

        {/* Printable Document Container */}
        <div className="p-8 space-y-6 text-[#111111] bg-white" id="printableGuideReport">
          
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
              Faculty Guide Activity Governance &amp; Milestone Audit Dossier
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#75695A] font-normal pt-1">
              <span><strong>Faculty Guide:</strong> {guideName}</span>
              <span>&bull;</span>
              <span><strong>Jurisdiction:</strong> Mentored Capstone Project Batches</span>
              <span>&bull;</span>
              <span><strong>Generated On:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Filter Summary Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] font-medium">
              <span className="text-[#75695A] bg-[#EDE7DB] border border-[#D8CCBA] py-0.5 px-2.5 rounded-md">
                Total Audit Records: {logs.length}
              </span>
            </div>
          </div>

          {/* Table of Records */}
          <div className="border border-[#D8CCBA] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EDE7DB] text-[#75695A] font-semibold border-b border-[#D8CCBA] uppercase text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target Team</th>
                  <th className="p-3">Operational Details</th>
                  <th className="p-3">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBA] text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#75695A]">
                      No guide evaluation or review records logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8F5EE]/50">
                      <td className="p-3 whitespace-nowrap font-mono text-[#75695A]">{log.dateFormatted || log.time || 'Today'}</td>
                      <td className="p-3 whitespace-nowrap font-medium text-[#111111]">{log.actionType || log.type}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-[#111111]">{log.target || log.teamNo || 'Team'}</td>
                      <td className="p-3 text-[#292725] leading-relaxed">{log.details || log.comment || log.remarks}</td>
                      <td className="p-3 whitespace-nowrap text-[#75695A] font-medium">{log.guideName || guideName}</td>
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
              <span className="font-bold text-[#111111] block">{guideName}</span>
              <span className="text-[10px] text-[#75695A]">Faculty Guide Signature</span>
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

export default GuideHistoryPdfModal;
