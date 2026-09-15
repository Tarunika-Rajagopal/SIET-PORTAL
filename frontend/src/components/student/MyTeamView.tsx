import React from 'react';
import { StudentTeamExtended } from '../../services/studentService';
import { getUserInitials } from '../../services/authService';
import { Users, BookOpen, Compass } from 'lucide-react';

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
      
      {/* Team Header Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-[#E2E8E4]">
        <div className="space-y-3">
          {/* Project Title appears once approved by the guide */}
          {team.isTitleApproved && team.projectTitle && (
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Project Title
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {team.projectTitle}
              </h2>
            </div>
          )}

          {/* Batch & Section Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 border border-[#E2E8E4] text-xs text-slate-700 font-medium shadow-2xs mt-1">
            <span><strong className="text-slate-900 font-bold">Batch:</strong> {team.batch}</span>
            <span className="text-slate-300">&bull;</span>
            <span><strong className="text-slate-900 font-bold">Section:</strong> Class {team.section}</span>
          </div>
        </div>
      </div>

      {/* Guide & Advisor Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Project Guide Card */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E2E8E4] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Project Guide
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
              {team.guideName}
            </h4>
          </div>
        </div>

        {/* Advisor Card */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E2E8E4] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
            <Compass size={22} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Advisor
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
              {team.advisorName}
            </h4>
          </div>
        </div>

      </div>

      {/* Team Members Roster */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        
        {/* Table Header: count badge on the left next to title */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-start gap-3">
          <div className="p-2 rounded-xl bg-mint-100 text-mint-800">
            <Users size={18} />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 m-0">Project Team Members</h3>
          <span 
            id="teamMemberCountBadge"
            className="bg-mint-100 text-mint-800 font-bold text-xs px-3 py-1 rounded-full border border-mint-200"
          >
            {team.members.length} Members
          </span>
        </div>

        {/* Clean 3-Column Table: Register Number, Student Name, Institutional Email */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4 w-48">REGISTER NUMBER</th>
                <th className="p-4">STUDENT NAME</th>
                <th className="p-4">INSTITUTIONAL EMAIL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {team.members.map((member, idx) => (
                <tr key={member.rollNo || idx} className="hover:bg-mint-50/40 transition">
                  <td className="p-4 font-mono font-bold text-mint-900 whitespace-nowrap">
                    {member.rollNo}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-mint-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                        {getUserInitials(member.name)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{member.name}</span>
                        {isTeamLead(member) && (
                          <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-800 text-[10px] font-extrabold uppercase border border-mint-200">
                            Team Lead
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-600">
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
