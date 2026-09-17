import { Team, WeeklySubmission, ReviewScore, ChecklistState, Announcement, GuideNotice } from '../types';
import { ApiClient } from './apiClient';
import { INITIAL_TEAMS } from '../data/guidePortalData';
import { MarksService } from './marksService';

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

  // Purge any mock submissions from v6 storage
  const guideRaw = localStorage.getItem("siet_guide_portal_teams_v6");
  if (guideRaw) {
    const guideTeams = JSON.parse(guideRaw);
    if (Array.isArray(guideTeams)) {
      let cleaned = false;
      guideTeams.forEach((t: any) => {
        if (t.teamId !== 'TEAM-CSE-Y3-B04' && t.teamNumber !== 4) {
          if ((t.submissions && t.submissions.length > 0) || t.projectTitle === 'Wildfire Prediction Mesh Network' || t.projectTitle === 'Automated Legal Document Summarizer' || t.projectTitle === 'Autonomous Solar Panel Cleaning Drone') {
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
    try {
      const stored = localStorage.getItem(TEAM_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(DEFAULT_STUDENT_TEAM));
    return DEFAULT_STUDENT_TEAM;
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
          // Filter out legacy mock submissions so only real student submissions remain
          const team = this.getTeam();
          const isGuideApproved = Boolean(team?.isTitleApproved || team?.guideApprovalStatus === 'Approved');
          return parsed.filter((sub: any) => {
            if (!sub || typeof sub !== 'object') return false;
            if (sub.presentationFile === 'mock_ppt_w0' || sub.presentationFile === 'Week0_Topic_Feasibility_Tarunika.pptx') return false;
            if (sub.title === 'Topic Finalization & Feasibility Defense') return false;
            return true;
          }).map((sub: any) => {
            if (isGuideApproved && (sub.status === 'Submitted' || sub.status === 'Pending' || !sub.status)) {
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

  getDeliverables(weekText: string): StudentDeliverableState {
    const key = `siet_deliverable_v6_${weekText.replace(/\s+/g, '_').toLowerCase()}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    const defaultState: StudentDeliverableState = {
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
    return defaultState;
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

    // Extract week number (supports "Week 0", "Week 1", etc.)
    const match = weekText.match(/\d+/);
    const weekNum = match ? parseInt(match[0], 10) : 0;

    // 1. Synchronize to student's submissions ledger
    try {
      const list = this.getSubmissions();
      let item = list.find(s => s.week === weekNum);
      if (!item) {
        item = {
          week: weekNum,
          title: `Week ${weekNum} Deliverable Submission`,
          dueDate: `Week ${weekNum}`,
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

      // 5. Asynchronous call to backend to delete submission
      ApiClient.deleteStudentSubmission(weekNumber).catch(() => {});

      // 6. Global event dispatch
      window.dispatchEvent(new Event('siet_data_updated'));
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

