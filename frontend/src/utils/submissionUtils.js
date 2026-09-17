/**
 * Evaluates whether a project team has submitted all required deliverables for endorsement.
 */
export const isTeamFullySubmitted = (team) => {
  if (!team) return false;

  const firstSub = team.submissions?.find(s => s.weekNumber === 0) || team.submissions?.[0];

  const titleVal = team.projectTitle || team.title;
  const hasTitle = Boolean(titleVal && String(titleVal).trim());

  const probVal = team.problemStatement || firstSub?.problemStatement;
  const hasProblemStatement = Boolean(probVal && String(probVal).trim());

  const solVal = team.proposedSolution || team.solution || firstSub?.proposedSolution || firstSub?.solution;
  const hasSolution = Boolean(solVal && String(solVal).trim());

  const absVal = team.abstract || team.projectDescription || team.abstractSummary || firstSub?.abstractSummary || firstSub?.abstract;
  const hasAbstract = Boolean(absVal && String(absVal).trim());

  const techVal = team.technologiesUsed || team.techStack || firstSub?.technologiesUsed || firstSub?.techStack;
  const hasTechStack = Boolean(
    techVal && (Array.isArray(techVal) ? techVal.length > 0 : Boolean(String(techVal).trim()))
  );

  const gitVal = team.githubUrl || team.repoUrl || team.githubRepo || firstSub?.githubUrl || firstSub?.repoUrl;
  const hasGithub = Boolean(gitVal && String(gitVal).trim());

  const demoVal = team.liveDemoUrl || team.demoUrl || firstSub?.liveDemoUrl || firstSub?.demoUrl;
  const hasDemo = Boolean(demoVal && String(demoVal).trim());

  const pptVal = team.presentationUrl || team.pptUrl || team.presentationFile || firstSub?.pptUrl || firstSub?.presentationFileName;
  const hasPpt = Boolean(pptVal && String(pptVal).trim());

  const repVal = team.reportUrl || team.pdfFile || team.pdfUrl || team.reportFile || firstSub?.reportUrl || firstSub?.pdfFile || (firstSub?.presentationFileName && firstSub.presentationFileName.toLowerCase().endsWith('.pdf'));
  const hasReport = Boolean(repVal && String(repVal).trim());

  const imgVal = team.screenshots || team.images || firstSub?.images;
  const hasImages = Boolean(
    (Array.isArray(imgVal) && imgVal.length > 0) ||
    Boolean(team.screenshotFile && String(team.screenshotFile).trim())
  );

  return Boolean(
    hasTitle &&
    hasProblemStatement &&
    hasSolution &&
    hasAbstract &&
    hasTechStack &&
    hasGithub &&
    hasDemo &&
    hasPpt &&
    hasReport &&
    hasImages
  );
};

/**
 * Checks if ANY detail or deliverable has been submitted by the student team.
 * If any detail is submitted, the team should be visible in Approve Submissions for guide evaluation.
 */
export const hasAnyDetailSubmitted = (team) => {
  if (!team) return false;

  const firstSub = team.submissions?.find(s => s.weekNumber === 0) || team.submissions?.[0];

  const titleVal = team.projectTitle || team.title;
  const hasTitle = Boolean(titleVal && String(titleVal).trim());

  const probVal = team.problemStatement || firstSub?.problemStatement;
  const hasProblemStatement = Boolean(probVal && String(probVal).trim());

  const solVal = team.proposedSolution || team.solution || firstSub?.proposedSolution || firstSub?.solution;
  const hasSolution = Boolean(solVal && String(solVal).trim());

  const absVal = team.abstract || team.projectDescription || team.abstractSummary || firstSub?.abstractSummary || firstSub?.abstract;
  const hasAbstract = Boolean(absVal && String(absVal).trim());

  const techVal = team.technologiesUsed || team.techStack || firstSub?.technologiesUsed || firstSub?.techStack;
  const hasTechStack = Boolean(
    techVal && (Array.isArray(techVal) ? techVal.length > 0 : Boolean(String(techVal).trim()))
  );

  const gitVal = team.githubUrl || team.repoUrl || team.githubRepo || firstSub?.githubUrl || firstSub?.repoUrl;
  const hasGithub = Boolean(gitVal && String(gitVal).trim());

  const demoVal = team.liveDemoUrl || team.demoUrl || firstSub?.liveDemoUrl || firstSub?.demoUrl;
  const hasDemo = Boolean(demoVal && String(demoVal).trim());

  const pptVal = team.presentationUrl || team.pptUrl || team.presentationFile || firstSub?.pptUrl || firstSub?.presentationFileName;
  const hasPpt = Boolean(pptVal && String(pptVal).trim() && !String(pptVal).includes('mock_ppt'));

  const repVal = team.reportUrl || team.pdfFile || team.pdfUrl || team.reportFile || firstSub?.reportUrl || firstSub?.pdfFile || (firstSub?.presentationFileName && firstSub.presentationFileName.toLowerCase().endsWith('.pdf'));
  const hasReport = Boolean(repVal && String(repVal).trim() && !String(repVal).includes('mock'));

  const imgVal = team.screenshots || team.images || firstSub?.images;
  const hasImages = Boolean(
    (Array.isArray(imgVal) && imgVal.length > 0) ||
    Boolean(team.screenshotFile && String(team.screenshotFile).trim())
  );

  const hasAnyWeeklySubmission = Boolean(
    team.submissions && team.submissions.some(s => 
      s.weekNumber > 0 && (
        (s.submissionStatus && !s.submissionStatus.includes('Awaiting') && !s.submissionStatus.includes('Notice')) ||
        Boolean(s.abstractSummary) ||
        Boolean(s.githubUrl) ||
        Boolean(s.pptUrl && !String(s.pptUrl).includes('mock')) ||
        Boolean(s.reportUrl && !String(s.reportUrl).includes('mock'))
      )
    )
  );

  return Boolean(
    hasTitle ||
    hasProblemStatement ||
    hasSolution ||
    hasAbstract ||
    hasTechStack ||
    hasGithub ||
    hasDemo ||
    hasPpt ||
    hasReport ||
    hasImages ||
    hasAnyWeeklySubmission
  );
};
