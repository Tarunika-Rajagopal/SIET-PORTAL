import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, AlertTriangle, CheckCircle2, RefreshCw,
  Clock, ShieldAlert, X, AlertCircle, ChevronRight, FileText, Check,
  Lock, Unlock
} from 'lucide-react';
import { ApiClient } from '../../services/apiClient';
import { HodService } from '../../services/hodService';

interface WeekData {
  week: number;
  title: string;
  description: string;
  studentCount: number;
  submissionCount: number;
  status: 'Submitted' | 'Empty' | 'No Submissions';
}

const DEFAULT_WEEK_METADATA: Record<number, { title: string; description: string }> = {
  1: {
    title: 'Problem Statement & Scope Formulation',
    description: 'Initial project problem definition, scope, and objectives proposal.'
  },
  2: {
    title: 'Literature Survey & Related Works',
    description: 'Comprehensive review of existing academic and industry implementations.'
  },
  3: {
    title: 'Dataset Collection & Pipeline Prototype',
    description: 'Data acquisition, preprocessing pipeline, and architectural diagram.'
  },
  4: {
    title: 'System Implementation & Deliverables',
    description: 'Functional software modules, documentation, and demo verification.'
  }
};

export const WeeklySubmissionManagementView: React.FC = () => {
  const [weeks, setWeeks] = useState<WeekData[]>([
    { week: 1, title: DEFAULT_WEEK_METADATA[1].title, description: DEFAULT_WEEK_METADATA[1].description, studentCount: 0, submissionCount: 0, status: 'Empty' },
    { week: 2, title: DEFAULT_WEEK_METADATA[2].title, description: DEFAULT_WEEK_METADATA[2].description, studentCount: 0, submissionCount: 0, status: 'Empty' },
    { week: 3, title: DEFAULT_WEEK_METADATA[3].title, description: DEFAULT_WEEK_METADATA[3].description, studentCount: 0, submissionCount: 0, status: 'Empty' },
    { week: 4, title: DEFAULT_WEEK_METADATA[4].title, description: DEFAULT_WEEK_METADATA[4].description, studentCount: 0, submissionCount: 0, status: 'Empty' }
  ]);

  // Toggles for deletion (week number -> boolean)
  const [deleteToggles, setDeleteToggles] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false
  });

  // Real backend release status for each week (week number -> boolean)
  const [weekReleases, setWeekReleases] = useState<Record<number, boolean>>(() => {
    try {
      const stored = localStorage.getItem('siet_week_release_status');
      if (stored) {
        const p = JSON.parse(stored);
        return { 1: Boolean(p['1']), 2: Boolean(p['2']), 3: Boolean(p['3']), 4: Boolean(p['4']) };
      }
    } catch (e) {}
    return { 1: true, 2: true, 3: false, 4: false };
  });
  const [updatingReleaseWeek, setUpdatingReleaseWeek] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    weeks: number[];
  }>({
    isOpen: false,
    weeks: []
  });

  // Fetch summary from backend
  const fetchSummary = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const data = await ApiClient.getWeeklySubmissionsSummary();
      if (Array.isArray(data) && data.length > 0) {
        setWeeks(prevWeeks => {
          return [1, 2, 3, 4].map(wNum => {
            const apiItem = data.find(d => d.week === wNum);
            const meta = DEFAULT_WEEK_METADATA[wNum] || { title: `Week ${wNum}`, description: '' };
            if (apiItem) {
              const status: 'Submitted' | 'Empty' | 'No Submissions' = 
                apiItem.studentCount > 0 ? 'Submitted' : (apiItem.status === 'No Submissions' ? 'No Submissions' : 'Empty');
              return {
                week: wNum,
                title: meta.title,
                description: meta.description,
                studentCount: apiItem.studentCount,
                submissionCount: apiItem.submissionCount,
                status: status
              };
            }
            return prevWeeks.find(pw => pw.week === wNum) || {
              week: wNum,
              title: meta.title,
              description: meta.description,
              studentCount: 0,
              submissionCount: 0,
              status: 'Empty'
            };
          });
        });
      }
    } catch (summaryErr: any) {
      console.warn('[WeeklySubmissionManagement] Could not fetch summary:', summaryErr);
    }

    // Fetch real weekly submission release status from backend
    try {
      const relData = await HodService.fetchWeekReleases();
      if (relData) {
        setWeekReleases({
          1: Boolean(relData['1']),
          2: Boolean(relData['2']),
          3: Boolean(relData['3']),
          4: Boolean(relData['4']),
        });
      }
    } catch (err: any) {
      console.warn('[WeeklySubmissionManagement] Could not fetch week release status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    // Cross-tab real-time sync with BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('siet_milestone_releases');
        bc.onmessage = (event) => {
          if (event.data?.releases) {
            const r = event.data.releases;
            setWeekReleases({
              1: Boolean(r['1']),
              2: Boolean(r['2']),
              3: Boolean(r['3']),
              4: Boolean(r['4']),
            });
          }
        };
      }
    } catch (e) {}

    const handleLocalReleaseUpdate = (e: any) => {
      if (e?.detail?.week !== undefined && e?.detail?.released !== undefined) {
        setWeekReleases(prev => ({
          ...prev,
          [e.detail.week]: Boolean(e.detail.released)
        }));
      } else {
        fetchSummary(true);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'siet_week_release_status' && e.newValue) {
        try {
          const r = JSON.parse(e.newValue);
          setWeekReleases({
            1: Boolean(r['1']),
            2: Boolean(r['2']),
            3: Boolean(r['3']),
            4: Boolean(r['4']),
          });
        } catch (err) {}
      }
    };

    const handleFocus = () => {
      fetchSummary(true);
    };

    window.addEventListener('siet_release_updated', handleLocalReleaseUpdate);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    // Heartbeat poll every 4 seconds for bulletproof real-time sync
    const interval = setInterval(() => {
      fetchSummary(true);
    }, 4000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('siet_release_updated', handleLocalReleaseUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchSummary]);

  // Auto-hide toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Handle toggling delete for a specific week
  const handleToggle = (week: number) => {
    setDeleteToggles(prev => ({
      ...prev,
      [week]: !prev[week]
    }));
  };

  // Handle toggling release authorization for a specific week (unlocks/locks student submissions)
  const handleToggleRelease = async (week: number) => {
    const current = Boolean(weekReleases[week]);
    const next = !current;

    // 1. Instant optimistic update for immediate 0ms visual feedback
    setWeekReleases(prev => ({
      ...prev,
      [week]: next
    }));
    setToast({
      type: 'success',
      message: `Week ${week} has been successfully ${next ? 'released and unlocked' : 'locked'} for student submissions.`
    });

    setUpdatingReleaseWeek(week);
    try {
      const res = await HodService.updateWeekRelease(week, next);
      if (res && res.releases) {
        setWeekReleases({
          1: Boolean(res.releases['1']),
          2: Boolean(res.releases['2']),
          3: Boolean(res.releases['3']),
          4: Boolean(res.releases['4']),
        });
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      setWeekReleases(prev => ({
        ...prev,
        [week]: current
      }));
      setToast({
        type: 'error',
        message: `Failed to update release status for Week ${week}: ${err.message || 'Unknown error'}`
      });
    } finally {
      setUpdatingReleaseWeek(null);
    }
  };

  // Selected weeks count
  const selectedWeeks = Object.entries(deleteToggles)
    .filter(([_, isSelected]) => isSelected)
    .map(([wStr]) => parseInt(wStr, 10));

  // Trigger modal for single week
  const handleOpenSingleDeleteModal = (week: number) => {
    if (!deleteToggles[week]) return;
    setConfirmModal({
      isOpen: true,
      weeks: [week]
    });
  };

  // Trigger modal for all selected weeks
  const handleOpenMultiDeleteModal = () => {
    if (selectedWeeks.length === 0) return;
    setConfirmModal({
      isOpen: true,
      weeks: selectedWeeks
    });
  };

  // Close confirmation modal
  const handleCloseModal = () => {
    if (isDeleting) return;
    setConfirmModal({
      isOpen: false,
      weeks: []
    });
  };

  // Execute deletion after confirmation
  const handleConfirmDelete = async () => {
    const weeksToDelete = confirmModal.weeks;
    if (weeksToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      // 1. Call backend API
      try {
        await ApiClient.deleteWeeklySubmissions(weeksToDelete);
      } catch (apiErr) {
        console.warn('[WeeklySubmissionManagement] Backend delete error, syncing local state:', apiErr);
      }

      // 2. Synchronize any local storage caches to maintain consistency
      try {
        // Clean student submissions cache
        const studentRaw = localStorage.getItem('siet_student_submissions_v6');
        if (studentRaw) {
          const parsed = JSON.parse(studentRaw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((s: any) => !weeksToDelete.includes(s.week));
            localStorage.setItem('siet_student_submissions_v6', JSON.stringify(filtered));
          }
        }

        // Clean guide portal teams cache
        const guideTeamsRaw = localStorage.getItem('siet_guide_portal_teams_v6');
        if (guideTeamsRaw) {
          const guideTeams = JSON.parse(guideTeamsRaw);
          if (Array.isArray(guideTeams)) {
            guideTeams.forEach((t: any) => {
              if (Array.isArray(t.submissions)) {
                t.submissions = t.submissions.filter((s: any) => {
                  const sWeek = s.weekNumber !== undefined ? s.weekNumber : s.week;
                  return !weeksToDelete.includes(sWeek);
                });
              }
            });
            localStorage.setItem('siet_guide_portal_teams_v6', JSON.stringify(guideTeams));
          }
        }
      } catch (storageErr) {
        console.warn('Storage sync error:', storageErr);
      }

      // 3. Update local state immediately
      setWeeks(prev =>
        prev.map(w => {
          if (weeksToDelete.includes(w.week)) {
            return {
              ...w,
              studentCount: 0,
              submissionCount: 0,
              status: 'No Submissions'
            };
          }
          return w;
        })
      );

      // 4. Turn off toggles for the deleted weeks
      setDeleteToggles(prev => {
        const next = { ...prev };
        weeksToDelete.forEach(w => {
          next[w] = false;
        });
        return next;
      });

      // 5. Close modal & show toast
      const isSingle = weeksToDelete.length === 1;
      const successMessage = isSingle
        ? `All Week ${weeksToDelete[0]} submissions have been deleted successfully.`
        : `All submissions for selected weeks (${weeksToDelete.map(w => `Week ${w}`).join(', ')}) have been deleted successfully.`;

      setToast({
        type: 'success',
        message: successMessage
      });

      setConfirmModal({
        isOpen: false,
        weeks: []
      });

      // 6. Refresh summary from backend
      await fetchSummary(true);
      window.dispatchEvent(new Event('siet_hod_history_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete submissions. Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* ── Top Dashboard Header ── */}
      <div className="bg-white border border-[#D8CCBA] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
            <span className="text-[11px] font-bold text-[#75695A] tracking-wider uppercase">
              Academic Milestone Governance &bull; HOD Controls
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] tracking-tight">
            Weekly Submission Management
          </h1>
          <p className="text-sm text-[#75695A] mt-1 font-medium">
            Manage and delete student submissions by week
          </p>
        </div>

        {/* Top-Level Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchSummary()}
            disabled={isLoading || isDeleting}
            className="px-3.5 py-2.5 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh submission metrics"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          {/* Delete Selected Weeks Button */}
          <button
            id="btnDeleteSelectedWeeks"
            onClick={handleOpenMultiDeleteModal}
            disabled={selectedWeeks.length === 0 || isDeleting}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs ${
              selectedWeeks.length > 0
                ? 'bg-[#7C3838] hover:bg-[#682C2C] text-[#FFFFFF] border border-[#682C2C] ring-2 ring-[#7C3838]/20'
                : 'bg-[#EDE7DB] text-[#A89F91] border border-[#D8CCBA] cursor-not-allowed opacity-70'
            }`}
          >
            <Trash2 size={15} />
            <span>Delete Selected Weeks</span>
            {selectedWeeks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-black">
                {selectedWeeks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Summary Indicator Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {weeks.map(item => (
          <div 
            key={`stat-${item.week}`}
            className="bg-white border border-[#D8CCBA] rounded-xl p-4 shadow-2xs flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider block">
                Week {item.week}
              </span>
              <span className="text-lg font-serif font-black text-[#111111] mt-0.5 block">
                {item.studentCount} Students
              </span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center gap-1 ${
                  weekReleases[item.week]
                    ? 'bg-[#EAF2E8] text-[#2E6930] border-[#84A07B]/40'
                    : 'bg-[#EDE7DB] text-[#75695A] border-[#D8CCBA]'
                }`}>
                  {weekReleases[item.week] ? <Unlock size={10} className="text-[#2E6930]" /> : <Lock size={10} className="text-[#75695A]" />}
                  <span>{weekReleases[item.week] ? 'Released' : 'Locked'}</span>
                </span>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border ${
              item.status === 'Submitted'
                ? 'bg-[#EAF2E8] text-[#2E6930] border-[#84A07B]/40'
                : 'bg-[#EDE7DB] text-[#75695A] border-[#D8CCBA]'
            }`}>
              {item.status}
            </div>
          </div>
        ))}
      </div>

      {/* ── 4 Weekly Sections / Cards Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {weeks.map(item => {
          const isMarked = Boolean(deleteToggles[item.week]);
          const isEmpty = item.studentCount === 0 || item.status === 'Empty' || item.status === 'No Submissions';

          return (
            <div
              key={`week-card-${item.week}`}
              id={`week-card-${item.week}`}
              className={`bg-white rounded-2xl p-6 sm:p-7 border transition-all duration-200 shadow-xs relative flex flex-col justify-between ${
                isMarked
                  ? 'border-[#B85C5C] bg-[#FFFBFB] ring-2 ring-[#B85C5C]/20 shadow-md'
                  : 'border-[#D8CCBA] hover:border-[#B8AA97]'
              }`}
            >
              {/* Card Top Section */}
              <div>
                {/* Header Row: Week Badge & Marked Indicator */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#111111] text-[#F8F5EE] font-serif font-black text-sm flex items-center justify-center shadow-xs">
                      W{item.week}
                    </span>
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#111111] leading-tight">
                        Week {item.week}
                      </h2>
                      <span className="text-[11px] text-[#75695A] font-medium">
                        {item.title}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border inline-flex items-center gap-1.5 ${
                    item.status === 'Submitted'
                      ? 'bg-[#EAF2E8] text-[#2E6930] border-[#84A07B]/40'
                      : 'bg-[#EDE7DB] text-[#75695A] border-[#D8CCBA]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Submitted' ? 'bg-[#2E6930]' : 'bg-[#75695A]'}`} />
                    <span>{item.status}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-[#75695A] mb-5 leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* Submission Metric Card */}
                <div className="bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl p-4 mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">
                      Submission Count
                    </span>
                    <span className="text-xl font-serif font-black text-[#111111] mt-0.5 block">
                      {item.studentCount} Students
                    </span>
                  </div>

                  {item.submissionCount > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">
                        Team Batches
                      </span>
                      <span className="text-xs font-bold text-[#292725] mt-0.5 block">
                        {item.submissionCount} Submissions
                      </span>
                    </div>
                  )}
                </div>

                {/* Milestone Release Authorization Control */}
                <div className="mb-5 p-3.5 bg-[#FAF8F4] border border-[#D8CCBA] rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      weekReleases[item.week]
                        ? 'bg-[#EAF2E8] border-[#84A07B]/40 text-[#2E6930]'
                        : 'bg-[#EDE7DB] border-[#D8CCBA] text-[#75695A]'
                    }`}>
                      {weekReleases[item.week] ? <Unlock size={17} /> : <Lock size={17} />}
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-[#75695A] uppercase tracking-wider block">
                        Student Access Authorization
                      </span>
                      <span className={`text-xs font-black flex items-center gap-1.5 mt-0.5 ${
                        weekReleases[item.week] ? 'text-[#2E6930]' : 'text-[#75695A]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${weekReleases[item.week] ? 'bg-[#2E6930]' : 'bg-[#75695A]'}`} />
                        <span>{weekReleases[item.week] ? 'Released • Submissions Open' : 'Locked • Submissions Closed'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Release Toggle Switch */}
                  <label 
                    htmlFor={`toggle-release-week-${item.week}`}
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                    title={weekReleases[item.week] ? `Week ${item.week} is released. Click to lock.` : `Week ${item.week} is locked. Click to release to students.`}
                  >
                    <span className="text-xs font-bold text-[#111111] hidden sm:inline">
                      {updatingReleaseWeek === item.week ? (
                        <RefreshCw size={13} className="animate-spin text-[#75695A]" />
                      ) : (
                        weekReleases[item.week] ? 'Release ON' : 'Release OFF'
                      )}
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id={`toggle-release-week-${item.week}`}
                        checked={Boolean(weekReleases[item.week])}
                        disabled={updatingReleaseWeek === item.week}
                        onChange={() => handleToggleRelease(item.week)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#EDE7DB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8CCBA] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E6930] border border-[#D8CCBA]"></div>
                    </div>
                  </label>
                </div>

                {/* Marked for Deletion Banner */}
                {isMarked && (
                  <div className="mb-5 bg-[#FDF2F2] border border-[#E8B4B4] rounded-xl p-3 flex items-center gap-2.5 text-xs text-[#7C3838] font-bold animate-in fade-in duration-200">
                    <AlertTriangle size={15} className="shrink-0 text-[#B85C5C]" />
                    <span>Marked for deletion &bull; Click below to confirm</span>
                  </div>
                )}
              </div>

              {/* Card Footer: Toggle & Delete Action Button */}
              <div className="pt-4 border-t border-[#EDE7DB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Modern Toggle Switch */}
                <label 
                  htmlFor={`toggle-week-${item.week}`}
                  className="flex items-center gap-3 cursor-pointer select-none group"
                >
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`toggle-week-${item.week}`}
                      checked={isMarked}
                      onChange={() => handleToggle(item.week)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#EDE7DB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8CCBA] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3838] border border-[#D8CCBA]"></div>
                  </div>
                  <span className={`text-xs font-bold transition-colors ${
                    isMarked ? 'text-[#7C3838]' : 'text-[#292725] group-hover:text-[#111111]'
                  }`}>
                    Delete Week {item.week}
                  </span>
                </label>

                {/* Delete Button (Disabled by default until toggle is enabled) */}
                <button
                  id={`btnDeleteWeek${item.week}`}
                  onClick={() => handleOpenSingleDeleteModal(item.week)}
                  disabled={!isMarked || isDeleting}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    isMarked
                      ? 'bg-[#7C3838] hover:bg-[#682C2C] text-[#FFFFFF] border border-[#682C2C] shadow-xs cursor-pointer'
                      : 'bg-[#EDE7DB]/60 text-[#A89F91] border border-[#D8CCBA]/60 cursor-not-allowed'
                  }`}
                  title={isMarked ? `Delete all submissions for Week ${item.week}` : `Toggle 'Delete Week ${item.week}' first to enable button`}
                >
                  <Trash2 size={14} />
                  <span>Delete Week {item.week}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#D8CCBA] overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Warning Header */}
            <div className="p-6 border-b border-[#EDE7DB] bg-[#FFFBFB] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FDF2F2] border border-[#E8B4B4] flex items-center justify-center text-[#B85C5C] shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#B85C5C] block">
                    Warning
                  </span>
                  <h3 className="text-base font-serif font-bold text-[#111111] leading-tight">
                    {confirmModal.weeks.length === 1
                      ? `Delete all Week ${confirmModal.weeks[0]} submissions?`
                      : 'Delete selected weekly submissions?'}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                disabled={isDeleting}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#75695A] hover:text-[#111111] hover:bg-[#EDE7DB] transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-4">
              {confirmModal.weeks.length === 1 ? (
                <p className="text-xs sm:text-sm text-[#292725] leading-relaxed">
                  This will permanently delete the submissions of <span className="font-bold text-[#111111]">ALL students</span> for <span className="font-bold text-[#7C3838]">Week {confirmModal.weeks[0]}</span>. This action cannot be undone.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm text-[#292725] leading-relaxed">
                    You are about to delete all submissions for:
                  </p>
                  <ul className="bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl p-3.5 space-y-1.5">
                    {confirmModal.weeks.map(w => (
                      <li key={`modal-w-${w}`} className="text-xs font-bold text-[#7C3838] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7C3838]" />
                        <span>Week {w} &bull; {DEFAULT_WEEK_METADATA[w]?.title || `Deliverables Week ${w}`}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-[#75695A] leading-relaxed">
                    This will permanently delete submissions from all students in these weeks.
                  </p>
                </div>
              )}

              {/* Data Isolation Rule Banner */}
              <div className="bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl p-3 text-[11px] text-[#75695A] font-medium leading-normal flex items-start gap-2">
                <ShieldAlert size={15} className="text-[#111111] shrink-0 mt-0.5" />
                <span>
                  All other weeks remain completely unaffected and safely preserved.
                </span>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-6 border-t border-[#EDE7DB] bg-[#F8F5EE] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-[#D8CCBA] bg-white hover:bg-[#EDE7DB] text-[#292725] text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btnConfirmDeleteWeeklySubmissions"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-[#7C3838] hover:bg-[#682C2C] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs border border-[#682C2C]"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting Submissions...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>
                      {confirmModal.weeks.length === 1
                        ? `Delete All Week ${confirmModal.weeks[0]} Submissions`
                        : `Delete Selected Weeks (${confirmModal.weeks.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification Banner ── */}
      {toast && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className={`px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold border animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-[#1A1A1A] text-[#F8F5EE] border-[#D8CCBA]'
              : 'bg-[#7C3838] text-white border-[#682C2C]'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-[#84A07B] shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-white shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/60 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default WeeklySubmissionManagementView;
