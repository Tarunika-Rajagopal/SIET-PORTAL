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

const STORAGE_KEY = 'siet_hod_action_history_v1';

type HistoryListener = () => void;
const listeners: Set<HistoryListener> = new Set();

const DEFAULT_HOD_HISTORY: HodHistoryRecord[] = [];

function notify() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

function loadHistory(): HodHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purge any stale legacy mock history
        const cleaned = parsed.filter(item => item && item.id !== 'HOD-ACT-001' && item.id !== 'HOD-ACT-002');
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.error('Failed to load HOD action history:', e);
  }
  return DEFAULT_HOD_HISTORY;
}

export const HodHistoryService = {
  getHistory(): HodHistoryRecord[] {
    return loadHistory();
  },

  async fetchHistory(): Promise<HodHistoryRecord[]> {
    try {
      const live = await ApiClient.getHodHistory();
      if (Array.isArray(live)) {
        const records: HodHistoryRecord[] = live.map((h: any) => ({
          id: h.id || `HOD-${Math.random()}`,
          timestamp: h.timestamp || new Date().toISOString(),
          date: h.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          actionType: h.actionType as any,
          target: h.target || '',
          classSection: h.classSection || '',
          batch: h.batch || '',
          details: h.details || '',
          performedBy: h.performedBy || 'HOD / CSE'
        }));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        } catch (e) {}
        notify();
        return records;
      }
    } catch (e) {
      console.warn('[HodHistoryService] Failed to fetch live history from backend:', e);
    }
    return loadHistory();
  },

  logAction(entry: Omit<HodHistoryRecord, 'id' | 'timestamp' | 'date'>): HodHistoryRecord {
    const history = loadHistory();
    const now = new Date();
    const record: HodHistoryRecord = {
      ...entry,
      id: `HOD-ACT-${String(Date.now()).slice(-6)}`,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    history.unshift(record);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save HOD action history:', e);
    }

    // Also persist to backend asynchronously
    ApiClient.logHodHistory({
      actionType: entry.actionType,
      target: entry.target,
      details: entry.details,
      classSection: entry.classSection,
      batch: entry.batch,
      performedBy: entry.performedBy
    }).catch(err => {
      console.warn('[HodHistoryService] Could not persist action to backend:', err);
    });

    notify();
    window.dispatchEvent(new Event('siet_hod_history_updated'));
    window.dispatchEvent(new Event('storage'));
    return record;
  },

  subscribe(listener: HistoryListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
