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
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load marks from localStorage', e);
  }

  // Default seed marks for demonstration across teams and weeks
  const defaultMarks: Record<string, Record<number, WeeklyMarksRecord>> = {
    "TEAM-CSE-Y3-B04": {
      1: {
        teamId: "TEAM-CSE-Y3-B04",
        weekNumber: 1,
        memberMarks: {
          "714023104112": 92,
          "714023104178": 88,
          "714023104035": 90,
          "714023104040": 86
        },
        teamAverage: 89,
        remarks: "Thorough problem formulation and clear division of drone hardware vs software milestones.",
        gradedAt: "2026-08-20T10:30:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      },
      2: {
        teamId: "TEAM-CSE-Y3-B04",
        weekNumber: 2,
        memberMarks: {
          "714023104112": 95,
          "714023104178": 90,
          "714023104035": 92,
          "714023104040": 91
        },
        teamAverage: 92,
        remarks: "Comprehensive literature survey across 14 IEEE papers on edge crop segmentation.",
        gradedAt: "2026-08-27T11:15:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      },
      3: {
        teamId: "TEAM-CSE-Y3-B04",
        weekNumber: 3,
        memberMarks: {
          "714023104112": 94,
          "714023104178": 91,
          "714023104035": 93,
          "714023104040": 88
        },
        teamAverage: 91.5,
        remarks: "System architecture diagrams and telemetry protocols verified with low packet drop.",
        gradedAt: "2026-09-03T14:20:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      }
    },
    "team-1": {
      1: {
        teamId: "team-1",
        weekNumber: 1,
        memberMarks: {
          "714023104112": 92,
          "714023104178": 88,
          "714023104154": 90,
          "714023104065": 86
        },
        teamAverage: 89,
        remarks: "Requirement specification and database ER diagrams are thorough. Excellent division of work.",
        gradedAt: "2026-08-20T10:30:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      },
      2: {
        teamId: "team-1",
        weekNumber: 2,
        memberMarks: {
          "714023104112": 95,
          "714023104178": 90,
          "714023104154": 92,
          "714023104065": 91
        },
        teamAverage: 92,
        remarks: "RFID serial bus communication verified. Fast response time under 320ms.",
        gradedAt: "2026-08-27T11:15:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      },
      3: {
        teamId: "team-1",
        weekNumber: 3,
        memberMarks: {
          "714023104112": 96,
          "714023104178": 93,
          "714023104154": 94,
          "714023104065": 93
        },
        teamAverage: 94,
        remarks: "Warden admin dashboard live testing completed with out-pass digital signatures.",
        gradedAt: "2026-09-03T10:00:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      }
    },
    "TEAM-CSE-Y3-B05": {
      1: {
        teamId: "TEAM-CSE-Y3-B05",
        weekNumber: 1,
        memberMarks: {
          "714023104035": 90,
          "714023104038": 87,
          "714023104051": 89,
          "714023104058": 86
        },
        teamAverage: 88,
        remarks: "Smart contract state diagram accepted. Good energy settlement protocol foundation.",
        gradedAt: "2026-08-20T11:00:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      },
      2: {
        teamId: "TEAM-CSE-Y3-B05",
        weekNumber: 2,
        memberMarks: {
          "714023104035": 92,
          "714023104038": 88,
          "714023104051": 91,
          "714023104058": 89
        },
        teamAverage: 90,
        remarks: "Private EVM testnet setup complete. Gas optimization metrics meet target criteria.",
        gradedAt: "2026-08-27T14:30:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      }
    },
    "team-2": {
      1: {
        teamId: "team-2",
        weekNumber: 1,
        memberMarks: {
          "714023104149": 88,
          "714023104128": 85,
          "714023104104": 86,
          "714023104081": 85
        },
        teamAverage: 86,
        remarks: "Dataset collection protocol approved. Good anti-spoofing research and lighting variance parameters.",
        gradedAt: "2026-08-21T09:30:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      },
      2: {
        teamId: "team-2",
        weekNumber: 2,
        memberMarks: {
          "714023104149": 78,
          "714023104128": 76,
          "714023104104": 75,
          "714023104081": 75
        },
        teamAverage: 76,
        remarks: "Inference benchmark requires optimization. Advised team to quantize model using TensorRT.",
        gradedAt: "2026-08-28T15:00:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      }
    },
    "team-3": {
      1: {
        teamId: "team-3",
        weekNumber: 1,
        memberMarks: {
          "714023104156": 91,
          "714023104169": 88,
          "714023104085": 89,
          "714023104072": 88
        },
        teamAverage: 89,
        remarks: "Scraper framework design verified with rate-limiting safeguards and proxy rotation.",
        gradedAt: "2026-08-25T11:00:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      }
    },
    "team-4": {
      1: {
        teamId: "team-4",
        weekNumber: 1,
        memberMarks: {
          "714023104161": 93,
          "714023104110": 89,
          "714023104151": 91,
          "714023104041": 87
        },
        teamAverage: 90,
        remarks: "Campus facility maintenance schema and QR generation pipeline accepted.",
        gradedAt: "2026-08-22T10:00:00.000Z",
        gradedBy: "Dr. R. Karthikeyan"
      }
    }
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMarks));
  } catch (e) {}

  return defaultMarks;
}

// Helper to resolve alias ids (e.g. team-1 <-> TEAM-CSE-Y3-B04)
const ALIAS_MAP: Record<string, string> = {
  "team-1": "TEAM-CSE-Y3-B04",
  "TEAM-CSE-Y3-B04": "team-1",
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
