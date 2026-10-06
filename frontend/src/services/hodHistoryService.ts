import { ApiClient } from './apiClient';

export interface HodHistoryRecord {
  id: string;
  timestamp: string;
  date: string;
  actionType: 'Marks Overridden' | 'Marks Updated' | 'Project Audited' | 'Submission Reviewed' | 'Advisor Appointed' | 'Student Reassigned';
  target: string;
  classSection: string;
  batch: string;
  details: string;
  performedBy: string;
}

type HistoryListener = () => void;
const listeners: Set<HistoryListener> = new Set();

// In-memory cache populated from backend
let cachedHistory: HodHistoryRecord[] = [];

function notify() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

export const HodHistoryService = {
  /**
   * Fetch history from the backend (authoritative source).
   * Updates in-memory cache and notifies listeners.
   */
  async fetchHistory(): Promise<HodHistoryRecord[]> {
    const serverLogs = await ApiClient.getHodHistory();
    const normalized = Array.isArray(serverLogs) ? serverLogs : [];
    cachedHistory = normalized;
    notify();
    return normalized;
  },

  /**
   * Get history from in-memory cache (synchronous).
   * Call fetchHistory() to refresh from backend.
   */
  getHistory(): HodHistoryRecord[] {
    return cachedHistory;
  },

  /**
   * Log a new HOD action. Persists to backend, then refreshes cache.
   */
  logAction(entry: Omit<HodHistoryRecord, 'id' | 'timestamp' | 'date'>): HodHistoryRecord {
    const now = new Date();
    const record: HodHistoryRecord = {
      ...entry,
      id: `HOD-ACT-${String(Date.now()).slice(-6)}`,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    // Optimistic in-memory update
    cachedHistory.unshift(record);
    notify();
    window.dispatchEvent(new Event('siet_hod_history_updated'));

    // Persist to backend (authoritative source)
    ApiClient.logHodHistory({
      actionType: entry.actionType,
      target: entry.target,
      details: entry.details,
      classSection: entry.classSection,
      batch: entry.batch,
      performedBy: entry.performedBy
    }).then(() => {
      // Refresh from backend to get server-generated ID
      this.fetchHistory().catch(() => {});
    }).catch(err => {
      console.warn('Failed to persist HOD history to backend:', err);
    });

    return record;
  },

  /**
   * Subscribe to history changes for UI reactivity.
   * Returns an unsubscribe function.
   */
  subscribe(listener: HistoryListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Clear in-memory history cache.
   */
  clearCache(): void {
    cachedHistory = [];
    notify();
  }
};

// Background-fetch from backend on module load
if (typeof window !== 'undefined') {
  HodHistoryService.fetchHistory().catch(() => {});
  window.addEventListener('siet_auth_logout', () => {
    HodHistoryService.clearCache();
  });
}

export default HodHistoryService;
