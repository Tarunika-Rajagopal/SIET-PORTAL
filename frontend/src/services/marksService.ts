export interface WeeklyMarksRecord {
  teamId: string;
  weekNumber: number;
  memberMarks: Record<string, number>; // rollNo -> mark (0-100)
  teamAverage: number;
  remarks?: string;
  gradedAt: string;
  gradedBy: string;
}

type MarksListener = () => void;
const listeners: Set<MarksListener> = new Set();

const STORAGE_KEY = 'siet_weekly_marks';

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

function loadAllMarks(): Record<string, Record<number, WeeklyMarksRecord>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Purge any stale legacy default mock marks if present
      if (
        parsed &&
        (
          parsed["TEAM-CSE-Y3-B04"]?.[1]?.remarks?.includes("Thorough problem formulation") ||
          parsed["team-1"]?.[1]?.remarks?.includes("Requirement specification") ||
          parsed["team-2"]?.[1]?.remarks?.includes("Dataset collection protocol")
        )
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return {};
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load marks from localStorage', e);
  }

  // Initially, NO marks assigned should be shown
  return {};
}

// Helper to resolve alias ids (e.g. team-1 <-> TEAM-CSE-Y3-B04)
const ALIAS_MAP: Record<string, string> = {
  "team-1": "TEAM-CSE-Y3-B04",
  "TEAM-CSE-Y3-B04": "team-1",
  "team-4": "TEAM-CSE-Y3-B04",
  "Team 04": "TEAM-CSE-Y3-B04",
  "Team 4": "TEAM-CSE-Y3-B04",
  "04": "TEAM-CSE-Y3-B04",
  "4": "TEAM-CSE-Y3-B04",
  "team-2": "TEAM-CSE-Y3-B05",
  "TEAM-CSE-Y3-B05": "team-2",
};

export const MarksService = {
  getAllMarks(): Record<string, Record<number, WeeklyMarksRecord>> {
    return loadAllMarks();
  },

  getAllTeamMarks(teamId: string): Record<number, WeeklyMarksRecord> {
    const all = loadAllMarks();
    if (all[teamId]) return all[teamId];
    const alias = ALIAS_MAP[teamId];
    if (alias && all[alias]) return all[alias];
    return {};
  },

  getAvailableWeeks(teamId: string): number[] {
    const teamMarks = this.getAllTeamMarks(teamId);
    return Object.keys(teamMarks).map(Number).sort((a, b) => a - b);
  },

  getWeeklyMarks(teamId: string, weekNumber: number): WeeklyMarksRecord | null {
    const all = loadAllMarks();
    if (all[teamId]?.[weekNumber]) {
      return all[teamId][weekNumber];
    }
    const alias = ALIAS_MAP[teamId];
    if (alias && all[alias]?.[weekNumber]) {
      return all[alias][weekNumber];
    }
    return null;
  },

  saveWeeklyMarks(
    teamId: string,
    weekNumber: number,
    memberMarks: Record<string, number>,
    remarks: string = '',
    gradedBy: string = 'Class Advisor'
  ): WeeklyMarksRecord {
    const all = loadAllMarks();
    if (!all[teamId]) {
      all[teamId] = {};
    }

    const marksValues = Object.values(memberMarks).filter(m => typeof m === 'number' && !isNaN(m));
    const sum = marksValues.reduce((acc, curr) => acc + curr, 0);
    const teamAverage = marksValues.length > 0 ? Math.round((sum / marksValues.length) * 10) / 10 : 0;

    const record: WeeklyMarksRecord = {
      teamId,
      weekNumber,
      memberMarks,
      teamAverage,
      remarks,
      gradedAt: new Date().toISOString(),
      gradedBy
    };

    all[teamId][weekNumber] = record;

    // Also sync alias if present
    const alias = ALIAS_MAP[teamId];
    if (alias) {
      if (!all[alias]) all[alias] = {};
      all[alias][weekNumber] = { ...record, teamId: alias };
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save marks to localStorage', e);
    }

    notifyListeners();
    // Dispatch global events for instant cross-portal reactive updates (HOD, Guide, Student)
    window.dispatchEvent(new Event('siet_marks_updated'));
    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));
    return record;
  },

  getTeamAverage(teamId: string, weekNumber: number): number | null {
    const record = this.getWeeklyMarks(teamId, weekNumber);
    return record ? record.teamAverage : null;
  },

  getMemberMark(teamId: string, weekNumber: number, rollNo: string): number | null {
    const record = this.getWeeklyMarks(teamId, weekNumber);
    if (!record || record.memberMarks[rollNo] === undefined) return null;
    return record.memberMarks[rollNo];
  },

  subscribe(listener: MarksListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

export default MarksService;
