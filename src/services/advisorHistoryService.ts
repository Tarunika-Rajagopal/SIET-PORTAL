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
    | 'Project Approval'
    | 'Milestone Review'
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
  getStorageKey(className: string = 'CSE-B'): string {
    return `siet_advisor_history_${className}`;
  },

  getHistory(className: string = 'CSE-B'): AdvisorHistoryLog[] {
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

    // Default initial seed logs covering changes made by respective roles
    const seed: AdvisorHistoryLog[] = [
      {
        id: "adv-log-1",
        timestamp: "2026-09-12T05:30:00.000Z",
        date: "2026-09-12",
        dateFormatted: "12 Sep 2026, 11:00 AM",
        role: "Class Advisor",
        actorName: "Dr. R. Karthikeyan",
        advisorName: "Dr. R. Karthikeyan",
        actionType: "Marks Evaluation",
        target: "Team 04 (Week 1 Milestone)",
        details: "Evaluated & awarded individual marks. Calculated Team Average: 89/100.",
        classSection: className
      },
      {
        id: "adv-log-2",
        timestamp: "2026-09-11T09:15:00.000Z",
        date: "2026-09-11",
        dateFormatted: "11 Sep 2026, 02:45 PM",
        role: "Class Advisor",
        actorName: "Dr. R. Karthikeyan",
        advisorName: "Dr. R. Karthikeyan",
        actionType: "Guide Reassignment",
        target: "Team 05",
        details: "Reassigned technical guide to Dr. A. Devipriya (capacity verified: 3/5 teams).",
        classSection: className
      },
      {
        id: "guide-log-1",
        timestamp: "2026-09-11T07:40:00.000Z",
        date: "2026-09-11",
        dateFormatted: "11 Sep 2026, 01:10 PM",
        role: "Faculty Guide",
        actorName: "Dr. P. Manimegalai",
        advisorName: "Dr. P. Manimegalai",
        actionType: "Project Approval",
        target: "Team 04 Proposal",
        details: "Approved capstone project proposal: 'AI Autonomous Drone Navigation System'.",
        classSection: className
      },
      {
        id: "guide-log-2",
        timestamp: "2026-09-10T11:20:00.000Z",
        date: "2026-09-10",
        dateFormatted: "10 Sep 2026, 04:50 PM",
        role: "Faculty Guide",
        actorName: "Dr. A. Devipriya",
        advisorName: "Dr. A. Devipriya",
        actionType: "Milestone Review",
        target: "Team 02 (Week 1 Deliverables)",
        details: "Reviewed system architecture and gave technical clearance for sprint progression.",
        classSection: className
      },
      {
        id: "hod-log-1",
        timestamp: "2026-09-10T08:30:00.000Z",
        date: "2026-09-10",
        dateFormatted: "10 Sep 2026, 02:00 PM",
        role: "Head of Department",
        actorName: "Dr. S. Karthik (HOD)",
        advisorName: "Dr. S. Karthik",
        actionType: "Department Governance",
        target: `Class ${className} Guide Quotas`,
        details: "Ratified 5-team maximum cap per faculty guide and authorized project allocations.",
        classSection: className
      },
      {
        id: "adv-log-3",
        timestamp: "2026-09-10T04:00:00.000Z",
        date: "2026-09-10",
        dateFormatted: "10 Sep 2026, 09:30 AM",
        role: "Class Advisor",
        actorName: "Dr. R. Karthikeyan",
        advisorName: "Dr. R. Karthikeyan",
        actionType: "Team Formation",
        target: `Class ${className}`,
        details: "Initialized team partitions with 4 members per team.",
        classSection: className
      },
      {
        id: "adv-log-4",
        timestamp: "2026-09-08T08:00:00.000Z",
        date: "2026-09-08",
        dateFormatted: "08 Sep 2026, 01:30 PM",
        role: "Class Advisor",
        actorName: "Dr. R. Karthikeyan",
        advisorName: "Dr. R. Karthikeyan",
        actionType: "Student Enrollment",
        target: "Tarunika Rajgopal (714023104112)",
        details: "Synchronized candidate registration and assigned to Team 04.",
        classSection: className
      },
      {
        id: "admin-log-1",
        timestamp: "2026-09-07T06:00:00.000Z",
        date: "2026-09-07",
        dateFormatted: "07 Sep 2026, 11:30 AM",
        role: "Admin",
        actorName: "Academic Registrar Admin",
        advisorName: "System Admin",
        actionType: "Student Enrollment",
        target: `Class ${className} Cohort`,
        details: "Imported enrolled student roster for Academic Year 2026-2027.",
        classSection: className
      }
    ];

    try {
      localStorage.setItem(key, JSON.stringify(seed));
    } catch (e) {}

    return seed;
  },

  addLog(
    className: string = 'CSE-B',
    actionType: AdvisorHistoryLog['actionType'],
    target: string,
    details: string,
    actorName: string = 'Dr. R. Karthikeyan',
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

    notifyListeners();
    return newLog;
  },

  subscribe(listener: HistoryListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

export default AdvisorHistoryService;
