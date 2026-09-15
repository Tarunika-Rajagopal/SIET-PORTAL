import React, { useState } from 'react';
import { X, FileText, Presentation, ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';

export const DocumentPreviewModal = ({ isOpen, onClose, documentType = 'report', submission, team }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = documentType === 'report' ? 4 : 8;

  if (!isOpen || !submission || !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-preview-title"
      >
        {/* Top Control Bar in White & Mint */}
        <div className="bg-white px-6 py-3.5 border-b border-[#E2E8E4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mint-50 text-mint-700 border border-mint-200 flex items-center justify-center shadow-xs">
              {documentType === 'report' ? <FileText size={18} /> : <Presentation size={18} />}
            </div>
            <div>
              <h3 id="doc-preview-title" className="text-xs font-extrabold text-slate-900 tracking-wide">
                {documentType === 'report' ? 'Institutional Technical Sprint Report' : 'Milestone Slide Deck Presentation'}
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold">
                Team #{team.teamNumber} &bull; Week {submission.weekNumber} Deliverable
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Page navigation */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl text-xs font-mono text-slate-700 border border-[#E2E8E4]">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="hover:text-mint-700 disabled:opacity-30 transition p-0.5"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[11px] font-extrabold">
                {documentType === 'report' ? `Page ${currentPage} of ${totalPages}` : `Slide ${currentPage} of ${totalPages}`}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="hover:text-mint-700 disabled:opacity-30 transition p-0.5"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Viewer Surface */}
        <div className="p-6 bg-[#EFF3F1]/70 overflow-y-auto flex-1 flex justify-center">
          <div className="bg-white w-full max-w-2xl min-h-[500px] rounded-2xl shadow-card border border-[#E2E8E4] p-8 flex flex-col justify-between text-xs text-slate-800">
            {/* Institutional Watermark & Header */}
            <div>
              <div className="border-b-2 border-mint-500 pb-4 mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                    Sri Shakthi Institute of Engineering and Technology
                  </h2>
                  <p className="text-[10px] text-mint-700 font-bold">
                    Department of Computer Science and Engineering &bull; Capstone Project Framework
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-[10px] font-extrabold">
                    Week {submission.weekNumber}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    {submission.submissionDate}
                  </span>
                </div>
              </div>

              {/* Dynamic Page Content */}
              {documentType === 'report' ? (
                <div className="space-y-4">
                  {currentPage === 1 && (
                    <>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Project Title</span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{team.projectTitle}</h3>
                        <p className="text-xs text-slate-600 mt-1">
                          <strong>Team #{team.teamNumber}</strong> &bull; Lead: {team.teamLeader} ({team.leaderRollNo})
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-[#E2E8E4] rounded-xl space-y-2">
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">1.0 Executive Sprint Abstract</h4>
                        <p className="text-slate-700 leading-relaxed text-xs">{submission.abstractSummary}</p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-[#E2E8E4] rounded-xl space-y-1.5">
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">2.0 Team Members on Duty</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {team.members?.map((m, i) => (
                            <div key={i} className="text-slate-600">
                              &bull; <span className="font-bold text-slate-900">{m.name}</span> ({m.role})
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {currentPage === 2 && (
                    <>
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide border-b border-[#E2E8E4] pb-1">
                        3.0 Technical Implementations &amp; Work Completed
                      </h4>
                      <p className="text-slate-700 leading-relaxed">
                        During sprint {submission.weekNumber}, our team prioritized subsystem modularization, API contract enforcement, and unit test coverage. Hardware prototypes and middleware logic were verified on local testbenches under faculty mentor advisory.
                      </p>
                      <div className="p-4 rounded-xl bg-mint-50/70 border border-mint-200 space-y-2">
                        <span className="font-bold text-mint-900 block">Key Milestones Achieved:</span>
                        <ul className="list-disc list-inside text-slate-700 space-y-1">
                          <li>System architecture and protocol design documented according to IEEE standards.</li>
                          <li>Integrated foundational database schemas and CRUD middleware endpoints.</li>
                          <li>Conducted bench testing and debouncing diagnostics on peripheral interfaces.</li>
                        </ul>
                      </div>
                    </>
                  )}

                  {currentPage === 3 && (
                    <>
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide border-b border-[#E2E8E4] pb-1">
                        4.0 Technical Impediments &amp; Mitigations
                      </h4>
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                        <span className="font-bold text-rose-900 block">Obstacles Encountered:</span>
                        <p className="text-slate-700 leading-relaxed">{submission.problemsFaced || 'No critical blockers recorded during this milestone.'}</p>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 mt-3">
                        <span className="font-bold text-amber-900 block">Corrective Countermeasures:</span>
                        <p className="text-slate-700 leading-relaxed">
                          Applied firmware debouncing filters, asynchronous task queues, and consult sessions with designated Faculty Guide {team.guide}.
                        </p>
                      </div>
                    </>
                  )}

                  {currentPage === 4 && (
                    <>
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide border-b border-[#E2E8E4] pb-1">
                        5.0 Next Sprint Target Deliverables
                      </h4>
                      <div className="p-4 bg-slate-50 border border-[#E2E8E4] rounded-xl space-y-1.5">
                        <span className="font-bold text-slate-900 block">Week {submission.weekNumber + 1} Work Plan:</span>
                        <p className="text-slate-700 leading-relaxed">{submission.nextWeekPlan || 'Proceed with next phase integrations.'}</p>
                      </div>

                      <div className="mt-8 pt-6 border-t-2 border-[#E2E8E4] grid grid-cols-2 gap-8 text-center">
                        <div>
                          <div className="border-b border-slate-300 pb-8"></div>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Student Leader Signature</span>
                          <span className="font-bold text-slate-900 text-[11px]">{team.teamLeader}</span>
                        </div>
                        <div>
                          <div className="border-b border-slate-300 pb-8"></div>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Faculty Guide Endorsement</span>
                          <span className="font-bold text-slate-900 text-[11px]">{team.guide}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Slide Deck Viewer */
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    {currentPage}
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {currentPage === 1 && `Milestone Presentation: ${team.projectTitle}`}
                    {currentPage === 2 && "Problem Formulation & Academic Context"}
                    {currentPage === 3 && "System Architecture & Block Diagrams"}
                    {currentPage === 4 && `Week ${submission.weekNumber} Deliverables & Demos`}
                    {currentPage === 5 && "Hardware & Benchmark Diagnostics"}
                    {currentPage === 6 && "Obstacles, Failures & Resolutive Action"}
                    {currentPage === 7 && "Sprint Velocity & Next Milestones"}
                    {currentPage === 8 && "Conclusion & Question/Answer Session"}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                    {submission.abstractSummary}
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint-50 text-mint-900 border border-mint-200 font-mono text-[11px]">
                    Slide {currentPage} of {totalPages} &bull; 16:9 HD Projection Format
                  </div>
                </div>
              )}
            </div>

            {/* Document Footer */}
            <div className="border-t border-[#E2E8E4] pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>CONFIDENTIAL &bull; SIET ACADEMIC CAPSTONE REPOSITORY</span>
              <span>{documentType === 'report' ? `PAGE ${currentPage} OF ${totalPages}` : `SLIDE ${currentPage} OF ${totalPages}`}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="bg-white px-6 py-3 border-t border-[#E2E8E4] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Rendered from student repository bundle ({submission.submissionStatus})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-[#E2E8E4] hover:bg-slate-50 rounded-xl transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
