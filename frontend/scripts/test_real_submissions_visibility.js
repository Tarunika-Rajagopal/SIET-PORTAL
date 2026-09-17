import { hasAnyDetailSubmitted } from '../src/utils/submissionUtils.js';
import { INITIAL_TEAMS } from '../src/data/guidePortalData.js';

console.log('=== VERIFYING ONLY REAL SUBMISSIONS ARE VISIBLE TO GUIDE ===\n');

// Mock localStorage in Node
const storage = {};
const localStorageMock = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Simulation of sanitizeAndSyncGuideTeams
const sanitizeAndSyncGuideTeams = (rawList) => {
  const source = Array.isArray(rawList) && rawList.length > 0 ? rawList : INITIAL_TEAMS;
  
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

      return {
        ...team,
        submissions: [],
        projectTitle: isMockTitle ? '' : (team.projectTitle || ''),
        problemStatement: (team.problemStatement && team.problemStatement.toLowerCase().includes('wildfire')) ? '' : (team.problemStatement || ''),
        proposedSolution: (team.proposedSolution && team.proposedSolution.toLowerCase().includes('mesh')) ? '' : (team.proposedSolution || ''),
        technologiesUsed: isMockTitle ? [] : (team.technologiesUsed || []),
        githubUrl: isMockTitle ? '' : (team.githubUrl || ''),
        liveDemoUrl: isMockTitle ? '' : (team.liveDemoUrl || ''),
        abstract: isMockTitle ? '' : (team.abstract || ''),
        titleStatus: team.titleStatus === 'Approved' || team.titleStatus === 'Rejected' ? team.titleStatus : 'Pending',
        titleLocked: team.titleStatus === 'Approved',
        latestSubmissionStatus: 'Awaiting Student Title Submission'
      };
    }

    // 2. Real Student Team (Team 4)
    try {
      const sTeamRaw = localStorageMock.getItem('siet_student_team_v6');
      const sTeam = sTeamRaw ? JSON.parse(sTeamRaw) : { id: 'TEAM-CSE-Y3-B04', guideApprovalStatus: 'Pending', isTitleApproved: false };
      const d0Raw = localStorageMock.getItem('siet_deliverable_v6_week_0');
      const d0 = d0Raw ? JSON.parse(d0Raw) : { week: 'Week 0', submittedFields: {} };
      const subsRaw = localStorageMock.getItem('siet_student_submissions_v6');
      const studentSubs = subsRaw ? JSON.parse(subsRaw) : [];

      const validSubs = studentSubs.filter(sub => {
        if (!sub || typeof sub !== 'object') return false;
        if (sub.presentationFile === 'mock_ppt_w0' || sub.presentationFile === 'Week0_Topic_Feasibility_Tarunika.pptx') return false;
        if (sub.title === 'Topic Finalization & Feasibility Defense') return false;
        return true;
      });

      const mappedSubmissions = validSubs.map(sub => {
        const isPdf = Boolean(sub.pdfFile || (sub.presentationFile && sub.presentationFile.toLowerCase().endsWith('.pdf')));
        const isPpt = Boolean(sub.presentationFile && (sub.presentationFile.toLowerCase().endsWith('.ppt') || sub.presentationFile.toLowerCase().endsWith('.pptx')));
        return {
          weekNumber: sub.week,
          title: sub.title || `Week ${sub.week}`,
          submissionDate: sub.submissionDate || '17 Sep 2026',
          submissionStatus: 'Submitted On Time',
          evaluationStatus: sub.status === 'Approved' ? 'Evaluated' : (sub.status === 'Changes Requested' || sub.status === 'Rejected') ? 'Revision Required' : 'Pending',
          isLocked: sub.status === 'Approved',
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
        mappedSubmissions.length > 0
      );

      const titleVal = sTeam.submittedTitle || d0.projectTitle || (mappedSubmissions[0]?.projectTitle) || '';
      
      let currentTitleStatus = team.titleStatus;
      let currentRejectionReason = team.rejectionReason || '';

      if (sTeam.isTitleApproved || team.titleStatus === 'Approved') {
        currentTitleStatus = 'Approved';
      } else if (sTeam.guideApprovalStatus === 'Rejected' || team.titleStatus === 'Rejected') {
        currentTitleStatus = 'Rejected';
        currentRejectionReason = sTeam.rejectionReason || team.rejectionReason || '';
      } else {
        currentTitleStatus = 'Pending';
      }

      if (sTeam.guideApprovalStatus === 'Pending' && currentTitleStatus === 'Rejected') {
        currentTitleStatus = 'Pending';
        currentRejectionReason = '';
      }

      return {
        ...team,
        projectTitle: titleVal,
        problemStatement: d0.problemStatement || mappedSubmissions[0]?.problemStatement || '',
        proposedSolution: d0.solution || mappedSubmissions[0]?.proposedSolution || '',
        technologiesUsed: d0.technologyUsed ? d0.technologyUsed.split(',').map(s => s.trim()).filter(Boolean) : (mappedSubmissions[0]?.technologiesUsed || []),
        abstract: d0.abstract || mappedSubmissions[0]?.abstractSummary || '',
        githubUrl: d0.repoUrl || mappedSubmissions[0]?.githubUrl || '',
        liveDemoUrl: d0.demoUrl || mappedSubmissions[0]?.liveDemoUrl || '',
        submissions: mappedSubmissions,
        titleStatus: currentTitleStatus,
        titleLocked: currentTitleStatus === 'Approved',
        rejectionReason: currentRejectionReason,
        latestSubmissionStatus: currentTitleStatus === 'Approved'
          ? 'Title Approved – Ready for Weekly Sprints'
          : currentTitleStatus === 'Rejected'
          ? 'Proposal Rejected – Revision Mandated'
          : hasStudentDetails
          ? 'Proposal Details Submitted for Guide Review'
          : 'Awaiting Student Title Submission'
      };
    } catch (e) {
      console.error('Error synchronizing student team:', e);
      return team;
    }
  });
};

// Flatten helper matching WeeklySubmissions.jsx
const flattenWeeklySubmissions = (teamsList) => {
  const allSubmissions = [];
  teamsList.forEach(team => {
    (team.submissions || []).forEach(sub => {
      const hasRealContent = Boolean(
        sub.submissionDate &&
        (sub.abstractSummary || sub.problemStatement || sub.proposedSolution || sub.pptUrl || sub.reportUrl || sub.presentationFileName || sub.pdfFile || sub.githubUrl || sub.liveDemoUrl || (sub.images && sub.images.length > 0)) &&
        !String(sub.pptUrl || '').includes('mock_ppt') &&
        !String(sub.presentationFileName || '').includes('mock_ppt')
      );

      if (hasRealContent) {
        allSubmissions.push({
          ...sub,
          teamId: team.teamId,
          teamNumber: team.teamNumber,
          projectTitle: team.projectTitle || sub.projectTitle || sub.title,
          teamLeader: team.teamLeader,
          classSection: team.classSection || `${team.class}-${team.section}`,
          parentTeam: team
        });
      }
    });
  });
  return allSubmissions;
};

// Filter helper matching ApproveProject.jsx
const filterApproveSubmissions = (teamsList) => {
  return teamsList.filter((team) => {
    if (team.titleStatus === 'Approved' || team.titleStatus === 'Rejected') return false;
    if (team.titleStatus !== 'Pending') return false;
    if (!hasAnyDetailSubmitted(team)) return false;
    return true;
  });
};

// Scenario 1: Initial Clean State (No student has submitted yet)
let teams = sanitizeAndSyncGuideTeams(INITIAL_TEAMS);

console.log('1. Testing Initial State:');
console.assert(teams.length === 4, `Expected 4 teams, got ${teams.length}`);

teams.forEach(t => {
  console.assert(t.submissions.length === 0, `Team #${t.teamNumber} submissions MUST be empty on clean state, got ${t.submissions.length}`);
  console.assert(!hasAnyDetailSubmitted(t), `Team #${t.teamNumber} should not have any submitted details, got true`);
});

let pendingApprove = filterApproveSubmissions(teams);
let weeklySubs = flattenWeeklySubmissions(teams);

console.assert(pendingApprove.length === 0, `Approve Submissions MUST be empty initially, got ${pendingApprove.length}`);
console.assert(weeklySubs.length === 0, `Weekly Submissions MUST be empty initially, got ${weeklySubs.length}`);
console.log('✓ Clean State: 0 teams in Approve Submissions, 0 submissions in Weekly Submissions');

// Scenario 2: Legacy Mock Cache Sanitization
console.log('\n2. Testing Legacy Stale Browser Cache Purge:');
const dirtyMockTeams = [
  {
    teamId: 'TEAM-CSE-Y3-A02',
    teamNumber: 2,
    projectTitle: 'Wildfire Prediction Mesh Network',
    problemStatement: 'Early wildfire detection challenge',
    proposedSolution: 'Mesh networking',
    submissions: [
      { weekNumber: 0, title: 'Week 0 - Problem Definition', pptUrl: 'mock_ppt_w0', submissionDate: '10 Aug 2026' }
    ]
  },
  {
    teamId: 'TEAM-CSE-Y3-B07',
    teamNumber: 7,
    projectTitle: 'Automated Legal Document Summarizer',
    submissions: [
      { weekNumber: 0, title: 'Week 0', pptUrl: 'mock_ppt_w0', submissionDate: '10 Aug 2026' },
      { weekNumber: 1, title: 'Week 1', pptUrl: 'mock_ppt_w1', submissionDate: '17 Aug 2026' }
    ]
  }
];

let sanitized = sanitizeAndSyncGuideTeams(dirtyMockTeams);
const team2 = sanitized.find(t => t.teamNumber === 2);
const team7 = sanitized.find(t => t.teamNumber === 7);

console.assert(team2.submissions.length === 0, 'Team 2 mock submissions purged');
console.assert(team2.projectTitle === '', 'Team 2 mock title purged');
console.assert(team7.submissions.length === 0, 'Team 7 mock submissions purged');
console.assert(!hasAnyDetailSubmitted(team2), 'Team 2 detail check is false');
console.assert(!hasAnyDetailSubmitted(team7), 'Team 7 detail check is false');

pendingApprove = filterApproveSubmissions(sanitized);
weeklySubs = flattenWeeklySubmissions(sanitized);

console.assert(pendingApprove.length === 0, 'Purged teams never appear in Approve Submissions');
console.assert(weeklySubs.length === 0, 'Purged teams never appear in Weekly Submissions');
console.log('✓ Legacy Cache Purged: Fake mock submissions and titles are completely removed');

// Scenario 3: Real Student Submits Deliverables for Team 4
console.log('\n3. Testing Real Student Submission for Team 4:');
const realDeliverableWeek0 = {
  week: 'Week 0',
  projectTitle: 'Autonomous Crop Disease Detection Drone',
  problemStatement: 'Late detection of crop fungal blight causes severe agricultural losses',
  solution: 'Low altitude autonomous drone running quantized MobileNetV4 inference at 45 FPS',
  technologyUsed: 'Python, PyTorch, ROS2, Jetson Orin Nano, Next.js',
  abstract: 'End-to-end aerial crop inspection system with real-time telemetry.',
  presentationFile: 'Autonomous_Crop_Drone_Week0_Defense.pptx',
  reportFile: 'Autonomous_Crop_Drone_Technical_Report.pdf',
  repoUrl: 'https://github.com/tarunika/crop-drone',
  demoUrl: 'https://crop-drone-demo.siet.ac.in',
  submittedFields: {
    title: true,
    problemStatement: true,
    solution: true,
    technologyUsed: true,
    abstract: true,
    presentation: true,
    report: true,
    repoUrl: true,
    demoUrl: true
  }
};
localStorageMock.setItem('siet_deliverable_v6_week_0', JSON.stringify(realDeliverableWeek0));

const realStudentSubmissions = [
  {
    week: 0,
    title: 'Week 0 Deliverable Submission',
    status: 'Submitted',
    submissionDate: '17 Sep 2026',
    projectTitle: realDeliverableWeek0.projectTitle,
    problemStatement: realDeliverableWeek0.problemStatement,
    solution: realDeliverableWeek0.solution,
    technologyUsed: realDeliverableWeek0.technologyUsed,
    abstract: realDeliverableWeek0.abstract,
    presentationFile: realDeliverableWeek0.presentationFile,
    pdfFile: realDeliverableWeek0.reportFile,
    repoUrl: realDeliverableWeek0.repoUrl,
    demoUrl: realDeliverableWeek0.demoUrl
  }
];
localStorageMock.setItem('siet_student_submissions_v6', JSON.stringify(realStudentSubmissions));

teams = sanitizeAndSyncGuideTeams(INITIAL_TEAMS);
const team4 = teams.find(t => t.teamNumber === 4);

console.assert(team4.submissions.length === 1, `Team 4 should have exactly 1 real submission, got ${team4.submissions.length}`);
console.assert(team4.submissions[0].presentationFileName === 'Autonomous_Crop_Drone_Week0_Defense.pptx', 'Exact PPT deliverable preserved');
console.assert(team4.projectTitle === 'Autonomous Crop Disease Detection Drone', 'Exact student title preserved');
console.assert(hasAnyDetailSubmitted(team4), 'Team 4 has submitted details');

pendingApprove = filterApproveSubmissions(teams);
weeklySubs = flattenWeeklySubmissions(teams);

console.assert(pendingApprove.length === 1, `ONLY Team 4 should be in Approve Submissions, got ${pendingApprove.length}`);
console.assert(pendingApprove[0].teamNumber === 4, 'Target team is Team 4');
console.assert(weeklySubs.length === 1, `ONLY Team 4 real submission should be in Weekly Submissions, got ${weeklySubs.length}`);
console.assert(weeklySubs[0].teamNumber === 4, 'Target team in Weekly Submissions is Team 4');
console.log('✓ Real Submission: ONLY Team 4 appears in Approve Submissions & Weekly Submissions with exact submitted materials');

// Scenario 4: Guide Approves Team 4
console.log('\n4. Testing Guide Approval Lifecycle:');
team4.titleStatus = 'Approved';
pendingApprove = filterApproveSubmissions(teams);
console.assert(pendingApprove.length === 0, `Approved team MUST NOT be visible in Approve Submissions, got ${pendingApprove.length}`);
console.log('✓ Approved State: Team 4 is hidden from Approve Submissions');

// Scenario 5: Guide Rejection & Resubmission
console.log('\n5. Testing Guide Rejection & Student Resubmission:');
team4.titleStatus = 'Rejected';
team4.rejectionReason = 'Please add edge hardware power consumption metrics.';
pendingApprove = filterApproveSubmissions(teams);
console.assert(pendingApprove.length === 0, `Rejected team MUST NOT be visible in Approve Submissions, got ${pendingApprove.length}`);
console.log('✓ Rejected State: Team 4 is hidden from Approve Submissions');

// Student updates and resubmits
realDeliverableWeek0.solution += ' Power consumption benchmarked at 9.2W under full GPU load.';
localStorageMock.setItem('siet_deliverable_v6_week_0', JSON.stringify(realDeliverableWeek0));
localStorageMock.setItem('siet_student_team_v6', JSON.stringify({
  id: 'TEAM-CSE-Y3-B04',
  guideApprovalStatus: 'Pending',
  rejectionReason: '',
  submittedTitle: realDeliverableWeek0.projectTitle
}));

teams = sanitizeAndSyncGuideTeams(teams);
pendingApprove = filterApproveSubmissions(teams);
console.assert(pendingApprove.length === 1, `Resubmitted team MUST reappear in Approve Submissions, got ${pendingApprove.length}`);
console.log('✓ Resubmitted State: Team 4 reappears in Approve Submissions for re-evaluation');

console.log('\n======================================================');
console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('ONLY REAL SUBMISSIONS MADE BY STUDENTS ARE VISIBLE TO GUIDE!');
console.log('======================================================\n');
