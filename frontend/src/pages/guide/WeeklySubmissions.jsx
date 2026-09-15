import React, { useState } from 'react';
import { 
  Clock, CheckCircle2, AlertCircle, FileText, Search, Filter, 
  ExternalLink, ArrowUpRight, Lock, Eye, CheckSquare, RefreshCw 
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import WeeklyReviewDrawer from '../../components/guide/WeeklyReviewDrawer';
import DocumentPreviewModal from '../../components/guide/DocumentPreviewModal';
import ImageViewerModal from '../../components/guide/ImageViewerModal';

export const WeeklySubmissions = () => {
  const { teams, stats, evaluateWeeklySubmission, requestWeeklyRevision } = useGuide();

  const [searchTerm, setSearchTerm] = useState('');
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [evalFilter, setEvalFilter] = useState('ALL');

  // Drawer and Modal States
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('report');

  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Flatten all submissions with parent team info
  const allSubmissions = [];
  teams.forEach(team => {
    (team.submissions || []).forEach(sub => {
      allSubmissions.push({
        ...sub,
        teamId: team.teamId,
        teamNumber: team.teamNumber,
        projectTitle: team.projectTitle,
        teamLeader: team.teamLeader,
        parentTeam: team
      });
    });
  });

  // Sort by week descending, then team number
  allSubmissions.sort((a, b) => b.weekNumber - a.weekNumber || a.teamNumber - b.teamNumber);

  // Filter submissions
  const filteredSubmissions = allSubmissions.filter(sub => {
    const matchesWeek = weekFilter === 'ALL' || String(sub.weekNumber) === weekFilter;
    const matchesEval = evalFilter === 'ALL' || sub.evaluationStatus === evalFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      `team ${sub.teamNumber}`.includes(q) ||
      `#${sub.teamNumber}`.includes(q) ||
      sub.projectTitle.toLowerCase().includes(q) ||
      sub.teamLeader.toLowerCase().includes(q) ||
      `week ${sub.weekNumber}`.includes(q);

    return matchesWeek && matchesEval && matchesSearch;
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

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Weekly Sprint Submissions &amp; Milestone Audits
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluate technical reports, presentation decks, and hardware bench results submitted by students.
        </p>
      </div>

      {/* 2. Top 4 Stat Cards in White & Mint theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Logs */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Sprints Logged</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalSubmissionsCount}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Across all 5 assigned teams</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center font-bold border border-[#E2E8E4]">
            <FileText size={20} />
          </div>
        </div>

        {/* Pending Review (Amber) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Review</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.pendingWeeklySubmissionsCount}</div>
            <span className="text-[10px] text-amber-800 font-semibold mt-0.5 block">Requires guide action</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
            <Clock size={20} />
          </div>
        </div>

        {/* Evaluated & Locked (Mint) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-mint-800 block">Evaluated &amp; Locked</span>
            <div className="text-2xl font-black text-mint-700 mt-1">{stats.evaluatedSubmissionsCount}</div>
            <span className="text-[10px] text-mint-700 font-semibold mt-0.5 block">Academic credit verified</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold border border-mint-200">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Revision Required (Rose) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Revision Required</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{stats.revisionRequiredCount}</div>
            <span className="text-[10px] text-rose-700 font-semibold mt-0.5 block">Deficiencies notified</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold border border-rose-200">
            <AlertCircle size={20} />
          </div>
        </div>

      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8E4] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by team number, title, sprint..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-mint-500 focus:bg-white transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Sprint Weeks</option>
            <option value="1">Week 1 Only</option>
            <option value="2">Week 2 Only</option>
            <option value="3">Week 3 Only</option>
          </select>

          <select
            value={evalFilter}
            onChange={(e) => setEvalFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Evaluation States</option>
            <option value="Pending">Pending Review</option>
            <option value="Evaluated">Evaluated &amp; Locked</option>
            <option value="Revision Required">Revision Required</option>
          </select>

          {/* Refresh button */}
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

      {/* 4. Submissions Master Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8E4] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-600 font-bold border-b border-[#E2E8E4] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Team ID</th>
                <th className="p-4">Sprint Week</th>
                <th className="p-4">Project Title</th>
                <th className="p-4">Submission Date</th>
                <th className="p-4">Submission Status</th>
                <th className="p-4">Evaluation Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    No weekly sprint submissions found.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const isEvaluated = sub.evaluationStatus === 'Evaluated';
                  const isPending = sub.evaluationStatus === 'Pending';
                  const isRevision = sub.evaluationStatus === 'Revision Required';

                  return (
                    <tr key={idx} className="hover:bg-mint-50/30 transition">
                      {/* Team ID */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs">
                          #{sub.teamNumber}
                        </span>
                      </td>

                      {/* Week Number */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-mint-50 text-mint-900 font-bold text-xs border border-mint-200">
                          Week {sub.weekNumber}
                        </span>
                      </td>

                      {/* Project Title */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 max-w-sm">{sub.projectTitle}</div>
                        <span className="text-[10px] text-slate-400">Lead: {sub.teamLeader}</span>
                      </td>

                      {/* Submission Date */}
                      <td className="p-4 text-slate-600 font-mono text-[11px]">
                        {sub.submissionDate}
                      </td>

                      {/* Submission Status */}
                      <td className="p-4">
                        <span className="text-slate-700 font-medium text-[11px]">
                          {sub.submissionStatus}
                        </span>
                      </td>

                      {/* Evaluation Status */}
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                          isEvaluated
                            ? 'bg-mint-100 text-mint-900 border-mint-200'
                            : isPending
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                        }`}>
                          {isEvaluated && <CheckCircle2 size={11} className="text-mint-700" />}
                          {isPending && <Clock size={11} className="text-amber-600" />}
                          {isRevision && <AlertCircle size={11} className="text-rose-600" />}
                          <span>{sub.evaluationStatus}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenReview(sub)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto shadow-xs ${
                            isPending
                              ? 'bg-mint-500 hover:bg-mint-600 text-white shadow-sm'
                              : 'bg-mint-50 hover:bg-mint-100 text-mint-900 border border-mint-200'
                          }`}
                        >
                          {isPending ? (
                            <>
                              <CheckSquare size={13} />
                              <span>Review</span>
                            </>
                          ) : (
                            <>
                              <Eye size={13} />
                              <span>View</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Drawer */}
      <WeeklyReviewDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        team={selectedTeam}
        submission={selectedSubmission}
        onEvaluate={(teamId, weekNumber, remarks) => {
          evaluateWeeklySubmission(teamId, weekNumber, remarks);
        }}
        onRequestRevision={(teamId, weekNumber, reason) => {
          return requestWeeklyRevision(teamId, weekNumber, reason);
        }}
        onOpenDocPreview={handleOpenDocPreview}
        onOpenImageViewer={handleOpenImageViewer}
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

    </div>
  );
};

export default WeeklySubmissions;
