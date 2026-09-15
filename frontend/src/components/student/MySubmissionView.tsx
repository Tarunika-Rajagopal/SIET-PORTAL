import React, { useState } from 'react';
import { WeeklySubmission } from '../../types';
import { StudentService } from '../../services/studentService';
import { 
  Calendar, CheckCircle2, Clock, FileText, Upload, AlertTriangle, 
  MessageSquare, RefreshCw, X, FileCode, ExternalLink, Image as ImageIcon,
  Award, User, Download, Check, XCircle
} from 'lucide-react';

interface MySubmissionViewProps {
  onSuccess?: (msg: string) => void;
}

export const MySubmissionView: React.FC<MySubmissionViewProps> = ({ onSuccess }) => {
  const [submissions, setSubmissions] = useState<WeeklySubmission[]>(() => StudentService.getSubmissions());
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeWeekSub, setActiveWeekSub] = useState<WeeklySubmission | null>(null);
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();

  // Completed / submitted weeks up to current academic week
  const completedWeeks = submissions.filter(
    s => s.week <= currentAcademicWeek && (s.status === 'Approved' || s.status === 'Submitted' || s.status === 'Changes Requested' || s.status === 'Rejected')
  );

  const handleOpenDetail = (sub: WeeklySubmission) => {
    setActiveWeekSub(sub);
    setDetailModalOpen(true);
  };

  const handleOpenResubmit = (sub: WeeklySubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveWeekSub(sub);
    setResubmitNotes('');
    setResubmitModalOpen(true);
  };

  const handleResubmitConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWeekSub || !resubmitNotes.trim()) return;

    StudentService.updateSubmission(activeWeekSub.week, resubmitNotes);
    setSubmissions(StudentService.getSubmissions());
    setResubmitModalOpen(false);
    if (detailModalOpen) setDetailModalOpen(false);
    if (onSuccess) {
      onSuccess(`Week ${activeWeekSub.week} milestone updated and submitted for Guide re-review.`);
    }
  };

  // Real file download trigger for PPT and PDF
  const handleDownloadFile = (fileName: string, fileType: 'ppt' | 'pdf', sub: WeeklySubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${sub.guideName || 'Dr. P. Manimegalai'}) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 220 >>
stream
BT
/F1 14 Tf
50 720 Td
(Sri Shakthi Institute of Engineering and Technology - Department of CSE) Tj
0 -25 Td
(Milestone Deliverable Dossier: Week ${sub.week} - ${sub.title}) Tj
0 -20 Td
(Project Title: ${sub.projectTitle || 'Autonomous Crop Disease Drone'}) Tj
0 -20 Td
(Student: Tarunika Rajgopal | Roll No: 714023104112) Tj
0 -20 Td
(Project Guide: ${sub.guideName || 'Dr. P. Manimegalai'} | Status: ${sub.status}) Tj
0 -20 Td
(Submitted Date: ${sub.submissionDate || 'N/A'}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 2 0 R >>
startxref
500
%%EOF`;
    } else {
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      content = `SIET PowerPoint Milestone Presentation
Milestone: Week ${sub.week} - ${sub.title}
Project: ${sub.projectTitle || 'Autonomous Crop Disease Drone System'}
Student: Tarunika Rajgopal (714023104112)
Project Guide: ${sub.guideName || 'Dr. P. Manimegalai'}
Submission Date: ${sub.submissionDate || 'N/A'}
Evaluation Status: ${sub.status}
Comments: ${sub.comments || 'Evaluated by Faculty Guide'}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadToast(`Downloaded ${fileName}`);
    setTimeout(() => {
      setDownloadToast(null);
    }, 3000);
  };

  return (
    <div className="space-y-4 font-sans">
      
      {/* Toast Notification */}
      {downloadToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Download size={14} className="text-mint-400" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* All Weeks Completed - Visible First as Interactive Cards */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Completed Milestones
            </span>
            <span className="text-[11px] font-bold text-mint-800 bg-mint-100 px-2.5 py-0.5 rounded-full border border-mint-200">
              {completedWeeks.length} Weeks Recorded (up to Week {currentAcademicWeek})
            </span>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8E4]">
          {completedWeeks.map((sub) => {
            const isRevisionRequired = sub.status === 'Changes Requested' || sub.status === 'Rejected';
            const isApproved = sub.status === 'Approved';
            const isSubmitted = sub.status === 'Submitted';

            return (
              <div
                key={sub.week}
                onClick={() => handleOpenDetail(sub)}
                className="p-5 sm:p-6 hover:bg-mint-50/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  
                  {/* Week Badge */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs transition group-hover:scale-105 ${
                    isApproved ? 'bg-mint-500 text-white' :
                    isRevisionRequired ? 'bg-rose-500 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    W{sub.week}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-mint-800 transition">
                        {sub.title}
                      </h4>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        isApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        isRevisionRequired ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {sub.status === 'Changes Requested' ? 'Needs Revision' : sub.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Submitted on {sub.submissionDate || 'N/A'}</span>
                      </span>

                      {sub.fileName ? (
                        <>
                          <span>&bull;</span>
                          <span className="text-slate-700 font-bold flex items-center gap-1 font-mono">
                            <FileText size={13} className="text-mint-700" />
                            <span>{sub.fileName}</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span>&bull;</span>
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <XCircle size={13} />
                            <span>No Presentation</span>
                          </span>
                        </>
                      )}

                      {sub.pdfFile ? (
                        <>
                          <span>&bull;</span>
                          <span className="text-slate-700 font-bold flex items-center gap-1 font-mono">
                            <FileCode size={13} className="text-mint-700" />
                            <span>PDF Dossier</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span>&bull;</span>
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <XCircle size={13} />
                            <span>No PDF Dossier</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Technologies Used & Obstacles Faced info */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      {sub.technologyUsed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EFF3F1] border border-[#E2E8E4] text-slate-700 font-semibold text-[10px]">
                          <span className="font-bold text-slate-500">Technologies:</span> <span className="font-mono">{sub.technologyUsed.split(',').slice(0, 3).join(', ')}{sub.technologyUsed.split(',').length > 3 ? '...' : ''}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                          <span>No Tech Specified</span>
                        </span>
                      )}
                      {sub.obstaclesFaced ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EFF3F1] border border-[#E2E8E4] text-slate-700 text-[10px] font-semibold line-clamp-1 max-w-sm sm:max-w-md">
                          <span className="font-bold text-slate-600 shrink-0">Obstacles:</span> <span className="truncate">{sub.obstaclesFaced}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                          <span>Obstacles: Not Submitted</span>
                        </span>
                      )}
                    </div>

                    {/* Brief Preview of Guide Comment */}
                    {sub.comments && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 italic mt-1">
                        &ldquo;{sub.comments}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  {isRevisionRequired ? (
                    <button
                      type="button"
                      onClick={(e) => handleOpenResubmit(sub, e)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <RefreshCw size={13} />
                      <span>Resubmit</span>
                    </button>
                  ) : isSubmitted ? (
                    <button
                      type="button"
                      disabled
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-90"
                    >
                      <Check size={13} className="text-emerald-600" />
                      <span>Submitted</span>
                    </button>
                  ) : isApproved ? (
                    <span className="px-3 py-1.5 rounded-xl bg-mint-50 text-mint-800 border border-mint-200 text-xs font-bold flex items-center gap-1.5">
                      <Check size={13} className="text-mint-700" />
                      <span>Approved</span>
                    </span>
                  ) : null}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Week Submission & Guide Review Detail Modal */}
      {detailModalOpen && activeWeekSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-[#E2E8E4] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm text-white shadow-xs ${
                  activeWeekSub.status === 'Approved' ? 'bg-mint-500' :
                  activeWeekSub.status === 'Changes Requested' ? 'bg-rose-500' :
                  'bg-amber-500'
                }`}>
                  W{activeWeekSub.week}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    Week {activeWeekSub.week}: {activeWeekSub.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>Submitted on {activeWeekSub.submissionDate || 'N/A'}</span>
                    <span>&bull;</span>
                    <span className={`font-bold ${
                      activeWeekSub.status === 'Approved' ? 'text-emerald-700' :
                      activeWeekSub.status === 'Changes Requested' ? 'text-rose-700' :
                      'text-amber-700'
                    }`}>
                      {activeWeekSub.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
              
              {/* Part 1: Review Given by Guide (NO MARKS SHOWN) */}
              <div className="bg-[#EFF3F1]/80 rounded-2xl p-5 border border-mint-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-mint-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Review by {activeWeekSub.guideName || 'Dr. P. Manimegalai'}
                      </span>
                      <span className="text-[10px] text-mint-700 font-bold">Faculty Project Guide</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase border ${
                    activeWeekSub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    activeWeekSub.status === 'Changes Requested' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {activeWeekSub.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Guide Evaluation Critique &amp; Remarks:
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#E2E8E4]">
                    {activeWeekSub.comments || 'Submission is under active evaluation by the project guide.'}
                  </p>
                </div>

                {activeWeekSub.status === 'Changes Requested' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenResubmit(activeWeekSub)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      <span>Resubmit Week {activeWeekSub.week} Deliverable</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Part 2: Complete Submission by Student */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-[#E2E8E4] pb-2">
                  Complete Student Submission Details
                </h4>

                {/* Project Title */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Project Title
                  </span>
                  {activeWeekSub.projectTitle ? (
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900">
                      {activeWeekSub.projectTitle}
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      <span>Not Submitted</span>
                    </div>
                  )}
                </div>

                {/* Problem Statement */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Problem Statement
                  </span>
                  {activeWeekSub.problemStatement ? (
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                      {activeWeekSub.problemStatement}
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      <span>Not Submitted</span>
                    </div>
                  )}
                </div>

                {/* Proposed Solution */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Proposed Solution &amp; Technical Approach
                  </span>
                  {activeWeekSub.solution ? (
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                      {activeWeekSub.solution}
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      <span>Not Submitted</span>
                    </div>
                  )}
                </div>

                {/* Technologies Used */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Technologies Used
                  </span>
                  {activeWeekSub.technologyUsed ? (
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 font-mono font-bold">
                      {activeWeekSub.technologyUsed}
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      <span>Not Submitted</span>
                    </div>
                  )}
                </div>

                {/* Obstacles Faced */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Obstacles Faced
                  </span>
                  {activeWeekSub.obstaclesFaced ? (
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                      {activeWeekSub.obstaclesFaced}
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      <span>Not Submitted</span>
                    </div>
                  )}
                </div>

                {/* Abstract */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Project Abstract
                  </span>
                  {activeWeekSub.abstract ? (
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs text-slate-800 leading-relaxed">
                      {activeWeekSub.abstract}
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      <span>Not Submitted</span>
                    </div>
                  )}
                </div>

                {/* Submission Files & External Artifacts Grid */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    Submitted Files, Repositories &amp; Media
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Presentation PPT */}
                    {activeWeekSub.fileName || activeWeekSub.presentationFile ? (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                              {activeWeekSub.fileName || activeWeekSub.presentationFile || `Week_${activeWeekSub.week}_Presentation.pptx`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{activeWeekSub.fileSize || '4.2 MB'} &bull; PowerPoint</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(activeWeekSub.fileName || activeWeekSub.presentationFile || `Week_${activeWeekSub.week}_Presentation.pptx`, 'ppt', activeWeekSub, e)}
                          className="px-3 py-1.5 rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 block">Presentation Deck</span>
                            <span className="text-[10px] text-slate-400">PowerPoint (.pptx)</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                          <XCircle size={12} />
                          <span>Not Submitted</span>
                        </span>
                      </div>
                    )}

                    {/* PDF Dossier */}
                    {activeWeekSub.pdfFile ? (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center shrink-0">
                            <FileCode size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                              {activeWeekSub.pdfFile}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">PDF Technical Report</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(activeWeekSub.pdfFile || `Week_${activeWeekSub.week}_Report.pdf`, 'pdf', activeWeekSub, e)}
                          className="px-3 py-1.5 rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Download size={13} />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                            <FileCode size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 block">Technical Report</span>
                            <span className="text-[10px] text-slate-400">PDF Document</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                          <XCircle size={12} />
                          <span>Not Submitted</span>
                        </span>
                      </div>
                    )}

                    {/* Source Code Repository */}
                    {activeWeekSub.repoUrl ? (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                            <FileCode size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">GitHub Source Code</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] block">
                              {activeWeekSub.repoUrl}
                            </span>
                          </div>
                        </div>
                        <a
                          href={activeWeekSub.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink size={12} />
                          <span>Visit</span>
                        </a>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                            <FileCode size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 block">GitHub Source Code</span>
                            <span className="text-[10px] text-slate-400">Repository</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                          <XCircle size={12} />
                          <span>Not Submitted</span>
                        </span>
                      </div>
                    )}

                    {/* Live Demo URL */}
                    {activeWeekSub.demoUrl ? (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8E4] flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center shrink-0">
                            <ExternalLink size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">Live Deployment</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] block">
                              {activeWeekSub.demoUrl}
                            </span>
                          </div>
                        </div>
                        <a
                          href={activeWeekSub.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink size={12} />
                          <span>Demo</span>
                        </a>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                            <ExternalLink size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 block">Live Deployment</span>
                            <span className="text-[10px] text-slate-400">Web Demo</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                          <XCircle size={12} />
                          <span>Not Submitted</span>
                        </span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Output Screenshot Media Preview */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Submitted Output Screenshot
                  </span>
                  {activeWeekSub.screenshotFile ? (
                    <div className="p-3 bg-slate-50 border border-[#E2E8E4] rounded-2xl flex items-center gap-3">
                      <img 
                        src={activeWeekSub.screenshotFile} 
                        alt="Output preview" 
                        className="w-16 h-16 rounded-xl object-contain border border-mint-200 bg-white p-1"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">Edge Vision Inference Output</span>
                        <span className="text-[11px] text-slate-500">Real-time classification telemetry screenshot</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                        <ImageIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-slate-700 block text-xs">Output Screenshot</span>
                        <span className="text-[11px] text-slate-500">No output screenshot image uploaded for this week</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1">
                        <XCircle size={12} />
                        <span>Not Submitted</span>
                      </span>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8E4] flex justify-end bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Resubmit Modal for Weeks Requiring Revision */}
      {resubmitModalOpen && activeWeekSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Update Week {activeWeekSub.week} Deliverable</h3>
                  <p className="text-xs text-slate-500">Address guide feedback and submit updated milestone documentation</p>
                </div>
              </div>
              <button
                onClick={() => setResubmitModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResubmitConfirm} className="p-6 space-y-4 text-xs">
              
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950">
                <span className="font-bold block mb-1">Guide Feedback to Address:</span>
                <p className="italic text-[11px]">{activeWeekSub.comments}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Revision Notes &amp; Updates Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={resubmitNotes}
                  onChange={(e) => setResubmitNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E4]">
                <button
                  type="button"
                  onClick={() => setResubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Submit Updated Deliverable</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default MySubmissionView;
