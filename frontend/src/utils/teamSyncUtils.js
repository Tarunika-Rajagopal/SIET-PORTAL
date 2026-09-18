import { INITIAL_TEAMS } from '../data/guidePortalData.js';
import { StudentService } from '../services/studentService';

/**
 * Ensures strictly real student submissions are visible to the guide:
 * 1. Non-student teams NEVER have mock submissions or mock titles.
 * 2. The real student team (Team 4) synchronizes strictly with actual submissions from StudentService.
 */
export const sanitizeAndSyncGuideTeams = (rawList) => {
  const source = Array.isArray(rawList) && rawList.length > 0 ? rawList : INITIAL_TEAMS;
  
  // Guarantee all INITIAL_TEAMS exist (e.g. CSE-A, CSE-B, CSE-C)
  const existingIds = new Set(source.map(t => t.teamId));
  const missing = INITIAL_TEAMS.filter(t => !existingIds.has(t.teamId));
  const combined = [...source, ...missing];

  return combined.map(team => {
    // 1. Teams other than the real student team (Team 4) MUST NEVER have mock submissions or mock titles
    if (team.teamId !== 'TEAM-CSE-Y3-B04' && team.teamNumber !== 4) {
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

    // 2. Real Student Team (Team 4): Synchronize strictly with real student submissions
    try {
      const sTeam = StudentService.getTeam();
      const d0 = StudentService.getDeliverables('Week 0');
      const studentSubs = StudentService.getSubmissions() || [];

      // Filter out any legacy mock submissions
      const validSubs = studentSubs.filter(sub => {
        if (!sub || typeof sub !== 'object') return false;
        if (sub.presentationFile === 'mock_ppt_w0' || sub.presentationFile === 'Week0_Topic_Feasibility_Tarunika.pptx') return false;
        if (sub.title === 'Topic Finalization & Feasibility Defense') return false;
        return true;
      });

      const hasStudentDetails = Boolean(
        sTeam.submittedTitle || 
        d0.projectTitle || 
        d0.problemStatement || 
        d0.solution || 
        d0.abstract || 
        d0.repoUrl || 
        d0.demoUrl || 
        d0.presentationFile || 
        d0.reportFile || 
        validSubs.length > 0
      );

      const titleVal = sTeam.submittedTitle || d0.projectTitle || (validSubs[0]?.projectTitle) || '';
      
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
        const isPdf = Boolean(sub.pdfFile || (sub.presentationFile && sub.presentationFile.toLowerCase().endsWith('.pdf')));
        const isPpt = Boolean(sub.presentationFile && (sub.presentationFile.toLowerCase().endsWith('.ppt') || sub.presentationFile.toLowerCase().endsWith('.pptx')));
        const isSubApproved = currentTitleStatus === 'Approved' || sub.status === 'Approved';

        return {
          weekNumber: sub.week,
          title: sub.title || `Week ${sub.week}`,
          submissionDate: sub.submissionDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          submissionStatus: isSubApproved ? 'Approved' : 'Submitted On Time',
          evaluationStatus: isSubApproved ? 'Approved' : (sub.status === 'Changes Requested' || sub.status === 'Rejected') ? 'Revision Required' : 'Pending',
          isLocked: isSubApproved,
          guideRemarks: sub.comments || '',
          abstractSummary: sub.abstract || d0.abstract || '',
          problemStatement: sub.problemStatement || d0.problemStatement || '',
          proposedSolution: sub.solution || d0.solution || '',
          technologiesUsed: sub.technologyUsed ? sub.technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : (d0.technologyUsed ? d0.technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : []),
          githubUrl: sub.repoUrl || d0.repoUrl || '',
          liveDemoUrl: sub.demoUrl || d0.demoUrl || '',
          presentationFileName: sub.presentationFile || '',
          reportUrl: sub.pdfFile || (isPdf ? sub.presentationFile : ''),
          pptUrl: isPpt ? sub.presentationFile : '',
          images: sub.screenshotFile ? [sub.screenshotFile] : [],
          obstaclesFaced: sub.obstaclesFaced || d0.obstaclesFaced || '',
          problemsFaced: sub.obstaclesFaced || d0.obstaclesFaced || '',
          nextWeekPlan: ''
        };
      });

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
        latestSubmissionStatus: currentTitleStatus === 'Approved'
          ? 'Title Approved – Ready for Weekly Sprints'
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
