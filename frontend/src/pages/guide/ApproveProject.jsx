import React, { useState } from 'react';
import { 
  Search, Bell, CheckCircle2, XCircle, Clock, AlertCircle, 
  Lock, Eye, Users, RefreshCw, Calendar, CheckSquare
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import ApproveConfirmModal from '../../components/guide/ApproveConfirmModal';
import TitleRejectModal from '../../components/guide/TitleRejectModal';
import NotifyTeamModal from '../../components/guide/NotifyTeamModal';
import TeamDetailsModal from '../../components/guide/TeamDetailsModal';
import { isTeamFullySubmitted, hasAnyDetailSubmitted } from '../../utils/submissionUtils';

export const ApproveProject = () => {
  const { teams, approveTitle, rejectTitle, notifyTeam, stats } = useGuide();

  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filtered teams: teams with ANY submitted detail AND Pending review
  // If approved or rejected, DO NOT SHOW in approve submissions page until next submitted by student
  const pendingTeams = teams.filter((team) => {
    // If approved or rejected, do NOT show in approve submissions page
    if (team.titleStatus === 'Approved' || team.titleStatus === 'Rejected') return false;
    // Must be Pending review (not yet Approved, not Rejected)
    if (team.titleStatus !== 'Pending') return false;
    // Must have submitted at least one detail or deliverable
    if (!hasAnyDetailSubmitted(team)) return false;
    return true;
  });

  const filteredTeams = pendingTeams.filter((team) => {
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNumber = `team ${team.teamNumber}`.includes(q) || `#${team.teamNumber}`.includes(q) || String(team.teamNumber) === q;
      const matchTitle = (team.projectTitle || '').toLowerCase().includes(q);
      const matchLeader = (team.teamLeader || '').toLowerCase().includes(q) || (team.leaderRollNo || '').includes(q);
      const matchMembers = (team.members || []).some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q));
      const matchClass = `${team.class || ''} ${team.section || ''}`.toLowerCase().includes(q);
      return matchNumber || matchTitle || matchLeader || matchMembers || matchClass;
    }

    return true;
  });

  const handleOpenApprove = (team) => {
    setSelectedTeam(team);
    setIsApproveOpen(true);
  };

  const handleOpenReject = (team) => {
    setSelectedTeam(team);
    setIsRejectOpen(true);
  };

  const handleOpenView = (team) => {
    setSelectedTeam(team);
    setIsDetailsOpen(true);
  };

  const handleOpenNotify = (team) => {
    setSelectedTeam(team);
    setIsNotifyOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Approve Submissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review student project deliverables and proposal details. Approve or reject submissions directly or inspect all materials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold shadow-2xs flex items-center gap-1.5">
            <Clock size={13} className="text-amber-700" />
            <span>{pendingTeams.length} Submissions Awaiting Review</span>
          </span>
        </div>
      </div>

      {/* 2. Control Bar: Filter Pill & Live Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2E8E4] shadow-card">
        {/* Active Pending Count Pill */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <div className="px-4 py-2 rounded-xl bg-mint-500 text-white font-extrabold shadow-sm flex items-center gap-2">
            <CheckSquare size={15} />
            <span>Pending Submissions ({pendingTeams.length})</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Showing teams with submitted details awaiting guide review
          </span>
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

      {/* 3. Proposals Card Feed: Display Only Team Title and Team Members */}
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
                {/* Proposal Header: Team Title & Status Badge */}
                <div className="p-5 border-b border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAF9]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs shadow-2xs">
                      Team #{team.teamNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Class {team.class}-{team.section} &bull; Batch {team.batch}
                    </span>
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
                      <span>{isApproved ? 'Approved' : isPending ? 'Pending Review' : 'Revision Required'}</span>
                    </span>
                  </div>
                </div>

                {/* Team Title Display */}
                <div className="px-5 py-4 bg-white border-b border-[#E2E8E4]">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Capstone Project Title
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                    {team.projectTitle ? (
                      team.projectTitle
                    ) : (
                      <span className="text-slate-400 italic font-normal">Awaiting Student Title Proposal Submission</span>
                    )}
                  </h2>
                </div>

                {/* Team Members List (Only Team Title and Members shown) */}
                <div className="p-5 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-mint-600" />
                      <span>Team Members ({team.members?.length || 4} Students)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Class Advisor: <strong className="text-slate-700">{team.advisor}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {(team.members || []).map((m, idx) => {
                      const isLead = m.name === team.teamLeader || m.role?.toLowerCase().includes('lead');
                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 ${
                            isLead 
                              ? 'bg-mint-50/50 border-mint-200' 
                              : 'bg-slate-50/60 border-[#E2E8E4]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-extrabold text-slate-900 text-xs leading-snug truncate">
                              {m.name}
                            </span>
                            {isLead && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] bg-mint-100 text-mint-900 border border-mint-200 font-black uppercase shrink-0">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>{m.rollNo}</span>
                            <span className="text-slate-500 font-sans">{isLead ? 'Team Lead' : 'Member'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proposal Footer Action: View (and Notify) */}
                <div className="px-5 py-3.5 bg-[#F8FAF9] border-t border-[#E2E8E4] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Notify Team */}
                    <button
                      type="button"
                      onClick={() => handleOpenNotify(team)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Bell size={14} className="text-amber-700" />
                      <span>{team.isNotified ? 'Notified' : 'Notify'}</span>
                    </button>

                    {/* Quick Reject Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenReject(team)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <XCircle size={14} className="text-rose-600" />
                      <span>Reject</span>
                    </button>

                    {/* Quick Approve Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenApprove(team)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <CheckCircle2 size={14} className="text-emerald-700" />
                      <span>Approve</span>
                    </button>

                    {/* View Button to inspect all submissions */}
                    <button
                      type="button"
                      onClick={() => handleOpenView(team)}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-mint-500 hover:bg-mint-600 shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Eye size={15} />
                      <span>View</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Team Details & Submission Inspection Modal */}
      <TeamDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        team={selectedTeam}
        onApprove={(teamId) => approveTitle(teamId)}
        onReject={(teamId, reason) => rejectTitle(teamId, reason)}
        onOpenNotify={(team) => {
          setSelectedTeam(team);
          setIsNotifyOpen(true);
        }}
      />

      {/* Notify Team Modal */}
      <NotifyTeamModal
        isOpen={isNotifyOpen}
        onClose={() => setIsNotifyOpen(false)}
        team={selectedTeam}
        onNotify={(teamId, data) => notifyTeam(teamId, data)}
      />

      {/* Approve Confirm Modal */}
      <ApproveConfirmModal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        team={selectedTeam}
        onConfirm={(teamId) => approveTitle(teamId)}
      />

      {/* Title Reject Modal */}
      <TitleRejectModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        team={selectedTeam}
        onReject={(teamId, reason) => rejectTitle(teamId, reason)}
      />

    </div>
  );
};

export default ApproveProject;
