import React, { useState, useEffect } from 'react';
import { WeeklySubmission } from '../../types';
import { StudentService } from '../../services/studentService';
import { MarksService } from '../../services/marksService';
import { formatProjectTitle } from '../../utils/titleUtils';
import { 
  Calendar, CheckCircle2, Clock, FileText, Upload, AlertTriangle, 
  MessageSquare, RefreshCw, X, FileCode, ExternalLink, Image as ImageIcon,
  Award, User, Download, Check, XCircle, Bell, MapPin, Edit3, ChevronRight
} from 'lucide-react';

interface MySubmissionViewProps {
  onSuccess?: (msg: string) => void;
  onNavigateToSubmission?: () => void;
}

export const MySubmissionView: React.FC<MySubmissionViewProps> = ({ onSuccess, onNavigateToSubmission }) => {
  const [submissions, setSubmissions] = useState<WeeklySubmission[]>(() => StudentService.getSubmissions());
  const [team, setTeam] = useState(() => StudentService.getTeam());
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeWeekSub, setActiveWeekSub] = useState<WeeklySubmission | null>(null);
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  useEffect(() => {
    const handleSync = () => {
      setSubmissions(StudentService.getSubmissions());
      setTeam(StudentService.getTeam());
    };
    handleSync();
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const teamId = team?.id || 'TEAM-CSE-Y3-B04';
  const memberRollNos = team?.members?.map(m => m.rollNo) || [];

  // Determine active submission:
  // "Only until the marks are assigned , it should move to the submissions page if edit submission clicked , else edit submission should not show , instead it should move to the next submission and enable every submit button"
  const getActiveSubmissionIndex = () => {
    let weekIndex = 0;
    while (weekIndex <= 16) {
      const rec = MarksService.getWeeklyMarks(teamId, weekIndex, memberRollNos);
      const hasMarks = Boolean(
        rec && (
          rec.teamAverage !== undefined ||
          (rec.memberMarks && Object.keys(rec.memberMarks).length > 0)
        )
      );
      if (!hasMarks) {
        break;
      }
      weekIndex++;
    }
    return weekIndex;
  };

  const activeSubmissionIndex = getActiveSubmissionIndex();
  const activeSubmissionNumber = activeSubmissionIndex + 1;

  // Display submissions list (show all student submissions, or fallback to active submission)
  const displaySubmissions = [...submissions].sort((a, b) => a.week - b.week);

  const handleOpenDetail = (sub: WeeklySubmission) => {
    setActiveWeekSub(sub);
    setDetailModalOpen(true);
  };

  const handleEditSubmission = (subWeek: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    localStorage.setItem('siet_student_start_edit_mode', 'true');
    window.dispatchEvent(new CustomEvent('student_navigate_submission', { detail: { edit: true, week: subWeek } }));
    if (onNavigateToSubmission) {
      onNavigateToSubmission();
    }
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
      onSuccess(`Submission ${activeWeekSub.week + 1} milestone updated and submitted for Guide re-review.`);
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
(Project Title: ${formatProjectTitle(sub.projectTitle, sub.status)}) Tj
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
Project: ${formatProjectTitle(sub.projectTitle, sub.status)}
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

      {/* All Submissions - Visible First as Interactive Cards */}
      <div className="bg-white rounded-3xl shadow-card border border-[#D8CCBA] overflow-hidden">
        <div className="p-5 border-b border-[#D8CCBA] flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Current Academic Milestone
            </span>
            <span className="text-[11px] font-bold text-mint-800 bg-mint-100 px-2.5 py-0.5 rounded-full border border-mint-200">
              Submission {activeSubmissionNumber}
            </span>
          </div>
        </div>

        {displaySubmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-300 mb-3 select-none">
              <Clock size={12} className="text-slate-500" />
              <span>No Submission</span>
            </span>
            <p className="font-bold text-slate-700 text-sm mb-1">No Milestone Submission for Submission {activeSubmissionNumber} Yet</p>
            <p className="text-slate-400">Deliverables for Submission {activeSubmissionNumber} will appear here once submitted from the Submission Form.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D8CCBA]">
            {displaySubmissions.map((sub) => {
              const isApproved = sub.status === 'Approved' || team?.isTitleApproved || team?.guideApprovalStatus === 'Approved';
              const isRevisionRequired = !isApproved && (sub.status === 'Changes Requested' || sub.status === 'Rejected');
              const marksRec = MarksService.getWeeklyMarks(teamId, sub.week, memberRollNos);
              const isMarksAssigned = Boolean(
                marksRec && (
                  marksRec.teamAverage !== undefined ||
                  (marksRec.memberMarks && Object.keys(marksRec.memberMarks).length > 0)
                )
              );

              return (
                <div
                  key={sub.week}
                  onClick={() => handleOpenDetail(sub)}
                  className="p-5 sm:p-6 hover:bg-mint-50/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    
                    {/* Submission Badge */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs transition group-hover:scale-105 ${
                      isApproved ? 'bg-mint-500 text-white' :
                      isRevisionRequired ? 'bg-rose-500 text-white' :
                      'bg-amber-500 text-white'
                    }`}>
                      S{sub.week + 1}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Display submission number */}
                        <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-mint-700 transition">
                          Submission {sub.week + 1}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                          isApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          isRevisionRequired ? 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isApproved ? 'bg-emerald-500' :
                            isRevisionRequired ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`}></span>
                          <span>{isApproved ? 'Approved' : isRevisionRequired ? sub.status : 'Pending'}</span>
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800">
                        {formatProjectTitle(sub.projectTitle, sub.status)}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                        <span>Submitted: <strong className="text-slate-700 font-bold">{sub.submissionDate || "N/A"}</strong></span>
                        {(marksRec?.teamAverage !== undefined || sub.score !== undefined) && (
                          <>
                            <span>&bull;</span>
                            <span className="text-mint-700 font-extrabold">Score: {marksRec?.teamAverage ?? sub.score} / {sub.maxScore || 100}</span>
                          </>
                        )}
                        {sub.fileName && (
                          <>
                            <span>&bull;</span>
                            <span className="font-mono text-slate-600 font-bold">{sub.fileName}</span>
                          </>
                        )}
                      </div>

                      {/* Technical metadata pills preview */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {sub.technologyUsed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F8F5EE] border border-[#D8CCBA] text-slate-700 font-semibold text-[10px]">
                            <span className="font-bold text-slate-500">Technologies:</span> <span className="font-mono">{sub.technologyUsed.split(',').slice(0, 3).join(', ')}{sub.technologyUsed.split(',').length > 3 ? '...' : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                            <span>No Tech Specified</span>
                          </span>
                        )}
                        {sub.obstaclesFaced ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F8F5EE] border border-[#D8CCBA] text-slate-700 text-[10px] font-semibold line-clamp-1 max-w-sm sm:max-w-md">
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

                      {/* Guide Consultation Notice (Updated directly in submission) */}
                      {sub.guideNotice && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-1.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-amber-900">
                              <Bell size={13} className="text-amber-600" />
                              <span>Guide Consultation Notice</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700">{sub.guideNotice.date}</span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                            {sub.guideNotice.comment}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold pt-1.5 border-t border-amber-200/80 text-amber-900">
                            <div className="flex items-center gap-1 bg-amber-100/90 px-2.5 py-1 rounded-lg">
                              <Clock size={12} className="text-amber-700" />
                              <span>Timing: {sub.guideNotice.timing}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-100/90 px-2.5 py-1 rounded-lg">
                              <MapPin size={12} className="text-amber-700" />
                              <span>Location: {sub.guideNotice.location}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    {isRevisionRequired ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenResubmit(sub, e)}
                        className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Update Milestone</span>
                      </button>
                    ) : isMarksAssigned ? (
                      /* If marks are assigned, edit submission does not show */
                      <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1.5 shadow-xs select-none">
                        <Award size={13} className="text-emerald-700" />
                        <span>Score: {marksRec?.teamAverage ?? sub.score}/100</span>
                      </span>
                    ) : (
                      /* Only until marks are assigned, show Edit Submission which navigates to submission page */
                      <button
                        type="button"
                        onClick={(e) => handleEditSubmission(sub.week, e)}
                        className="px-3 py-1.5 rounded-xl border border-[#D8CCBA] bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Edit your submitted details before marks are assigned"
                      >
                        <Edit3 size={13} />
                        <span>Edit Submission</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(sub);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive Submission Detail Modal (Screenshot sections removed as requested) */}
      {detailModalOpen && activeWeekSub && (() => {
        const isModalApproved = activeWeekSub.status === 'Approved' || team?.isTitleApproved || team?.guideApprovalStatus === 'Approved';
        const isModalRevision = !isModalApproved && (activeWeekSub.status === 'Changes Requested' || activeWeekSub.status === 'Rejected');
        const modalMarks = MarksService.getWeeklyMarks(teamId, activeWeekSub.week, memberRollNos);
        const isModalMarksAssigned = Boolean(
          modalMarks && (
            modalMarks.teamAverage !== undefined ||
            (modalMarks.memberMarks && Object.keys(modalMarks.memberMarks).length > 0)
          )
        );

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-[#D8CCBA] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm text-white shadow-xs ${
                  isModalApproved ? 'bg-mint-500' :
                  isModalRevision ? 'bg-rose-500' :
                  'bg-amber-500'
                }`}>
                  S{activeWeekSub.week + 1}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    Submission {activeWeekSub.week + 1} Details
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>Submitted on {activeWeekSub.submissionDate || 'N/A'}</span>
                    <span>&bull;</span>
                    <span className={`font-bold ${
                      isModalApproved ? 'text-emerald-700' :
                      isModalRevision ? 'text-rose-700' :
                      'text-amber-700'
                    }`}>
                      {isModalApproved ? 'Approved' : isModalRevision ? activeWeekSub.status : 'Pending'}
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

            {/* Modal Scrollable Body: Pure Student Submission Details (Consultation Notice & Guide Review Cards Removed) */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
              
              {/* Complete Submission by Student */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-[#D8CCBA] pb-2">
                  Complete Student Submission Details
                </h4>

                {/* Project Title */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Project Title
                  </span>
                  <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs font-bold text-slate-900">
                    {formatProjectTitle(activeWeekSub.projectTitle, activeWeekSub.status)}
                  </div>
                </div>

                {/* Problem Statement */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Problem Statement
                  </span>
                  {activeWeekSub.problemStatement ? (
                    <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed">
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
                    <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed">
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
                    <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 font-mono font-bold">
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
                    <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed">
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
                    <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-xl text-xs text-slate-800 leading-relaxed">
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
                      <div className="p-3.5 rounded-2xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
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
                      <div className="p-3.5 rounded-2xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
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
                      <div className="p-3.5 rounded-2xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
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
                      <div className="p-3.5 rounded-2xl bg-white border border-[#D8CCBA] flex items-center justify-between shadow-xs">
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
                    <div className="p-3 bg-slate-50 border border-[#D8CCBA] rounded-2xl flex items-center gap-3">
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
            {/* Modal Footer */}
            <div className="p-4 border-t border-[#D8CCBA] flex items-center justify-between bg-slate-50 shrink-0">
              {!isModalMarksAssigned ? (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleEditSubmission(activeWeekSub.week);
                  }}
                  className="px-4 py-2 bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] border border-[#D8CCBA] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Edit your submitted details before marks are assigned"
                >
                  <Edit3 size={13} />
                  <span>Edit Submission</span>
                </button>
              ) : (
                <div />
              )}

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
        );
      })()}

      {/* Resubmit Modal for Submissions Requiring Revision */}
      {resubmitModalOpen && activeWeekSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#D8CCBA] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Update Submission {activeWeekSub.week + 1} Deliverable</h3>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#D8CCBA] rounded-xl text-slate-900 focus:outline-none focus:border-mint-500 leading-relaxed font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8CCBA]">
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
