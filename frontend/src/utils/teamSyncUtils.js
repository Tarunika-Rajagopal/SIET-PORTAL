import { INITIAL_TEAMS } from '../data/guidePortalData.js';
import { StudentService } from '../services/studentService';
import { MarksService } from '../services/marksService';

const isMatchingStudentTeam = (team, sTeam) => {
  if (!team || !sTeam) return false;
  const sId = (sTeam.id || sTeam.teamId || '').toLowerCase().trim();
  const sNo = (sTeam.teamNo || '').toLowerCase().trim();
  const sNum = sTeam.teamNumber != null ? Number(sTeam.teamNumber) : (sNo ? parseInt(sNo.replace(/\D/g, ''), 10) : null);

  const tId = (team.teamId || team.id || '').toLowerCase().trim();
  const tNo = (team.teamNo || '').toLowerCase().trim();
  const tNum = team.teamNumber != null ? Number(team.teamNumber) : (tNo ? parseInt(tNo.replace(/\D/g, ''), 10) : null);

  if (sId && tId && sId === tId) return true;
  if (sNo && tNo && sNo === tNo) return true;
  if (sNum != null && tNum != null && !Number.isNaN(sNum) && !Number.isNaN(tNum) && sNum === tNum) return true;

  if (Array.isArray(sTeam.members) && Array.isArray(team.members)) {
    const sRolls = new Set(sTeam.members.map(m => (m.rollNo || m.rollNumber || m.id || '').toLowerCase().trim()).filter(Boolean));
    if (sRolls.size > 0 && team.members.some(m => sRolls.has((m.rollNo || m.rollNumber || m.id || '').toLowerCase().trim()))) {
      return true;
    }
  }
  return false;
};

/**
 * Ensures strictly real student submissions are visible to the guide:
 * 1. Non-student teams NEVER have mock submissions or mock titles.
 * 2. The active student team synchronizes strictly with actual submissions from StudentService.
 */
export const sanitizeAndSyncGuideTeams = (rawList) => {
  const source = Array.isArray(rawList) && rawList.length > 0 ? rawList : INITIAL_TEAMS;
  
  // Guarantee all INITIAL_TEAMS exist (e.g. CSE-A, CSE-B, CSE-C)
  const existingIds = new Set(source.map(t => t.teamId));
  const missing = INITIAL_TEAMS.filter(t => !existingIds.has(t.teamId));
  const combined = [...source, ...missing];

  const sTeam = StudentService.getTeam();

  return combined.map(team => {
    const isStudent = isMatchingStudentTeam(team, sTeam);

    // 1. Teams other than the active student team: Strip mock placeholders, preserve real submissions
    if (!isStudent) {
      const isMockTitle = (
        team.projectTitle === 'Wildfire Prediction Mesh Network' || 
        team.projectTitle === 'Automated Legal Document Summarizer' || 
        team.projectTitle === 'Autonomous Solar Panel Cleaning Drone'
      );

      const hasTitle = Boolean(!isMockTitle && team.projectTitle && team.projectTitle.trim());
      const isApproved = team.titleStatus === 'Approved';
      const status = isApproved ? 'Approved' : (hasTitle ? 'Pending' : 'No Submission');

      return {
        ...team,
        submissions: isMockTitle ? [] : (team.submissions || []),
        projectTitle: isMockTitle ? '' : (team.projectTitle || ''),
        problemStatement: (team.problemStatement && team.problemStatement.toLowerCase().includes('wildfire')) ? '' : (team.problemStatement || ''),
        proposedSolution: (team.proposedSolution && team.proposedSolution.toLowerCase().includes('mesh')) ? '' : (team.proposedSolution || ''),
        technologiesUsed: isMockTitle ? [] : (team.technologiesUsed || []),
        githubUrl: isMockTitle ? '' : (team.githubUrl || ''),
        liveDemoUrl: isMockTitle ? '' : (team.liveDemoUrl || ''),
        abstract: isMockTitle ? '' : (team.abstract || ''),
        titleStatus: status,
        titleLocked: isApproved,
        latestSubmissionStatus: isApproved ? 'Title Approved – Ready for Weekly Sprints' : (hasTitle ? 'Proposal Details Submitted for Guide Review' : 'No Submission')
      };
    }

    // 2. Active Student Team: Synchronize strictly with real student submissions
    try {
      const d1 = StudentService.getDeliverables('Submission 1', sTeam.id);
      const studentSubs = StudentService.getSubmissions() || [];

      // Filter out any legacy mock submissions
      const validSubs = studentSubs.filter(sub => {
        if (!sub || typeof sub !== 'object') return false;
        if (sub.presentationFile === 'mock_ppt_w0' || sub.presentationFile === 'Week0_Topic_Feasibility_Tarunika.pptx') return false;
        if (sub.title === 'Topic Finalization & Feasibility Defense') return false;
        return true;
      });

      // Check Submissions 2, 3, 4 (weeks 2, 3, 4) for real submitted deliverables
      for (let w = 2; w <= 4; w++) {
        const subNum = w;
        if (!validSubs.some(s => s.week === w)) {
          const dW = StudentService.getDeliverables(`Submission ${subNum}`, sTeam.id);
          const hasActualSubmission = Boolean(
            dW.submittedFields?.technologyUsed ||
            dW.submittedFields?.obstaclesFaced ||
            dW.submittedFields?.abstract ||
            dW.submittedFields?.presentation ||
            dW.submittedFields?.report ||
            dW.submittedFields?.repoUrl ||
            dW.submittedFields?.demoUrl ||
            dW.submittedFields?.screenshot
          );
          if (hasActualSubmission) {
            const subMarks = MarksService.getWeeklyMarks(sTeam.id || team.teamId, subNum);
            const isApproved = StudentService.isSubmissionApproved(subNum, sTeam.id) || 
                               Boolean(subMarks && (subMarks.teamAverage > 0 || (subMarks.memberMarks && Object.keys(subMarks.memberMarks).length > 0)));

            validSubs.push({
              week: w,
              title: `Submission ${subNum} Deliverable Submission`,
              dueDate: `Submission ${subNum}`,
              status: isApproved ? 'Approved' : 'Submitted',
              submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              projectTitle: dW.projectTitle || d1.projectTitle || sTeam.submittedTitle || sTeam.projectTitle || '',
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

      const hasStudentDetails = Boolean(
        sTeam.submittedTitle || 
        d1.projectTitle || 
        d1.problemStatement || 
        d1.solution || 
        d1.abstract || 
        d1.repoUrl || 
        d1.demoUrl || 
        d1.presentationFile || 
        d1.reportFile || 
        validSubs.length > 0
      );

      const titleVal = sTeam.submittedTitle || d1.projectTitle || (validSubs[0]?.projectTitle) || '';
      
      let currentTitleStatus = team.titleStatus;
      let currentRejectionReason = team.rejectionReason || '';

      if (sTeam.isTitleApproved || team.titleStatus === 'Approved') {
        currentTitleStatus = 'Approved';
      } else if (sTeam.guideApprovalStatus === 'Rejected' || team.titleStatus === 'Rejected') {
        currentTitleStatus = 'Rejected';
        currentRejectionReason = sTeam.rejectionReason || team.rejectionReason || '';
      } else if (hasStudentDetails) {
        currentTitleStatus = 'Pending';
      } else {
        currentTitleStatus = 'No Submission';
      }

      // If student resubmits after rejection, reset status to Pending
      if (sTeam.guideApprovalStatus === 'Pending' && currentTitleStatus === 'Rejected') {
        currentTitleStatus = 'Pending';
        currentRejectionReason = '';
      }

      const mappedSubmissions = validSubs.map(sub => {
        const subNum = sub.week;
        const dWeek = StudentService.getDeliverables(`Submission ${subNum}`, sTeam.id);
        const isPdf = Boolean(sub.pdfFile || (sub.presentationFile && sub.presentationFile.toLowerCase().endsWith('.pdf')) || (dWeek.reportFile && dWeek.reportFile.toLowerCase().endsWith('.pdf')));
        const isPpt = Boolean(sub.presentationFile && (sub.presentationFile.toLowerCase().endsWith('.ppt') || sub.presentationFile.toLowerCase().endsWith('.pptx')) || (dWeek.presentationFile && (dWeek.presentationFile.toLowerCase().endsWith('.ppt') || dWeek.presentationFile.toLowerCase().endsWith('.pptx'))));

        const subMarks = MarksService.getWeeklyMarks(sTeam.id || team.teamId, subNum);
        const hasMarks = Boolean(subMarks && (subMarks.teamAverage > 0 || (subMarks.memberMarks && Object.keys(subMarks.memberMarks).length > 0)));

        const isSubApproved = sub.week === 1
          ? (currentTitleStatus === 'Approved' || sub.status === 'Approved' || hasMarks)
          : (sub.status === 'Approved' || sub.evaluationStatus === 'Approved' || StudentService.isSubmissionApproved(subNum, sTeam.id) || hasMarks);

        const pFile = sub.presentationFile || dWeek.presentationFile || (sub.week === 1 ? d1.presentationFile : '') || '';
        const rFile = sub.pdfFile || dWeek.reportFile || (sub.week === 1 ? d1.reportFile : '') || '';
        const evalStatus = isSubApproved ? 'Approved' : (sub.status === 'Changes Requested' || sub.status === 'Rejected') ? 'Revision Required' : 'Pending';

        return {
          weekNumber: sub.week,
          submissionNumber: subNum,
          title: sub.title || `Submission ${subNum}`,
          submissionDate: sub.submissionDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          submissionStatus: isSubApproved ? 'Approved' : 'Submitted On Time',
          evaluationStatus: evalStatus,
          status: evalStatus === 'Approved' ? 'Approved' : evalStatus === 'Revision Required' ? 'Revision Required' : 'Submitted',
          isLocked: isSubApproved,
          score: subMarks?.teamAverage ?? subMarks?.score ?? sub.score ?? undefined,
          memberMarks: subMarks?.memberMarks || sub.memberMarks || undefined,
          guideRemarks: subMarks?.remarks || sub.comments || sub.guideRemarks || '',
          abstractSummary: sub.abstract || dWeek.abstract || (sub.week === 1 ? d1.abstract : '') || '',
          problemStatement: sub.problemStatement || dWeek.problemStatement || (sub.week === 1 ? d1.problemStatement : '') || '',
          proposedSolution: sub.solution || dWeek.solution || (sub.week === 1 ? d1.solution : '') || '',
          technologiesUsed: sub.technologyUsed ? sub.technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : (dWeek.technologyUsed ? dWeek.technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : (d1.technologyUsed ? d1.technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : [])),
          githubUrl: sub.repoUrl || dWeek.repoUrl || (sub.week === 1 ? d1.repoUrl : '') || '',
          liveDemoUrl: sub.demoUrl || dWeek.demoUrl || (sub.week === 1 ? d1.demoUrl : '') || '',
          presentationFileName: pFile,
          reportUrl: rFile || (isPdf ? pFile : ''),
          pptUrl: isPpt ? pFile : '',
          images: (sub.screenshotFile || dWeek.screenshotFile || (sub.week === 1 ? d1.screenshotFile : '')) ? [sub.screenshotFile || dWeek.screenshotFile || (sub.week === 1 ? d1.screenshotFile : '')] : [],
          obstaclesFaced: sub.obstaclesFaced || dWeek.obstaclesFaced || (sub.week === 1 ? d1.obstaclesFaced : '') || '',
          problemsFaced: sub.obstaclesFaced || dWeek.obstaclesFaced || (sub.week === 1 ? d1.obstaclesFaced : '') || '',
          nextWeekPlan: ''
        };
      });

      const pendingSub = mappedSubmissions.find(s => s.evaluationStatus === 'Pending' || s.evaluationStatus === 'Revision Required');

      return {
        ...team,
        projectTitle: titleVal,
        problemStatement: d0.problemStatement || validSubs[0]?.problemStatement || '',
        proposedSolution: d0.solution || validSubs[0]?.solution || '',
        technologiesUsed: d0.technologyUsed ? d0.technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : (validSubs[0]?.technologyUsed ? validSubs[0].technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : []),
        abstract: d0.abstract || validSubs[0]?.abstract || '',
        githubUrl: d0.repoUrl || validSubs[0]?.repoUrl || '',
        liveDemoUrl: d0.demoUrl || validSubs[0]?.demoUrl || '',
        submissions: mappedSubmissions,
        titleStatus: currentTitleStatus,
        titleLocked: currentTitleStatus === 'Approved',
        rejectionReason: currentRejectionReason,
        latestSubmissionStatus: pendingSub
          ? `Submission ${pendingSub.submissionNumber} Deliverables Submitted for Review`
          : currentTitleStatus === 'Approved'
          ? (mappedSubmissions.length > 0 ? `Submission ${mappedSubmissions[mappedSubmissions.length - 1].submissionNumber} Approved` : 'Title Approved – Ready for Weekly Sprints')
          : currentTitleStatus === 'Rejected'
          ? 'Proposal Rejected – Revision Mandated'
          : currentTitleStatus === 'Pending'
          ? 'Proposal Details Submitted for Guide Review'
          : 'No Submission'
      };
    } catch (e) {
      console.error('Error synchronizing student team:', e);
      return team;
    }
  });
};
