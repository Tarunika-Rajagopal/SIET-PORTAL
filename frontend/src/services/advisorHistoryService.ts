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

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

export const AdvisorHistoryService = {
  getStorageKey(className: string = ''): string {
    return `siet_advisor_history_${className}`;
  },

  async fetchHistory(className: string = ''): Promise<AdvisorHistoryLog[]> {
    if (!className) return [];
    try {
      const serverLogs = await ApiClient.getAdvisorHistory(className);
      if (Array.isArray(serverLogs)) {
        localStorage.setItem(this.getStorageKey(className), JSON.stringify(serverLogs));
        notifyListeners();
        return serverLogs;
      }
    } catch (e) {
      console.warn('Failed to fetch advisor history from backend:', e);
    }
    return this.getHistory(className);
  },

  getHistory(className: string = ''): AdvisorHistoryLog[] {
    if (!className) return [];
    const key = this.getStorageKey(className);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: AdvisorHistoryLog[] = JSON.parse(stored);
        // Ensure role and actorName exist on legacy records
        return parsed.map(log => ({
          ...log,
          role: log.role || 'Class Advisor',
          actorName: log.actorName || log.advisorName || 'Class Advisor'
        }));
      }
    } catch (e) {}

    return [];
  },

  addLog(
    className: string = '',
    actionType: AdvisorHistoryLog['actionType'],
    target: string,
    details: string,
    actorName: string = 'Class Advisor',
    role: AdvisorHistoryLog['role'] = 'Class Advisor'
  ): AdvisorHistoryLog {
    const list = this.getHistory(className);
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

    list.unshift(newLog);

    try {
      localStorage.setItem(this.getStorageKey(className), JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }

    // Persist to backend
    ApiClient.logAdvisorHistory({
      className,
      actionType,
      target,
      details,
      actorName,
      role
    }).catch(err => {
      console.warn('Failed to persist advisor history log to backend:', err);
    });

    notifyListeners();
    return newLog;
  },

  getGuideHistory(guideName?: string): AdvisorHistoryLog[] {
    const knownSections = ['CSE-A', 'CSE-B', 'CSE-C'];
    const allLogs: AdvisorHistoryLog[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch from dedicated guide store
    try {
      const guideStored = localStorage.getItem('siet_guide_action_history');
      if (guideStored) {
        const parsed: AdvisorHistoryLog[] = JSON.parse(guideStored);
        parsed.forEach(log => {
          if (!seenIds.has(log.id)) {
            seenIds.add(log.id);
            allLogs.push(log);
          }
        });
      }
    } catch (e) {}

    // 2. Fetch from section stores where role === 'Faculty Guide'
    knownSections.forEach(sec => {
      const logs = this.getHistory(sec);
      logs.forEach(log => {
        if (log.role === 'Faculty Guide' && !seenIds.has(log.id)) {
          seenIds.add(log.id);
          allLogs.push(log);
        }
      });
    });

    // 3. Optional filter by guideName if specified
    let result = allLogs;
    if (guideName) {
      const target = guideName.toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '').trim();
      result = allLogs.filter(log => {
        const actor = (log.actorName || '').toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '').trim();
        return !target || !actor || actor.includes(target) || target.includes(actor);
      });
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  addGuideLog(
    actionType: AdvisorHistoryLog['actionType'],
    target: string,
    details: string,
    guideName: string = '',
    classSection: string = ''
  ): AdvisorHistoryLog {
    const log = this.addLog(classSection, actionType, target, details, guideName, 'Faculty Guide');

    try {
      const raw = localStorage.getItem('siet_guide_action_history');
      const list: AdvisorHistoryLog[] = raw ? JSON.parse(raw) : [];
      if (!list.some(x => x.id === log.id)) {
        list.unshift(log);
        localStorage.setItem('siet_guide_action_history', JSON.stringify(list));
      }
    } catch (e) {}

    notifyListeners();
    return log;
  },

  subscribe(listener: HistoryListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

export default AdvisorHistoryService;
