import { WeeklySubmission } from '../types';
import { ApiClient } from './apiClient';

export interface HodAdvisor {
  id: string;
  name: string;
  email: string;
  designation: string;
  batch: string;
  assignedClass: string;
  teamsCount: number;
  studentsCount: number;
  status: 'Active' | 'Available';
}

export interface HodStudent {
  rollNo: string;
  name: string;
  email: string;
  batch: string;
  classSection: string;
  teamNo: string;
  teamId: string;
  projectTitle: string;
  status: string;
  guide: string;
  advisor: string;
}

export interface HodTeamDetails {
  id: string;
  teamNo: string;
  projectTitle: string;
  batch: string;
  classSection: string;
  status: 'Approved' | 'In Progress' | 'Review Required' | 'Rejected' | 'Submitted';
  progress: number;
  rejectionReason?: string;
  guideApprovalStatus?: string;
  advisor: {
    name: string;
    email: string;
    designation: string;
  };
  guide: {
    name: string;
    email: string;
    designation: string;
    specialization: string;
  };
  members: Array<{
    rollNo: string;
    name: string;
    email: string;
    isLead: boolean;
  }>;
  submissions: WeeklySubmission[];
}

export interface HodStatistics {
  totalStudents: number;
  totalTeams: number;
  totalGuides: number;
  totalAdvisors: number;
  totalFaculty: number;
  activeProjects: number;
  pendingApprovals: number;
  departmentProgress: number;
  weeklySummary: Array<{ week: number; studentCount: number; submissionCount: number; status: string }>;
}

export interface HodFilterOptions {
  batches: string[];
  classes: string[];
}

// In-memory cache for live data
let cachedAdvisors: HodAdvisor[] = [];
let cachedTeams: HodTeamDetails[] = [];
let cachedStudents: HodStudent[] = [];
let cachedFaculty: any[] = [];

export const HodService = {
  // ── Synchronous accessor fallbacks (return cached live data or empty, NEVER mock data) ──
  getAdvisors(batchFilter?: string, classFilter?: string): HodAdvisor[] {
    return cachedAdvisors.filter(a => {
      const matchBatch = !batchFilter || batchFilter === 'ALL' || a.batch === batchFilter;
      const matchClass = !classFilter || classFilter === 'ALL' || a.assignedClass === classFilter;
      return matchBatch && matchClass;
    });
  },

  getStudents(batchFilter?: string, classFilter?: string): HodStudent[] {
    return cachedStudents.filter(s => {
      const matchBatch = !batchFilter || batchFilter === 'ALL' || s.batch === batchFilter;
      const matchClass = !classFilter || classFilter === 'ALL' || s.classSection === classFilter;
      return matchBatch && matchClass;
    });
  },

  getTeams(batchFilter?: string, classFilter?: string, searchTerm?: string): HodTeamDetails[] {
    return cachedTeams.filter(t => {
      const matchBatch = !batchFilter || batchFilter === 'ALL' || t.batch === batchFilter;
      const matchClass = !classFilter || classFilter === 'ALL' || t.classSection === classFilter;
      
      let matchSearch = true;
      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inTitle = (t.projectTitle || '').toLowerCase().includes(q);
        const inTeamNo = (t.teamNo || '').toLowerCase().includes(q);
        const inMembers = t.members.some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q));
        const inGuide = (t.guide?.name || '').toLowerCase().includes(q);
        const inAdvisor = (t.advisor?.name || '').toLowerCase().includes(q);
        matchSearch = inTitle || inTeamNo || inMembers || inGuide || inAdvisor;
      }

      return matchBatch && matchClass && matchSearch;
    });
  },

  getTeamByStudent(rollNoOrName: string): HodTeamDetails | undefined {
    const q = rollNoOrName.toLowerCase();
    return cachedTeams.find(t =>
      t.members.some(m => m.rollNo.toLowerCase() === q || m.name.toLowerCase().includes(q))
    );
  },

  getFacultyList(): any[] {
    return cachedFaculty;
  },

  // ── Connected Live Backend API methods ───────────────────────────────
  async fetchAdvisors(batchFilter?: string, classFilter?: string): Promise<HodAdvisor[]> {
    const data = await ApiClient.getHodAdvisors(batchFilter, classFilter);
    if (Array.isArray(data)) {
      cachedAdvisors = data as HodAdvisor[];
      return cachedAdvisors;
    }
    return [];
  },

  async fetchAdvisorStudents(advisorId: string): Promise<HodStudent[]> {
    const data = await ApiClient.getHodAdvisorStudents(advisorId);
    if (Array.isArray(data)) {
      return data as HodStudent[];
    }
    return [];
  },

  async fetchStudents(batchFilter?: string, classFilter?: string): Promise<HodStudent[]> {
    const data = await ApiClient.getHodStudents(batchFilter, classFilter);
    if (Array.isArray(data)) {
      cachedStudents = data as HodStudent[];
      return cachedStudents;
    }
    return [];
  },

  async fetchTeams(batchFilter?: string, classFilter?: string, searchTerm?: string): Promise<HodTeamDetails[]> {
    const data = await ApiClient.getHodTeams(batchFilter, classFilter, searchTerm);
    if (Array.isArray(data)) {
      cachedTeams = data as HodTeamDetails[];
      return cachedTeams;
    }
    return [];
  },

  async fetchTeamSubmission(teamId: string, week: number): Promise<WeeklySubmission | null> {
    const data = await ApiClient.getHodTeamSubmission(teamId, week);
    return (data as WeeklySubmission) || null;
  },

  async fetchFacultyList(): Promise<any[]> {
    const data = await ApiClient.getHodFacultyList();
    if (Array.isArray(data)) {
      cachedFaculty = data;
      return cachedFaculty;
    }
    return [];
  },

  async fetchStatistics(): Promise<HodStatistics | null> {
    return await ApiClient.getHodStatistics();
  },

  async fetchFilterOptions(): Promise<HodFilterOptions> {
    try {
      const opts = await ApiClient.getHodFilterOptions();
      if (opts && Array.isArray(opts.batches) && Array.isArray(opts.classes)) {
        return opts;
      }
    } catch (e) {
      console.warn('[HodService] Backend fetchFilterOptions failed:', e);
    }
    return {
      batches: ['2023-2027 (III Year)', '2024-2028 (II Year)', '2022-2026 (IV Year)'],
      classes: ['CSE-A', 'CSE-B', 'CSE-C']
    };
  },

  async fetchWeeklySubmissionsSummary(): Promise<any[]> {
    return ApiClient.getWeeklySubmissionsSummary();
  },

  async deleteWeeklySubmissions(weeks: number[]): Promise<any> {
    return ApiClient.deleteWeeklySubmissions(weeks);
  },

  async fetchWeekReleases(): Promise<Record<string, boolean>> {
    const res = await ApiClient.getHodWeekReleases();
    if (res && res.releases) {
      return res.releases;
    }
    return { '1': true, '2': true, '3': false, '4': false };
  },

  async updateWeekRelease(week: number, released: boolean): Promise<any> {
    // 1. Persist to authoritative backend API first
    const res = await ApiClient.updateHodWeekRelease(week, released);

    // 2. Broadcast and notify listeners after successful backend persistence
    window.dispatchEvent(new CustomEvent('siet_release_updated', { detail: { week, released } }));
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('siet_milestone_releases');
        bc.postMessage({ type: 'RELEASE_CONFIRMED', week, released, releases: res?.releases });
        bc.close();
      } catch (e) {}
    }
    return res;
  },

  clearCache(): void {
    cachedAdvisors = [];
    cachedTeams = [];
    cachedStudents = [];
    cachedFaculty = [];
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('siet_auth_logout', () => {
    HodService.clearCache();
  });
}
