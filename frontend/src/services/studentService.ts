import { Team, WeeklySubmission, ReviewScore, ChecklistState, Announcement, GuideNotice } from '../types';
import { ApiClient } from './apiClient';
import { MarksService } from './marksService';
import { AuthService } from './authService';

// Repository-wide cleanup: Purge all stale legacy domain cache from localStorage
if (typeof window !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('siet_student_submissions_') ||
        key.startsWith('siet_deliverable_') ||
        key.startsWith('siet_student_team_') ||
        key.startsWith('siet_guide_portal_teams_') ||
        key.startsWith('siet_guide_portal_activities_') ||
        key.startsWith('siet_team_submissions_')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

export interface StudentDeliverableState {
  week: string;
  projectTitle?: string;
  isTitleApproved: boolean;
  problemStatement?: string;
  solution?: string;
  technologyUsed?: string;
  obstaclesFaced?: string;
  abstract?: string;
  presentationFile?: string;
  reportFile?: string;
  repoUrl?: string;
  demoUrl?: string;
  screenshotFile?: string;
  submittedFields: {
    title: boolean;
    problemStatement: boolean;
    solution: boolean;
    technologyUsed: boolean;
    obstaclesFaced: boolean;
    abstract: boolean;
    presentation: boolean;
    report: boolean;
    repoUrl: boolean;
    demoUrl: boolean;
    screenshot: boolean;
  };
}

export interface StudentTeamExtended extends Team {
  submittedTitle?: string;
  teamNumber?: number;
  isTitleApproved: boolean;
  guideApprovalStatus: 'Approved' | 'Pending Review' | 'Pending' | 'Revision Required' | 'Rejected';
  rejectionReason?: string;
}

// In-memory server-state cache (PostgreSQL is the single authoritative source of truth)
let memoryStudentTeam: StudentTeamExtended | null = null;
let memoryStudentSubmissions: WeeklySubmission[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('siet_auth_logout', () => {
    memoryStudentTeam = null;
    memoryStudentSubmissions = [];
  });
}

// Build a default team object from the authenticated user's profile
function buildDefaultTeamFromUser(): StudentTeamExtended {
  const user = AuthService.getCurrentUser();
  const initialMembers = user && user.name && user.rollNo ? [{
    rollNo: user.rollNo,
    name: user.name,
    email: user.email || '',
    phone: '',
    role: (user as any).isLead ? 'Team Lead' : 'Team Member',
    isLead: Boolean((user as any).isLead),
  }] : [];

  return {
    id: user?.teamId || '',
    teamNo: user?.teamNo || '',
    projectTitle: user?.projectTitle || '',
    submittedTitle: '',
    isTitleApproved: false,
    guideApprovalStatus: 'Pending',
    guideName: user?.guideName || '',
    advisorName: user?.advisorName || '',
    batch: user?.batch || '',
    section: user?.class || '',
    status: 'In Progress',
    progress: 0,
    members: initialMembers,
  };
}

export const DEFAULT_COMPLETED_WEEKS: WeeklySubmission[] = [];

let memoryWeekReleases: Record<string, boolean> = { '1': true, '2': true, '3': false, '4': false };

export const StudentService = {
  getCurrentAcademicWeek(): number {
    try {
      const releasedWeeks = Object.entries(memoryWeekReleases)
        .filter(([_, released]) => Boolean(released))
        .map(([w]) => Number(w))
        .filter(w => !Number.isNaN(w));
      if (releasedWeeks.length > 0) {
        return Math.max(...releasedWeeks);
      }
    } catch {}
    return 1;
  },

  getTeam(): StudentTeamExtended {
    if (memoryStudentTeam) return memoryStudentTeam;
    return buildDefaultTeamFromUser();
  },

  saveTeam(team: StudentTeamExtended): void {
    if (!team) return;
    memoryStudentTeam = team;
    window.dispatchEvent(new Event('siet_data_updated'));
  },

  resetMemoryState(): void {
    memoryStudentTeam = null;
    memoryStudentSubmissions = [];
  },

  async fetchTeamFromBackend(): Promise<StudentTeamExtended | null> {
    try {
      const backendTeam = await ApiClient.getStudentTeam();
      if (backendTeam && (backendTeam.teamNo || backendTeam.teamId)) {
        const teamObj: StudentTeamExtended = {
          id: backendTeam.teamId || backendTeam.id,
          teamNo: backendTeam.teamNo,
          projectTitle: backendTeam.title || backendTeam.projectTitle || '',
          submittedTitle: backendTeam.title || backendTeam.submittedTitle || '',
          isTitleApproved: backendTeam.status === 'Approved' || backendTeam.status === 'Active & Approved',
          guideApprovalStatus: (backendTeam.status === 'Approved' || backendTeam.status === 'Active & Approved') ? 'Approved' : 'Pending Review',
          guideName: backendTeam.guide || backendTeam.guideName || '',
          advisorName: backendTeam.advisorName || '',
          batch: backendTeam.batch || '',
          section: backendTeam.class || backendTeam.section || '',
          status: 'In Progress',
          progress: 0,
          members: (backendTeam.members || []).map((m: any) => ({
            rollNo: m.rollNo,
            name: m.name,
            email: m.email,
            role: m.isLead ? 'Team Lead' : 'Team Member',
            isLead: Boolean(m.isLead),
          })),
        };
        this.saveTeam(teamObj);
        return teamObj;
      }
    } catch (e) {
      console.warn('Failed to fetch student team from backend:', e);
    }
    return null;
  },

  async fetchSubmissionsFromBackend(): Promise<WeeklySubmission[]> {
    try {
      const serverSubs = await ApiClient.getStudentSubmissions();
      if (Array.isArray(serverSubs)) {
        this.saveSubmissions(serverSubs);
        window.dispatchEvent(new Event('siet_student_submissions_updated'));
        return serverSubs;
      }
    } catch (e) {
      console.warn('Failed to fetch student submissions from backend:', e);
    }
    return this.getSubmissions();
  },

  getSubmissions(): WeeklySubmission[] {
    return memoryStudentSubmissions;
  },

  saveSubmissions(submissions: WeeklySubmission[]): void {
    memoryStudentSubmissions = Array.isArray(submissions) ? submissions : [];
    window.dispatchEvent(new Event('siet_data_updated'));
  },

  async fetchWeekReleases(): Promise<Record<string, boolean>> {
    try {
      const res = await ApiClient.getStudentWeekReleases();
      if (res && res.releases) {
        memoryWeekReleases = res.releases;
        return res.releases;
      }
    } catch (e) {
      console.warn('[StudentService] fetchWeekReleases network failure, using in-memory state:', e);
    }
    return memoryWeekReleases;
  },

  isCurrentUserTeamLead(teamToCheck?: Team | StudentTeamExtended): boolean {
    const user = AuthService.getCurrentUser();
    if (!user) return false;

    // Students only
    const userRole = (user.role || (user as any).activeRole || '').toLowerCase();
    if (userRole && !userRole.includes('student')) {
      return false;
    }

    const team = teamToCheck || this.getTeam();
    const userRoll = (user.rollNo || '').trim().toLowerCase();
    const userEmail = (user.email || '').trim().toLowerCase();
    const userName = (user.name || '').trim().toLowerCase();

    // 1. Check team level designated lead fields
    if (team) {
      const leadRoll = ((team as any).lead_roll_no || (team as any).leadRollNo || '').trim().toLowerCase();
      const leadName = ((team as any).lead_student || (team as any).leadStudent || '').trim().toLowerCase();
      if (userRoll && leadRoll && userRoll === leadRoll) return true;
      if (userName && leadName && userName === leadName) return true;
    }

    // 2. Check members array
    if (team && Array.isArray(team.members) && team.members.length > 0) {
      const member = team.members.find((m: any) => {
        const mRoll = (m.rollNo || '').trim().toLowerCase();
        const mEmail = (m.email || '').trim().toLowerCase();
        if (userRoll && mRoll && userRoll === mRoll) return true;
        if (userEmail && mEmail && userEmail === mEmail) return true;
        return false;
      });

      if (member) {
        if (
          (member as any).isLead ||
          (member as any).isLeader ||
          (member.role && member.role.toLowerCase().includes('lead'))
        ) {
          return true;
        }
      }

      // If no member in team has been marked as lead, allow current student to act for their team
      const hasExplicitLead = team.members.some((m: any) =>
        Boolean((m as any).isLead || (m as any).isLeader || (m.role && m.role.toLowerCase().includes('lead')))
      );
      if (!hasExplicitLead) {
        return true;
      }

      return false;
    }

    // Default to true for authenticated students without an explicit members array block
    return true;
  },

  getTeamLead(teamToCheck?: Team | StudentTeamExtended): any {
    const team = teamToCheck || this.getTeam();
    if (!team) return undefined;
    if (Array.isArray(team.members)) {
      const found = team.members.find((m: any) =>
        (m as any).isLead ||
        (m as any).isLeader ||
        (m.role && m.role.toLowerCase().includes('lead'))
      );
      if (found) return found;
    }
    const leadName = (team as any).lead_student || (team as any).leadStudent;
    const leadRoll = (team as any).lead_roll_no || (team as any).leadRollNo;
    if (leadName || leadRoll) {
      return { name: leadName || 'Team Lead', rollNo: leadRoll || '' };
    }
    return undefined;
  },

  isSubmission1Approved(teamId?: string): boolean {
    if (!teamId) return false;
    const tId = teamId.trim();
    const currentTeam = this.getTeam();
    const isStudentTeam = Boolean(currentTeam?.id && (tId === currentTeam.id || tId === currentTeam.teamNo));

    if (isStudentTeam) {
      if (currentTeam.isTitleApproved || currentTeam.guideApprovalStatus === 'Approved') return true;
    }

    const marks = MarksService.getWeeklyMarks(tId, 1);
    if (marks && (marks.teamAverage > 0 || (marks.memberMarks && Object.keys(marks.memberMarks).length > 0))) {
      return true;
    }

    if (isStudentTeam) {
      const subs = this.getSubmissions();
      const s1 = subs.find((s: any) => s.week === 1);
      if (s1 && s1.status === 'Approved') return true;
    }

    return false;
  },

  isSubmissionApproved(subNumber: number, teamId?: string): boolean {
    if (subNumber === 1) return this.isSubmission1Approved(teamId);
    if (subNumber < 1 || subNumber > 4) return false;

    const currentTeam = this.getTeam();
    const effectiveTeamId = (teamId || currentTeam?.id || currentTeam?.teamNo || '').trim();
    if (!effectiveTeamId) return false;

    const isStudentTeam = Boolean(currentTeam?.id && (
      effectiveTeamId.toLowerCase() === currentTeam.id.toLowerCase() || 
      effectiveTeamId.toLowerCase() === (currentTeam.teamNo || '').toLowerCase()
    ));

    const marks = MarksService.getWeeklyMarks(effectiveTeamId, subNumber);
    if (marks && ((marks.teamAverage !== undefined && marks.teamAverage > 0) || (marks.memberMarks && Object.values(marks.memberMarks).some(m => typeof m === 'number' && m > 0)))) {
      return true;
    }

    if (isStudentTeam) {
      const subs = this.getSubmissions();
      const sub = subs.find(s => s.week === subNumber);
      if (sub && (sub.status === 'Approved' || (typeof sub.score === 'number' && sub.score > 0))) return true;
    }

    return false;
  },

  getTeamActiveSubmissionNumber(teamId?: string): number {
    const currentTeam = this.getTeam();
    const tId = teamId || currentTeam?.id || '';
    if (!this.isSubmissionApproved(1, tId)) return 1;
    if (!this.isSubmissionApproved(2, tId)) return 2;
    if (!this.isSubmissionApproved(3, tId)) return 3;
    return 4;
  },

  normalizeWeekSlug(weekText: string): string {
    const lower = (weekText || '').trim().toLowerCase();
    if (lower === 'week 0' || lower === 'week_0' || lower === 'submission 0' || lower === 'submission_0') {
      return '';
    }

    if (lower === 'week 1' || lower === 'week_1' || lower === 'submission 1' || lower === 'submission_1') {
      return 'submission_1';
    }
    if (lower === 'week 2' || lower === 'week_2' || lower === 'submission 2' || lower === 'submission_2') {
      return 'submission_2';
    }
    if (lower === 'week 3' || lower === 'week_3' || lower === 'submission 3' || lower === 'submission_3') {
      return 'submission_3';
    }
    if (lower === 'week 4' || lower === 'week_4' || lower === 'submission 4' || lower === 'submission_4') {
      return 'submission_4';
    }

    const match = lower.match(/(?:submission|week)[_\s-]*(\d+)/);
    if (match) {
      const parsedNum = parseInt(match[1], 10);
      if (parsedNum >= 1 && parsedNum <= 4) {
        return `submission_${parsedNum}`;
      }
      return '';
    }

    const directNum = parseInt(lower, 10);
    if (!isNaN(directNum) && directNum >= 1 && directNum <= 4) {
      return `submission_${directNum}`;
    }

    return '';
  },

  getDeliverables(weekText: string, _teamIdOverride?: string): StudentDeliverableState {
    const team = this.getTeam();
    const cleanTitle = team.projectTitle || team.submittedTitle || '';
    return {
      week: weekText,
      projectTitle: cleanTitle,
      isTitleApproved: Boolean(team.isTitleApproved),
      problemStatement: team.problemStatement || '',
      solution: team.proposedSolution || '',
      technologyUsed: '',
      obstaclesFaced: '',
      abstract: team.abstract || '',
      presentationFile: '',
      reportFile: '',
      repoUrl: team.repoUrl || '',
      demoUrl: team.demoUrl || '',
      screenshotFile: '',
      submittedFields: {
        title: Boolean(cleanTitle),
        problemStatement: Boolean(team.problemStatement),
        solution: Boolean(team.proposedSolution),
        technologyUsed: false,
        obstaclesFaced: false,
        abstract: Boolean(team.abstract),
        presentation: false,
        report: false,
        repoUrl: Boolean(team.repoUrl),
        demoUrl: Boolean(team.demoUrl),
        screenshot: false
      }
    };
  }
};

export default StudentService;
