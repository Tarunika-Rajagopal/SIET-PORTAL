import React, { useState } from 'react';
import { 
  ShieldCheck, Search, Bell, CheckCircle2, XCircle, Clock, AlertCircle, 
  Lock, Eye, MessageSquare, Code, Users, Calendar, Sparkles, Filter, ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import ApproveConfirmModal from '../../components/guide/ApproveConfirmModal';
import TitleRejectModal from '../../components/guide/TitleRejectModal';
import NotifyTeamModal from '../../components/guide/NotifyTeamModal';
import TeamDetailsModal from '../../components/guide/TeamDetailsModal';

export const ApproveProject = () => {
  const { teams, approveTitle, rejectTitle, notifyTeam, stats } = useGuide();

  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'Approved' | 'Rejected' | 'Notified' | 'All'
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filtered teams
  const filteredTeams = teams.filter((team) => {
    // Tab filter
    if (activeTab === 'Pending' && team.titleStatus !== 'Pending') return false;
    if (activeTab === 'Approved' && team.titleStatus !== 'Approved') return false;
    if (activeTab === 'Rejected' && team.titleStatus !== 'Rejected') return false;
    if (activeTab === 'Notified' && !team.isNotified) return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNumber = `team ${team.teamNumber}`.includes(q) || `#${team.teamNumber}`.includes(q) || String(team.teamNumber) === q;
      const matchTitle = team.projectTitle.toLowerCase().includes(q);
      const matchLeader = team.teamLeader.toLowerCase().includes(q) || team.leaderRollNo.includes(q);
      const matchNotice = team.isNotified && (team.notifiedComment.toLowerCase().includes(q) || team.notifiedTiming.toLowerCase().includes(q));
      const matchTech = (team.technologiesUsed || []).some(t => t.toLowerCase().includes(q));
      return matchNumber || matchTitle || matchLeader || matchNotice || matchTech;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* 1. Page Header (Clean & Direct) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Capstone Title Endorsement &amp; Scope Review
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review problem statements, technological viability, and student scopes for Capstone projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-mint-100 text-mint-900 border border-mint-200 text-xs font-extrabold shadow-xs">
            {stats.pendingTitleApprovalsCount} Titles Awaiting Review
          </span>
        </div>
      </div>

      {/* 2. Control Bar: Filter Tabs & Live Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2E8E4] shadow-card">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('Pending')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'Pending'
                ? 'bg-mint-500 text-white font-extrabold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Pending Review</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'Pending' ? 'bg-white text-mint-800' : 'bg-amber-100 text-amber-900'
            }`}>
              {stats.pendingTitleApprovalsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('Approved')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'Approved'
                ? 'bg-mint-500 text-white font-extrabold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Approved</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'Approved' ? 'bg-white text-mint-800' : 'bg-mint-100 text-mint-900'
            }`}>
              {stats.approvedTitlesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('Rejected')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'Rejected'
                ? 'bg-mint-500 text-white font-extrabold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Revision Required</span>
            {stats.rejectedTitlesCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'Rejected' ? 'bg-white text-rose-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {stats.rejectedTitlesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('Notified')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'Notified'
                ? 'bg-mint-500 text-white font-extrabold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bell size={13} className={activeTab === 'Notified' ? 'text-white' : 'text-amber-600'} />
            <span>Notified Students</span>
            {stats.notifiedCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'Notified' ? 'bg-white text-amber-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {stats.notifiedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('All')}
            className={`px-3.5 py-2 rounded-xl transition ${
              activeTab === 'All'
                ? 'bg-mint-500 text-white font-extrabold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>All Proposals ({teams.length})</span>
          </button>
        </div>

        {/* Live Search Bar & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team, title, student..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-mint-500 focus:bg-white transition"
            />
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh page"
            className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh page"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 3. Proposals Card Grid / Feed */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-12 text-center space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-[#E2E8E4]">
            <Search size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No project proposals match criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or filter tab to locate specific team proposals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTeams.map((team) => {
            const isApproved = team.titleStatus === 'Approved';
            const isPending = team.titleStatus === 'Pending';
            const isRejected = team.titleStatus === 'Rejected';

            return (
              <div 
                key={team.teamId}
                className="bg-white rounded-2xl border border-[#E2E8E4] shadow-card hover:shadow-hover transition overflow-hidden"
              >
                {/* Proposal Header */}
                <div className="p-5 border-b border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAF9]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Team Number Pill in White & Mint */}
                    <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs shadow-xs">
                      Team #{team.teamNumber}
                    </span>

                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {team.projectTitle}
                    </h2>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${
                      isApproved
                        ? 'bg-mint-100 text-mint-900 border-mint-200'
                        : isPending
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      {isApproved && <CheckCircle2 size={13} className="text-mint-700" />}
                      {isPending && <Clock size={13} className="text-amber-600" />}
                      {isRejected && <XCircle size={13} className="text-rose-600" />}
                      <span>{isApproved ? 'Approved & Locked' : isPending ? 'Pending Evaluation' : 'Revision Required'}</span>
                    </span>
                  </div>
                </div>

                {/* Sub-meta details bar */}
                <div className="px-5 py-2.5 bg-white border-b border-[#E2E8E4] flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-slate-400 font-semibold">Lead: </span>
                      <strong className="text-slate-900">{team.teamLeader}</strong>
                      <span className="text-slate-400 font-mono text-[11px] ml-1">({team.leaderRollNo})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Students: </span>
                      <span className="font-bold text-slate-800">{team.membersCount || 4} Members</span>
                      <span className="text-slate-400 text-[11px] ml-1">({team.class}-{team.section} &bull; {team.batch})</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold">Class Advisor: </span>
                    <span className="font-bold text-slate-700">{team.advisor}</span>
                  </div>
                </div>

                {/* Proposal Body */}
                <div className="p-5 space-y-4 text-xs">
                  
                  {/* Notified Banner (renders if team.isNotified = true) */}
                  {team.isNotified && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                          <Bell size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px]">
                              Active Consultation Notice
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white text-amber-900 font-mono text-[10px] font-bold border border-amber-300">
                              {team.notifiedTiming}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium mt-1 leading-snug">
                            "{team.notifiedComment}"
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Venue: <strong>{team.notifiedLocation || 'Faculty Cabin 204'}</strong> &bull; Notified on {team.notifiedAt}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTeam(team);
                          setIsNotifyOpen(true);
                        }}
                        className="self-start sm:self-center px-3 py-1.5 text-[11px] font-bold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition shrink-0 shadow-xs"
                      >
                        Update Timing
                      </button>
                    </div>
                  )}

                  {/* Rejection Alert Box (renders if rejected) */}
                  {isRejected && team.rejectionReason && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs">
                      <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-rose-900 uppercase tracking-wide text-[10px] block">
                          Mandated Revision Feedback:
                        </span>
                        <p className="text-rose-950 leading-relaxed font-medium">
                          "{team.rejectionReason}"
                        </p>
                        <span className="text-[10px] text-rose-700 italic">
                          Awaiting revised problem statement submission from student team.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2-Column Specs: Problem Statement vs Proposed Solution */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#EFF3F1]/60 border border-[#E2E8E4] space-y-1">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                        Problem Statement
                      </span>
                      <p className="text-slate-800 leading-relaxed text-xs">
                        {team.problemStatement}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-mint-50/60 border border-mint-200 space-y-1">
                      <span className="font-bold text-mint-900 uppercase tracking-wider text-[10px] block">
                        Proposed Solution Architecture
                      </span>
                      <p className="text-slate-800 leading-relaxed text-xs">
                        {team.proposedSolution}
                      </p>
                    </div>
                  </div>

                  {/* Abstract & Tech Stack */}
                  <div className="space-y-2">
                    <p className="text-slate-600 text-xs leading-relaxed italic border-l-2 border-mint-500 pl-3 py-0.5">
                      "{team.abstract || team.projectDescription}"
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tech Stack:</span>
                      {team.technologiesUsed?.map((tech, i) => (
                        <span 
                          key={i} 
                          className="px-2.5 py-0.5 rounded-lg bg-mint-50 text-mint-900 text-[11px] font-semibold border border-mint-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Proposal Footer Action Buttons */}
                <div className="px-5 py-3.5 bg-[#F8FAF9] border-t border-[#E2E8E4] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTeam(team);
                        setIsDetailsOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-[#E2E8E4] hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye size={14} className="text-slate-400" />
                      <span>View Full Proposal</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTeam(team);
                        setIsNotifyOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Bell size={14} className="text-amber-700" />
                      <span>{team.isNotified ? 'Notify Again' : 'Notify Team'}</span>
                    </button>
                  </div>

                  {/* Decision Actions */}
                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      /* Approved: Locked indicator */
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 border border-mint-200 text-mint-900 font-extrabold text-xs">
                        <Lock size={14} className="text-mint-700" />
                        <span>Scope Endorsed &amp; Locked</span>
                      </div>
                    ) : (
                      /* Pending or Rejected: Action buttons */
                      <>
                        <button
                          onClick={() => {
                            setSelectedTeam(team);
                            setIsRejectOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1.5 shadow-xs"
                        >
                          <XCircle size={14} />
                          <span>Reject Title</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTeam(team);
                            setIsApproveOpen(true);
                          }}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-mint-500 hover:bg-mint-600 shadow-sm transition flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle2 size={15} />
                          <span>Approve Title</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ApproveConfirmModal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        team={selectedTeam}
        onConfirm={(teamId) => approveTitle(teamId)}
      />

      <TitleRejectModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        team={selectedTeam}
        onReject={(teamId, reason) => rejectTitle(teamId, reason)}
      />

      <NotifyTeamModal
        isOpen={isNotifyOpen}
        onClose={() => setIsNotifyOpen(false)}
        team={selectedTeam}
        onNotify={(teamId, data) => notifyTeam(teamId, data)}
      />

      <TeamDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        team={selectedTeam}
      />

    </div>
  );
};

export default ApproveProject;
