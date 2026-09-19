import { Team, WeeklySubmission, ReviewScore, ChecklistState, Announcement, GuideNotice } from '../types';
import { ApiClient } from './apiClient';
import { INITIAL_TEAMS } from '../data/guidePortalData';
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

  // Purge any legacy mock submissions from v6 storage (only purge explicit mock titles)
  const guideRaw = localStorage.getItem("siet_guide_portal_teams_v6");
  if (guideRaw) {
    const guideTeams = JSON.parse(guideRaw);
    if (Array.isArray(guideTeams)) {
      let cleaned = false;
      guideTeams.forEach((t: any) => {
        if (t.teamId !== 'TEAM-CSE-Y3-B04' && t.teamNumber !== 4) {
          const isMockTitle = (
            t.projectTitle === 'Wildfire Prediction Mesh Network' || 
            t.projectTitle === 'Automated Legal Document Summarizer' || 
            t.projectTitle === 'Autonomous Solar Panel Cleaning Drone'
          );
          if (isMockTitle) {
            t.submissions = [];
            t.projectTitle = '';
            t.problemStatement = '';
            t.proposedSolution = '';
            t.technologiesUsed = [];
            t.githubUrl = '';
            t.liveDemoUrl = '';
            t.abstract = '';
            t.titleStatus = 'Pending';
            cleaned = true;
          }
        }
      });
      if (cleaned) {
        localStorage.setItem("siet_guide_portal_teams_v6", JSON.stringify(guideTeams));
      }
    }
  }
} catch (e) {}

const TEAM_STORAGE_KEY = "siet_student_team_v6";
const SUBMISSIONS_STORAGE_KEY = "siet_student_submissions_v6";
const GUIDE_TEAMS_STORAGE_KEY = "siet_guide_portal_teams_v6";

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
  isTitleApproved: boolean;
  guideApprovalStatus: 'Approved' | 'Pending Review' | 'Pending' | 'Revision Required' | 'Rejected';
  rejectionReason?: string;
}

export const DEFAULT_STUDENT_TEAM: StudentTeamExtended = {
  id: "TEAM-CSE-Y3-B04",
  teamNo: "Team 04",
  projectTitle: "",
  submittedTitle: "",
  isTitleApproved: false,
  guideApprovalStatus: "Pending Review",
  guideName: "Dr. P. Manimegalai",
  advisorName: "Dr. R. Karthikeyan",
  batch: "2023-2027 (III Year)",
  section: "CSE-B",
  status: "In Progress",
  progress: 0,
  members: [
    { rollNo: "714023104112", name: "Tarunika Rajgopal", email: "student@srishakthi.ac.in", role: "Team Lead" },
    { rollNo: "714023104178", name: "Vigneshwaran M", email: "vigneshwaran.m@srishakthi.ac.in", role: "Team Member" },
    { rollNo: "714023104189", name: "Vishnu Priya S", email: "vishnupriya.s@srishakthi.ac.in", role: "Team Member" },
    { rollNo: "714023104066", name: "Kavitha R", email: "kavitha.r@srishakthi.ac.in", role: "Team Member" }
  ]
};

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
    let team: StudentTeamExtended = DEFAULT_STUDENT_TEAM;
    try {
      const stored = localStorage.getItem(TEAM_STORAGE_KEY);
      if (stored) team = JSON.parse(stored);
    } catch (e) {}

    // Check if the current user belongs to another class team in advisor records
    try {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser && team?.members && !team.members.some((m: any) =>
        (currentUser.rollNo && m.rollNo && m.rollNo.trim().toLowerCase() === currentUser.rollNo.trim().toLowerCase()) ||
        (currentUser.email && m.email && m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
      )) {
        const className = currentUser.class || 'CSE-B';
        const advRaw = localStorage.getItem(`siet_advisor_teams_${className}`);
        if (advRaw) {
          const advTeams = JSON.parse(advRaw);
          if (Array.isArray(advTeams)) {
            const matched = advTeams.find((t: any) => Array.isArray(t.members) && t.members.some((m: any) =>
              (currentUser.rollNo && m.rollNo && m.rollNo.trim().toLowerCase() === currentUser.rollNo.trim().toLowerCase()) ||
              (currentUser.email && m.email && m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
            ));
            if (matched) {
              team = {
                id: matched.teamId,
                teamNo: matched.teamNo,
                projectTitle: matched.title || '',
                submittedTitle: matched.title || '',
                isTitleApproved: matched.status === 'Approved' || matched.status === 'Active & Approved',
                guideApprovalStatus: (matched.status === 'Approved' || matched.status === 'Active & Approved') ? 'Approved' : 'Pending Review',
                guideName: matched.guide || 'Dr. P. Manimegalai',
                advisorName: currentUser.advisorName || 'Dr. R. Karthikeyan',
                batch: matched.batch || '2023-2027 (III Year)',
                section: matched.class || className,
                status: 'In Progress',
                progress: 0,
                members: matched.members.map((m: any) => ({
                  rollNo: m.rollNo,
                  name: m.name,
                  email: m.email,
                  role: m.isLead ? 'Team Lead' : 'Team Member'
                }))
              };
            }
          }
        }
      }
    } catch (e) {}

    // Check if Guide has approved title or submission 1 without calling this.isSubmission1Approved()
    if (team.isTitleApproved || team.guideApprovalStatus === 'Approved') {
      return team;
    }

    try {
      const rawGuide = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
      if (rawGuide) {
        const guideTeams = JSON.parse(rawGuide);
        const gt = guideTeams.find((t: any) => t.teamId === team.id || t.id === team.id || t.teamNumber === 4);
        if (gt) {
          if (gt.titleStatus === 'Approved' || gt.titleLocked === true) {
            team.isTitleApproved = true;
            team.guideApprovalStatus = 'Approved';
          } else if (gt.submissions && gt.submissions[0]) {
            const s0 = gt.submissions[0];
            if (s0.evaluationStatus === 'Approved' || s0.status === 'Approved') {
              team.isTitleApproved = true;
              team.guideApprovalStatus = 'Approved';
            }
          }
        }
      }
    } catch (e) {}

    if (team.isTitleApproved) {
      if (!team.projectTitle || team.projectTitle === 'No Title Submitted' || team.projectTitle === 'Title Approval Pending') {
        try {
          const d1 = localStorage.getItem('siet_deliverable_v6_submission_1');
          if (d1) {
            const p1 = JSON.parse(d1);
            if (p1?.projectTitle && p1.projectTitle.trim()) {
              team.projectTitle = p1.projectTitle.trim();
              team.submittedTitle = p1.projectTitle.trim();
            }
          }
        } catch (e) {}
      }
    }

    return team;
  },

  isCurrentUserTeamLead(teamToCheck?: Team | StudentTeamExtended): boolean {
    const user = AuthService.getCurrentUser();
    if (!user) return false;

    const team = teamToCheck || this.getTeam();
    if (!team || !Array.isArray(team.members) || team.members.length === 0) {
      return false;
    }

    const userRoll = (user.rollNo || '').trim().toLowerCase();
    const userEmail = (user.email || '').trim().toLowerCase();

    const member = team.members.find((m: any) => {
      const mRoll = (m.rollNo || '').trim().toLowerCase();
      const mEmail = (m.email || '').trim().toLowerCase();
      if (userRoll && mRoll && userRoll === mRoll) return true;
      if (userEmail && mEmail && userEmail === mEmail) return true;
      return false;
    });

    if (!member) return false;

    return Boolean(
      (member as any).isLead ||
      (member as any).isLeader ||
      (member.role && member.role.toLowerCase().includes('lead'))
    );
  },

  getTeamLead(teamToCheck?: Team | StudentTeamExtended): any {
    const team = teamToCheck || this.getTeam();
    if (!team || !Array.isArray(team.members)) return undefined;
    return team.members.find((m: any) =>
      (m as any).isLead ||
      (m as any).isLeader ||
      (m.role && m.role.toLowerCase().includes('lead'))
    );
  },

  saveTeam(team: StudentTeamExtended): void {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    window.dispatchEvent(new Event('siet_data_updated'));
  },

  getSubmissions(): WeeklySubmission[] {
    try {
      const stored = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          let isGuideApproved = false;
          try {
            const tRaw = localStorage.getItem(TEAM_STORAGE_KEY);
            if (tRaw) {
              const parsedT = JSON.parse(tRaw);
              isGuideApproved = Boolean(parsedT?.isTitleApproved || parsedT?.guideApprovalStatus === 'Approved');
            }
          } catch (e) {}

          return parsed.filter((sub: any) => {
            if (!sub || typeof sub !== 'object') return false;
            if (sub.presentationFile === 'mock_ppt_w0' || sub.presentationFile === 'Week0_Topic_Feasibility_Tarunika.pptx') return false;
            if (sub.title === 'Topic Finalization & Feasibility Defense') return false;
            return true;
          }).map((sub: any) => {
            if (sub.week === 0 && isGuideApproved && (sub.status === 'Submitted' || sub.status === 'Pending' || !sub.status)) {
              return { ...sub, status: 'Approved' as const };
            }
            return sub;
          });
        }
      }
    } catch (e) {}
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_COMPLETED_WEEKS));
    return DEFAULT_COMPLETED_WEEKS;
  },

  saveSubmissions(submissions: WeeklySubmission[]): void {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
    window.dispatchEvent(new Event('siet_data_updated'));
  },

  isSubmission1Approved(teamId?: string): boolean {
    const tId = teamId || 'TEAM-CSE-Y3-B04';
    try {
      const stored = localStorage.getItem(TEAM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.isTitleApproved || parsed.guideApprovalStatus === 'Approved')) return true;
      }
    } catch (e) {}

    try {
      const rawGuide = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
      if (rawGuide) {
        const guideTeams = JSON.parse(rawGuide);
        const gt = guideTeams.find((t: any) => t.teamId === tId || t.id === tId || t.teamNumber === 4);
        if (gt) {
          if (gt.titleStatus === 'Approved' || gt.titleLocked === true) return true;
          if (gt.submissions && gt.submissions[0]) {
            const s0 = gt.submissions[0];
            if (s0.evaluationStatus === 'Approved' || s0.status === 'Approved') return true;
          }
        }
      }
    } catch (e) {}

    const marks = MarksService.getWeeklyMarks(tId, 1);
    if (marks && (marks.teamAverage > 0 || (marks.memberMarks && Object.keys(marks.memberMarks).length > 0))) {
      return true;
    }
    const marks0 = MarksService.getWeeklyMarks(tId, 0);
    if (marks0 && (marks0.teamAverage > 0 || (marks0.memberMarks && Object.keys(marks0.memberMarks).length > 0))) {
      return true;
    }

    try {
      const sRaw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (sRaw) {
        const parsedS = JSON.parse(sRaw);
        if (Array.isArray(parsedS)) {
          const s0 = parsedS.find((s: any) => s.week === 0);
          if (s0 && s0.status === 'Approved') return true;
        }
      }
    } catch (e) {}

    return false;
  },

  isSubmissionApproved(subNumber: number, teamId?: string): boolean {
    if (subNumber === 1) return this.isSubmission1Approved(teamId);

    const tId = teamId || 'TEAM-CSE-Y3-B04';
    const weekIndex = subNumber - 1;

    try {
      const rawGuide = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
      if (rawGuide) {
        const guideTeams = JSON.parse(rawGuide);
        const gt = guideTeams.find((t: any) => t.teamId === tId || t.id === tId || t.teamNumber === 4);
        if (gt && gt.submissions) {
          const sub = gt.submissions.find((s: any) => s.weekNumber === weekIndex || s.submissionNumber === subNumber);
          if (sub && (sub.evaluationStatus === 'Approved' || sub.status === 'Approved')) return true;
        }
      }
    } catch (e) {}

    const marks = MarksService.getWeeklyMarks(tId, subNumber);
    if (marks && (marks.teamAverage > 0 || (marks.memberMarks && Object.keys(marks.memberMarks).length > 0))) {
      return true;
    }

    const subs = this.getSubmissions();
    const sub = subs.find(s => s.week === weekIndex);
    if (sub && sub.status === 'Approved') return true;

    return false;
  },

  getTeamActiveSubmissionNumber(teamId?: string): number {
    const tId = teamId || 'TEAM-CSE-Y3-B04';
    if (!this.isSubmissionApproved(1, tId)) return 1;
    if (!this.isSubmissionApproved(2, tId)) return 2;
    if (!this.isSubmissionApproved(3, tId)) return 3;
    return 4;
  },

  getDeliverables(weekText: string): StudentDeliverableState {
    const key = `siet_deliverable_v6_${weekText.replace(/\s+/g, '_').toLowerCase()}`;
    let loadedState: StudentDeliverableState | null = null;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        loadedState = JSON.parse(stored);
      } else {
        const wLower = weekText.toLowerCase();
        if (wLower.includes('submission 1') || wLower === 'week 0' || wLower === 'week_0') {
          const fallback = localStorage.getItem('siet_deliverable_v6_submission_1') || localStorage.getItem('siet_deliverable_v6_week_0');
          if (fallback) loadedState = JSON.parse(fallback);
        } else if (wLower.includes('submission 2') || wLower === 'week 1' || wLower === 'week_1') {
          const fallback = localStorage.getItem('siet_deliverable_v6_submission_2') || localStorage.getItem('siet_deliverable_v6_week_1');
          if (fallback) loadedState = JSON.parse(fallback);
        } else if (wLower.includes('submission 3') || wLower === 'week 2' || wLower === 'week_2') {
          const fallback = localStorage.getItem('siet_deliverable_v6_submission_3') || localStorage.getItem('siet_deliverable_v6_week_2');
          if (fallback) loadedState = JSON.parse(fallback);
        } else if (wLower.includes('submission 4') || wLower === 'week 3' || wLower === 'week_3') {
          const fallback = localStorage.getItem('siet_deliverable_v6_submission_4') || localStorage.getItem('siet_deliverable_v6_week_3');
          if (fallback) loadedState = JSON.parse(fallback);
        }
      }
    } catch (e) {}

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

    // Sequential Carryover: Title, Problem Statement, Solution are carried over once approved in prior milestones
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
      let latestTitle = '';
      let latestProblem = '';
      let latestSolution = '';

      for (let sNum = 1; sNum < currentSubNum; sNum++) {
        if (this.isSubmissionApproved(sNum)) {
          const dPrevKey = `siet_deliverable_v6_submission_${sNum}`;
          const dLegacyKey = sNum === 1 ? 'siet_deliverable_v6_week_0' : null;
          let dPrev: any = null;
          try {
            const rawPrev = localStorage.getItem(dPrevKey) || (dLegacyKey ? localStorage.getItem(dLegacyKey) : null);
            if (rawPrev) dPrev = JSON.parse(rawPrev);
          } catch (e) {}

          const t = dPrev?.projectTitle || (sNum === 1 ? (team.projectTitle || team.submittedTitle) : '');
          const p = dPrev?.problemStatement || '';
          const s = dPrev?.solution || '';
          if (t && t.trim() && t !== 'No Title Submitted' && t !== 'Title Approval Pending') latestTitle = t.trim();
          if (p && p.trim()) latestProblem = p.trim();
          if (s && s.trim()) latestSolution = s.trim();
        }
      }

      if (latestTitle && !defaultState.projectTitle) {
        defaultState.projectTitle = latestTitle;
        defaultState.isTitleApproved = true;
      }
      if (latestProblem && !defaultState.problemStatement) {
        defaultState.problemStatement = latestProblem;
      }
      if (latestSolution && !defaultState.solution) {
        defaultState.solution = latestSolution;
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
    }
  ): StudentDeliverableState {
    const key = `siet_deliverable_v6_${weekText.replace(/\s+/g, '_').toLowerCase()}`;
    const current = this.getDeliverables(weekText);

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
    if (weekText.toLowerCase().includes('submission')) {
      const match = weekText.match(/\d+/);
      const subNum = match ? parseInt(match[0], 10) : 1;
      weekNum = Math.max(0, subNum - 1);
    } else {
      const match = weekText.match(/\d+/);
      weekNum = match ? parseInt(match[0], 10) : 0;
    }

    // 1. Synchronize to submissions ledger
    try {
      const list = this.getSubmissions();
      let item = list.find(s => s.week === weekNum);
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
          guideName: this.getTeam().guideName || 'Dr. P. Manimegalai'
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

    // 2. Synchronize directly into Guide Portal
    try {
      const rawTeams = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
      let guideTeams = rawTeams ? JSON.parse(rawTeams) : [];
      if (!Array.isArray(guideTeams) || guideTeams.length === 0) {
        guideTeams = INITIAL_TEAMS;
      }
      let guideTeam = guideTeams.find((t: any) => t.teamId === 'TEAM-CSE-Y3-B04' || t.teamNumber === 4) || guideTeams[0];
      if (guideTeam) {
        if (current.projectTitle) guideTeam.projectTitle = current.projectTitle;
        if (current.problemStatement) guideTeam.problemStatement = current.problemStatement;
        if (current.solution) guideTeam.proposedSolution = current.solution;
        if (current.technologyUsed) guideTeam.technologiesUsed = current.technologyUsed.split(',').map((s: string) => s.trim());
        if (current.repoUrl) guideTeam.githubUrl = current.repoUrl;
        if (current.demoUrl) guideTeam.liveDemoUrl = current.demoUrl;
        if (current.abstract) guideTeam.abstract = current.abstract;

        if (!guideTeam.submissions) guideTeam.submissions = [];
        let sub = guideTeam.submissions.find((s: any) => s.weekNumber === weekNum);
        const isPdf = Boolean(current.presentationFile && current.presentationFile.toLowerCase().endsWith('.pdf'));
        const isPpt = Boolean(current.presentationFile && (current.presentationFile.toLowerCase().endsWith('.ppt') || current.presentationFile.toLowerCase().endsWith('.pptx')));

        if (!sub) {
          sub = {
            weekNumber: weekNum,
            submissionNumber: weekNum + 1,
            title: `Submission ${weekNum + 1}`,
            submissionDate: data.submissionDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            submissionStatus: 'Submitted On Time',
            evaluationStatus: 'Pending',
            isLocked: false,
            guideRemarks: '',
            abstractSummary: current.abstract || '',
            problemStatement: current.problemStatement || '',
            proposedSolution: current.solution || '',
            technologiesUsed: current.technologyUsed ? current.technologyUsed.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            githubUrl: current.repoUrl || '',
            liveDemoUrl: current.demoUrl || '',
            presentationFileName: current.presentationFile || '',
            reportUrl: current.reportFile || (isPdf ? current.presentationFile : ''),
            pdfFile: current.reportFile || (isPdf ? current.presentationFile : ''),
            pptUrl: isPpt ? current.presentationFile : '',
            images: current.screenshotFile ? [current.screenshotFile] : [],
            problemsFaced: current.obstaclesFaced || '',
            obstaclesFaced: current.obstaclesFaced || '',
            nextWeekPlan: ''
          };
          guideTeam.submissions.push(sub);
        } else {
          sub.submissionStatus = 'Submitted On Time';
          sub.evaluationStatus = 'Pending';
          sub.submissionDate = data.submissionDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          if (current.abstract) sub.abstractSummary = current.abstract;
          if (current.problemStatement) sub.problemStatement = current.problemStatement;
          if (current.solution) sub.proposedSolution = current.solution;
          if (current.technologyUsed) sub.technologiesUsed = current.technologyUsed.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (current.obstaclesFaced) { sub.problemsFaced = current.obstaclesFaced; sub.obstaclesFaced = current.obstaclesFaced; }
          if (current.reportFile) { sub.reportUrl = current.reportFile; sub.pdfFile = current.reportFile; }
          if (current.presentationFile) {
            sub.presentationFileName = current.presentationFile;
            if (isPdf) { sub.reportUrl = current.presentationFile; sub.pdfFile = current.presentationFile; sub.pptUrl = ''; }
            else { sub.pptUrl = current.presentationFile; }
          }
          if (current.repoUrl) sub.githubUrl = current.repoUrl;
          if (current.demoUrl) sub.liveDemoUrl = current.demoUrl;
          if (current.screenshotFile) sub.images = [current.screenshotFile];
        }

        guideTeam.latestSubmissionStatus = `Submission ${weekNum + 1} Deliverables Submitted for Review`;
        localStorage.setItem(GUIDE_TEAMS_STORAGE_KEY, JSON.stringify(guideTeams));
      }
    } catch (e) {
      console.error(e);
    }

    ApiClient.submitStudentDeliverables(weekNum, {
      problemStatement: current.problemStatement,
      solution: current.solution,
      technologyUsed: current.technologyUsed,
      obstaclesFaced: current.obstaclesFaced,
      abstract: current.abstract,
      repoUrl: current.repoUrl,
      demoUrl: current.demoUrl,
      isSubmit: true
    }).catch(() => {});

    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));

    return current;
  },

  saveDeliverableField(
    weekText: string,
    field: keyof StudentDeliverableState['submittedFields'],
    value: string
  ): StudentDeliverableState {
    const key = `siet_deliverable_v6_${weekText.replace(/\s+/g, '_').toLowerCase()}`;
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
          ApiClient.updateProjectTitle(backendTeam.id, value).catch(() => {});
        }
      }).catch(() => {});
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
          guideName: this.getTeam().guideName || 'Dr. P. Manimegalai'
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

    // 2. Synchronize directly into Guide Portal storage (siet_guide_portal_teams_v6)
    try {
      const rawTeams = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
      let guideTeams = rawTeams ? JSON.parse(rawTeams) : [];
      if (!Array.isArray(guideTeams) || guideTeams.length === 0) {
        guideTeams = INITIAL_TEAMS;
      }

      let guideTeam = guideTeams.find((t: any) => t.teamId === 'TEAM-CSE-Y3-B04' || t.teamNumber === 4) || guideTeams[0];
      if (guideTeam) {
        if (current.projectTitle) {
          guideTeam.projectTitle = current.projectTitle;
        }
        if (field === 'title' || guideTeam.titleStatus === 'Rejected') {
          guideTeam.titleStatus = 'Pending';
          guideTeam.titleLocked = false;
          guideTeam.rejectionReason = '';
          guideTeam.latestSubmissionStatus = `${field.toUpperCase()} Submitted – Pending Guide Review`;
        }

        try {
          const studentTeam = this.getTeam();
          if (studentTeam.guideApprovalStatus === 'Rejected') {
            studentTeam.guideApprovalStatus = 'Pending';
            studentTeam.rejectionReason = '';
            this.saveTeam(studentTeam);
          }
        } catch (e) {}

        if (current.problemStatement) guideTeam.problemStatement = current.problemStatement;
        if (current.solution) guideTeam.proposedSolution = current.solution;
        if (current.technologyUsed) guideTeam.technologiesUsed = current.technologyUsed.split(',').map((s: string) => s.trim());
        if (current.repoUrl) guideTeam.githubUrl = current.repoUrl;
        if (current.demoUrl) guideTeam.liveDemoUrl = current.demoUrl;
        if (current.abstract) guideTeam.abstract = current.abstract;

        if (!guideTeam.submissions) guideTeam.submissions = [];
        let sub = guideTeam.submissions.find((s: any) => s.weekNumber === weekNum);
        
        const isPdf = Boolean(current.presentationFile && current.presentationFile.toLowerCase().endsWith('.pdf'));
        const isPpt = Boolean(current.presentationFile && (current.presentationFile.toLowerCase().endsWith('.ppt') || current.presentationFile.toLowerCase().endsWith('.pptx')));
        
        if (!sub) {
          sub = {
            weekNumber: weekNum,
            title: `Week ${weekNum}`,
            submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            submissionStatus: 'Submitted On Time',
            evaluationStatus: 'Pending',
            isLocked: false,
            guideRemarks: '',
            abstractSummary: current.abstract || '',
            problemStatement: current.problemStatement || '',
            proposedSolution: current.solution || '',
            technologiesUsed: current.technologyUsed ? current.technologyUsed.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            githubUrl: current.repoUrl || '',
            liveDemoUrl: current.demoUrl || '',
            presentationFileName: current.presentationFile || '',
            reportUrl: current.reportFile || (isPdf ? current.presentationFile : ''),
            pdfFile: current.reportFile || (isPdf ? current.presentationFile : ''),
            pptUrl: isPpt ? current.presentationFile : '',
            images: current.screenshotFile ? [current.screenshotFile] : [],
            problemsFaced: current.obstaclesFaced || '',
            obstaclesFaced: current.obstaclesFaced || '',
            nextWeekPlan: ''
          };
          guideTeam.submissions.push(sub);
        } else {
          sub.submissionStatus = 'Submitted On Time';
          sub.evaluationStatus = 'Pending';
          sub.submissionDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          if (field === 'abstract') sub.abstractSummary = value;
          if (field === 'problemStatement') sub.problemStatement = value;
          if (field === 'solution') sub.proposedSolution = value;
          if (field === 'technologyUsed') sub.technologiesUsed = value ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          if (field === 'obstaclesFaced') { sub.problemsFaced = value; sub.obstaclesFaced = value; }
          if (field === 'report') {
            sub.reportUrl = value;
            sub.pdfFile = value;
          }
          if (field === 'presentation') {
            sub.presentationFileName = value;
            if (value.toLowerCase().endsWith('.pdf')) {
              sub.reportUrl = value;
              sub.pdfFile = value;
              sub.pptUrl = '';
            } else {
              sub.pptUrl = value;
            }
          }
          if (field === 'repoUrl') sub.githubUrl = value;
          if (field === 'demoUrl') sub.liveDemoUrl = value;
          if (field === 'screenshot') sub.images = value ? [value] : [];
        }

        guideTeam.latestSubmissionStatus = `Week ${weekNum} Deliverables Submitted for Review`;
        localStorage.setItem(GUIDE_TEAMS_STORAGE_KEY, JSON.stringify(guideTeams));
      }
    } catch (e) {
      console.error('Error syncing guide team:', e);
    }

    // 3. Send asynchronous API call to Backend
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
      console.log('Backend sync queued or offline:', err);
    });

    // 4. Dispatch global events for instant UI synchronization across tabs and pages
    window.dispatchEvent(new Event('siet_data_updated'));
    window.dispatchEvent(new Event('storage'));

    return current;
  },

  updateSubmission(weekNumber: number, updatedComments: string): boolean {
    const list = this.getSubmissions();
    const item = list.find(s => s.week === weekNumber);
    if (!item) return false;

    item.status = 'Submitted';
    item.submissionDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    item.comments = `Updated: ${updatedComments}`;
    this.saveSubmissions(list);

    // Call backend
    ApiClient.submitStudentDeliverables(weekNumber, {
      isSubmit: true
    }).catch(() => {});

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
      const key = `siet_deliverable_v6_week_${weekNumber}`;
      localStorage.removeItem(key);

      // 3. Reset title & status in student team
      team.projectTitle = '';
      team.submittedTitle = '';
      team.isTitleApproved = false;
      team.guideApprovalStatus = 'Pending Review';
      this.saveTeam(team);

      // 4. Reset Guide Portal storage so guide reflects clean unsubmitted state
      try {
        const rawTeams = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
        let guideTeams = rawTeams ? JSON.parse(rawTeams) : [];
        if (Array.isArray(guideTeams) && guideTeams.length > 0) {
          const guideTeam = guideTeams.find((t: any) => t.teamId === 'TEAM-CSE-Y3-B04' || t.teamNumber === 4) || guideTeams[0];
          if (guideTeam) {
            guideTeam.submissions = (guideTeam.submissions || []).filter((s: any) => s.weekNumber !== weekNumber);
            guideTeam.projectTitle = '';
            guideTeam.titleStatus = 'Pending';
            guideTeam.titleLocked = false;
            guideTeam.latestSubmissionStatus = 'Awaiting Student Title Submission';
            guideTeam.problemStatement = '';
            guideTeam.proposedSolution = '';
            guideTeam.technologiesUsed = [];
            guideTeam.githubUrl = '';
            guideTeam.liveDemoUrl = '';
            guideTeam.abstract = '';
            localStorage.setItem(GUIDE_TEAMS_STORAGE_KEY, JSON.stringify(guideTeams));
          }
        }
      } catch (e) {}

      // 5. Reset Advisor Portal storage and marks across all portals so marks become unassigned
      try {
        const memberRollNos = team?.members?.map(m => m.rollNo) || [];
        MarksService.deleteWeeklyMarks(team.id || 'TEAM-CSE-Y3-B04', weekNumber, memberRollNos);
        const advRaw = localStorage.getItem('siet_advisor_teams_CSE-B');
        if (advRaw) {
          const advTeams = JSON.parse(advRaw);
          if (Array.isArray(advTeams)) {
            const advTeam = advTeams.find((t: any) => t.teamId === 'TEAM-CSE-Y3-B04' || t.teamNo === 'Team 04');
            if (advTeam) {
              advTeam.title = '';
              advTeam.status = 'Pending';
              localStorage.setItem('siet_advisor_teams_CSE-B', JSON.stringify(advTeams));
            }
          }
        }
      } catch (e) {}

      // 6. Asynchronous call to backend to delete submission
      ApiClient.deleteStudentSubmission(weekNumber).catch(() => {});

      // 7. Global event dispatch
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

    // Reset guide portal
    try {
      const rawTeams = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
      let guideTeams = rawTeams ? JSON.parse(rawTeams) : [];
      if (Array.isArray(guideTeams)) {
        guideTeams.forEach((t: any) => {
          t.submissions = [];
          t.projectTitle = '';
          t.titleStatus = 'Pending';
          t.titleLocked = false;
          t.latestSubmissionStatus = 'Awaiting Student Title Submission';
          t.problemStatement = '';
          t.proposedSolution = '';
          t.technologiesUsed = [];
          t.githubUrl = '';
          t.liveDemoUrl = '';
          t.abstract = '';
        });
        localStorage.setItem(GUIDE_TEAMS_STORAGE_KEY, JSON.stringify(guideTeams));
      }
    } catch (e) {}

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
          guideName: this.getTeam().guideName || 'Dr. P. Manimegalai'
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

