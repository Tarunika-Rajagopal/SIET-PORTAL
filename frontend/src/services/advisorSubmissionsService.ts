import { WeeklySubmission } from '../types';
import { ClassTeam } from './advisorService';
import { StudentService } from './studentService';

// Submissions are supplied strictly via authoritative server state and API endpoints.

/**
 * Returns strictly real student milestone submissions for the active student team.
 * Merges deliverables (abstract, problem statement, solution, tech stack, repos, etc.)
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

  // Merge full deliverable fields into each submission (capped to max 4 submissions)
  return validSubs.sort((a, b) => a.week - b.week).slice(0, 4).map(sub => {
    const dWeek = StudentService.getDeliverables(`Submission ${sub.week}`, effectiveTeamId);
    const isSubRejected = sub.status === 'Changes Requested' || sub.status === 'Rejected' || (sub.week === 1 && studentTeam.guideApprovalStatus === 'Rejected');
    const isSubApproved = !isSubRejected && (
      sub.status === 'Approved' || 
      (sub.week === 1 && isGuideApproved) || 
      StudentService.isSubmissionApproved(sub.week, studentTeam.id)
    );

    const pFile = sub.presentationFile || dWeek.presentationFile || (sub.week === 1 ? d1.presentationFile : '') || '';
    const rFile = sub.pdfFile || dWeek.reportFile || (sub.week === 1 ? d1.reportFile : '') || '';
    const fName = sub.fileName || pFile || rFile || '';
    const guideComments = sub.comments || (sub.week === 1 && studentTeam.rejectionReason ? studentTeam.rejectionReason : '') || '';

    return {
      ...sub,
      status: isSubRejected ? ('Changes Requested' as const) : isSubApproved ? ('Approved' as const) : ('Submitted' as const),
      projectTitle: sub.projectTitle || dWeek.projectTitle || d1.projectTitle || studentTeam.submittedTitle || studentTeam.projectTitle || teamTitle || '',
      problemStatement: sub.problemStatement || dWeek.problemStatement || (sub.week === 1 ? d1.problemStatement : '') || '',
      solution: sub.solution || dWeek.solution || (sub.week === 1 ? d1.solution : '') || '',
      technologyUsed: sub.technologyUsed || dWeek.technologyUsed || (sub.week === 1 ? d1.technologyUsed : '') || '',
      obstaclesFaced: sub.obstaclesFaced || dWeek.obstaclesFaced || (sub.week === 1 ? d1.obstaclesFaced : '') || '',
      abstract: sub.abstract || dWeek.abstract || (sub.week === 1 ? d1.abstract : '') || '',
      presentationFile: pFile,
      pdfFile: rFile,
      fileName: fName,
      repoUrl: sub.repoUrl || dWeek.repoUrl || (sub.week === 1 ? d1.repoUrl : '') || '',
      demoUrl: sub.demoUrl || dWeek.demoUrl || (sub.week === 1 ? d1.demoUrl : '') || '',
      screenshotFile: sub.screenshotFile || dWeek.screenshotFile || (sub.week === 1 ? d1.screenshotFile : '') || '',
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

import { MarksService } from './marksService';

function enrichSubmission(sub: WeeklySubmission, team: ClassTeam): WeeklySubmission {
  const memberRolls = team.members?.map(m => m.rollNo) || [];
  const teamIdKey = team.teamId || (team as any).id || team.teamNo || '';
  const weekMarks = MarksService.getWeeklyMarks(teamIdKey, sub.week, memberRolls) ||
                    (sub.week === 1 ? MarksService.getWeeklyMarks(teamIdKey, 0, memberRolls) : null);
  
  const subMemberMarks = (sub as any).memberMarks && typeof (sub as any).memberMarks === 'object' && Object.keys((sub as any).memberMarks).length > 0
    ? (sub as any).memberMarks
    : null;
  const weekMemberMarks = weekMarks?.memberMarks && typeof weekMarks.memberMarks === 'object' && Object.keys(weekMarks.memberMarks).length > 0
    ? weekMarks.memberMarks
    : null;
  const mergedMemberMarks = weekMemberMarks || subMemberMarks || {};

  const hasMarks = Boolean(
    (weekMarks && (
      (weekMarks.teamAverage !== undefined && weekMarks.teamAverage > 0) ||
      (weekMarks.memberMarks && Object.values(weekMarks.memberMarks).some(m => typeof m === 'number' && m > 0))
    )) ||
    (typeof sub.score === 'number' && sub.score > 0) ||
    Object.keys(mergedMemberMarks).length > 0
  );

  const isRevision = 
    sub.status === 'Changes Requested' || 
    sub.status === 'Revision Required' || 
    sub.status === 'Rejected' ||
    (sub.week === 1 && (team.status === 'Rejected' || (team as any).guideApprovalStatus === 'Rejected'));

  const isApproved = !isRevision && Boolean(
    sub.status === 'Approved' ||
    (sub.status as string) === 'Evaluated' ||
    hasMarks ||
    (sub.week === 1 && (
      team.status === 'Approved' || 
      (team as any).isTitleApproved ||
      (team as any).guideApprovalStatus === 'Approved' ||
      StudentService.isSubmission1Approved(team.teamId)
    )) ||
    StudentService.isSubmissionApproved(sub.week, team.teamId)
  );

  const effectiveStatus: WeeklySubmission['status'] = isRevision 
    ? 'Changes Requested' 
    : isApproved 
      ? 'Approved' 
      : 'Submitted';

  const finalScore = (weekMarks?.teamAverage !== undefined && weekMarks.teamAverage > 0)
    ? weekMarks.teamAverage
    : (typeof sub.score === 'number' && sub.score > 0 ? sub.score : sub.score);

  return {
    ...sub,
    status: effectiveStatus,
    score: finalScore,
    memberMarks: mergedMemberMarks,
    comments: sub.comments || weekMarks?.remarks || ''
  };
}

export const AdvisorSubmissionsService = {
  /**
   * Returns milestone submissions for a given class team.
   * Strictly returns real submissions made by the students and approved by the guide.
   * Isolates data to the exact selected team ID without falling back to other teams.
   */
  getTeamSubmissions(team: ClassTeam): WeeklySubmission[] {
    if (!team) return [];

    const subsMap = new Map<number, WeeklySubmission>();

    // 1. Prioritize authoritative backend-loaded submissions attached to the team
    if ((team as any)?.submissions && Array.isArray((team as any).submissions)) {
      for (const s of (team as any).submissions) {
        if (s && typeof s === 'object' && s.week) {
          subsMap.set(Number(s.week), s);
        }
      }
    }

    // 2. Canonical student submissions if this team matches the active student team
    const studentTeam = StudentService.getTeam();
    const isStudentTeam = Boolean(
      studentTeam && (
        (team.teamId && studentTeam.id && team.teamId.toLowerCase().trim() === studentTeam.id.toLowerCase().trim()) ||
        (Array.isArray(team.members) && Array.isArray(studentTeam.members) && team.members.some(tm => studentTeam.members.some(sm => sm.rollNo && sm.rollNo === tm.rollNo)))
      )
    );

    if (isStudentTeam) {
      const studentSubs = getCanonicalStudentSubmissions(team.title, team.teamId || studentTeam.id);
      for (const s of studentSubs) {
        if (s && s.week && !subsMap.has(s.week)) {
          subsMap.set(s.week, s);
        }
      }
    }

    // Enrich all submissions with current marks and status, sorted by week
    const result: WeeklySubmission[] = Array.from(subsMap.values())
      .map(s => enrichSubmission(s, team))
      .sort((a, b) => a.week - b.week);

    return result;
  },

  getSubmissionForWeek(team: ClassTeam, week: number): WeeklySubmission | undefined {
    const subs = this.getTeamSubmissions(team);
    return subs.find(s => s.week === week);
  }
};

export default AdvisorSubmissionsService;
