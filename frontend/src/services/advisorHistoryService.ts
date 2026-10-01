import { ApiClient } from './apiClient';

export interface AdvisorHistoryLog {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. "12 Sep 2026, 11:30 AM"
  role: 'Class Advisor' | 'Faculty Guide' | 'Head of Department' | 'Admin';
  actorName: string;
  advisorName?: string; // backwards compatibility
  actionType: 
    | 'Marks Evaluation' 
    | 'Student Transfer' 
    | 'Guide Reassignment' 
    | 'Student Enrollment' 
    | 'Team Formation'
    | 'Team Modification'
    | 'Team Deletion'
    | 'Project Approval'
    | 'Milestone Review'
    | 'Notice Dispatched'
    | 'Consultation Notice'
    | 'Department Governance';
  target: string;
  details: string;
  classSection: string;
}

type HistoryListener = () => void;
const listeners: Set<HistoryListener> = new Set();

// In-memory cache keyed by className, populated from backend
const memoryCache = new Map<string, AdvisorHistoryLog[]>();

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Normalize a backend log record into the AdvisorHistoryLog shape.
 * Handles missing fields gracefully for backwards compatibility.
 */
function normalizeLog(log: any): AdvisorHistoryLog {
  return {
    id: log.id || '',
    timestamp: log.timestamp || '',
    date: log.date || '',
    dateFormatted: log.dateFormatted || '',
    role: log.role || 'Class Advisor',
    actorName: log.actorName || log.advisorName || 'Class Advisor',
    advisorName: log.advisorName || log.actorName || 'Class Advisor',
    actionType: log.actionType,
    target: log.target || '',
    details: log.details || '',
    classSection: log.classSection || '',
  };
}

export const AdvisorHistoryService = {
  /**
   * Fetch history from the backend (authoritative source).
   * Updates the in-memory cache and notifies listeners.
   * Returns empty array if the backend is unreachable.
   */
  async fetchHistory(className: string = 'CSE-B'): Promise<AdvisorHistoryLog[]> {
    try {
      const serverLogs = await ApiClient.getAdvisorHistory(className);
      const normalized = Array.isArray(serverLogs)
        ? serverLogs.map(normalizeLog)
        : [];
      memoryCache.set(className, normalized);
      notifyListeners();
      return normalized;
    } catch (e) {
      console.warn('Failed to fetch advisor history from backend:', e);
      // Return whatever is in memory cache, or empty array
      return memoryCache.get(className) || [];
    }
  },

  /**
   * Get history from the in-memory cache (synchronous).
   * Use this for immediate rendering; call fetchHistory() to refresh from backend.
   */
  getHistory(className: string = 'CSE-B'): AdvisorHistoryLog[] {
    return memoryCache.get(className) || [];
  },

  /**
   * Add a new history log entry.
   * Persists to the backend first, then updates the in-memory cache.
   */
  addLog(
    className: string = 'CSE-B',
    actionType: AdvisorHistoryLog['actionType'],
    target: string,
    details: string,
    actorName: string = 'Class Advisor',
    role: AdvisorHistoryLog['role'] = 'Class Advisor'
  ): AdvisorHistoryLog {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const dateFormatted = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newLog: AdvisorHistoryLog = {
      id: `hist-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: now.toISOString(),
      date: dateStr,
      dateFormatted,
      role,
      actorName,
      advisorName: actorName,
      actionType,
      target,
      details,
      classSection: className
    };

    // Optimistically update in-memory cache
    const current = memoryCache.get(className) || [];
    current.unshift(newLog);
    memoryCache.set(className, current);
    notifyListeners();

    // Persist to backend (the authoritative source)
    ApiClient.logAdvisorHistory({
      className,
      actionType,
      target,
      details,
      actorName,
      role
    }).then(() => {
      // Refresh from backend to get the server-generated ID
      this.fetchHistory(className).catch(() => {});
    }).catch(err => {
      console.warn('Failed to persist advisor history log to backend:', err);
    });

    return newLog;
  },

  /**
   * Get guide-specific history from the backend.
   * Fetches advisor history and filters by role === 'Faculty Guide'.
   * Optionally filters by guideName.
   */
  async getGuideHistory(guideName?: string, className?: string): Promise<AdvisorHistoryLog[]> {
    // Fetch from backend for the given class section (or default)
    const logs = await this.fetchHistory(className || 'CSE-B');

    // Filter to only Faculty Guide entries
    let guideLogs = logs.filter(log => log.role === 'Faculty Guide');

    // Optional filter by guideName
    if (guideName) {
      const target = guideName.toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '').trim();
      guideLogs = guideLogs.filter(log => {
        const actor = (log.actorName || '').toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '').trim();
        return !target || !actor || actor.includes(target) || target.includes(actor);
      });
    }

    return guideLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Add a guide-specific history log.
   * This is a convenience wrapper around addLog with role='Faculty Guide'.
   */
  addGuideLog(
    actionType: AdvisorHistoryLog['actionType'],
    target: string,
    details: string,
    guideName: string = 'Faculty Guide',
    classSection: string = 'CSE-B'
  ): AdvisorHistoryLog {
    return this.addLog(classSection, actionType, target, details, guideName, 'Faculty Guide');
  },

  /**
   * Subscribe to history changes (e.g., for UI reactivity).
   * Returns an unsubscribe function.
   */
  subscribe(listener: HistoryListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

export default AdvisorHistoryService;
