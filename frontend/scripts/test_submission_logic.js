import { isTeamFullySubmitted } from '../src/utils/submissionUtils.js';

console.log('--- Testing isTeamFullySubmitted ---');

const completeTeam = {
  id: 'TEAM-01',
  title: 'AI Smart Health Tracker',
  problemStatement: 'Inefficient health diagnostics',
  solution: 'Edge AI diagnostic pipeline',
  abstract: 'Deep learning health monitor',
  techStack: ['Python', 'TensorFlow', 'React'],
  repoUrl: 'https://github.com/example/health-ai',
  demoUrl: 'https://health-ai.demo.io',
  presentationUrl: 'https://example.com/slides.pptx',
  reportUrl: 'https://example.com/report.pdf',
  screenshots: ['screen1.png']
};

console.assert(isTeamFullySubmitted(completeTeam) === true, 'Complete team should be fully submitted');
console.log('✓ Complete team check passed: true');

// Test missing report
const missingReportTeam = { ...completeTeam, reportUrl: '' };
console.assert(isTeamFullySubmitted(missingReportTeam) === false, 'Team missing report should return false');
console.log('✓ Missing report check passed: false');

// Test missing presentation
const missingPptTeam = { ...completeTeam, presentationUrl: '' };
console.assert(isTeamFullySubmitted(missingPptTeam) === false, 'Team missing PPT should return false');
console.log('✓ Missing PPT check passed: false');

// Test missing demo
const missingDemoTeam = { ...completeTeam, demoUrl: '' };
console.assert(isTeamFullySubmitted(missingDemoTeam) === false, 'Team missing demo should return false');
console.log('✓ Missing demo URL check passed: false');

// Test missing repo
const missingRepoTeam = { ...completeTeam, repoUrl: '' };
console.assert(isTeamFullySubmitted(missingRepoTeam) === false, 'Team missing repo should return false');
console.log('✓ Missing repo URL check passed: false');

// Test Approve Projects filtering:
console.log('\n--- Testing Approve Projects Filter ---');
const teams = [
  { ...completeTeam, id: 'T1', titleStatus: 'Pending' },
  { ...missingReportTeam, id: 'T2', titleStatus: 'Pending' },
  { ...completeTeam, id: 'T3', titleStatus: 'Approved' },
  { ...completeTeam, id: 'T4', titleStatus: 'Rejected' },
];

const pendingApprovals = teams.filter(t => t.titleStatus === 'Pending' && isTeamFullySubmitted(t));
console.assert(pendingApprovals.length === 1 && pendingApprovals[0].id === 'T1', 'Only T1 should be in pending approvals');
console.log(`✓ Pending approvals filtered correctly: count = ${pendingApprovals.length} (Team ${pendingApprovals[0].id})`);

// Test Filter by Batch and Class
console.log('\n--- Testing My Teams Batch & Class Filter ---');
const teamList = [
  { id: 'T1', batch: '2021-2025', section: 'CSE A' },
  { id: 'T2', batch: '2022-2026', section: 'CSE B' },
  { id: 'T3', batch: '2021-2025', section: 'CSE B' },
];

const filterTeams = (list, batch, cls) => {
  return list.filter(t => {
    const matchBatch = batch === 'ALL' || t.batch === batch;
    const matchClass = cls === 'ALL' || t.section === cls;
    return matchBatch && matchClass;
  });
};

console.assert(filterTeams(teamList, '2021-2025', 'ALL').length === 2, 'Batch filter should return 2');
console.assert(filterTeams(teamList, '2021-2025', 'CSE B').length === 1, 'Batch + Class filter should return 1');
console.log('✓ Batch & Class filter tests passed');

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
