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

const DEFAULT_HOD_HISTORY: HodHistoryRecord[] = [
  {
    id: 'HOD-ACT-001',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    date: new Date(Date.now() - 3600000 * 24 * 2).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    actionType: 'Project Audited',
    target: 'Team 04 (Autonomous AI Navigation)',
    classSection: 'CSE-B',
    batch: '2023-2027 (III Year)',
    details: 'Verified milestone phase deliverables and endorsed project trajectory under Guide Dr. P. Manimegalai.',
    performedBy: 'Dr. S. K. Aruna (HOD / CSE)'
  },
  {
    id: 'HOD-ACT-002',
    timestamp: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    date: new Date(Date.now() - 3600000 * 24 * 4).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    actionType: 'Advisor Appointed',
    target: 'Dr. R. Karthikeyan',
    classSection: 'CSE-B',
    batch: '2023-2027 (III Year)',
    details: 'Designated faculty advisor for academic project cohort CSE-B (2023-2027).',
    performedBy: 'Dr. S. K. Aruna (HOD / CSE)'
  }
];

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
      if (Array.isArray(parsed)) return parsed;
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
