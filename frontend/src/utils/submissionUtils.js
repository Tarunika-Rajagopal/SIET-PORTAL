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

  const techVal = team.technologiesUsed || team.techStack || team.technologyUsed || firstSub?.technologiesUsed || firstSub?.techStack || firstSub?.technologyUsed;
  const hasTechStack = Boolean(
    techVal && (Array.isArray(techVal) ? techVal.length > 0 : Boolean(String(techVal).trim()))
  );

  const gitVal = team.githubUrl || team.repoUrl || team.githubRepo || firstSub?.githubUrl || firstSub?.repoUrl;
  const hasGithub = Boolean(gitVal && String(gitVal).trim());

  const demoVal = team.liveDemoUrl || team.demoUrl || firstSub?.liveDemoUrl || firstSub?.demoUrl;
  const hasDemo = Boolean(demoVal && String(demoVal).trim());

  return Boolean(
    hasTitle &&
    hasProblemStatement &&
    hasSolution &&
    hasAbstract &&
    hasTechStack &&
    hasGithub &&
    hasDemo
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

  const techVal = team.technologiesUsed || team.techStack || team.technologyUsed || firstSub?.technologiesUsed || firstSub?.techStack || firstSub?.technologyUsed;
  const hasTechStack = Boolean(
    techVal && (Array.isArray(techVal) ? techVal.length > 0 : Boolean(String(techVal).trim()))
  );

  const gitVal = team.githubUrl || team.repoUrl || team.githubRepo || firstSub?.githubUrl || firstSub?.repoUrl;
  const hasGithub = Boolean(gitVal && String(gitVal).trim());

  const demoVal = team.liveDemoUrl || team.demoUrl || firstSub?.liveDemoUrl || firstSub?.demoUrl;
  const hasDemo = Boolean(demoVal && String(demoVal).trim());

  const hasAnyWeeklySubmission = Boolean(
    team.submissions && team.submissions.some(s => 
      s.weekNumber > 0 && (
        (s.submissionStatus && !s.submissionStatus.includes('Awaiting') && !s.submissionStatus.includes('Notice')) ||
        Boolean(s.abstractSummary) ||
        Boolean(s.githubUrl) ||
        Boolean(s.demoUrl) ||
        Boolean(s.liveDemoUrl)
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
    hasAnyWeeklySubmission
  );
};
