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

let cachedMarks: Record<string, Record<number, WeeklyMarksRecord>> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) cachedMarks = null;
  });
  window.addEventListener('siet_marks_updated', () => {
    cachedMarks = null;
  });
}

function loadAllMarks(): Record<string, Record<number, WeeklyMarksRecord>> {
  if (cachedMarks) return cachedMarks;
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
        cachedMarks = {};
        return {};
      }
      cachedMarks = parsed;
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load marks from localStorage', e);
  }

  // Initially, NO marks assigned should be shown
  cachedMarks = {};
  return {};
}

// Helper to resolve alias ids across team aliases (e.g. team-4, TEAM-CSE-Y3-B04, Team 04, etc.)
const ALL_ALIAS_GROUPS: string[][] = [
  ["TEAM-CSE-Y3-B04", "team-4", "Team 04", "Team 4", "04", "4"],
  ["TEAM-CSE-Y3-B05", "team-5", "Team 05", "Team 5", "05", "5"],
  ["TEAM-CSE-Y3-B06", "team-6", "Team 06", "Team 6", "06", "6"],
  ["TEAM-CSE-Y3-B07", "team-7", "Team 07", "Team 7", "07", "7"],
  ["TEAM-CSE-Y3-A02", "team-2", "Team 02", "Team 2", "02", "2"],
  ["TEAM-CSE-Y3-C08", "team-8", "Team 08", "Team 8", "08", "8"],
  ["TEAM-CSE-Y3-C09", "team-9", "Team 09", "Team 9", "09", "9"]
];

function getAliasesForTeam(teamId: string): string[] {
  const tLower = teamId.toLowerCase();
  const group = ALL_ALIAS_GROUPS.find(g => g.some(a => a.toLowerCase() === tLower));
  return group ? group : [teamId];
}

export const MarksService = {
  getAllMarks(): Record<string, Record<number, WeeklyMarksRecord>> {
    return loadAllMarks();
  },

  getAllTeamMarks(teamId: string, memberRollNos?: string[]): Record<number, WeeklyMarksRecord> {
    const all = loadAllMarks();
    const result: Record<number, WeeklyMarksRecord> = {};

    // 1. Direct key match
    if (all[teamId]) {
      Object.assign(result, all[teamId]);
    }

    // 2. All alias group keys
    const aliases = getAliasesForTeam(teamId);
    for (const a of aliases) {
      if (all[a]) {
        for (const [wStr, rec] of Object.entries(all[a])) {
          const w = Number(wStr);
          if (!result[w] || (rec.teamAverage > 0 && result[w].teamAverage === 0)) {
            result[w] = rec;
          }
        }
      }
    }

    // 3. Case-insensitive key match
    const lower = teamId.toLowerCase();
    for (const [k, v] of Object.entries(all)) {
      if (k.toLowerCase() === lower && v) {
        for (const [wStr, rec] of Object.entries(v)) {
          const w = Number(wStr);
          if (!result[w] || (rec.teamAverage > 0 && result[w].teamAverage === 0)) {
            result[w] = rec;
          }
        }
      }
    }

    // 4. Member roll numbers match across all recorded marks
    if (memberRollNos && memberRollNos.length > 0) {
      for (const v of Object.values(all)) {
        if (!v) continue;
        for (const [wStr, rec] of Object.entries(v)) {
          const w = Number(wStr);
          if (rec && rec.memberMarks && memberRollNos.some(r => r in rec.memberMarks)) {
            if (!result[w] || (rec.teamAverage > 0 && result[w].teamAverage === 0)) {
              result[w] = rec;
            }
          }
        }
      }
    }

    return result;
  },

  getAvailableWeeks(teamId: string, memberRollNos?: string[]): number[] {
    const teamMarks = this.getAllTeamMarks(teamId, memberRollNos);
    return Object.keys(teamMarks).map(Number).sort((a, b) => a - b);
  },

  getWeeklyMarks(teamId: string, weekNumber: number, memberRollNos?: string[]): WeeklyMarksRecord | null {
    const allTeamMarks = this.getAllTeamMarks(teamId, memberRollNos);
    if (allTeamMarks[weekNumber]) {
      return allTeamMarks[weekNumber];
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

    // Save under primary teamId
    if (!all[teamId]) all[teamId] = {};
    all[teamId][weekNumber] = record;

    // Synchronize to ALL known alias keys for this team
    const aliases = getAliasesForTeam(teamId);
    for (const a of aliases) {
      if (!all[a]) all[a] = {};
      all[a][weekNumber] = { ...record, teamId: a };
    }

    try {
      cachedMarks = all;
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

  deleteWeeklyMarks(teamId: string, weekNumber?: number, memberRollNos?: string[]): void {
    const all = loadAllMarks();
    const aliases = getAliasesForTeam(teamId).map(a => a.toLowerCase());
    const targetTeamIdLower = teamId.toLowerCase();

    for (const [key, weekMap] of Object.entries(all)) {
      if (!weekMap) continue;
      const keyLower = key.toLowerCase();
      const isTeamMatch = keyLower === targetTeamIdLower || aliases.includes(keyLower);

      if (weekNumber !== undefined) {
        if (isTeamMatch && weekMap[weekNumber]) {
          delete weekMap[weekNumber];
        } else if (memberRollNos && memberRollNos.length > 0 && weekMap[weekNumber]) {
          const rec = weekMap[weekNumber];
          if (rec && rec.memberMarks && memberRollNos.some(r => r in rec.memberMarks)) {
            delete weekMap[weekNumber];
          }
        }
        if (Object.keys(weekMap).length === 0) {
          delete all[key];
        }
      } else {
        if (isTeamMatch) {
          delete all[key];
        }
      }
    }

    try {
      cachedMarks = all;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to delete marks from localStorage', e);
    }

    notifyListeners();
    window.dispatchEvent(new Event('siet_marks_updated'));
    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));
  },

  getTeamAverage(teamId: string, weekNumber: number, memberRollNos?: string[]): number | null {
    const record = this.getWeeklyMarks(teamId, weekNumber, memberRollNos);
    return record ? record.teamAverage : null;
  },

  getMemberMark(teamId: string, weekNumber: number, rollNo: string): number | null {
    const record = this.getWeeklyMarks(teamId, weekNumber, [rollNo]);
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
