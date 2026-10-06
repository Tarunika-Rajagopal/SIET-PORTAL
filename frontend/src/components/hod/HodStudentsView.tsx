import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HodService, HodTeamDetails } from '../../services/hodService';
import { useHodFilterOptions, useHodTeams, useHodAdvisors, invalidateHodTeamsQuery, invalidateTeamsQuery } from '../../hooks/useQueries';
import { MarksService } from '../../services/marksService';
import { HodHistoryService } from '../../services/hodHistoryService';
import { StudentService } from '../../services/studentService';
import { ApiClient } from '../../services/apiClient';
import { AuthService } from '../../services/authService';
import { formatProjectTitle, getSubmissionTitle } from '../../utils/titleUtils';
import { 
  Search, UserCheck, CheckCircle2, Check, Filter, RefreshCw, ChevronDown, ChevronUp, 
  Users, FolderGit2, FileText, Download, ExternalLink, Github, Award,
  Edit3, Save, X, Clock, Eye, Loader2, AlertCircle
} from 'lucide-react';
import { WeeklySubmission } from '../../types';

interface HodStudentsViewProps {
  selectedBatch?: string;
  selectedClass?: string;
  initialBatch?: string;
  initialClass?: string;
  onSelectStudent?: (studentRollNo: string, batch: string, className: string) => void;
}

export const HodStudentsView: React.FC<HodStudentsViewProps> = ({
  selectedBatch,
  selectedClass,
  initialBatch,
  initialClass
}) => {
  const [batchFilter, setBatchFilter] = useState(selectedBatch || initialBatch || 'ALL');
  const [classFilter, setClassFilter] = useState(selectedClass || initialClass || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  type ReviewFilterValue = 'ALL' | 'ANY_INCOMPLETE' | 'REV_1' | 'REV_2' | 'REV_3' | 'REV_4';
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterValue>('ALL');
  const [, setMarksTick] = useState(0);

  // Accordion state (supports multiple rows toggled at the same time)
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
  const toggleTeamExpand = (teamId: string) => {
    setExpandedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };
  const [inspectingTeamId, setInspectingTeamId] = useState<string | null>(null);

  // Modal inspection state
  const [activeModalTeam, setActiveModalTeam] = useState<HodTeamDetails | null>(null);
  const [activeModalSub, setActiveModalSub] = useState<WeeklySubmission | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit marks state inside modal
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const [draftMemberMarks, setDraftMemberMarks] = useState<Record<string, number>>({});
  const [draftRemarks, setDraftRemarks] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Subscribe to real-time marks updates
  useEffect(() => {
    MarksService.fetchAllMarks().catch(() => {});
    const unsub = MarksService.subscribe(() => {
      setMarksTick(n => n + 1);
    });
    const handleSync = () => {
      setMarksTick(n => n + 1);
    };
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      unsub();
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Update filters when props change
  useEffect(() => {
    if (selectedBatch !== undefined) setBatchFilter(selectedBatch || 'ALL');
    else if (initialBatch !== undefined) setBatchFilter(initialBatch || 'ALL');
    if (selectedClass !== undefined) setClassFilter(selectedClass || 'ALL');
    else if (initialClass !== undefined) setClassFilter(initialClass || 'ALL');
  }, [selectedBatch, selectedClass, initialBatch, initialClass]);

  // Query hooks
  const { data: filterOpts } = useHodFilterOptions();
  const {
    data: liveTeamsData,
    isLoading: teamsLoading,
    isError: isTeamsError,
    refetch: refetchTeams
  } = useHodTeams(batchFilter, classFilter, searchTerm);

  const {
    data: liveAdvisorsData,
    isLoading: advisorsLoading,
    refetch: refetchAdvisors
  } = useHodAdvisors(batchFilter, classFilter);

  const [detailedSubsByTeam, setDetailedSubsByTeam] = useState<Record<string, Record<number, WeeklySubmission>>>({});

  // Merge liveTeamsData with any detailed submissions loaded in this session
  const teams: HodTeamDetails[] = useMemo(() => {
    const raw = Array.isArray(liveTeamsData) ? liveTeamsData : [];
    if (Object.keys(detailedSubsByTeam).length === 0) return raw;
    return raw.map(t => {
      const teamDetails = detailedSubsByTeam[t.id];
      if (!teamDetails || !t.submissions) return t;
      return {
        ...t,
        submissions: t.submissions.map(s => {
          const detail = teamDetails[s.week];
          return detail ? { ...s, ...detail } : s;
        })
      };
    });
  }, [liveTeamsData, detailedSubsByTeam]);

  // Helper to determine if a review is completed
  const isReviewCompleted = useCallback((team: HodTeamDetails, revNum: number): boolean => {
    const sub = team.submissions?.find(s => s.week === revNum);
    return Boolean(
      sub?.isCompleted ?? 
      (sub?.status === 'Submitted' || sub?.status === 'Approved')
    );
  }, []);

  // Counts of teams having incomplete reviews per milestone
  const incompleteCounts = useMemo(() => {
    return {
      any: teams.filter(t => [1, 2, 3, 4].some(r => !isReviewCompleted(t, r))).length,
      r1: teams.filter(t => !isReviewCompleted(t, 1)).length,
      r2: teams.filter(t => !isReviewCompleted(t, 2)).length,
      r3: teams.filter(t => !isReviewCompleted(t, 3)).length,
      r4: teams.filter(t => !isReviewCompleted(t, 4)).length,
    };
  }, [teams, isReviewCompleted]);

  // Filter teams based on review selection
  const displayedTeams = useMemo(() => {
    if (reviewFilter === 'ALL') return teams;
    if (reviewFilter === 'ANY_INCOMPLETE') {
      return teams.filter(t => [1, 2, 3, 4].some(r => !isReviewCompleted(t, r)));
    }
    if (reviewFilter === 'REV_1') return teams.filter(t => !isReviewCompleted(t, 1));
    if (reviewFilter === 'REV_2') return teams.filter(t => !isReviewCompleted(t, 2));
    if (reviewFilter === 'REV_3') return teams.filter(t => !isReviewCompleted(t, 3));
    if (reviewFilter === 'REV_4') return teams.filter(t => !isReviewCompleted(t, 4));
    return teams;
  }, [teams, reviewFilter, isReviewCompleted]);

  const advisors = Array.isArray(liveAdvisorsData) ? liveAdvisorsData : [];
  const loading = teamsLoading || advisorsLoading;
  const error = isTeamsError ? 'Unable to load student teams and advisors from database.' : null;

  const batchOptions = filterOpts?.batches?.length ? filterOpts.batches : [];
  const classOptions = filterOpts?.classes?.length ? filterOpts.classes : [];

  const handleRefresh = useCallback(() => {
    refetchTeams();
    refetchAdvisors();
  }, [refetchTeams, refetchAdvisors]);

  const currentAdvisor = advisors.find(a =>
    a.assignedClass === classFilter &&
    (!batchFilter || batchFilter === 'ALL' || !a.batch || a.batch === batchFilter)
  );

  // Helper to get initials
  const getUserInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to open view submission modal
  const handleOpenSubmissionModal = async (team: HodTeamDetails, sub: WeeklySubmission) => {
    setActiveModalTeam(team);
    setActiveModalSub(sub);
    setIsEditingMarks(false);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
    setIsSavingMarks(false);

    // Pre-populate marks draft
    const subNum = (sub as any).submissionNumber || (sub as any).weekNumber || sub.week || 1;
    const wMarks = MarksService.getWeeklyMarks(team.id, subNum, team.members.map(m => m.rollNo)) ||
                   (subNum === 1 ? MarksService.getWeeklyMarks(team.id, 0, team.members.map(m => m.rollNo)) : null);
    const initialMarks: Record<string, number> = {};
    team.members.forEach(m => {
      initialMarks[m.rollNo] = wMarks?.memberMarks?.[m.rollNo] ?? (wMarks?.teamAverage || 0);
    });
    setDraftMemberMarks(initialMarks);
    setDraftRemarks(wMarks?.remarks || '');

    // On-demand fetch detailed submission deliverables if not already present
    if (!sub.problemStatement && !sub.abstract && !sub.solution) {
      try {
        setLoadingDetail(true);
        const detailedSub = await HodService.fetchTeamSubmission(team.id, sub.week);
        if (detailedSub) {
          setActiveModalSub(prev => (prev && prev.week === sub.week ? { ...prev, ...detailedSub } : prev));
          // Cache in local teams list so subsequent opens of the same submission don't need network request
          setDetailedSubsByTeam(prev => ({
            ...prev,
            [team.id]: {
              ...(prev[team.id] || {}),
              [sub.week]: detailedSub
            }
          }));
        }
      } catch (err) {
        console.warn('Could not fetch detailed submission:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  // Live auto-calculated average
  const draftValues = Object.values(draftMemberMarks);
  const draftAverage = draftValues.length > 0
    ? Math.round((draftValues.reduce((acc, v) => acc + (Number(v) || 0), 0) / draftValues.length) * 10) / 10
    : 0;

  // Handle save marks from HOD
  const handleSaveMarks = async () => {
    if (!activeModalTeam || !activeModalSub) return;

    const subNum = (activeModalSub as any).submissionNumber || (activeModalSub as any).weekNumber || activeModalSub.week || 1;
    const currentUser = AuthService.getCurrentUser();
    const hodAuthor = currentUser?.name ? `${currentUser.name} (HOD / CSE)` : 'HOD / CSE';

    setIsSavingMarks(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    // 1. Call backend API to persist marks in database
    try {
      await ApiClient.saveWeeklyMarks(
        activeModalTeam.id,
        subNum,
        draftMemberMarks,
        draftRemarks,
        hodAuthor
      );
    } catch (e: any) {
      console.error('[HodStudentsView] Backend saveWeeklyMarks failed:', e);
      setIsSavingMarks(false);
      setSaveErrorMsg(e?.message || 'Failed to save marks to the backend database. Please check your network and permissions.');
      return;
    }

    // 2. Log action to HodHistoryService for audit tracking ONLY after database persistence
    try {
      HodHistoryService.logAction({
        actionType: 'Marks Overridden',
        target: `${activeModalTeam.teamNo} (Submission ${subNum})`,
        classSection: activeModalTeam.classSection,
        batch: activeModalTeam.batch,
        details: `HOD overridden marks for ${activeModalTeam.teamNo} (Submission ${subNum}) with average score ${draftAverage}/100. ${draftRemarks ? `Remarks: "${draftRemarks}"` : ''}`,
        performedBy: hodAuthor
      });
    } catch (e) {
      console.error(e);
    }

    // 1. Call backend API to persist marks in database
    try {
      await ApiClient.saveWeeklyMarks(
        activeModalTeam.id,
        subNum,
        draftMemberMarks,
        draftRemarks,
        hodAuthor
      );
    } catch (e) {
      console.warn('[HodStudentsView] Backend saveWeeklyMarks failed, continuing with local storage:', e);
    }

    // 2. Save to MarksService under subNum alone
    MarksService.saveWeeklyMarks(
      activeModalTeam.id,
      subNum,
      draftMemberMarks,
      draftRemarks,
      'HOD Evaluation'
    );

    // 3. Dispatch events & invalidate queries
    window.dispatchEvent(new Event('siet_marks_updated'));
    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));

    invalidateHodTeamsQuery();
    invalidateTeamsQuery();
    MarksService.fetchAllMarks().catch(() => {});

    setIsSavingMarks(false);
    setIsEditingMarks(false);
    setSaveSuccessMsg('Marks saved and synchronized successfully to Student, Advisor, and Guide portals.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-4">
      
      {/* Filter Option Row */}
      <div className="bg-[#FAF7F2] rounded-2xl p-4 shadow-sm border border-[#D8CCBA] flex flex-wrap items-center gap-3">
        
        {/* Batch Filter */}
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
        >
          <option value="ALL">All Batches</option>
          {batchOptions.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
        >
          <option value="ALL">All Classes</option>
          {classOptions.map(c => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team, title, or student..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]"
          />
        </div>

        {/* Right Most Corner Controls */}
        <div className="ml-auto flex items-center gap-2.5 shrink-0">
          {/* Recognizable Crimson / Rose Review Filter Dropdown */}
          <div className="relative flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition shadow-xs ${
              reviewFilter !== 'ALL'
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-400/30'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
            }`}>
              <Filter size={13} className={reviewFilter !== 'ALL' ? 'text-white' : 'text-rose-600'} />
              <select
                id="selectReviewFilter"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value as any)}
                className={`text-xs font-bold bg-transparent border-0 focus:outline-none cursor-pointer pr-1 ${
                  reviewFilter !== 'ALL'
                    ? 'text-white [&>option]:text-[#111111] [&>option]:bg-white'
                    : 'text-rose-700 [&>option]:text-[#111111] [&>option]:bg-white'
                }`}
                title="Filter by review non-completion"
              >
                <option value="ALL">All Reviews</option>
                <option value="ANY_INCOMPLETE">Any Incomplete Review ({incompleteCounts.any})</option>
                <option value="REV_1">Review 1 Incomplete ({incompleteCounts.r1})</option>
                <option value="REV_2">Review 2 Incomplete ({incompleteCounts.r2})</option>
                <option value="REV_3">Review 3 Incomplete ({incompleteCounts.r3})</option>
                <option value="REV_4">Review 4 Incomplete ({incompleteCounts.r4})</option>
              </select>
              {reviewFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setReviewFilter('ALL')}
                  className="p-0.5 rounded-full hover:bg-rose-700/80 text-white cursor-pointer transition"
                  title="Clear review filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh real data"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh real data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

      </div>

      {/* Active Crimson Filter Chip Banner */}
      {reviewFilter !== 'ALL' && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>
              {reviewFilter === 'ANY_INCOMPLETE' && `Filtering teams with any incomplete review (${displayedTeams.length} found)`}
              {reviewFilter === 'REV_1' && `Filtering teams with incomplete Review 1 (${displayedTeams.length} found)`}
              {reviewFilter === 'REV_2' && `Filtering teams with incomplete Review 2 (${displayedTeams.length} found)`}
              {reviewFilter === 'REV_3' && `Filtering teams with incomplete Review 3 (${displayedTeams.length} found)`}
              {reviewFilter === 'REV_4' && `Filtering teams with incomplete Review 4 (${displayedTeams.length} found)`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReviewFilter('ALL')}
            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <X size={12} />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Class Advisor Banner if specific class selected */}
      {classFilter !== 'ALL' && (
        <div className="p-4 rounded-2xl bg-white border border-[#D8CCBA] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#75695A] uppercase tracking-wider">Designated Class Advisor:</span>
                <span className="text-xs font-extrabold text-[#111111]">
                  {currentAdvisor ? currentAdvisor.name : 'Unassigned'}
                </span>
                <span className="text-[11px] text-[#75695A] font-mono">
                  ({currentAdvisor ? currentAdvisor.email : 'No advisor email assigned'})
                </span>
              </div>
              <p className="text-[11px] text-[#75695A] mt-0.5 font-medium">
                Class: <strong className="text-[#111111]">{classFilter}</strong> &bull; Batch: <strong className="text-[#111111]">{batchFilter}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Teams Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4 whitespace-nowrap">Team Number</th>
                <th className="p-4 whitespace-nowrap">Class</th>
                <th className="p-4">Title</th>
                <th className="p-4 text-center whitespace-nowrap">Review 1</th>
                <th className="p-4 text-center whitespace-nowrap">Review 2</th>
                <th className="p-4 text-center whitespace-nowrap">Review 3</th>
                <th className="p-4 text-center whitespace-nowrap">Review 4</th>
              </tr>
            </thead>
            <tbody className="font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-[#75695A]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-[#75695A]" />
                      <p className="font-bold text-xs text-[#111111]">Loading real team deliverables &amp; evaluation status...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-rose-600 bg-rose-50/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-bold text-xs">{error}</p>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className="px-3 py-1 bg-white border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-50 cursor-pointer shadow-xs"
                      >
                        Retry Loading
                      </button>
                    </div>
                  </td>
                </tr>
              ) : displayedTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#75695A]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p>
                        {reviewFilter !== 'ALL' 
                          ? 'No teams match the selected review filter.' 
                          : 'No project teams match the selected filters.'}
                      </p>
                      {reviewFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setReviewFilter('ALL')}
                          className="px-3 py-1 bg-white border border-[#D8CCBA] rounded-lg text-xs font-bold text-[#111111] hover:bg-[#EDE7DB] transition cursor-pointer shadow-2xs"
                        >
                          Show All Teams
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedTeams.map((team) => {
                  const isExpanded = expandedTeamIds.has(team.id);
                  const isInspecting = inspectingTeamId === team.id;
                  const isSub1Approved = team.status === 'Approved' || team.guideApprovalStatus === 'Approved' || StudentService.isSubmission1Approved(team.id);
                  const formattedTitle = formatProjectTitle(team.projectTitle, isSub1Approved ? 'Approved' : team.status, isSub1Approved);
                  const isTitleApproved = formattedTitle !== 'No Title Submitted' && formattedTitle !== 'Title Approval Pending';
                  const isTitlePending = formattedTitle === 'Title Approval Pending';

                  return (
                    <React.Fragment key={team.id}>
                      {/* Main Team Row */}
                      <tr
                        onClick={() => toggleTeamExpand(team.id)}
                        className={`cursor-pointer transition-colors duration-300 ease-out border-b border-[#D8CCBA] select-none ${
                          isExpanded ? 'bg-[#F8F5EE]' : 'hover:bg-[#F8F5EE]/60'
                        }`}
                      >
                        {/* Team Number */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-serif font-bold text-xs">
                              {team.teamNo}
                            </span>
                            <span className="p-1 rounded-lg text-[#75695A] hover:bg-[#EDE7DB] transition flex items-center justify-center">
                              <ChevronDown 
                                size={14} 
                                className={`transition-transform duration-450 ease-out ${
                                  isExpanded ? 'rotate-180 text-[#111111]' : 'rotate-0 text-[#75695A]'
                                }`} 
                              />
                            </span>
                          </div>
                          <span className="text-[11px] text-[#75695A] block mt-1 font-medium">
                            Guide: {team.guide?.name || 'Unassigned'}
                          </span>
                        </td>

                        {/* Class */}
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md bg-[#EDE7DB] text-[#111111] font-semibold border border-[#D8CCBA]">
                            Class {team.classSection}
                          </span>
                          <span className="text-[10px] text-[#75695A] block mt-1 font-mono">
                            {team.batch}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="p-4 max-w-md">
                          {isTitleApproved ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#111111] text-xs">
                                {formattedTitle}
                              </span>
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            </div>
                          ) : isTitlePending ? (
                            <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                              <Clock size={11} /> Title Approval Pending
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                              No Title Submitted
                            </span>
                          )}
                        </td>

                        {/* Four Reviews: Review 1, Review 2, Review 3, Review 4 */}
                        {[1, 2, 3, 4].map((revNum) => {
                          const isCompleted = isReviewCompleted(team, revNum);

                          return (
                            <td 
                              key={revNum} 
                              className="p-4 text-center whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center">
                                {isCompleted ? (
                                  <div
                                    title={`Review ${revNum}: Completed`}
                                    className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-2xs border border-emerald-600"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div
                                    title={`Review ${revNum}: Not Completed`}
                                    className="w-5 h-5 rounded-md bg-rose-50 text-rose-600 border border-rose-300 flex items-center justify-center shadow-2xs"
                                  >
                                    <X size={12} strokeWidth={2.5} />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expanded Accordion: Team Members & Inspect Submissions */}
                      <tr className={isExpanded ? 'border-b border-[#D8CCBA]' : 'border-0'}>
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
                              <div className="bg-[#FAF8F4] border-t border-[#D8CCBA] p-5">
                                <div className="space-y-4">
                              
                              {/* Team Members Header & Inspect Submissions Action Button */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#D8CCBA]">
                                <div className="flex items-center gap-2">
                                  <Users size={16} className="text-[#75695A]" />
                                  <span className="font-serif font-bold text-[#111111] text-xs uppercase tracking-wider">
                                    Team Members ({team.members.length} Candidates)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Inspect Submissions Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInspectingTeamId(isInspecting ? null : team.id);
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                      isInspecting
                                        ? 'bg-[#111111] text-[#F8F5EE] border-[#111111]'
                                        : 'bg-[#EDE7DB] text-[#111111] border-[#D8CCBA] hover:bg-[#E2D9C8]'
                                    }`}
                                  >
                                    <FileText size={13} />
                                    <span>{isInspecting ? 'Hide Submissions' : 'Inspect Submissions'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Members Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {team.members.map((member) => (
                                  <div
                                    key={member.rollNo}
                                    className="p-3 bg-white rounded-xl border border-[#D8CCBA] space-y-1 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[#111111] text-xs truncate">
                                        {member.name}
                                      </span>
                                      {member.isLead && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]">
                                          Lead
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#75695A] font-mono block">
                                      {member.rollNo}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Inspect Submissions Grid (shown when Inspect Submissions is clicked) */}
                              {isInspecting && (
                                <div className="mt-4 p-4 rounded-2xl bg-white border border-[#D8CCBA] space-y-3 shadow-sm animate-fadeIn">
                                  <div className="flex items-center justify-between pb-2 border-b border-[#D8CCBA]">
                                    <span className="font-serif font-bold text-[#111111] text-xs uppercase tracking-wider flex items-center gap-1.5">
                                      <FileText size={14} className="text-[#75695A]" />
                                      Weekly Milestone Submissions &amp; Evaluation Audit
                                    </span>
                                    <span className="text-[11px] text-[#75695A] font-medium">
                                      Click View Submission to inspect artifacts, guide marks &amp; edit marks
                                    </span>
                                  </div>

                                  {/* Submissions List */}
                                  {team.submissions && team.submissions.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {team.submissions.slice(0, 4).map((sub) => {
                                        const weekNum = sub.week;
                                        const subNumber = (sub as any).submissionNumber || (sub as any).weekNumber || sub.week || 1;
                                        const wMarks = MarksService.getWeeklyMarks(team.id, subNumber, team.members.map(m => m.rollNo)) ||
                                                       (subNumber === 1 ? MarksService.getWeeklyMarks(team.id, 0, team.members.map(m => m.rollNo)) : null);
                                        const isApproved = sub.status === 'Approved';
                                        const isRejected = sub.status === 'Rejected' || sub.status === 'Changes Requested';

                                        return (
                                          <div
                                            key={weekNum}
                                            className="p-4 rounded-xl border border-[#D8CCBA] bg-[#FAF8F4] hover:bg-[#F3EFE6] transition flex flex-col justify-between gap-3 shadow-2xs"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] font-bold text-[10px] uppercase border border-[#D8CCBA]">
                                                    Submission {subNumber}
                                                  </span>
                                                  <span className="text-[11px] font-mono text-[#75695A]">
                                                    {sub.submissionDate || 'Submitted'}
                                                  </span>
                                                </div>
                                                <h5 className="font-bold text-[#111111] text-xs mt-1.5 line-clamp-1">
                                                  {sub.title || `Milestone Submission ${subNumber}`}
                                                </h5>
                                              </div>

                                              {/* Status Badge */}
                                              {isApproved ? (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[10px] shrink-0">
                                                  Approved
                                                </span>
                                              ) : isRejected ? (
                                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-extrabold text-[10px] shrink-0">
                                                  Revision Required
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px] shrink-0">
                                                  Pending
                                                </span>
                                              )}
                                            </div>

                                            {/* Marks & View Submission Button */}
                                            <div className="pt-2 border-t border-[#D8CCBA] flex items-center justify-between gap-2">
                                              <div>
                                                {wMarks && wMarks.teamAverage > 0 ? (
                                                  <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                                                    <Award size={11} /> Avg: {wMarks.teamAverage}/100
                                                  </span>
                                                ) : (
                                                  <span className="text-[11px] text-slate-400 italic font-medium">
                                                    Ungraded
                                                  </span>
                                                )}
                                              </div>

                                              {/* View Submission Action Button */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenSubmissionModal(team, sub);
                                                }}
                                                className="px-3 py-1 rounded-lg bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                              >
                                                <Eye size={12} />
                                                <span>View Submission</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="p-6 text-center text-[#75695A] bg-[#FAF8F4] rounded-xl border border-[#D8CCBA]">
                                      <p className="font-semibold text-xs">No deliverables submitted by this team yet.</p>
                                    </div>
                                  )}
                                </div>
                              )}

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

      {/* Submission Details Modal with Exact Deliverables, Individual Marks & Edit Marks */}
      {activeModalTeam && activeModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#D8CCBA] overflow-hidden flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs">
                  {activeModalTeam.teamNo} &bull; Submission {(activeModalSub as any).submissionNumber || (activeModalSub as any).weekNumber || activeModalSub.week || 1}
                </span>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#111111] truncate max-w-md">
                    {activeModalSub.title || `Milestone Submission ${activeModalSub.week}`}
                  </h3>
                  <p className="text-[11px] text-[#75695A] font-semibold">
                    Class {activeModalTeam.classSection} &bull; Batch {activeModalTeam.batch} &bull; Guide: {activeModalTeam.guide?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveModalTeam(null);
                  setActiveModalSub(null);
                  setIsEditingMarks(false);
                  setLoadingDetail(false);
                }}
                className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">

              {/* Toast Success Message inside Modal */}
              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Toast Error Message inside Modal */}
              {saveErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-700 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* Section: Deliverables Breakdown (exact or red Not Submitted) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#D8CCBA]">
                  <span className="font-extrabold text-[#111111] uppercase tracking-wider text-xs">
                    Student Deliverables &amp; Artifacts Checklist
                  </span>
                  <div className="flex items-center gap-2">
                    {loadingDetail && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold animate-pulse">
                        <Loader2 size={12} className="animate-spin" /> Loading details...
                      </span>
                    )}
                    <span className="text-[11px] text-[#75695A]">
                      Items missing are marked in red as Not Submitted
                    </span>
                  </div>
                </div>

                {/* 1. Project Title */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">1. Project Title</span>
                    {activeModalTeam.projectTitle ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalTeam.projectTitle && (
                    <p className="text-slate-900 font-bold text-xs">
                      {getSubmissionTitle(activeModalTeam.projectTitle)}
                    </p>
                  )}
                </div>

                {/* 2. Problem Statement */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">2. Problem Statement</span>
                    {activeModalSub.problemStatement ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.problemStatement && (
                    <p className="text-slate-800 text-xs leading-relaxed font-medium">
                      {activeModalSub.problemStatement}
                    </p>
                  )}
                </div>

                {/* 3. Proposed Solution */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">3. Proposed Solution &amp; Technical Approach</span>
                    {activeModalSub.solution ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.solution && (
                    <p className="text-slate-800 text-xs leading-relaxed font-medium">
                      {activeModalSub.solution}
                    </p>
                  )}
                </div>

                {/* 4. Abstract */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">4. Executive Abstract</span>
                    {activeModalSub.abstract ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.abstract && (
                    <p className="text-slate-800 text-xs leading-relaxed font-medium">
                      {activeModalSub.abstract}
                    </p>
                  )}
                </div>

                {/* 5. Tech Stack */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">5. Technologies &amp; Frameworks</span>
                    {activeModalSub.technologyUsed ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.technologyUsed && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeModalSub.technologyUsed.split(',').map((tech, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] rounded-md font-mono text-[11px]">
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. GitHub Repository */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">6. GitHub Repository</span>
                    {activeModalSub.repoUrl ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.repoUrl ? (
                    <div className="pt-1">
                      <a
                        href={activeModalSub.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-700 hover:text-indigo-900 font-mono text-xs underline flex items-center gap-1"
                      >
                        <Github size={13} /> {activeModalSub.repoUrl}
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* 9. Live Demo */}
                <div className="p-3.5 bg-slate-50/70 border border-[#D8CCBA] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs">7. Live Demo / Deployment</span>
                    {activeModalSub.demoUrl ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-[11px]">
                        Not Submitted
                      </span>
                    )}
                  </div>
                  {activeModalSub.demoUrl ? (
                    <div className="pt-1">
                      <a
                        href={activeModalSub.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-700 hover:text-indigo-900 font-mono text-xs underline flex items-center gap-1"
                      >
                        <ExternalLink size={13} /> {activeModalSub.demoUrl}
                      </a>
                    </div>
                  ) : null}
                </div>

              </div>

              {/* Section: Individual Member Marks Assigned by Guide & Average Score */}
              <div className="pt-4 border-t border-[#D8CCBA] space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#D8CCBA]">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-[#111111]" />
                    <span className="font-serif font-bold text-[#111111] text-xs uppercase tracking-wider">
                      Student Individual Marks &amp; Auto-Calculated Team Average
                    </span>
                  </div>

                  {!isEditingMarks && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMarks(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit3 size={13} /> Edit Marks
                    </button>
                  )}
                </div>

                {/* View Mode */}
                {!isEditingMarks ? (
                  <div className="space-y-3">
                    <div className="bg-[#FAF8F4] rounded-2xl p-4 border border-[#D8CCBA] space-y-3">
                      {(() => {
                        const subNum = (activeModalSub as any).submissionNumber || (activeModalSub as any).weekNumber || activeModalSub.week || 1;
                        const wMarks = MarksService.getWeeklyMarks(activeModalTeam.id, subNum, activeModalTeam.members.map(x => x.rollNo)) ||
                                       (subNum === 1 ? MarksService.getWeeklyMarks(activeModalTeam.id, 0, activeModalTeam.members.map(x => x.rollNo)) : null);

                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {activeModalTeam.members.map((m) => {
                                const score = wMarks?.memberMarks?.[m.rollNo];

                                return (
                                  <div
                                    key={m.rollNo}
                                    className="p-3 bg-white rounded-xl border border-[#D8CCBA] flex items-center justify-between shadow-2xs"
                                  >
                                    <div>
                                      <span className="font-bold text-[#111111] text-xs block">
                                        {m.name}
                                      </span>
                                      <span className="font-mono text-[10px] text-[#75695A]">
                                        {m.rollNo} {m.isLead && '• Lead'}
                                      </span>
                                    </div>

                                    <div>
                                      {score !== undefined ? (
                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 font-black text-xs border border-emerald-200">
                                          {score} / 100
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[11px] italic font-semibold">
                                          Unassigned
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Average Score Banner */}
                            <div className="pt-2 border-t border-[#D8CCBA] flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[#75695A] font-bold uppercase tracking-wider text-[11px] block">
                                  Team Calculated Average Score:
                                </span>
                                {wMarks?.gradedBy && (
                                  <span className="text-[10px] text-[#75695A] font-medium">
                                    Evaluated by: <strong className="text-[#111111]">{wMarks.gradedBy}</strong>
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300 shadow-2xs">
                                {wMarks && wMarks.teamAverage > 0 ? `${wMarks.teamAverage} / 100` : 'Unassigned'}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Edit Marks Mode */
                  <div className="bg-[#FAF8F4] rounded-2xl p-4 border border-[#D8CCBA] space-y-4">
                    <p className="text-[11px] text-[#75695A] font-medium">
                      HOD Override: Modify marks assigned by Advisor or Guide individually for each student candidate (0-100). The updated score is auto-calculated and synchronized immediately across all portals.
                    </p>

                    <div className="space-y-2.5">
                      {activeModalTeam.members.map((m) => {
                        const val = draftMemberMarks[m.rollNo] ?? 0;

                        return (
                          <div
                            key={m.rollNo}
                            className="p-3 bg-white rounded-xl border border-[#D8CCBA] flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div>
                              <span className="font-bold text-[#111111] text-xs block">
                                {m.name}
                              </span>
                              <span className="font-mono text-[10px] text-[#75695A]">
                                {m.rollNo} {m.isLead && '• Lead'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={val}
                                onChange={(e) => {
                                  const num = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                  setDraftMemberMarks(prev => ({
                                    ...prev,
                                    [m.rollNo]: num
                                  }));
                                }}
                                className="w-16 px-2 py-1 bg-[#F8F5EE] border border-[#D8CCBA] rounded-lg text-center font-bold text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                              />
                              <span className="text-slate-500 font-bold text-xs">/ 100</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Calculated Average */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider">
                        Auto-Calculated Average Score:
                      </span>
                      <span className="text-base font-black text-emerald-950">
                        {draftAverage} / 100
                      </span>
                    </div>

                    {/* Remarks Input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#75695A] uppercase tracking-wider">
                        Evaluation Remarks / Guide Feedback:
                      </label>
                      <textarea
                        rows={2}
                        value={draftRemarks}
                        onChange={(e) => setDraftRemarks(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8CCBA]">
                      <button
                        type="button"
                        onClick={() => setIsEditingMarks(false)}
                        className="px-4 py-2 rounded-xl border border-[#D8CCBA] text-[#75695A] hover:bg-[#EDE7DB] font-bold text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMarks}
                        disabled={isSavingMarks}
                        className="px-5 py-2 rounded-xl bg-[#111111] text-[#F8F5EE] hover:bg-[#292725] disabled:opacity-60 disabled:cursor-not-allowed font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {isSavingMarks ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save size={14} /> Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Modal Bottom Bar */}
            <div className="bg-[#F8F5EE] px-6 py-3 border-t border-[#D8CCBA] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#75695A]">
                Academic Project Governance Dossier &bull; SIET CSE Portal
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveModalTeam(null);
                  setActiveModalSub(null);
                  setIsEditingMarks(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-white border border-[#D8CCBA] text-[#111111] hover:bg-[#EDE7DB] font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default HodStudentsView;
