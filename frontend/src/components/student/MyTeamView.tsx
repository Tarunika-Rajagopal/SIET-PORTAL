import React, { useState, useEffect } from 'react';
import { StudentService, StudentTeamExtended } from '../../services/studentService';
import { MarksService, WeeklyMarksRecord } from '../../services/marksService';
import { getUserInitials } from '../../services/authService';
import { formatProjectTitle } from '../../utils/titleUtils';
import { Users, BookOpen, Compass, AlertTriangle, ChevronDown, CheckCircle2, Clock, Mail } from 'lucide-react';

interface MyTeamViewProps {
  team: StudentTeamExtended;
}

export const MyTeamView: React.FC<MyTeamViewProps> = ({ team }) => {
  const [marksRecords, setMarksRecords] = useState<Record<number, WeeklyMarksRecord>>({});
  const [expandedRolls, setExpandedRolls] = useState<Set<string>>(new Set());

  const toggleMemberRow = (rollNo: string) => {
    setExpandedRolls(prev => {
      const next = new Set(prev);
      if (next.has(rollNo)) next.delete(rollNo);
      else next.add(rollNo);
      return next;
    });
  };

  const teamId = team?.id || '';
  const memberRollNos = team?.members?.map(m => m.rollNo) || [];

  useEffect(() => {
    let isMounted = true;

    // Read from in-memory cache immediately (synchronous)
    const refreshFromCache = () => {
      if (!isMounted) return;
      setMarksRecords(MarksService.getAllTeamMarks(teamId, memberRollNos));
    };
    refreshFromCache();

    // Fetch authoritative marks from PostgreSQL via FastAPI
    if (teamId) {
      MarksService.fetchTeamMarks(teamId)
        .then(() => {
          // After fetch completes the cache is updated; read from cache
          // to ensure consistent data source (not raw API response)
          refreshFromCache();
        })
        .catch(() => {});
    }

    // Subscribe to MarksService cache updates (e.g., from fetchAllMarks, saveWeeklyMarks)
    const unsubscribe = MarksService.subscribe(refreshFromCache);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [teamId, memberRollNos.length]);

  const activeTeam = team || StudentService.getTeam();

  if (!activeTeam) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-[#D8CCBA] shadow-xs space-y-3">
        <Users size={36} className="mx-auto text-slate-400" />
        <h3 className="text-base font-extrabold text-slate-800">No Team Information Available</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You are currently not enrolled in any project team, or team data is still synchronizing. Please contact your Class Advisor.
        </p>
      </div>
    );
  }

  const isTeamLead = (member: any) => {
    if (member?.isLead || member?.isLeader) return true;
    if (member?.role && member.role.toLowerCase().includes('lead')) return true;
    const leadRoll = ((team as any).lead_roll_no || (team as any).leadRollNo || '').trim().toLowerCase();
    if (member?.rollNo && leadRoll && member.rollNo.trim().toLowerCase() === leadRoll) return true;
    const leadName = ((team as any).lead_student || (team as any).leadStudent || '').trim().toLowerCase();
    if (member?.name && leadName && member.name.trim().toLowerCase() === leadName) return true;
    return false;
  };

  // Retrieve assigned mark for a member and review milestone
  // Review 1 = Submission 1, Review 2 = Submission 2, Review 3 = Submission 3, Review 4 = Submission 4
  const getMemberReviewMark = (rollNo: string, reviewIndex: number) => {
    // Review 1 strictly checks week 1.
    // Review 2 strictly checks week 2.
    // Review 3 strictly checks week 3.
    // Review 4 strictly checks week 4.
    const candidateWeeks = [reviewIndex];
    const cleanRollNo = String(rollNo || '').trim();
    const lowerRoll = cleanRollNo.toLowerCase();
    
    for (const w of candidateWeeks) {
      const rec = marksRecords[w];
      if (!rec) continue;

      // 1. Direct match
      if (rec.memberMarks && rec.memberMarks[cleanRollNo] !== undefined && typeof rec.memberMarks[cleanRollNo] === 'number') {
        return rec.memberMarks[cleanRollNo];
      }

      // 2. Case-insensitive / trimmed match across memberMarks
      if (rec.memberMarks) {
        const matchedKey = Object.keys(rec.memberMarks).find(k => k.trim().toLowerCase() === lowerRoll);
        if (matchedKey && typeof rec.memberMarks[matchedKey] === 'number') {
          return rec.memberMarks[matchedKey];
        }
      }

      // 3. Fallback to team average if this milestone was evaluated for the team
      if (rec.teamAverage !== undefined && typeof rec.teamAverage === 'number' && rec.teamAverage > 0) {
        return rec.teamAverage;
      }

      // 4. If any other team member has marks in this record, use calculated average of available marks
      if (rec.memberMarks && Object.keys(rec.memberMarks).length > 0) {
        const marksList = Object.values(rec.memberMarks).filter((v): v is number => typeof v === 'number');
        if (marksList.length > 0) {
          return Math.round(marksList.reduce((a, b) => a + b, 0) / marksList.length);
        }
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
                const sub1Deliverables = (!team.projectTitle && isSub1Approved) ? StudentService.getDeliverables('Submission 1', team.id) : null;
                const displayTitle = team.projectTitle || sub1Deliverables?.projectTitle || '';
                const isApproved = team.isTitleApproved || isSub1Approved || team.guideApprovalStatus === 'Approved';
                const status = isApproved ? 'Approved' : (team.guideApprovalStatus || 'Pending');
                return formatProjectTitle(displayTitle, status, isApproved);
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
              {team.guideName || 'Not Assigned'}
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
              {team.advisorName || 'Not Assigned'}
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
            {team.members?.length || 0} Members
          </span>
        </div>

        {/* Center-Aligned, Compact Table with Review 1, Review 2, Review 3, Review 4 */}
        <div className="overflow-x-auto p-3 sm:p-4">
          <table className="w-full text-center text-xs border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '4%' }} />
            </colgroup>
            <thead className="bg-[#EDE7DB]/70 text-[#75695A] uppercase tracking-wider font-mono font-bold text-[10px] border-b border-[#D8CCBA]">
              <tr>
                <th className="py-2.5 px-3 text-center">REGISTER NUMBER</th>
                <th className="py-2.5 px-3 text-left">STUDENT NAME</th>
                <th className="py-2.5 px-3 text-center">REVIEW 1</th>
                <th className="py-2.5 px-3 text-center">REVIEW 2</th>
                <th className="py-2.5 px-3 text-center">REVIEW 3</th>
                <th className="py-2.5 px-3 text-center">REVIEW 4</th>
                <th className="py-2.5 px-2 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="font-medium bg-white">
              {(!team.members || team.members.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400 italic">
                    No team members registered yet.
                  </td>
                </tr>
              ) : (
                team.members.map((member, idx) => {
                  const isExpanded = expandedRolls.has(member.rollNo);
                  const markR1 = getMemberReviewMark(member.rollNo, 1);
                  const markR2 = getMemberReviewMark(member.rollNo, 2);
                  const markR3 = getMemberReviewMark(member.rollNo, 3);
                  const markR4 = getMemberReviewMark(member.rollNo, 4);

                  const reviews = [
                    { num: 1, title: 'Review 1 (Synopsis & Problem Definition)', mark: markR1, rec: marksRecords[1] },
                    { num: 2, title: 'Review 2 (Design & Methodology)', mark: markR2, rec: marksRecords[2] },
                    { num: 3, title: 'Review 3 (Prototype & Implementation)', mark: markR3, rec: marksRecords[3] },
                    { num: 4, title: 'Review 4 (Testing & Final Defense)', mark: markR4, rec: marksRecords[4] },
                  ];

                  return (
                    <React.Fragment key={member.rollNo || idx}>
                      {/* Main Member Row */}
                      <tr 
                        onClick={() => toggleMemberRow(member.rollNo)}
                        className={`cursor-pointer transition-colors duration-300 ease-out select-none border-b border-[#EAE2D5] ${
                          isExpanded ? 'bg-[#FAF6EF]' : 'hover:bg-[#FAF8F4]'
                        }`}
                      >
                        {/* Register Number */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <span className="font-mono font-bold text-[#111111] text-xs">
                            {member.rollNo}
                          </span>
                        </td>

                        {/* Student Name */}
                        <td className="py-3 px-3 whitespace-nowrap text-left">
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
                        <td className="py-3 px-3 whitespace-nowrap text-center">
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
                        <td className="py-3 px-3 whitespace-nowrap text-center">
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
                        <td className="py-3 px-3 whitespace-nowrap text-center">
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
                        <td className="py-3 px-3 whitespace-nowrap text-center">
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

                        {/* Rotating Chevron */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[#75695A] hover:text-[#111111] transition-colors duration-300">
                            <ChevronDown
                              size={15}
                              className={`transition-transform duration-450 ease-out ${
                                isExpanded ? 'rotate-180 text-[#111111]' : 'rotate-0'
                              }`}
                            />
                          </div>
                        </td>
                      </tr>

                      {/* Smooth Animated Toggle Drawer */}
                      <tr className={isExpanded ? 'border-b border-[#D8CCBA]/80' : 'border-0'}>
                        <td colSpan={7} className="p-0 border-0">
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateRows: isExpanded ? '1fr' : '0fr',
                              opacity: isExpanded ? 1 : 0,
                              transition: 'grid-template-rows 460ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                              pointerEvents: isExpanded ? 'auto' : 'none',
                            }}
                          >
                            <div style={{ overflow: 'hidden', minHeight: 0 }}>
                              <div className="bg-[#FAF7F2] border-y border-[#D8CCBA]/80 p-4 sm:p-5 text-left space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#D8CCBA]/60">
                                  <div className="flex items-center gap-2">
                                    <span className="font-serif font-bold text-xs text-[#111111]">
                                      {member.name}
                                    </span>
                                    <span className="font-mono text-[11px] text-[#75695A] font-semibold">
                                      ({member.rollNo})
                                    </span>
                                    {isTeamLead(member) && (
                                      <span className="px-2 py-0.5 rounded-full bg-[#111111] text-amber-400 text-[10px] font-black uppercase">
                                        Team Leader
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[#75695A] font-medium">
                                    Review Milestone Progress Breakdown
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                                  {reviews.map((rev) => {
                                    const isAssigned = rev.mark !== null;
                                    return (
                                      <div 
                                        key={rev.num}
                                        className="bg-white rounded-xl p-3 border border-[#D8CCBA] shadow-2xs space-y-2"
                                      >
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="font-mono font-bold text-[#111111]">
                                            Review {rev.num}
                                          </span>
                                          {isAssigned ? (
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-[11px]">
                                              {rev.mark}/100
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#75695A] font-semibold text-[10px]">
                                              Pending
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-[#75695A] leading-tight">
                                          {rev.title}
                                        </p>
                                        <div className="pt-1.5 border-t border-[#EAE2D5] text-[10px] text-[#75695A] flex items-center justify-between">
                                          <span>Status</span>
                                          <span className={`font-bold ${isAssigned ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {isAssigned ? 'Evaluated' : 'Awaiting Review'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default MyTeamView;
