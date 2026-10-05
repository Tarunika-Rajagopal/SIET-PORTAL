import { WeeklySubmission } from '../types';
import { ClassTeam } from './advisorService';
import { StudentService } from './studentService';

const GUIDE_TEAMS_STORAGE_KEY = 'siet_guide_portal_teams_v6';

/**
 * Returns strictly real student milestone submissions for the active student team.
 * Merges deliverables (abstract, problem statement, solution, tech stack, PPT, PDF, repos, etc.)
 * so that Guide, Advisor, and HOD portals view the exact same data.
 */
export function getCanonicalStudentSubmissions(teamTitle?: string, teamIdOverride?: string): WeeklySubmission[] {
  const studentTeam = StudentService.getTeam();
  const effectiveTeamId = teamIdOverride || studentTeam.id;
  const d1 = StudentService.getDeliverables('Submission 1', effectiveTeamId);
  const rawSubs = StudentService.getSubmissions() || [];

  const isGuideApproved = Boolean(
    studentTeam?.isTitleApproved ||
    studentTeam?.guideApprovalStatus === 'Approved'
  );

  // Filter out any legacy mock submissions
  const validSubs: WeeklySubmission[] = rawSubs.filter(s => {
    if (!s || typeof s !== 'object') return false;
    if (s.presentationFile === 'mock_ppt_w0') return false;
    return true;
  });

  const hasD1 = Boolean(
    d1.submittedFields?.title ||
    d1.submittedFields?.presentation ||
    d1.submittedFields?.report ||
    d1.problemStatement ||
    d1.solution ||
    d1.abstract ||
    studentTeam.submittedTitle ||
    studentTeam.projectTitle ||
    d1.projectTitle
  );

  // If Week 1 is not yet in validSubs but student submitted Submission 1 deliverables, include it
  if (!validSubs.some(s => s.week === 1) && hasD1) {
    validSubs.unshift({
      week: 1,
      title: 'Submission 1 Deliverables & Proposal',
      dueDate: 'Submission 1',
      status: isGuideApproved ? 'Approved' : (studentTeam.guideApprovalStatus === 'Rejected' ? 'Changes Requested' : 'Submitted'),
      submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      projectTitle: d1.projectTitle || studentTeam.submittedTitle || studentTeam.projectTitle || teamTitle || '',
      problemStatement: d1.problemStatement || '',
      solution: d1.solution || '',
      technologyUsed: d1.technologyUsed || '',
      obstaclesFaced: d1.obstaclesFaced || '',
      abstract: d1.abstract || '',
      presentationFile: d1.presentationFile || '',
      pdfFile: d1.reportFile || '',
      fileName: d1.presentationFile || d1.reportFile || '',
      repoUrl: d1.repoUrl || '',
      demoUrl: d1.demoUrl || '',
      screenshotFile: d1.screenshotFile || '',
      guideName: studentTeam.guideName || 'Unassigned'
    });
  }

  // Check Submissions 2, 3, 4 (weeks 2, 3, 4) for real submitted deliverables
  for (let w = 2; w <= 4; w++) {
    const subNum = w;
    if (!validSubs.some(s => s.week === w)) {
      const dW = StudentService.getDeliverables(`Submission ${subNum}`, effectiveTeamId);
      const hasActualSubmission = Boolean(
        dW.submittedFields?.technologyUsed ||
        dW.submittedFields?.obstaclesFaced ||
        dW.submittedFields?.abstract ||
        dW.submittedFields?.presentation ||
        dW.submittedFields?.report ||
        dW.submittedFields?.repoUrl ||
        dW.submittedFields?.demoUrl ||
        dW.submittedFields?.screenshot ||
        dW.problemStatement ||
        dW.solution ||
        dW.abstract ||
        dW.projectTitle
      );
      if (hasActualSubmission) {
        validSubs.push({
          week: w,
          title: `Submission ${subNum} Deliverable Submission`,
          dueDate: `Submission ${subNum}`,
          status: StudentService.isSubmissionApproved(subNum, studentTeam.id) ? 'Approved' : 'Submitted',
          submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          projectTitle: dW.projectTitle || d1.projectTitle || studentTeam.submittedTitle || studentTeam.projectTitle || teamTitle || '',
          problemStatement: dW.problemStatement || '',
          solution: dW.solution || '',
          technologyUsed: dW.technologyUsed || '',
          obstaclesFaced: dW.obstaclesFaced || '',
          abstract: dW.abstract || '',
          presentationFile: dW.presentationFile || '',
          pdfFile: dW.reportFile || '',
          fileName: dW.presentationFile || dW.reportFile || '',
          repoUrl: dW.repoUrl || '',
          demoUrl: dW.demoUrl || '',
          screenshotFile: dW.screenshotFile || '',
          guideName: studentTeam.guideName || 'Unassigned'
        });
      }
    }
  }

  // Also sync guide evaluations / comments from guide storage if available
  let guideTeamSubs: any[] = [];
  try {
    const rawG = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
    if (rawG) {
      const gTeams = JSON.parse(rawG);
      const gt = gTeams.find((t: any) => {
        const tId = (t.teamId || t.id || '').toLowerCase().trim();
        const sId = (studentTeam.id || '').toLowerCase().trim();
        const tNo = (t.teamNo || '').toLowerCase().trim();
        const sNo = (studentTeam.teamNo || '').toLowerCase().trim();
        const tNum = t.teamNumber != null ? Number(t.teamNumber) : parseInt(tNo.replace(/\D/g, ''), 10);
        const sNum = studentTeam.teamNumber != null ? Number(studentTeam.teamNumber) : parseInt(sNo.replace(/\D/g, ''), 10);

        if (tId && sId && tId === sId) return true;
        if (tNo && sNo && tNo === sNo) return true;
        if (!isNaN(tNum) && !isNaN(sNum) && tNum === sNum) return true;
        return false;
      });
      if (gt && Array.isArray(gt.submissions)) {
        guideTeamSubs = gt.submissions;
      }
    }
  } catch (e) {}

  // Merge full deliverable fields into each submission (capped to max 4 submissions)
  return validSubs.sort((a, b) => a.week - b.week).slice(0, 4).map(sub => {
    const dWeek = StudentService.getDeliverables(`Submission ${sub.week}`, effectiveTeamId);
    const gSub = guideTeamSubs.find((gs: any) => (gs.weekNumber ?? gs.week) === sub.week);
    const isSubRejected = sub.status === 'Changes Requested' || sub.status === 'Rejected' || (sub.week === 1 && studentTeam.guideApprovalStatus === 'Rejected') || gSub?.evaluationStatus === 'Revision Required';
    const isSubApproved = !isSubRejected && (
      sub.status === 'Approved' || 
      (sub.week === 1 && isGuideApproved) || 
      StudentService.isSubmissionApproved(sub.week, studentTeam.id) ||
      gSub?.evaluationStatus === 'Approved' ||
      gSub?.status === 'Approved'
    );

    const pFile = sub.presentationFile || dWeek.presentationFile || (sub.week === 1 ? d1.presentationFile : '') || gSub?.presentationFileName || '';
    const rFile = sub.pdfFile || dWeek.reportFile || (sub.week === 1 ? d1.reportFile : '') || gSub?.reportUrl || gSub?.pdfFile || '';
    const fName = sub.fileName || pFile || rFile || '';
    const guideComments = sub.comments || gSub?.guideRemarks || (sub.week === 1 && studentTeam.rejectionReason ? studentTeam.rejectionReason : '') || '';

    return {
      ...sub,
      status: isSubRejected ? ('Changes Requested' as const) : isSubApproved ? ('Approved' as const) : ('Submitted' as const),
      projectTitle: sub.projectTitle || dWeek.projectTitle || d1.projectTitle || studentTeam.submittedTitle || studentTeam.projectTitle || teamTitle || '',
      problemStatement: sub.problemStatement || dWeek.problemStatement || (sub.week === 1 ? d1.problemStatement : '') || gSub?.problemStatement || '',
      solution: sub.solution || dWeek.solution || (sub.week === 1 ? d1.solution : '') || gSub?.proposedSolution || '',
      technologyUsed: sub.technologyUsed || dWeek.technologyUsed || (sub.week === 1 ? d1.technologyUsed : '') || (Array.isArray(gSub?.technologiesUsed) ? gSub.technologiesUsed.join(', ') : (gSub?.technologiesUsed || '')),
      obstaclesFaced: sub.obstaclesFaced || dWeek.obstaclesFaced || (sub.week === 1 ? d1.obstaclesFaced : '') || gSub?.obstaclesFaced || gSub?.problemsFaced || '',
      abstract: sub.abstract || dWeek.abstract || (sub.week === 1 ? d1.abstract : '') || gSub?.abstractSummary || gSub?.abstract || '',
      presentationFile: pFile,
      pdfFile: rFile,
      fileName: fName,
      repoUrl: sub.repoUrl || dWeek.repoUrl || (sub.week === 1 ? d1.repoUrl : '') || gSub?.githubUrl || '',
      demoUrl: sub.demoUrl || dWeek.demoUrl || (sub.week === 1 ? d1.demoUrl : '') || gSub?.liveDemoUrl || '',
      screenshotFile: sub.screenshotFile || dWeek.screenshotFile || (sub.week === 1 ? d1.screenshotFile : '') || (Array.isArray(gSub?.images) ? gSub.images[0] : gSub?.screenshotFile || ''),
      guideName: sub.guideName || studentTeam.guideName || 'Unassigned',
      comments: guideComments
    };
  });
}

function getTeamNumberValue(team: ClassTeam): number | null {
  const raw = team.teamNo || team.teamId || '';
  const parsed = parseInt(String(raw).replace(/\D/g, ''), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function isMockValue(value?: string): boolean {
  return Boolean(value && /mock|wildfire prediction mesh network|automated legal document summarizer|autonomous solar panel cleaning drone/i.test(value));
}

function toTechnologyText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }
  return typeof value === 'string' ? value : '';
}

function mapGuideStatus(status?: string): WeeklySubmission['status'] {
  if (status === 'Approved' || status === 'Evaluated') return 'Approved';
  if (status === 'Revision Required' || status === 'Rejected' || status === 'Changes Requested') return 'Changes Requested';
  return 'Submitted';
}

function mapGuideSubmissionToWeeklySubmission(guideTeam: any, guideSubmission: any, team: ClassTeam): WeeklySubmission {
  const week = Number(guideSubmission.weekNumber ?? guideSubmission.week ?? 1);
  const presentationFile = guideSubmission.presentationFileName || guideSubmission.pptUrl || guideSubmission.presentationFile || guideTeam.presentationFile || guideTeam.presentationFileName || '';
  const pdfFile = guideSubmission.pdfFile || guideSubmission.reportUrl || guideSubmission.reportFile || guideTeam.pdfFile || guideTeam.reportUrl || '';

  return {
    week,
    title: guideSubmission.title || (week === 1 ? 'Submission 1: Project Initiation & Title Proposal' : `Milestone Week ${week}`),
    dueDate: guideSubmission.dueDate || `Week ${week}`,
    status: mapGuideStatus(guideSubmission.evaluationStatus || guideSubmission.submissionStatus || guideSubmission.status || guideTeam.titleStatus || 'Approved'),
    submissionDate: guideSubmission.submissionDate || guideTeam.titleApprovedDate || '',
    score: typeof guideSubmission.score === 'number' ? guideSubmission.score : guideTeam.guideScore,
    maxScore: guideSubmission.maxScore || 100,
    projectTitle: guideTeam.projectTitle || team.title || '',
    problemStatement: guideSubmission.problemStatement || guideTeam.problemStatement || '',
    solution: guideSubmission.proposedSolution || guideSubmission.solution || guideTeam.proposedSolution || '',
    technologyUsed: toTechnologyText(guideSubmission.technologiesUsed || guideTeam.technologiesUsed),
    obstaclesFaced: guideSubmission.obstaclesFaced || guideSubmission.problemsFaced || '',
    abstract: guideSubmission.abstractSummary || guideSubmission.abstract || guideTeam.abstract || guideTeam.projectDescription || '',
    presentationFile,
    pdfFile,
    fileName: presentationFile || pdfFile,
    repoUrl: guideSubmission.githubUrl || guideSubmission.repoUrl || guideTeam.githubUrl || '',
    demoUrl: guideSubmission.liveDemoUrl || guideSubmission.demoUrl || guideTeam.liveDemoUrl || '',
    screenshotFile: Array.isArray(guideSubmission.images) ? (guideSubmission.images[0] || '') : (guideSubmission.screenshotFile || ''),
    guideName: guideSubmission.guideName || guideTeam.guide || team.guide,
    guideReviewDate: guideSubmission.guideReviewDate || guideSubmission.submissionDate || guideTeam.titleApprovedDate || 'Reviewed',
    comments: guideSubmission.guideRemarks || guideSubmission.comments || guideTeam.guideFeedback || guideTeam.rejectionReason || ''
  };
}

function getGuideApprovedSubmissionsForTeam(team: ClassTeam): WeeklySubmission[] {
  try {
    const stored = localStorage.getItem(GUIDE_TEAMS_STORAGE_KEY);
    let guideTeams: any[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          guideTeams = parsed;
        }
      } catch (e) {
        console.error('Error parsing guide teams from localStorage:', e);
      }
    }

    if (guideTeams.length === 0) {
      return [];
    }

    const teamNumber = getTeamNumberValue(team);
    const normalizedTeamId = (team.teamId || '').trim().toLowerCase();
    const normalizedTeamNo = (team.teamNo || '').trim().toLowerCase();

    let guideTeam = guideTeams.find((gt: any) => {
      const gtId = (gt.teamId || gt.id || '').trim().toLowerCase();
      const gtNo = (gt.teamNo || (gt.teamNumber ? `Team ${String(gt.teamNumber).padStart(2, '0')}` : '')).trim().toLowerCase();
      const gtNum = typeof gt.teamNumber === 'number' ? gt.teamNumber : (gt.teamNo ? parseInt(String(gt.teamNo).replace(/\D/g, ''), 10) : null);

      return (
        (gtId && normalizedTeamId && gtId === normalizedTeamId) ||
        (gtNo && normalizedTeamNo && gtNo === normalizedTeamNo) ||
        (teamNumber !== null && gtNum !== null && gtNum === teamNumber)
      );
    });

    if (!guideTeam) return [];

    if (isMockValue(guideTeam.projectTitle)) return [];

    const hasAnySubmissionOrDetails = Boolean(
      (Array.isArray(guideTeam.submissions) && guideTeam.submissions.length > 0) ||
      guideTeam.projectTitle ||
      guideTeam.problemStatement ||
      guideTeam.proposedSolution ||
      guideTeam.presentationFile ||
      guideTeam.pdfFile
    );

    if (!hasAnySubmissionOrDetails) return [];

    const mapped = Array.isArray(guideTeam.submissions) && guideTeam.submissions.length > 0
      ? guideTeam.submissions
          .filter((s: any) => s && typeof s === 'object')
          .map((s: any) => mapGuideSubmissionToWeeklySubmission(guideTeam, s, team))
          .filter((s: WeeklySubmission) => !isMockValue(s.presentationFile) && !isMockValue(s.fileName))
      : [];

    // Ensure Week 1 submission exists if the team has approved project details but submissions list didn't have week 1
    const hasWeek1 = mapped.some(s => s.week === 1);
    if (!hasWeek1) {
      const hasApprovedProjectDetails = Boolean(
        guideTeam.projectTitle ||
        team.title ||
        guideTeam.problemStatement ||
        guideTeam.proposedSolution ||
        guideTeam.abstract ||
        guideTeam.githubUrl ||
        guideTeam.liveDemoUrl ||
        (Array.isArray(guideTeam.technologiesUsed) && guideTeam.technologiesUsed.length > 0)
      );

      if (hasApprovedProjectDetails) {
        mapped.unshift(
          mapGuideSubmissionToWeeklySubmission(
            guideTeam,
            {
              weekNumber: 1,
              title: 'Submission 1: Project Initiation & Title Proposal',
              evaluationStatus: guideTeam.titleStatus || 'Approved',
              submissionDate: guideTeam.titleApprovedDate || ''
            },
            team
          )
        );
      }
    }

    return mapped.sort((a, b) => a.week - b.week);
  } catch (e) {
    console.error('Failed to load guide-approved submissions for advisor view', e);
    return [];
  }
}

export const AdvisorSubmissionsService = {
  /**
   * Returns milestone submissions for a given class team.
   * Strictly returns real submissions made by the students and approved by the guide.
   * Isolates data to the exact selected team ID without falling back to other teams.
   */
  getTeamSubmissions(team: ClassTeam): WeeklySubmission[] {
    if (!team) return [];

    // Prioritize authoritative backend-loaded submissions attached to the team
    if ((team as any)?.submissions && Array.isArray((team as any).submissions) && (team as any).submissions.length > 0) {
      return (team as any).submissions;
    }

    const studentTeam = StudentService.getTeam();
    const tNum = team.teamNo ? parseInt(team.teamNo.replace(/\D/g, ''), 10) : null;
    const sNum = studentTeam.teamNumber != null ? Number(studentTeam.teamNumber) : (studentTeam.teamNo ? parseInt(studentTeam.teamNo.replace(/\D/g, ''), 10) : null);

    const isStudentTeam = Boolean(
      studentTeam && (
        (team.teamId && studentTeam.id && team.teamId.toLowerCase().trim() === studentTeam.id.toLowerCase().trim()) ||
        (team.teamNo && studentTeam.teamNo && team.teamNo.toLowerCase().trim() === studentTeam.teamNo.toLowerCase().trim()) ||
        (tNum != null && sNum != null && !isNaN(tNum) && !isNaN(sNum) && tNum === sNum) ||
        (Array.isArray(team.members) && Array.isArray(studentTeam.members) && team.members.some(tm => studentTeam.members.some(sm => sm.rollNo === tm.rollNo)))
      )
    );

    if (isStudentTeam) {
      const studentSubs = getCanonicalStudentSubmissions(team.title, team.teamId || studentTeam.id);
      if (studentSubs.length > 0) {
        return studentSubs;
      }
    }

    // 2. Guide-approved project/submission records for the exact selected team
    const guideApprovedSubmissions = getGuideApprovedSubmissionsForTeam(team);
    if (guideApprovedSubmissions.length > 0) {
      return guideApprovedSubmissions;
    }

    // 3. Check local storage for custom submissions explicitly saved for this specific teamId
    try {
      const stored = localStorage.getItem(`siet_team_submissions_${team.teamId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(s => s && typeof s === 'object' && !String(s.presentationFile || '').includes('mock_ppt'));
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 4. For any team without submissions, return clean empty list (never fall back to another team)
    return [];
  },

  getSubmissionForWeek(team: ClassTeam, week: number): WeeklySubmission | undefined {
    const subs = this.getTeamSubmissions(team);
    return subs.find(s => s.week === week);
  }
};

export default AdvisorSubmissionsService;
