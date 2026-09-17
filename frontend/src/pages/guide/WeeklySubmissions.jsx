import React, { useState } from 'react';
import { 
  Clock, CheckCircle2, AlertCircle, FileText, Search, Filter, 
  ExternalLink, ArrowUpRight, Lock, Eye, CheckSquare, RefreshCw,
  Bell
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import WeeklyReviewDrawer from '../../components/guide/WeeklyReviewDrawer';
import DocumentPreviewModal from '../../components/guide/DocumentPreviewModal';
import ImageViewerModal from '../../components/guide/ImageViewerModal';
import NotifyTeamModal from '../../components/guide/NotifyTeamModal';

export const WeeklySubmissions = () => {
  const { teams, stats, notifyTeam } = useGuide();

  const [searchTerm, setSearchTerm] = useState('');
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  // Drawer and Modal States
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('report');

  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Notify Modal state
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyTargetTeam, setNotifyTargetTeam] = useState(null);
  const [notifyWeekNumber, setNotifyWeekNumber] = useState(null);

  // Flatten all submissions with parent team info - strictly real student submissions only
  const allSubmissions = [];
  teams.forEach(team => {
    (team.submissions || []).forEach(sub => {
      const hasRealContent = Boolean(
        sub.submissionDate &&
        (sub.abstractSummary || sub.problemStatement || sub.proposedSolution || sub.pptUrl || sub.reportUrl || sub.presentationFileName || sub.pdfFile || sub.githubUrl || sub.liveDemoUrl || (sub.images && sub.images.length > 0)) &&
        !String(sub.pptUrl || '').includes('mock_ppt') &&
        !String(sub.presentationFileName || '').includes('mock_ppt')
      );

      if (hasRealContent) {
        allSubmissions.push({
          ...sub,
          teamId: team.teamId,
          teamNumber: team.teamNumber,
          projectTitle: team.projectTitle || sub.projectTitle || sub.title,
          teamLeader: team.teamLeader,
          classSection: team.classSection || `${team.class}-${team.section}`,
          parentTeam: team
        });
      }
    });
  });

  // Sort by week descending, then team number
  allSubmissions.sort((a, b) => b.weekNumber - a.weekNumber || a.teamNumber - b.teamNumber);

  // Filter submissions
  const filteredSubmissions = allSubmissions.filter(sub => {
    const matchesWeek = weekFilter === 'ALL' || String(sub.weekNumber) === weekFilter;
    const matchesClass = classFilter === 'ALL' || sub.classSection === classFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      `team ${sub.teamNumber}`.includes(q) ||
      `#${sub.teamNumber}`.includes(q) ||
      (sub.projectTitle || '').toLowerCase().includes(q) ||
      (sub.teamLeader || '').toLowerCase().includes(q) ||
      `week ${sub.weekNumber}`.includes(q);

    return matchesWeek && matchesClass && matchesSearch;
  });

  const handleOpenReview = (sub) => {
    setSelectedSubmission(sub);
    setSelectedTeam(sub.parentTeam);
    setIsDrawerOpen(true);
  };

  const handleOpenDocPreview = (type) => {
    setDocType(type);
    setDocModalOpen(true);
  };

  const handleOpenImageViewer = (index) => {
    setActiveImgIndex(index);
    setImgModalOpen(true);
  };

  const handleOpenNotifyModal = (team, weekNum) => {
    setNotifyTargetTeam(team);
    setNotifyWeekNumber(weekNum);
    setIsNotifyOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#111111] tracking-tight">
          Weekly Sprint Submissions
        </h1>
        <p className="text-xs text-[#75695A] mt-0.5">
          View deliverables submitted by student teams across sprint milestones.
        </p>
      </div>

      {/* 2. Top 3 Stat Cards in Ivory & Charcoal theme */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Logs */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8CCBA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#75695A] block">Total Sprints Logged</span>
            <div className="text-2xl font-bold text-[#111111] mt-1">{allSubmissions.length}</div>
            <span className="text-[10px] text-[#75695A] mt-0.5 block">Across all assigned teams</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#F8F5EE] text-[#111111] flex items-center justify-center font-bold border border-[#D8CCBA]">
            <FileText size={20} />
          </div>
        </div>

        {/* Total Teams with Submissions */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8CCBA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#75695A] block">Active Teams</span>
            <div className="text-2xl font-bold text-[#111111] mt-1">{teams.length}</div>
            <span className="text-[10px] text-[#75695A] font-semibold mt-0.5 block">Mentored capstone groups</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center font-bold border border-[#D8CCBA]">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Active Consultation Notices */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8CCBA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Active Notices Dispatched</span>
            <div className="text-2xl font-bold text-amber-900 mt-1">{stats.notifiedCount || 0}</div>
            <span className="text-[10px] text-amber-800 font-semibold mt-0.5 block">Consultations scheduled</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
            <Bell size={20} />
          </div>
        </div>
      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#D8CCBA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by team number, title, sprint..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
          >
            <option value="ALL">All Sprint Weeks</option>
            <option value="0">Week 0 Only</option>
            <option value="1">Week 1 Only</option>
            <option value="2">Week 2 Only</option>
            <option value="3">Week 3 Only</option>
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh page"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-slate-700 hover:text-black border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh page"
          >
            <RefreshCw size={14} />
          </button>
        </div>

      </div>

      {/* 4. Submissions Master Table */}
      <div className="bg-white rounded-2xl border border-[#D8CCBA] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#111111] font-bold border-b border-[#D8CCBA] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Team</th>
                <th className="p-4">Class</th>
                <th className="p-4">Sprint Week</th>
                <th className="p-4">Project Title</th>
                <th className="p-4">Submission Date</th>
                <th className="p-4">Deliverables Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-medium">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    No weekly sprint submissions found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-[#F8F5EE]/80 transition">
                      {/* Team ID */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs">
                          #{sub.teamNumber}
                        </span>
                      </td>

                      {/* Class */}
                      <td className="p-4">
                        <span className="font-bold text-[#111111] text-xs">
                          {sub.classSection}
                        </span>
                      </td>

                      {/* Week Number */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-[#F8F5EE] text-[#111111] font-bold text-xs border border-[#D8CCBA]">
                          Week {sub.weekNumber}
                        </span>
                      </td>

                      {/* Project Title */}
                      <td className="p-4">
                        <div className="font-bold text-[#111111] max-w-xs truncate">{sub.projectTitle || 'No Title'}</div>
                        <span className="text-[10px] text-[#75695A]">Lead: {sub.teamLeader}</span>
                      </td>

                      {/* Submission Date */}
                      <td className="p-4 text-[#75695A] font-mono text-[11px]">
                        {sub.submissionDate || 'N/A'}
                      </td>

                      {/* Submission Status */}
                      <td className="p-4">
                        {(() => {
                          const isApproved = sub.evaluationStatus === 'Approved' || sub.status === 'Approved' || sub.parentTeam?.isTitleApproved || sub.parentTeam?.titleStatus === 'Approved';
                          const isRevision = !isApproved && sub.evaluationStatus === 'Revision Required';

                          if (isApproved) {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border-emerald-300">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            );
                          }
                          if (isRevision) {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-rose-50 text-rose-800 border-rose-300">
                                <AlertCircle size={11} className="text-rose-600" />
                                <span>Changes Requested</span>
                              </span>
                            );
                          }
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-amber-50 text-amber-900 border-amber-300">
                              <Clock size={11} className="text-amber-600" />
                              <span>Pending</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions: View and Notify (NO approval or reject option) */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenNotifyModal(sub.parentTeam, sub.weekNumber)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Bell size={13} className="text-amber-700" />
                            <span>Notify</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenReview(sub)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] border border-[#111111] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Drawer: View-only with Notify option (NO approval or reject option) */}
      <WeeklyReviewDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        team={selectedTeam}
        submission={selectedSubmission}
        onOpenDocPreview={handleOpenDocPreview}
        onOpenImageViewer={handleOpenImageViewer}
        onOpenNotify={(team, weekNumber) => handleOpenNotifyModal(team, weekNumber)}
      />

      {/* Document Viewer Modal */}
      <DocumentPreviewModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        documentType={docType}
        submission={selectedSubmission}
        team={selectedTeam}
      />

      {/* Image Lightbox Modal */}
      <ImageViewerModal
        isOpen={imgModalOpen}
        onClose={() => setImgModalOpen(false)}
        images={selectedSubmission?.images || []}
        initialIndex={activeImgIndex}
        title={selectedTeam?.projectTitle}
      />

      {/* Notify Team Modal */}
      <NotifyTeamModal
        isOpen={isNotifyOpen}
        onClose={() => setIsNotifyOpen(false)}
        team={notifyTargetTeam}
        onNotify={(teamId, data) => notifyTeam(teamId, { ...data, weekNumber: notifyWeekNumber })}
      />

    </div>
  );
};

export default WeeklySubmissions;
