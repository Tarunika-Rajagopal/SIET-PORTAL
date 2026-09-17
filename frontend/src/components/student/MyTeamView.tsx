import React from 'react';
import { StudentTeamExtended } from '../../services/studentService';
import { getUserInitials } from '../../services/authService';
import { Users, BookOpen, Compass, AlertTriangle } from 'lucide-react';

interface MyTeamViewProps {
  team: StudentTeamExtended;
}

export const MyTeamView: React.FC<MyTeamViewProps> = ({ team }) => {
  if (!team) return null;

  const isTeamLead = (member: { rollNo?: string; name?: string; role?: string; isLeader?: boolean }) => {
    if (member.isLeader) return true;
    if (member.role && member.role.toLowerCase().includes('lead')) return true;
    return false;
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
          {/* Project Title appears once approved by the guide */}
          {team.isTitleApproved && team.projectTitle && (
            <div>
              <span className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                Project Title
              </span>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#111111] leading-snug">
                {team.projectTitle}
              </h2>
            </div>
          )}

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

      {/* Team Members Roster */}
      <div className="bg-white rounded-2xl shadow-card border border-[#D8CCBA] overflow-hidden">
        
        {/* Table Header: count badge on the left next to title */}
        <div className="p-5 border-b border-[#D8CCBA] bg-[#F8F5EE] flex items-center justify-start gap-3">
          <div className="p-2 rounded-lg bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]">
            <Users size={18} />
          </div>
          <h3 className="text-sm font-serif font-bold text-[#111111] m-0">Project Team Members</h3>
          <span 
            id="teamMemberCountBadge"
            className="bg-[#EDE7DB] text-[#111111] font-bold text-xs px-3 py-1 rounded-full border border-[#D8CCBA]"
          >
            {team.members.length} Members
          </span>
        </div>

        {/* Clean 3-Column Table: Register Number, Student Name, Institutional Email */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#111111] uppercase tracking-wider font-serif font-bold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4 w-48">REGISTER NUMBER</th>
                <th className="p-4">STUDENT NAME</th>
                <th className="p-4">INSTITUTIONAL EMAIL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-medium bg-white">
              {team.members.map((member, idx) => (
                <tr key={member.rollNo || idx} className="hover:bg-[#F8F5EE] transition">
                  <td className="p-4 font-mono font-bold text-[#111111] whitespace-nowrap">
                    {member.rollNo}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#111111] text-[#F8F5EE] font-bold text-xs flex items-center justify-center shadow-subtle border border-[#292725]">
                        {getUserInitials(member.name)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111111]">{member.name}</span>
                        {isTeamLead(member) && (
                          <span className="px-2 py-0.5 rounded-full bg-[#EDE7DB] text-[#111111] text-[10px] font-bold uppercase border border-[#D8CCBA]">
                            Team Lead
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-[#75695A]">
                    {member.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default MyTeamView;
