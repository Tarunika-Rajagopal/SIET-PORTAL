import React from 'react';
import { X, Award, Users, CheckCircle2, AlertCircle, Clock, MessageSquare, Star } from 'lucide-react';
import { WeeklySubmission } from '../../types';
import { WeeklyMarksRecord } from '../../services/marksService';
import { ClassTeam } from '../../services/advisorService';
import AdvisorSubmissionDetails from './AdvisorSubmissionDetails';

interface AdvisorSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: WeeklySubmission | null | undefined;
  teamTitle?: string;
  teamNo?: string;
  marks?: WeeklyMarksRecord | null;
  team?: ClassTeam | null;
  studentRollNo?: string;
  studentName?: string;
}

export const AdvisorSubmissionDetailModal: React.FC<AdvisorSubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submission,
  teamTitle,
  teamNo,
  marks,
  team,
  studentRollNo,
  studentName,
}) => {
  if (!isOpen || !submission) return null;

  const subNum = (submission as any).weekNumber !== undefined
    ? (submission as any).weekNumber
    : (submission.week !== undefined ? submission.week : 1);

  const status = submission.status || 'Submitted';
  const isApproved = status === 'Approved';
  const isRevision = status === 'Changes Requested' || status === 'Rejected' || status === 'Revision Required';

  // Marks data
  const subMemberMarks = (submission as any)?.memberMarks && typeof (submission as any).memberMarks === 'object' && Object.keys((submission as any).memberMarks).length > 0
    ? (submission as any).memberMarks
    : null;

  const marksMemberMarks = marks?.memberMarks && typeof marks.memberMarks === 'object' && Object.keys(marks.memberMarks).length > 0
    ? marks.memberMarks
    : null;

  const memberMarks: Record<string, number> = marksMemberMarks || subMemberMarks || {};

  const teamScore = (marks?.teamAverage !== undefined && marks.teamAverage > 0)
    ? marks.teamAverage
    : (typeof submission.score === 'number' && submission.score > 0 ? submission.score : null);

  const cleanRoll = (studentRollNo || '').trim().toLowerCase();

  const inspectedStudentMark = studentRollNo
    ? (memberMarks[studentRollNo] ??
       memberMarks[studentRollNo.trim()] ??
       Object.entries(memberMarks).find(([k]) => k.trim().toLowerCase() === cleanRoll)?.[1] ??
       null)
    : null;

  const hasAnyMarks = teamScore !== null || Object.keys(memberMarks).length > 0;
  const remarksText = marks?.remarks || submission.comments || '';
  const gradedBy = marks?.gradedBy || (submission as any).gradedBy || submission.guideName || 'Faculty Guide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-[#D8CCBA] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-xs ${
              isApproved ? 'bg-mint-600 text-white' : isRevision ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
            }`}>
              S{subNum}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  Submission {subNum} Details
                </h3>
                {teamNo && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                    {teamNo}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>Submitted on {submission.submissionDate || 'N/A'}</span>
                <span>&bull;</span>
                <span className={`font-black flex items-center gap-1 ${
                  isApproved ? 'text-emerald-700' :
                  isRevision ? 'text-rose-700' :
                  'text-amber-700'
                }`}>
                  {isApproved ? <CheckCircle2 size={12} className="text-emerald-600 inline" /> : null}
                  {isRevision ? <AlertCircle size={12} className="text-rose-600 inline" /> : null}
                  {!isApproved && !isRevision ? <Clock size={12} className="text-amber-600 inline" /> : null}
                  <span>{status}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
          {/* Official Evaluation & Marks Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50/80 via-white to-slate-50 border border-mint-200 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-mint-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-500" />
                <span className="font-black text-xs text-slate-900 uppercase tracking-wide">
                  Official Evaluation &amp; Marks Record
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Evaluated by: <strong className="text-slate-800 font-bold">{gradedBy}</strong>
              </span>
            </div>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Team Score */}
              <div className="p-3 bg-white rounded-xl border border-[#E2E8E4] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-mint-100 text-mint-800 flex items-center justify-center font-black">
                    <Users size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Score / Average</span>
                    <span className="text-xs font-black text-slate-900">Entire Team</span>
                  </div>
                </div>
                <div>
                  {teamScore !== null ? (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-black text-xs shadow-2xs">
                      {teamScore} / 100
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-bold italic">Pending</span>
                  )}
                </div>
              </div>

              {/* Inspected Student Individual Score */}
              {studentName && (
                <div className="p-3 bg-white rounded-xl border border-mint-300 ring-1 ring-mint-300/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                      <Star size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Individual Score</span>
                      <span className="text-xs font-black text-slate-900 truncate max-w-[140px] block" title={studentName}>
                        {studentName} {studentRollNo ? `(${studentRollNo})` : ''}
                      </span>
                    </div>
                  </div>
                  <div>
                    {inspectedStudentMark !== null && inspectedStudentMark !== undefined ? (
                      <span className="px-2.5 py-1 rounded-lg bg-mint-600 text-white font-black text-xs shadow-2xs">
                        {inspectedStudentMark} / 100
                      </span>
                    ) : (Object.keys(memberMarks).length === 0 && teamScore !== null) ? (
                      <span className="px-2.5 py-1 rounded-lg bg-mint-600 text-white font-black text-xs shadow-2xs">
                        {teamScore} / 100
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-bold italic">Pending</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Member-wise Marks Breakdown (If multiple members) */}
            {team && team.members && team.members.length > 0 && hasAnyMarks && (
              <div className="pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  All Team Members &bull; Individual Marks Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {team.members.map(m => {
                    const mCleanRoll = m.rollNo.trim().toLowerCase();
                    const individualVal = memberMarks[m.rollNo] ??
                      memberMarks[m.rollNo.trim()] ??
                      Object.entries(memberMarks).find(([k]) => k.trim().toLowerCase() === mCleanRoll)?.[1];

                    const markVal = (individualVal !== null && individualVal !== undefined)
                      ? individualVal
                      : (Object.keys(memberMarks).length === 0 ? teamScore : null);

                    const isCurrentStudent = studentRollNo && mCleanRoll === cleanRoll;

                    return (
                      <div
                        key={m.rollNo}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                          isCurrentStudent ? 'bg-mint-100/70 border-mint-300 font-bold' : 'bg-slate-50 border-[#E2E8E4]'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-slate-800 truncate block">{m.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{m.rollNo}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-[#D8CCBA] text-slate-900 font-black text-xs shrink-0">
                          {markVal !== null && markVal !== undefined ? `${markVal}/100` : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guide Remarks / Comments */}
            {remarksText && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                  <MessageSquare size={13} className="text-amber-600" />
                  <span>Faculty Guide Feedback &amp; Evaluation Remarks</span>
                </div>
                <p className="text-slate-700 italic leading-relaxed whitespace-pre-wrap">{remarksText}</p>
              </div>
            )}
          </div>

          <AdvisorSubmissionDetails
            submission={submission}
            teamTitle={teamTitle}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#D8CCBA] flex items-center justify-end bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvisorSubmissionDetailModal;
