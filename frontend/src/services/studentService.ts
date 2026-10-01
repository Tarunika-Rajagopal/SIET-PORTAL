import { Team, WeeklySubmission, ReviewScore, ChecklistState, Announcement, GuideNotice } from '../types';
import { ApiClient } from './apiClient';
import { MarksService } from './marksService';
import { AuthService } from './authService';

// Purge any stale legacy cache from previous revisions
try {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('siet_student_submissions_v') ||
      key.startsWith('siet_deliverable_v') ||
      key.startsWith('siet_student_team_v') ||
      key.startsWith('siet_guide_portal_teams_v') ||
      key.startsWith('siet_guide_portal_activities_v')
    )) {
      if (!key.includes('_v6')) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
} catch (e) { }

const TEAM_STORAGE_KEY = "siet_student_team_v6";
const SUBMISSIONS_STORAGE_KEY = "siet_student_submissions_v6";

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

// Helper to scope team storage key dynamically to prevent cross-team contamination
function getTeamStorageKey(teamId?: string): string {
  const user = AuthService.getCurrentUser();
  const rawId = (teamId || user?.teamId || user?.teamNo || '').trim();
  const cleanId = rawId ? rawId.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'unassigned';
  return `siet_student_team_v6_${cleanId}`;
}

// Helper to scope student submissions storage key dynamically to prevent cross-team contamination
function getSubmissionsStorageKey(teamId?: string): string {
  const user = AuthService.getCurrentUser();
  const rawId = (teamId || user?.teamId || user?.teamNo || '').trim();
  const cleanId = rawId ? rawId.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'unassigned';
  return `siet_student_submissions_v6_${cleanId}`;
}

// Build a default team object from the authenticated user's profile instead of hardcoding Team 04.
// This ensures the fallback always matches the logged-in student's actual team assignment.
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

export const StudentService = {
  getCurrentAcademicWeek(): number {
    // Academic semester Week 0 began Sunday, September 13, 2026.
    // Each Sunday rolls over to the next academic week automatically (Week 0, Week 1, Week 2, ...).
    const semesterStart = new Date(2026, 8, 13); // September 13, 2026 (Month 8 is September in JS 0-indexed)
    const now = new Date();
    const diffTime = now.getTime() - semesterStart.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7);
    return Math.max(0, Math.min(16, weekNumber));
  },

  getTeam(): StudentTeamExtended {
    const currentUser = AuthService.getCurrentUser();
    let team: StudentTeamExtended = buildDefaultTeamFromUser();
    try {
      const scopedKey = getTeamStorageKey(currentUser?.teamId);
      const stored = localStorage.getItem(scopedKey) || localStorage.getItem(TEAM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure cached team belongs to the authenticated student
        const isMatch = currentUser && (
          (currentUser.teamId && parsed.id === currentUser.teamId) ||
          (currentUser.teamNo && parsed.teamNo === currentUser.teamNo)
        );
        if (isMatch) {
          team = parsed;
        }
      }
    } catch (e) { }

    if (team.isTitleApproved) {
      if (!team.projectTitle || team.projectTitle === 'No Title Submitted' || team.projectTitle === 'Title Approval Pending') {
        try {
          const d1Key = this.getDeliverableKey('Submission 1', team.id);
          const d1 = localStorage.getItem(d1Key);
          if (d1) {
            const p1 = JSON.parse(d1);
            if (p1?.projectTitle && p1.projectTitle.trim()) {
              team.projectTitle = p1.projectTitle.trim();
              team.submittedTitle = p1.projectTitle.trim();
            }
          }
        } catch (e) { }
      }
    }

    return team;
  },

  async fetchWeekReleases(): Promise<Record<string, boolean>> {
    try {
      const res = await ApiClient.getStudentWeekReleases();
      if (res && res.releases) {
        try {
          localStorage.setItem('siet_week_release_status', JSON.stringify(res.releases));
        } catch (e) { }
        return res.releases;
      }
    } catch (e) {
      console.warn('[StudentService] fetchWeekReleases network failure, using cache:', e);
    }
    try {
      const cached = localStorage.getItem('siet_week_release_status');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return { '1': true };
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

    // 3. Check members array
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

  saveTeam(team: StudentTeamExtended): void {
    if (!team) return;
    const scopedKey = getTeamStorageKey(team.id);
    localStorage.setItem(scopedKey, JSON.stringify(team));
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    window.dispatchEvent(new Event('siet_data_updated'));
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
    const currentUser = AuthService.getCurrentUser();
    const scopedKey = getSubmissionsStorageKey(currentUser?.teamId);
    try {
      const stored = localStorage.getItem(scopedKey) || localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          let isGuideApproved = false;
          try {
            const teamKey = getTeamStorageKey(currentUser?.teamId);
            const tRaw = localStorage.getItem(teamKey) || localStorage.getItem(TEAM_STORAGE_KEY);
            if (tRaw) {
              const parsedT = JSON.parse(tRaw);
              isGuideApproved = Boolean(parsedT?.isTitleApproved || parsedT?.guideApprovalStatus === 'Approved');
            }
          } catch (e) { }

          return parsed.filter((sub: any) => Boolean(sub && typeof sub === 'object')).map((sub: any) => {
            if (sub.week === 0 && isGuideApproved && (sub.status === 'Submitted' || sub.status === 'Pending' || !sub.status)) {
              return { ...sub, status: 'Approved' as const };
            }
            return sub;
          });
        }
      }
    } catch (e) { }
    return DEFAULT_COMPLETED_WEEKS;
  },

  saveSubmissions(submissions: WeeklySubmission[], teamIdOverride?: string): void {
    const currentUser = AuthService.getCurrentUser();
    const scopedKey = getSubmissionsStorageKey(teamIdOverride || currentUser?.teamId);
    try {
      localStorage.setItem(scopedKey, JSON.stringify(submissions));
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
    } catch (e) {}
    window.dispatchEvent(new Event('siet_data_updated'));
  },



  isSubmission1Approved(teamId?: string): boolean {
    if (!teamId) return false;
    const tId = teamId.trim();
    const currentTeam = this.getTeam();
    const isStudentTeam = Boolean(currentTeam?.id && (tId === currentTeam.id || tId === currentTeam.teamNo));

    if (isStudentTeam) {
      if (currentTeam.isTitleApproved || currentTeam.guideApprovalStatus === 'Approved') return true;
      try {
        const scopedKey = getTeamStorageKey(tId);
        const stored = localStorage.getItem(scopedKey) || localStorage.getItem(TEAM_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.isTitleApproved || parsed.guideApprovalStatus === 'Approved')) return true;
        }
      } catch (e) { }
    }

    const marks = MarksService.getWeeklyMarks(tId, 1);
    if (marks && (marks.teamAverage > 0 || (marks.memberMarks && Object.keys(marks.memberMarks).length > 0))) {
      return true;
    }
    const marks0 = MarksService.getWeeklyMarks(tId, 0);
    if (marks0 && (marks0.teamAverage > 0 || (marks0.memberMarks && Object.keys(marks0.memberMarks).length > 0))) {
      return true;
    }

    if (isStudentTeam) {
      const subs = this.getSubmissions();
      const s0 = subs.find((s: any) => s.week === 0 || s.week === 1);
      if (s0 && s0.status === 'Approved') return true;
    }

    return false;
  },

  isSubmissionApproved(subNumber: number, teamId?: string): boolean {
    if (subNumber === 1) return this.isSubmission1Approved(teamId);
    if (!teamId) return false;

    const tId = teamId.trim();
    const currentTeam = this.getTeam();
    const isStudentTeam = Boolean(currentTeam?.id && (tId === currentTeam.id || tId === currentTeam.teamNo));
    const weekIndex = subNumber - 1;

    const marks = MarksService.getWeeklyMarks(tId, subNumber) ||
      MarksService.getWeeklyMarks(tId, weekIndex);
    if (marks && (marks.teamAverage > 0 || (marks.memberMarks && Object.keys(marks.memberMarks).length > 0))) {
      return true;
    }

    if (isStudentTeam) {
      const subs = this.getSubmissions();
      const sub = subs.find(s => s.week === weekIndex || s.week === subNumber);
      if (sub && sub.status === 'Approved') return true;
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
    if (lower === 'week 0' || lower === 'week_0' || lower === 'submission 1' || lower === 'submission_1') {
      return 'submission_1';
    }
    if (lower === 'week 1' || lower === 'week_1' || lower === 'submission 2' || lower === 'submission_2') {
      return 'submission_2';
    }
    if (lower === 'week 2' || lower === 'week_2' || lower === 'submission 3' || lower === 'submission_3') {
      return 'submission_3';
    }
    if (lower === 'week 3' || lower === 'week_3' || lower === 'submission 4' || lower === 'submission_4') {
      return 'submission_4';
    }
    if (lower.startsWith('week ')) {
      const num = parseInt(lower.replace('week ', ''), 10);
      if (!isNaN(num)) return `submission_${num + 1}`;
    }
    if (lower.startsWith('submission ')) {
      const num = parseInt(lower.replace('submission ', ''), 10);
      if (!isNaN(num)) return `submission_${num}`;
    }
    return lower.replace(/\s+/g, '_');
  },

  getDeliverableKey(weekText: string, teamIdOverride?: string): string {
    const user = AuthService.getCurrentUser();
    const rawId = (teamIdOverride || user?.teamId || user?.teamNo || '').trim();
    const cleanId = rawId ? rawId.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'unassigned';
    const weekSlug = this.normalizeWeekSlug(weekText);
    return `siet_deliverable_v6_${cleanId}_${weekSlug}`;
  },

  clearDeliverables(weekText: string, teamIdOverride?: string): void {
    const key = this.getDeliverableKey(weekText, teamIdOverride);
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },

  getDeliverables(weekText: string, teamIdOverride?: string): StudentDeliverableState {
    const key = this.getDeliverableKey(weekText, teamIdOverride);
    let loadedState: StudentDeliverableState | null = null;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        loadedState = JSON.parse(stored);
      }
    } catch (e) { }

    const defaultState: StudentDeliverableState = loadedState || {
      week: weekText,
      projectTitle: "",
      isTitleApproved: false,
      problemStatement: "",
      solution: "",
      technologyUsed: "",
      obstaclesFaced: "",
      abstract: "",
      presentationFile: "",
      reportFile: "",
      repoUrl: "",
      demoUrl: "",
      screenshotFile: "",
      submittedFields: {
        title: false,
        problemStatement: false,
        solution: false,
        technologyUsed: false,
        obstaclesFaced: false,
        abstract: false,
        presentation: false,
        report: false,
        repoUrl: false,
        demoUrl: false,
        screenshot: false
      }
    };

    // Project Title is shared across milestones; deliverable fields remain milestone-independent
    const isSubAfter1 =
      weekText.toLowerCase().includes('submission 2') ||
      weekText.toLowerCase().includes('submission 3') ||
      weekText.toLowerCase().includes('submission 4') ||
      weekText.toLowerCase().includes('week 1') ||
      weekText.toLowerCase().includes('week 2') ||
      weekText.toLowerCase().includes('week 3');

    if (isSubAfter1) {
      let currentSubNum = 2;
      const match = weekText.match(/\d+/);
      if (match) {
        currentSubNum = weekText.toLowerCase().includes('week') ? parseInt(match[0], 10) + 1 : parseInt(match[0], 10);
      }

      const team = this.getTeam();
      const currentTeamId = teamIdOverride || team?.id;
      let latestTitle = '';

      for (let sNum = 1; sNum < currentSubNum; sNum++) {
        if (this.isSubmissionApproved(sNum, currentTeamId)) {
          const dPrevKey = this.getDeliverableKey(`Submission ${sNum}`, currentTeamId);
          let dPrev: any = null;
          try {
            const rawPrev = localStorage.getItem(dPrevKey);
            if (rawPrev) dPrev = JSON.parse(rawPrev);
          } catch (e) { }

          const t = dPrev?.projectTitle || (sNum === 1 ? (team.projectTitle || team.submittedTitle) : '');
          if (t && t.trim() && t !== 'No Title Submitted' && t !== 'Title Approval Pending') latestTitle = t.trim();
        }
      }

      if (!latestTitle) {
        const teamT = (team?.projectTitle || team?.submittedTitle || '').trim();
        if (teamT && teamT !== 'No Title Submitted' && teamT !== 'Title Approval Pending') latestTitle = teamT;
      }

      if (latestTitle && !defaultState.projectTitle) {
        defaultState.projectTitle = latestTitle;
        defaultState.isTitleApproved = true;
      }
    }

    return defaultState;
  },

  saveAllDeliverables(
    weekText: string,
    data: {
      projectTitle?: string;
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
      submissionDate?: string;
    },
    teamIdOverride?: string
  ): StudentDeliverableState {
    const key = this.getDeliverableKey(weekText, teamIdOverride);
    const current = this.getDeliverables(weekText, teamIdOverride);

    if (data.projectTitle !== undefined) {
      current.projectTitle = data.projectTitle;
      current.submittedFields.title = Boolean(data.projectTitle.trim());
      const team = this.getTeam();
      team.submittedTitle = data.projectTitle;
      team.projectTitle = data.projectTitle;
      if (!this.isSubmission1Approved()) {
        team.isTitleApproved = false;
        team.guideApprovalStatus = 'Pending Review';
        current.isTitleApproved = false;
      } else {
        team.isTitleApproved = true;
        team.guideApprovalStatus = 'Approved';
        current.isTitleApproved = true;
      }
      this.saveTeam(team);
    }
    if (data.problemStatement !== undefined) {
      current.problemStatement = data.problemStatement;
      current.submittedFields.problemStatement = Boolean(data.problemStatement.trim());
    }
    if (data.solution !== undefined) {
      current.solution = data.solution;
      current.submittedFields.solution = Boolean(data.solution.trim());
    }
    if (data.technologyUsed !== undefined) {
      current.technologyUsed = data.technologyUsed;
      current.submittedFields.technologyUsed = Boolean(data.technologyUsed.trim());
    }
    if (data.obstaclesFaced !== undefined) {
      current.obstaclesFaced = data.obstaclesFaced;
      current.submittedFields.obstaclesFaced = Boolean(data.obstaclesFaced.trim());
    }
    if (data.abstract !== undefined) {
      current.abstract = data.abstract;
      current.submittedFields.abstract = Boolean(data.abstract.trim());
    }
    if (data.presentationFile !== undefined) {
      current.presentationFile = data.presentationFile;
      current.submittedFields.presentation = Boolean(data.presentationFile.trim());
    }
    if (data.reportFile !== undefined) {
      current.reportFile = data.reportFile;
      current.submittedFields.report = Boolean(data.reportFile.trim());
    }
    if (data.repoUrl !== undefined) {
      current.repoUrl = data.repoUrl;
      current.submittedFields.repoUrl = Boolean(data.repoUrl.trim());
    }
    if (data.demoUrl !== undefined) {
      current.demoUrl = data.demoUrl;
      current.submittedFields.demoUrl = Boolean(data.demoUrl.trim());
    }
    if (data.screenshotFile !== undefined) {
      current.screenshotFile = data.screenshotFile;
      current.submittedFields.screenshot = Boolean(data.screenshotFile.trim());
    }

    localStorage.setItem(key, JSON.stringify(current));

    let weekNum = 0;
    let submissionNum = 1;
    if (weekText.toLowerCase().includes('submission')) {
      const match = weekText.match(/\d+/);
      const subNum = match ? parseInt(match[0], 10) : 1;
      submissionNum = subNum;
      weekNum = Math.max(0, subNum - 1);
    } else {
      const match = weekText.match(/\d+/);
      const w = match ? parseInt(match[0], 10) : 0;
      submissionNum = w === 0 ? 1 : w + 1;
      weekNum = w;
    }

    // 1. Synchronize to submissions ledger
    try {
      const list = this.getSubmissions();
      let item = list.find(s => s.week === weekNum || s.week === submissionNum);
      const subDate = data.submissionDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!item) {
        item = {
          week: weekNum,
          title: `Submission ${weekNum + 1} Deliverable Submission`,
          dueDate: `Submission ${weekNum + 1}`,
          status: 'Submitted',
          submissionDate: subDate,
          projectTitle: current.projectTitle || this.getTeam().projectTitle || '',
          problemStatement: current.problemStatement,
          solution: current.solution,
          technologyUsed: current.technologyUsed,
          obstaclesFaced: current.obstaclesFaced,
          abstract: current.abstract,
          presentationFile: current.presentationFile,
          pdfFile: current.reportFile,
          fileName: current.presentationFile || current.reportFile,
          repoUrl: current.repoUrl,
          demoUrl: current.demoUrl,
          screenshotFile: current.screenshotFile,
          guideName: this.getTeam().guideName || ''
        };
        list.push(item);
      } else {
        item.status = 'Submitted';
        item.submissionDate = subDate;
        if (current.projectTitle) item.projectTitle = current.projectTitle;
        if (current.problemStatement) item.problemStatement = current.problemStatement;
        if (current.solution) item.solution = current.solution;
        if (current.technologyUsed) item.technologyUsed = current.technologyUsed;
        if (current.obstaclesFaced) item.obstaclesFaced = current.obstaclesFaced;
        if (current.abstract) item.abstract = current.abstract;
        if (current.presentationFile) { item.presentationFile = current.presentationFile; item.fileName = current.presentationFile; }
        if (current.reportFile) item.pdfFile = current.reportFile;
        if (current.repoUrl) item.repoUrl = current.repoUrl;
        if (current.demoUrl) item.demoUrl = current.demoUrl;
        if (current.screenshotFile) item.screenshotFile = current.screenshotFile;
      }
      this.saveSubmissions(list);
    } catch (e) {
      console.error(e);
    }

    ApiClient.submitStudentDeliverables(submissionNum, {
      problemStatement: current.problemStatement,
      solution: current.solution,
      technologyUsed: current.technologyUsed,
      obstaclesFaced: current.obstaclesFaced,
      abstract: current.abstract,
      repoUrl: current.repoUrl,
      demoUrl: current.demoUrl,
      isSubmit: true
    }).catch(() => { });

    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));

    return current;
  },

  saveDeliverableField(
    weekText: string,
    field: keyof StudentDeliverableState['submittedFields'],
    value: string
  ): StudentDeliverableState {
    const key = this.getDeliverableKey(weekText);
    const current = this.getDeliverables(weekText);

    if (field === 'title') {
      current.projectTitle = value;
      const team = this.getTeam();
      team.submittedTitle = value;
      team.projectTitle = value;
      team.isTitleApproved = false;
      team.guideApprovalStatus = 'Pending Review';
      this.saveTeam(team);
      current.isTitleApproved = false;

      // Also trigger backend title update
      ApiClient.getStudentTeam().then(backendTeam => {
        if (backendTeam?.id) {
          ApiClient.updateProjectTitle(backendTeam.id, value).catch(() => { });
        }
      }).catch(() => { });
    } else if (field === 'problemStatement') {
      current.problemStatement = value;
    } else if (field === 'solution') {
      current.solution = value;
    } else if (field === 'technologyUsed') {
      current.technologyUsed = value;
    } else if (field === 'obstaclesFaced') {
      current.obstaclesFaced = value;
    } else if (field === 'abstract') {
      current.abstract = value;
    } else if (field === 'presentation') {
      current.presentationFile = value;
    } else if (field === 'report') {
      current.reportFile = value;
    } else if (field === 'repoUrl') {
      current.repoUrl = value;
    } else if (field === 'demoUrl') {
      current.demoUrl = value;
    } else if (field === 'screenshot') {
      current.screenshotFile = value;
    }

    current.submittedFields[field] = true;
    localStorage.setItem(key, JSON.stringify(current));

    // Extract week index: Submission 1 -> 0, Submission 2 -> 1, Week 0 -> 0, Week 1 -> 1
    let weekNum = 0;
    if (weekText.toLowerCase().includes('submission')) {
      const match = weekText.match(/\d+/);
      const subNum = match ? parseInt(match[0], 10) : 1;
      weekNum = Math.max(0, subNum - 1);
    } else {
      const match = weekText.match(/\d+/);
      weekNum = match ? parseInt(match[0], 10) : 0;
    }

    // 1. Synchronize to student's submissions ledger
    try {
      const list = this.getSubmissions();
      let item = list.find(s => s.week === weekNum);
      if (!item) {
        item = {
          week: weekNum,
          title: `Submission ${weekNum + 1} Deliverable Submission`,
          dueDate: `Submission ${weekNum + 1}`,
          status: 'Submitted',
          submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          projectTitle: current.projectTitle || this.getTeam().projectTitle || '',
          problemStatement: current.problemStatement,
          solution: current.solution,
          technologyUsed: current.technologyUsed,
          obstaclesFaced: current.obstaclesFaced,
          abstract: current.abstract,
          presentationFile: current.presentationFile,
          pdfFile: current.reportFile,
          fileName: current.presentationFile || current.reportFile,
          repoUrl: current.repoUrl,
          demoUrl: current.demoUrl,
          screenshotFile: current.screenshotFile,
          guideName: this.getTeam().guideName || ''
        };
        list.push(item);
      } else {
        item.status = 'Submitted';
        item.submissionDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        if (field === 'title') item.projectTitle = value;
        if (field === 'problemStatement') item.problemStatement = value;
        if (field === 'solution') item.solution = value;
        if (field === 'technologyUsed') item.technologyUsed = value;
        if (field === 'obstaclesFaced') item.obstaclesFaced = value;
        if (field === 'abstract') item.abstract = value;
        if (field === 'presentation') { item.presentationFile = value; item.fileName = value; }
        if (field === 'report') { item.pdfFile = value; }
        if (field === 'repoUrl') item.repoUrl = value;
        if (field === 'demoUrl') item.demoUrl = value;
        if (field === 'screenshot') item.screenshotFile = value;
      }
      this.saveSubmissions(list);
    } catch (e) {
      console.error('Error saving submission ledger:', e);
    }

    try {
      const studentTeam = this.getTeam();
      if (studentTeam.guideApprovalStatus === 'Rejected') {
        studentTeam.guideApprovalStatus = 'Pending';
        studentTeam.rejectionReason = '';
        this.saveTeam(studentTeam);
      }
    } catch (e) { }

    // 2. Send asynchronous API call to Backend
    ApiClient.submitStudentDeliverables(weekNum, {
      problemStatement: current.problemStatement,
      solution: current.solution,
      technologyUsed: current.technologyUsed,
      obstaclesFaced: current.obstaclesFaced,
      abstract: current.abstract,
      repoUrl: current.repoUrl,
      demoUrl: current.demoUrl,
      isSubmit: true
    }).catch(err => {
      console.error('Backend sync queued or offline:', err);
    });

    // 4. Dispatch global events for instant UI synchronization across tabs and pages
    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));

    return current;
  },

  async updateSubmission(weekNumber: number, updatedComments: string): Promise<boolean> {
    const list = this.getSubmissions();
    const item = list.find(s => s.week === weekNumber);
    if (!item) return false;

    item.status = 'Submitted';
    item.submissionDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    item.comments = `Updated: ${updatedComments}`;
    this.saveSubmissions(list);

    // Call backend
    await ApiClient.submitStudentDeliverables(weekNumber, {
      isSubmit: true
    }).catch(() => { });

    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));
    return true;
  },

  deleteSubmission(weekNumber: number): boolean {
    try {
      const team = this.getTeam();

      // 1. Remove from submissions list
      const list = this.getSubmissions().filter(s => s.week !== weekNumber);
      this.saveSubmissions(list);

      // 2. Clear deliverable state for that week
      this.clearDeliverables(`Week ${weekNumber}`, team.id);
      this.clearDeliverables(`Submission ${weekNumber + 1}`, team.id);

      // 3. Reset title & status in student team
      team.projectTitle = '';
      team.submittedTitle = '';
      team.isTitleApproved = false;
      team.guideApprovalStatus = 'Pending Review';
      this.saveTeam(team);

      // 4. Reset marks across all portals so marks become unassigned
      try {
        const memberRollNos = team?.members?.map(m => m.rollNo) || [];
        MarksService.deleteWeeklyMarks(team.id, weekNumber, memberRollNos);
      } catch (e) { }

      // 5. Asynchronous call to backend to delete submission
      ApiClient.deleteStudentSubmission(weekNumber).catch(() => { });

      // 6. Global event dispatch
      window.dispatchEvent(new Event('siet_data_updated'));
      window.dispatchEvent(new Event('siet_marks_updated'));
      window.dispatchEvent(new Event('storage'));
      return true;
    } catch (e) {
      console.error('Error deleting submission:', e);
      return false;
    }
  },

  /** Clears ALL submissions and deliverable data across all portals */
  clearAllSubmissions(): void {
    // Clear submissions list
    this.saveSubmissions([]);

    // Clear all deliverable keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('siet_deliverable_v6_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Reset team data
    const team = this.getTeam();
    team.projectTitle = '';
    team.submittedTitle = '';
    team.isTitleApproved = false;
    team.guideApprovalStatus = 'Pending Review';
    team.progress = 0;
    this.saveTeam(team);

    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));
  },

  attachGuideNotice(weekNumber: number, notice: GuideNotice): void {
    try {
      const list = this.getSubmissions();
      let item = list.find(s => s.week === weekNumber);
      if (!item) {
        item = {
          week: weekNumber,
          title: `Week ${weekNumber} Deliverable Submission`,
          dueDate: `Week ${weekNumber}`,
          status: 'Pending',
          guideNotice: notice,
          guideName: this.getTeam().guideName || ''
        };
        list.push(item);
      } else {
        item.guideNotice = notice;
      }
      this.saveSubmissions(list);
      window.dispatchEvent(new Event('siet_data_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error attaching guide notice:', e);
    }
  }
};

