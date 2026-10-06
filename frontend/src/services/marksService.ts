import { ApiClient } from './apiClient';

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

// In-memory cache: teamId -> weekNumber -> record
let cachedMarks: Record<string, Record<number, WeeklyMarksRecord>> = {};

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

function dispatchGlobalEvents() {
  window.dispatchEvent(new Event('siet_marks_updated'));
  window.dispatchEvent(new Event('siet_data_updated'));
}

/**
 * Generate safe team ID aliases for cross-format matching.
 * Section-qualified identifiers (e.g. "TEAM-CSE-Y3-B04") strictly preserve section isolation
 * (e.g. "CSE-B Team 04", "B04") and never emit bare digits ("4", "04") that collide across sections.
 * UUIDs are strictly kept intact without extracting trailing digits.
 */
function getAliasesForTeam(teamId: string): string[] {
  if (!teamId) return [];
  // If teamId is a UUID, return only the UUID (never extract trailing digits as a team number)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId)) {
    return [teamId, teamId.toLowerCase()];
  }
  const aliases = new Set<string>([teamId, teamId.toLowerCase()]);

  // Section-aware matching: e.g. "TEAM-CSE-B-T10", "TEAM-CSE-Y3-B04", "CSE-B Team 04", "B-Team 04", "CSE-B-T10"
  const classSecMatch = teamId.match(/(?:CSE-?([A-D])|([A-D]))[-_\s]*(?:team|t)?[-_\s]*(\d+)/i);
  if (classSecMatch) {
    const sec = (classSecMatch[1] || classSecMatch[2] || '').toUpperCase();
    const rawNum = classSecMatch[3];
    const num = parseInt(rawNum, 10);
    const padded = num < 10 ? `0${num}` : `${num}`;
    aliases.add(`CSE-${sec} Team ${num}`);
    aliases.add(`CSE-${sec} Team ${padded}`);
    aliases.add(`CSE-${sec}-${num}`);
    aliases.add(`CSE-${sec}-${padded}`);
    aliases.add(`CSE-${sec}-Team ${num}`);
    aliases.add(`CSE-${sec}-Team ${padded}`);
    aliases.add(`TEAM-CSE-${sec}-T${num}`);
    aliases.add(`TEAM-CSE-${sec}-T${padded}`);
    aliases.add(`${sec}-Team ${num}`);
    aliases.add(`${sec}-Team ${padded}`);
    aliases.add(`Team ${num}`);
    aliases.add(`Team ${padded}`);
    aliases.add(`team-${num}`);
    aliases.add(`team-${padded}`);
    aliases.add(`${sec}${padded}`);
    return Array.from(aliases);
  }

  // Generic team numbering ONLY if no class/section is present
  const numMatch = teamId.match(/\d+$/) || teamId.match(/(\d+)/);
  if (numMatch) {
    const rawNum = numMatch[1] || numMatch[0];
    const num = parseInt(rawNum, 10);
    const padded = num < 10 ? `0${num}` : `${num}`;
    aliases.add(`team-${num}`);
    aliases.add(`team-${padded}`);
    aliases.add(`Team ${num}`);
    aliases.add(`Team ${padded}`);
  }
  return Array.from(aliases);
}

export const MarksService = {
  /**
   * Fetch ALL marks from the backend (authoritative source).
   * Updates in-memory cache and notifies listeners.
   */
  async fetchAllMarks(): Promise<Record<string, Record<number, WeeklyMarksRecord>>> {
    try {
      const serverMarks = await ApiClient.getAllWeeklyMarks();
      if (serverMarks && typeof serverMarks === 'object') {
        const nextCached: Record<string, Record<number, WeeklyMarksRecord>> = {};
        for (const [key, weekObj] of Object.entries(serverMarks)) {
          nextCached[key] = weekObj as any;
          for (const alias of getAliasesForTeam(key)) {
            nextCached[alias] = { ...(nextCached[alias] || {}), ...(weekObj as any) };
          }
        }
        cachedMarks = nextCached;
        notifyListeners();
        dispatchGlobalEvents();
        return cachedMarks;
      }
    } catch (e) {
      console.warn('Failed to fetch marks from backend:', e);
    }
    return cachedMarks;
  },

  clearCacheForTeam(teamId: string): void {
    if (!teamId) return;
    const aliases = [teamId, ...getAliasesForTeam(teamId)].map(a => a.toLowerCase());
    for (const key of Object.keys(cachedMarks)) {
      if (aliases.includes(key.toLowerCase())) {
        delete cachedMarks[key];
      }
    }
    notifyListeners();
    dispatchGlobalEvents();
  },


  /**
   * Fetch marks for a specific team from the backend.
   * Updates the in-memory cache for that team and notifies listeners.
   */
  async fetchTeamMarks(teamId: string): Promise<Record<number, WeeklyMarksRecord>> {
    if (!teamId) return {};
    try {
      const serverTeamMarks = await ApiClient.getTeamWeeklyMarks(teamId);
      if (serverTeamMarks && typeof serverTeamMarks === 'object') {
        const targetAliases = [teamId, ...getAliasesForTeam(teamId)];
        for (const a of targetAliases) {
          if (!cachedMarks[a]) cachedMarks[a] = {};
          for (const [wStr, rec] of Object.entries(serverTeamMarks)) {
            const w = Number(wStr);
            cachedMarks[a][w] = rec as WeeklyMarksRecord;
          }
        }
        notifyListeners();
        return serverTeamMarks;
      }
    } catch (e) {
      console.warn(`Failed to fetch marks for team ${teamId} from backend:`, e);
    }
    return this.getAllTeamMarks(teamId);
  },

  /**
   * Get all marks from the in-memory cache (synchronous).
   * Call fetchAllMarks() to refresh from backend.
   */
  getAllMarks(): Record<string, Record<number, WeeklyMarksRecord>> {
    return cachedMarks;
  },

  /**
   * Get marks for a specific team from the in-memory cache (synchronous).
   * Searches across team ID aliases and optional member roll numbers.
   */
  getAllTeamMarks(teamId: string, memberRollNos?: string[]): Record<number, WeeklyMarksRecord> {
    const all = cachedMarks;
    const result: Record<number, WeeklyMarksRecord> = {};

    const mergeRecord = (w: number, rec: WeeklyMarksRecord) => {
      if (!result[w]) {
        // Deep copy to prevent mutating the cache when merging
        result[w] = { ...rec, memberMarks: { ...rec.memberMarks } };
      } else {
        // Merge member marks from different records for the same week
        if (rec.memberMarks) {
          result[w].memberMarks = { ...result[w].memberMarks, ...rec.memberMarks };
        }
        if (rec.teamAverage > 0 && result[w].teamAverage === 0) {
          result[w].teamAverage = rec.teamAverage;
        }
        if (rec.remarks && !result[w].remarks) {
          result[w].remarks = rec.remarks;
        }
      }
    };

    // 1. Direct key match
    if (all[teamId]) {
      for (const [wStr, rec] of Object.entries(all[teamId])) {
        mergeRecord(Number(wStr), rec);
      }
    }

    // 2. All alias group keys
    const aliases = getAliasesForTeam(teamId);
    for (const a of aliases) {
      if (all[a]) {
        for (const [wStr, rec] of Object.entries(all[a])) {
          mergeRecord(Number(wStr), rec);
        }
      }
    }

    // 3. Case-insensitive key match
    const lower = teamId.toLowerCase();
    for (const [k, v] of Object.entries(all)) {
      if (k.toLowerCase() === lower && v) {
        for (const [wStr, rec] of Object.entries(v)) {
          mergeRecord(Number(wStr), rec);
        }
      }
    }

    // 4. Member roll numbers match across all recorded marks
    if (memberRollNos && memberRollNos.length > 0) {
      const cleanRolls = memberRollNos.map(r => String(r).trim().toLowerCase());
      for (const v of Object.values(all)) {
        if (!v) continue;
        for (const [wStr, rec] of Object.entries(v)) {
          const w = Number(wStr);
          if (rec && rec.memberMarks) {
            const hasMatch = Object.keys(rec.memberMarks).some(k => 
              cleanRolls.includes(String(k).trim().toLowerCase())
            );
            if (hasMatch) {
              mergeRecord(w, rec);
            }
          }
        }
      }
    }

    // Also normalize keys in the result to ensure case-insensitive matching in getMemberReviewMark
    for (const w of Object.keys(result)) {
      const wNum = Number(w);
      const normalizedMarks: Record<string, number> = {};
      if (result[wNum].memberMarks) {
        for (const [k, val] of Object.entries(result[wNum].memberMarks)) {
           normalizedMarks[String(k).trim()] = val;
        }
        result[wNum].memberMarks = normalizedMarks;
      }
    }

    return result;
  },

  /**
   * Get the list of available weeks with marks for a team.
   */
  getAvailableWeeks(teamId: string, memberRollNos?: string[]): number[] {
    const teamMarks = this.getAllTeamMarks(teamId, memberRollNos);
    return Object.keys(teamMarks).map(Number).sort((a, b) => a - b);
  },

  /**
   * Get marks for a specific team and week (synchronous, from cache).
   */
  getWeeklyMarks(teamId: string, weekNumber: number, memberRollNos?: string[]): WeeklyMarksRecord | null {
    const allTeamMarks = this.getAllTeamMarks(teamId, memberRollNos);
    return allTeamMarks[weekNumber] || null;
  },

  /**
   * Save marks for a team/week. Persists to backend, then updates cache.
   */
  saveWeeklyMarks(
    teamId: string,
    weekNumber: number,
    memberMarks: Record<string, number>,
    remarks: string = '',
    gradedBy: string = 'Advisor'
  ): WeeklyMarksRecord {
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

    // Optimistically update in-memory cache across teamId and all aliases
    const aliases = [teamId, ...getAliasesForTeam(teamId)];
    for (const a of aliases) {
      if (!cachedMarks[a]) cachedMarks[a] = {};
      cachedMarks[a][weekNumber] = record;
    }

    notifyListeners();
    dispatchGlobalEvents();

    // Persist to backend (authoritative source)
    ApiClient.saveWeeklyMarks(teamId, weekNumber, memberMarks, remarks, gradedBy)
      .then(() => {
        // Refresh from backend to get server-computed values
        this.fetchTeamMarks(teamId).catch(() => {});
        this.fetchAllMarks().catch(() => {});
      })
      .catch(err => {
        console.warn('Failed to persist marks to backend:', err);
      });

    return record;
  },

  /**
   * Delete marks for a team (optionally for a specific week).
   * Calls the backend DELETE endpoint when a specific week is given.
   */
  deleteWeeklyMarks(teamId: string, weekNumber?: number, memberRollNos?: string[]): void {
    const aliases = getAliasesForTeam(teamId).map(a => a.toLowerCase());
    const targetTeamIdLower = teamId.toLowerCase();

    for (const [key, weekMap] of Object.entries(cachedMarks)) {
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
          delete cachedMarks[key];
        }
      } else {
        if (isTeamMatch) {
          delete cachedMarks[key];
        }
      }
    }

    notifyListeners();
    dispatchGlobalEvents();

    // Persist deletion to backend
    if (weekNumber !== undefined) {
      ApiClient.saveWeeklyMarks(teamId, weekNumber, {}, '', '')
        .catch(err => console.warn('Failed to delete marks from backend:', err));
    }
  },

  /**
   * Get team average for a specific week.
   */
  getTeamAverage(teamId: string, weekNumber: number, memberRollNos?: string[]): number | null {
    const record = this.getWeeklyMarks(teamId, weekNumber, memberRollNos);
    return record ? record.teamAverage : null;
  },

  /**
   * Get a single member's mark for a specific week.
   */
  getMemberMark(teamId: string, weekNumber: number, rollNo: string): number | null {
    const record = this.getWeeklyMarks(teamId, weekNumber, [rollNo]);
    if (!record || record.memberMarks[rollNo] === undefined) return null;
    return record.memberMarks[rollNo];
  },

  /**
   * Subscribe to marks changes for UI reactivity.
   * Returns an unsubscribe function.
   */
  subscribe(listener: MarksListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

// Background-fetch all marks from backend on module load
if (typeof window !== 'undefined') {
  MarksService.fetchAllMarks().catch(() => {});
}

export default MarksService;
