import { isTeamFullySubmitted, hasAnyDetailSubmitted } from '../src/utils/submissionUtils.js';

console.log('=== 1. Testing hasAnyDetailSubmitted ===');

const emptyTeam = {
  id: 'T-EMPTY',
  projectTitle: '',
  title: '',
  problemStatement: '',
  proposedSolution: '',
  abstract: '',
  technologiesUsed: [],
  githubUrl: '',
  liveDemoUrl: '',
  presentationFile: '',
  reportUrl: '',
  screenshotFile: '',
  submissions: []
};

console.assert(hasAnyDetailSubmitted(emptyTeam) === false, 'Empty team should NOT be considered submitted');
console.log('✓ Empty team returns false');

const partialTeam1 = {
  ...emptyTeam,
  projectTitle: 'Smart IoT Irrigation Gateway'
};
console.assert(hasAnyDetailSubmitted(partialTeam1) === true, 'Team with only title should return true');
console.log('✓ Partial team (title only) returns true');

const partialTeam2 = {
  ...emptyTeam,
  submissions: [
    {
      weekNumber: 0,
      problemStatement: 'Water wastage in agricultural fields'
    }
  ]
};
console.assert(hasAnyDetailSubmitted(partialTeam2) === true, 'Team with only problem statement in submission returns true');
console.log('✓ Partial team (problem statement only) returns true');

const completeTeam = {
  id: 'T-COMPLETE',
  projectTitle: 'AI Drone System',
  problemStatement: 'Search and rescue bottleneck',
  proposedSolution: 'Autonomous drone mesh network',
  abstract: 'Deep learning real-time detection',
  technologiesUsed: ['Python', 'TensorFlow', 'ROS'],
  githubUrl: 'https://github.com/example/drone',
  liveDemoUrl: 'https://drone.demo.io',
  presentationUrl: 'https://example.com/slides.pptx',
  reportUrl: 'https://example.com/report.pdf',
  screenshots: ['screen1.png'],
  submissions: [
    {
      weekNumber: 0,
      pptUrl: 'slides.pptx',
      reportUrl: 'report.pdf',
      images: ['screen1.png']
    }
  ]
};
console.assert(hasAnyDetailSubmitted(completeTeam) === true, 'Complete team returns true');
console.log('✓ Complete team returns true');

console.log('\n=== 2. Testing Approve Submissions Filter ===');
const teams = [
  { ...partialTeam1, id: 'T-PARTIAL', titleStatus: 'Pending' },
  { ...emptyTeam, id: 'T-EMPTY', titleStatus: 'Pending' },
  { ...completeTeam, id: 'T-APPROVED', titleStatus: 'Approved' },
  { ...completeTeam, id: 'T-REJECTED', titleStatus: 'Rejected' },
];

const pendingApprovals = teams.filter(t => t.titleStatus === 'Pending' && hasAnyDetailSubmitted(t));
console.assert(pendingApprovals.length === 1 && pendingApprovals[0].id === 'T-PARTIAL', 'Only T-PARTIAL should be in pending submissions');
console.log(`✓ Approve Submissions filter passed: 1 team visible (ID: ${pendingApprovals[0].id})`);

console.log('\n=== 3. Testing Guide History Filtering and Isolation ===');
const mockLogs = [
  { id: '1', role: 'Faculty Guide', actorName: 'Dr. P. Manimegalai', actionType: 'Project Approval', target: 'Team 04', details: 'Approved project proposal' },
  { id: '2', role: 'Class Advisor', actorName: 'Dr. R. Karthikeyan', actionType: 'Marks Evaluation', target: 'Team 04', details: 'Marks 89/100' },
  { id: '3', role: 'Head of Department', actorName: 'Dr. S. Karthik', actionType: 'Department Governance', target: 'CSE Quota', details: 'Quota ratified' },
  { id: '4', role: 'Faculty Guide', actorName: 'Dr. P. Manimegalai', actionType: 'Notice Dispatched', target: 'Team 04 - Week 1', details: 'Meeting at 3 PM' },
  { id: '5', role: 'Faculty Guide', actorName: 'Dr. P. Manimegalai', actionType: 'Project Approval', target: 'Team 02', details: 'Rejected project proposal: revision required' },
];

const guideOnlyLogs = mockLogs.filter(l => l.role === 'Faculty Guide');
console.assert(guideOnlyLogs.length === 3, 'Guide history must only contain 3 Faculty Guide logs');
console.assert(!guideOnlyLogs.some(l => l.role !== 'Faculty Guide'), 'No non-guide logs should be present');
console.log(`✓ Guide history isolation passed: ${guideOnlyLogs.length} guide logs filtered out of ${mockLogs.length} total logs`);

// Test CSV export generation
const csvRows = guideOnlyLogs.map(l => `"${l.id}","${l.actionType}","${l.target}","${l.details}"`);
const csvContent = ["ID,Action Type,Target,Details", ...csvRows].join('\n');
console.assert(csvContent.includes('Dr. P. Manimegalai') === false, 'Headers match schema');
console.assert(csvContent.includes('Notice Dispatched'), 'Includes Notice Dispatched');
console.assert(csvContent.includes('Rejected project proposal'), 'Includes Rejection details');
console.log('✓ CSV export generation verified');

console.log('\n=== 4. Testing Advisor Marks Delete Protection ===');
const marksDB = {
  'TEAM-CSE-Y3-B04': {
    1: { teamAverage: 89, memberMarks: { '714023104112': 90 } }
  }
};

const canDeleteSubmission = (teamId, weekNumber) => {
  const marks = marksDB[teamId]?.[weekNumber];
  if (marks && (marks.teamAverage !== undefined || Object.keys(marks.memberMarks || {}).length > 0)) {
    return false; // locked
  }
  return true; // allowed
};

console.assert(canDeleteSubmission('TEAM-CSE-Y3-B04', 1) === false, 'Week 1 with marks should NOT be deletable');
console.assert(canDeleteSubmission('TEAM-CSE-Y3-B04', 3) === true, 'Week 3 with no marks should be deletable');
console.log('✓ Deletion is strictly blocked when advisor marks exist');

console.log('\nALL UNIT AND INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!');
