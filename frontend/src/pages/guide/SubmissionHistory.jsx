import React, { useState } from 'react';
import { 
  History, Calendar, CheckCircle2, Clock, AlertCircle, FileText, 
  Presentation, Image as ImageIcon, Github, ExternalLink, ArrowRight, 
  Users, Shield, CheckSquare, Eye 
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import WeeklyReviewDrawer from '../../components/guide/WeeklyReviewDrawer';
import DocumentPreviewModal from '../../components/guide/DocumentPreviewModal';
import ImageViewerModal from '../../components/guide/ImageViewerModal';
import AdvisorHistoryView from '../../components/advisor/AdvisorHistoryView';

export const SubmissionHistory = () => {
  const { teams, evaluateWeeklySubmission, requestWeeklyRevision } = useGuide();

  const [historyMode, setHistoryMode] = useState('audit-log'); // 'audit-log' | 'team-submissions'
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.teamId || 'team-1');

  // Active team object
  const activeTeam = teams.find(t => t.teamId === selectedTeamId) || teams[0];

  // Drawer / Modal States
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('report');

  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const handleOpenReview = (sub) => {
    setSelectedSubmission(sub);
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

  const currentAcademicWeek = 6;
  const submissions = (activeTeam?.submissions || []).filter(sub => sub.weekNumber <= currentAcademicWeek);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* 1. Page Header with Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            History &amp; Audit Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit multi-role activity changes, milestone evaluations, and chronological team progress.
          </p>
        </div>

        {/* Segmented Mode Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E2E8E4] shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setHistoryMode('audit-log')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              historyMode === 'audit-log'
                ? 'bg-mint-500 text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:bg-mint-50'
            }`}
          >
            Activity Audit Log (All Roles)
          </button>
          <button
            type="button"
            onClick={() => setHistoryMode('team-submissions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              historyMode === 'team-submissions'
                ? 'bg-mint-500 text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:bg-mint-50'
            }`}
          >
            Team Milestone Timeline
          </button>
        </div>
      </div>

      {/* If Multi-Role Activity Audit Log is active */}
      {historyMode === 'audit-log' ? (
        <AdvisorHistoryView
          className="CSE-B"
          advisorName="Faculty Guide Workspace"
        />
      ) : (
        <>

      {/* 2. Horizontal Team Carousel */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8E4] shadow-card">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Select Student Team Portfolio Ledger:
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {teams.map((team) => {
            const isSelected = team.teamId === selectedTeamId;
            const weekCount = (team.submissions || []).filter(s => s.weekNumber <= currentAcademicWeek).length;

            return (
              <button
                key={team.teamId}
                onClick={() => setSelectedTeamId(team.teamId)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-mint-100 text-mint-900 border-mint-300 shadow-sm font-extrabold'
                    : 'bg-white text-slate-700 border-[#E2E8E4] hover:bg-slate-50'
                }`}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-mint-600"></span>
                )}
                <span>Team #{team.teamNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-mint-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {weekCount} {weekCount === 1 ? 'Week' : 'Weeks'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Team Summary Banner */}
      {activeTeam && (
        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs shadow-xs">
                Team #{activeTeam.teamNumber}
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">{activeTeam.projectTitle}</h2>
                <span className="text-xs text-slate-500">
                  {activeTeam.class}-{activeTeam.section} &bull; Batch {activeTeam.batch}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                activeTeam.titleStatus === 'Approved'
                  ? 'bg-mint-100 text-mint-900 border-mint-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                Title {activeTeam.titleStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Team Leader</span>
              <span className="font-extrabold text-slate-900 mt-0.5 block">{activeTeam.teamLeader}</span>
              <span className="text-[10px] text-slate-400 font-mono">{activeTeam.leaderRollNo}</span>
            </div>

            <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Students</span>
              <span className="font-extrabold text-slate-900 mt-0.5 block">{activeTeam.membersCount || 4} Enrolled</span>
              <span className="text-[10px] text-slate-500">4th Year Capstone</span>
            </div>

            <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Class Advisor</span>
              <span className="font-extrabold text-slate-900 mt-0.5 block">{activeTeam.advisor}</span>
              <span className="text-[10px] text-slate-500">Section Supervisor</span>
            </div>

            <div className="p-3 bg-[#EFF3F1]/70 rounded-xl border border-[#E2E8E4]">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Sprints</span>
              <span className="font-extrabold text-mint-700 mt-0.5 block">{submissions.length} Logged (up to Week {currentAcademicWeek})</span>
              <span className="text-[10px] text-slate-500">IEEE Deliverables</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Timeline Ledger */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History size={14} className="text-mint-600" />
          <span>Chronological Milestone Timeline (Sprint Progress)</span>
        </h3>

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8E4] p-12 text-center text-slate-500 space-y-2 shadow-card">
            <Clock size={28} className="mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-800">No weekly sprint logs submitted yet.</p>
            <p className="text-[11px] text-slate-400">Team will begin weekly logs once initial setup is complete.</p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l-2 border-mint-200 space-y-6">
            {submissions.map((sub, idx) => {
              const isEvaluated = sub.evaluationStatus === 'Evaluated';
              const isPending = sub.evaluationStatus === 'Pending';
              const isRevision = sub.evaluationStatus === 'Revision Required';

              return (
                <div key={idx} className="relative group">
                  {/* Timeline Node Bullet */}
                  <div className={`absolute -left-[31px] sm:-left-[39px] top-4 w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[11px] shadow-sm border-2 ${
                    isEvaluated
                      ? 'bg-mint-500 text-white border-white'
                      : isPending
                      ? 'bg-amber-500 text-white border-white'
                      : 'bg-rose-500 text-white border-white'
                  }`}>
                    W{sub.weekNumber}
                  </div>

                  {/* Card Container */}
                  <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5 shadow-card hover:shadow-hover transition space-y-3">
                    
                    {/* Week Title & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8E4] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-mint-50 text-mint-900 font-bold text-xs border border-mint-200">
                            Week {sub.weekNumber}
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900">{sub.title || `Milestone Sprint ${sub.weekNumber}`}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          Submitted on {sub.submissionDate}
                        </span>
                      </div>

                      <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                        isEvaluated
                          ? 'bg-mint-100 text-mint-900 border-mint-200'
                          : isPending
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        {isEvaluated && <CheckCircle2 size={13} className="text-mint-700" />}
                        {isPending && <Clock size={13} className="text-amber-600" />}
                        {isRevision && <AlertCircle size={13} className="text-rose-600" />}
                        <span>{sub.evaluationStatus}</span>
                      </span>
                    </div>

                    {/* 2-line clamped abstract */}
                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                      {sub.abstractSummary}
                    </p>

                    {/* Recorded Guide Remarks Box */}
                    {sub.guideRemarks ? (
                      <div className="p-3.5 bg-mint-50/70 border border-mint-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-mint-900 text-[11px]">
                            Recorded Guide Feedback &amp; Endorsement:
                          </span>
                          {sub.evaluatedDate && (
                            <span className="text-[10px] text-mint-800 font-mono font-bold">
                              Evaluated: {sub.evaluatedDate}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 italic">
                          "{sub.guideRemarks}"
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <Clock size={14} className="text-amber-600 shrink-0" />
                        <span className="font-semibold">Pending guide evaluation and remarks entry.</span>
                      </div>
                    )}

                    {/* Artifact Summary Icons & Open Review Drawer */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-mint-50 text-mint-900 border border-mint-200 text-[11px] font-bold">
                          <FileText size={12} className="text-mint-700" />
                          <span>PDF Report</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                          <Presentation size={12} className="text-slate-600" />
                          <span>Slides</span>
                        </span>
                        {sub.images && sub.images.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            <ImageIcon size={12} className="text-slate-600" />
                            <span>{sub.images.length} Captures</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenReview(sub)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-mint-900 bg-mint-50 hover:bg-mint-100 border border-mint-200 transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye size={13} />
                        <span>Inspect Deliverables</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* Review Drawer */}
      <WeeklyReviewDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        team={activeTeam}
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
        team={activeTeam}
      />

      {/* Image Lightbox Modal */}
      <ImageViewerModal
        isOpen={imgModalOpen}
        onClose={() => setImgModalOpen(false)}
        images={selectedSubmission?.images || []}
        initialIndex={activeImgIndex}
        title={activeTeam?.projectTitle}
      />

    </div>
  );
};

export default SubmissionHistory;
