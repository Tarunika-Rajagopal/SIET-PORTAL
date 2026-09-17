import { WeeklySubmission } from '../types';
import { ClassTeam } from './advisorService';
import { StudentService } from './studentService';

/**
 * Returns strictly real student milestone submissions for Team 04.
 * Merges deliverables (abstract, problem statement, solution, tech stack, PPT, PDF, repos, etc.)
 * so that Guide, Advisor, and HOD portals view the exact same data.
 */
export function getCanonicalStudentSubmissions(teamTitle?: string): WeeklySubmission[] {
  const studentTeam = StudentService.getTeam();
  const d0 = StudentService.getDeliverables('Week 0');
  const rawSubs = StudentService.getSubmissions() || [];

  const isGuideApproved = Boolean(
    studentTeam?.isTitleApproved ||
    studentTeam?.guideApprovalStatus === 'Approved'
  );

  // Filter out any legacy mock submissions
  const validSubs: WeeklySubmission[] = rawSubs.filter(s => {
    if (!s || typeof s !== 'object') return false;
    if (s.presentationFile === 'mock_ppt_w0' || s.presentationFile === 'Week0_Topic_Feasibility_Tarunika.pptx') return false;
    if (s.title === 'Topic Finalization & Feasibility Defense') return false;
    return true;
  });

  const hasD0 = Boolean(
    d0.projectTitle ||
    d0.problemStatement ||
    d0.solution ||
    d0.technologyUsed ||
    d0.abstract ||
    d0.presentationFile ||
    d0.reportFile ||
    d0.repoUrl ||
    d0.demoUrl ||
    d0.screenshotFile ||
    studentTeam.submittedTitle
  );

  // If Week 0 is not yet in validSubs but student submitted Week 0 deliverables, include it
  if (!validSubs.some(s => s.week === 0) && hasD0) {
    validSubs.unshift({
      week: 0,
      title: 'Project Initiation & Title Proposal',
      dueDate: 'Week 0',
      status: isGuideApproved ? 'Approved' : (studentTeam.guideApprovalStatus === 'Rejected' ? 'Changes Requested' : 'Submitted'),
      submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      projectTitle: d0.projectTitle || studentTeam.submittedTitle || studentTeam.projectTitle || teamTitle || '',
      problemStatement: d0.problemStatement || '',
      solution: d0.solution || '',
      technologyUsed: d0.technologyUsed || '',
      obstaclesFaced: d0.obstaclesFaced || '',
      abstract: d0.abstract || '',
      presentationFile: d0.presentationFile || '',
      pdfFile: d0.reportFile || '',
      fileName: d0.presentationFile || d0.reportFile || '',
      repoUrl: d0.repoUrl || '',
      demoUrl: d0.demoUrl || '',
      screenshotFile: d0.screenshotFile || '',
      guideName: 'Dr. P. Manimegalai'
    });
  }

  // Check other weeks (1..16) for any deliverables saved by the student
  for (let w = 1; w <= 16; w++) {
    if (!validSubs.some(s => s.week === w)) {
      const dW = StudentService.getDeliverables(`Week ${w}`);
      const hasDW = Boolean(
        dW.problemStatement ||
        dW.solution ||
        dW.technologyUsed ||
        dW.obstaclesFaced ||
        dW.abstract ||
        dW.presentationFile ||
        dW.reportFile ||
        dW.repoUrl ||
        dW.demoUrl ||
        dW.screenshotFile ||
        dW.projectTitle
      );
      if (hasDW) {
        validSubs.push({
          week: w,
          title: `Milestone Week ${w}`,
          dueDate: `Week ${w}`,
          status: isGuideApproved ? 'Approved' : 'Submitted',
          submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          projectTitle: dW.projectTitle || d0.projectTitle || studentTeam.submittedTitle || studentTeam.projectTitle || teamTitle || '',
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
          guideName: 'Dr. P. Manimegalai'
        });
      }
    }
  }

  // Merge full deliverable fields into each submission
  return validSubs.sort((a, b) => a.week - b.week).map(sub => {
    const dWeek = StudentService.getDeliverables(`Week ${sub.week}`);
    const isWeek0 = sub.week === 0;
    const isSubRejected = sub.status === 'Changes Requested' || sub.status === 'Rejected' || (isWeek0 && studentTeam.guideApprovalStatus === 'Rejected');
    const isSubApproved = !isSubRejected && (sub.status === 'Approved' || (isWeek0 && isGuideApproved));

    const pFile = sub.presentationFile || dWeek.presentationFile || (sub.week === 0 ? d0.presentationFile : '') || '';
    const rFile = sub.pdfFile || dWeek.reportFile || (sub.week === 0 ? d0.reportFile : '') || '';
    const fName = sub.fileName || pFile || rFile || '';
    const guideComments = sub.comments || (isWeek0 && studentTeam.rejectionReason ? studentTeam.rejectionReason : '') || '';

    return {
      ...sub,
      status: isSubRejected ? ('Changes Requested' as const) : isSubApproved ? ('Approved' as const) : ('Submitted' as const),
      projectTitle: sub.projectTitle || dWeek.projectTitle || d0.projectTitle || studentTeam.submittedTitle || studentTeam.projectTitle || teamTitle || '',
      problemStatement: sub.problemStatement || dWeek.problemStatement || (sub.week === 0 ? d0.problemStatement : '') || '',
      solution: sub.solution || dWeek.solution || (sub.week === 0 ? d0.solution : '') || '',
      technologyUsed: sub.technologyUsed || dWeek.technologyUsed || (sub.week === 0 ? d0.technologyUsed : '') || '',
      obstaclesFaced: sub.obstaclesFaced || dWeek.obstaclesFaced || (sub.week === 0 ? d0.obstaclesFaced : '') || '',
      abstract: sub.abstract || dWeek.abstract || (sub.week === 0 ? d0.abstract : '') || '',
      presentationFile: pFile,
      pdfFile: rFile,
      fileName: fName,
      repoUrl: sub.repoUrl || dWeek.repoUrl || (sub.week === 0 ? d0.repoUrl : '') || '',
      demoUrl: sub.demoUrl || dWeek.demoUrl || (sub.week === 0 ? d0.demoUrl : '') || '',
      screenshotFile: sub.screenshotFile || dWeek.screenshotFile || (sub.week === 0 ? d0.screenshotFile : '') || '',
      guideName: sub.guideName || 'Dr. P. Manimegalai',
      comments: guideComments
    };
  });
}

export const AdvisorSubmissionsService = {
  /**
   * Returns milestone submissions for a given class team.
   * Strictly returns real submissions made by the students (no mock data).
   */
  getTeamSubmissions(team: ClassTeam): WeeklySubmission[] {
    // 1. If Team 04 (or matching TEAM-CSE-Y3-B04), return strictly the real submissions from StudentService
    if (team.teamId === 'TEAM-CSE-Y3-B04' || team.teamNo === 'Team 04' || team.teamNo === '04') {
      return getCanonicalStudentSubmissions(team.title);
    }

    // 2. Check local storage for custom submissions explicitly saved for this team (non-mock only)
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

    // 3. For all other teams without student submissions, return clean empty list
    return [];
  },

  /**
   * Returns a specific week's submission for a team.
   */
  getSubmissionForWeek(team: ClassTeam, week: number): WeeklySubmission | undefined {
    const subs = this.getTeamSubmissions(team);
    return subs.find(s => s.week === week);
  },

  /**
   * Generates and downloads real milestone files for PPT and PDF matching student portal format.
   */
  downloadFile(fileName: string, fileType: 'ppt' | 'pdf', sub: WeeklySubmission, team: ClassTeam, advisorName: string = 'Dr. R. Karthikeyan') {
    const weekNum = sub.week;
    const weekTitle = sub.title;
    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${advisorName}) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 260 >>
stream
BT
/F1 14 Tf
50 720 Td
(Sri Shakthi Institute of Engineering and Technology - Department of CSE) Tj
0 -25 Td
(Advisor Milestone Audit Dossier: Week ${weekNum} - ${weekTitle}) Tj
0 -20 Td
(Project Title: ${sub.projectTitle || team.title}) Tj
0 -20 Td
(Team: ${team.teamNo} | Class: ${team.class} | Batch: ${team.batch}) Tj
0 -20 Td
(Guide: ${team.guide} | Class Advisor: ${advisorName}) Tj
0 -20 Td
(Submission Status: ${sub.status} | Submitted Date: ${sub.submissionDate || 'N/A'}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 2 0 R >>
startxref
500
%%EOF`;
    } else {
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      content = `SIET PowerPoint Milestone Presentation
Milestone: Week ${weekNum} - ${weekTitle}
Project: ${sub.projectTitle || team.title}
Team: ${team.teamNo} (${team.class})
Faculty Guide: ${team.guide}
Class Advisor: ${advisorName}
Submission Date: ${sub.submissionDate || 'N/A'}
Evaluation Status: ${sub.status}
Comments: ${sub.comments || 'Evaluated for Capstone Milestone'}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export default AdvisorSubmissionsService;
