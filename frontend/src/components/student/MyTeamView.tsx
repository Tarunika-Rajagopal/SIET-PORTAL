import React, { useState, useEffect } from 'react';
import { StudentService, StudentTeamExtended } from '../../services/studentService';
import { MarksService, WeeklyMarksRecord } from '../../services/marksService';
import { getUserInitials } from '../../services/authService';
import { formatProjectTitle } from '../../utils/titleUtils';
import { Users, BookOpen, Compass, AlertTriangle, Award } from 'lucide-react';

interface MyTeamViewProps {
  team: StudentTeamExtended;
}

export const MyTeamView: React.FC<MyTeamViewProps> = ({ team }) => {
  const [marksRecords, setMarksRecords] = useState<Record<number, WeeklyMarksRecord>>({});

  const teamId = team?.id || 'TEAM-CSE-Y3-B04';
  const memberRollNos = team?.members?.map(m => m.rollNo) || [];

  useEffect(() => {
    const loadMarks = () => {
      setMarksRecords(MarksService.getAllTeamMarks(teamId, memberRollNos));
    };
    loadMarks();

    window.addEventListener('siet_marks_updated', loadMarks);
    window.addEventListener('siet_data_updated', loadMarks);
    window.addEventListener('storage', loadMarks);

    return () => {
      window.removeEventListener('siet_marks_updated', loadMarks);
      window.removeEventListener('siet_data_updated', loadMarks);
      window.removeEventListener('storage', loadMarks);
    };
  }, [teamId]);

  if (!team) return null;

  const isTeamLead = (member: { rollNo?: string; name?: string; role?: string; isLeader?: boolean }) => {
    if (member.isLeader) return true;
    if (member.role && member.role.toLowerCase().includes('lead')) return true;
    return false;
  };

  // Retrieve assigned mark for a member and review milestone
  // Review 1 = Submission 1, Review 2 = Submission 2, Review 3 = Submission 3, Review 4 = Submission 4
  const getMemberReviewMark = (rollNo: string, reviewIndex: number) => {
    // Review 1 checks week 1 then fallback week 0.
    // Review 2 strictly checks week 2.
    // Review 3 strictly checks week 3.
    // Review 4 strictly checks week 4.
    const candidateWeeks = reviewIndex === 1 ? [1, 0] : [reviewIndex];
    for (const w of candidateWeeks) {
      const rec = marksRecords[w];
      if (rec && rec.memberMarks && rec.memberMarks[rollNo] !== undefined && typeof rec.memberMarks[rollNo] === 'number') {
        return rec.memberMarks[rollNo];
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Rejection Notice Alert Banner */}
      {team.guideApprovalStatus === 'Rejected' && (
        <div className="bg-[#F8EEEE] border border-[#D9AEAE] rounded-2xl p-5 sm:p-6 shadow-subtle flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-[#DEA5A8]/30 text-[#7C3838] shrink-0 mt-0.5">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-serif font-bold text-[#7C3838]">Project Proposal Revision Required</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#DEA5A8]/40 text-[#7C3838] text-[10px] font-bold uppercase tracking-wider border border-[#D9AEAE]">
                Action Required
              </span>
            </div>
            <p className="text-xs text-[#7C3838] font-medium leading-relaxed">
              Your Faculty Guide has reviewed your submission and requested revisions before this project can be approved:
            </p>
            {team.rejectionReason && (
              <div className="mt-2 p-3.5 rounded-xl bg-white border border-[#D9AEAE] font-medium text-xs text-[#7C3838] italic">
                "{team.rejectionReason}"
              </div>
            )}
            <p className="text-[11px] text-[#7C3838] font-bold pt-1">
              Please go to the <strong>Submissions</strong> tab to update your deliverables according to the guide's feedback.
            </p>
          </div>
        </div>
      )}

      {/* Team Header Hero Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-[#D8CCBA]">
        <div className="space-y-3">
          <div>
            <span className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
              Project Title
            </span>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#111111] leading-snug">
              {(() => {
                const isSub1Approved = StudentService.isSubmission1Approved(team.id);
                const sub1Deliverables = isSub1Approved ? StudentService.getDeliverables('Submission 1') : null;
                const displayTitle = (isSub1Approved && sub1Deliverables?.projectTitle) ? sub1Deliverables.projectTitle : team.projectTitle;
                return formatProjectTitle(displayTitle, isSub1Approved ? 'Approved' : team.guideApprovalStatus, isSub1Approved || team.isTitleApproved);
              })()}
            </h2>
          </div>

          {/* Batch & Section Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#F8F5EE] border border-[#D8CCBA] text-xs text-[#292725] font-medium shadow-subtle mt-1">
            <span><strong className="text-[#111111] font-bold">Batch:</strong> {team.batch}</span>
            <span className="text-[#B8AA97]">&bull;</span>
            <span><strong className="text-[#111111] font-bold">Section:</strong> Class {team.section}</span>
          </div>
        </div>
      </div>

      {/* Guide & Advisor Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Project Guide Card */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-[#D8CCBA] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center font-bold text-base shadow-xs border border-[#D8CCBA] shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider">
              Project Guide
            </div>
            <h4 className="text-sm font-serif font-bold text-[#111111] mt-0.5">
              {team.guideName}
            </h4>
          </div>
        </div>

        {/* Advisor Card */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-[#D8CCBA] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center font-bold text-base shadow-xs border border-[#D8CCBA] shrink-0">
            <Compass size={22} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider">
              Advisor
            </div>
            <h4 className="text-sm font-serif font-bold text-[#111111] mt-0.5">
              {team.advisorName}
            </h4>
          </div>
        </div>

      </div>

      {/* Team Members Roster: Center-Aligned, Compact Table with Review Marks */}
      <div className="bg-white rounded-2xl shadow-card border border-[#D8CCBA] overflow-hidden">
        
        {/* Table Header: count badge on the left next to title */}
        <div className="p-4 sm:p-5 border-b border-[#D8CCBA] bg-[#F8F5EE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center shadow-xs">
              <Users size={16} />
            </div>
            <h3 className="text-sm font-serif font-bold text-[#111111] m-0">Project Team Members</h3>
          </div>
          <span 
            id="teamMemberCountBadge"
            className="bg-[#EDE7DB] text-[#111111] font-bold text-xs px-3 py-1 rounded-full border border-[#D8CCBA] shadow-2xs"
          >
            {team.members.length} Members
          </span>
        </div>

        {/* Center-Aligned, Compact Table with Review 1, Review 2, Review 3, Review 4 */}
        <div className="overflow-x-auto p-3 sm:p-4">
          <table className="w-full text-center text-xs border-collapse">
            <thead className="bg-[#EDE7DB]/70 text-[#75695A] uppercase tracking-wider font-mono font-bold text-[10px] border-b border-[#D8CCBA]">
              <tr>
                <th className="py-2.5 px-3 text-center">REGISTER NUMBER</th>
                <th className="py-2.5 px-3 text-left">STUDENT NAME</th>
                <th className="py-2.5 px-3 text-center">REVIEW 1</th>
                <th className="py-2.5 px-3 text-center">REVIEW 2</th>
                <th className="py-2.5 px-3 text-center">REVIEW 3</th>
                <th className="py-2.5 px-3 text-center">REVIEW 4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D5] font-medium bg-white">
              {team.members.map((member, idx) => {
                const markR1 = getMemberReviewMark(member.rollNo, 1);
                const markR2 = getMemberReviewMark(member.rollNo, 2);
                const markR3 = getMemberReviewMark(member.rollNo, 3);
                const markR4 = getMemberReviewMark(member.rollNo, 4);

                return (
                  <tr key={member.rollNo || idx} className="hover:bg-[#FAF8F4] transition-colors">
                    {/* Register Number */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <span className="font-mono font-bold text-[#111111] text-xs">
                        {member.rollNo}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1E1E1E] to-[#111111] text-[#F8F5EE] font-bold text-[10px] flex items-center justify-center shadow-xs border border-[#333333] shrink-0">
                          {getUserInitials(member.name)}
                        </div>
                        <span className="font-bold text-[#111111] text-xs">{member.name}</span>
                        {isTeamLead(member) && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#111111] text-amber-400 text-[9px] font-black uppercase tracking-wider">
                            Lead
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Review 1 */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {markR1 !== null ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-xs">
                          {markR1}/100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-semibold text-xs">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Review 2 */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {markR2 !== null ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-xs">
                          {markR2}/100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-semibold text-xs">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Review 3 */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {markR3 !== null ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-xs">
                          {markR3}/100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-semibold text-xs">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Review 4 */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {markR4 !== null ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-xs">
                          {markR4}/100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-semibold text-xs">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default MyTeamView;
