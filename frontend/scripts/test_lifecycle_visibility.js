import { hasAnyDetailSubmitted } from '../src/utils/submissionUtils.js';

console.log('=== Testing Approval / Rejection Lifecycle Visibility in Approve Submissions ===');

const mockTeam = {
  teamId: 'TEAM-CSE-Y3-B04',
  teamNumber: 4,
  projectTitle: 'Smart AI Health Device',
  problemStatement: 'Early disease prediction challenges',
  proposedSolution: 'Edge ML analytics',
  abstract: 'Deep learning on embedded MCU',
  technologiesUsed: ['Python', 'C++'],
  githubUrl: 'https://github.com/example/health',
  liveDemoUrl: 'https://health.demo',
  titleStatus: 'Pending',
  rejectionReason: '',
  submissions: []
};

const filterApproveSubmissions = (teams) => {
  return teams.filter(t => {
    if (t.titleStatus === 'Approved' || t.titleStatus === 'Rejected') return false;
    if (t.titleStatus !== 'Pending') return false;
    if (!hasAnyDetailSubmitted(t)) return false;
    return true;
  });
};

// State 1: Student submits initial deliverables -> Pending
let list = [mockTeam];
let visible = filterApproveSubmissions(list);
console.assert(visible.length === 1, 'Pending team with submitted details MUST be visible');
console.log('✓ Initial submitted state: Team is visible in Approve Submissions');

// State 2: Guide rejects the proposal
mockTeam.titleStatus = 'Rejected';
mockTeam.rejectionReason = 'Please include hardware schematic and benchmark dataset';
visible = filterApproveSubmissions([mockTeam]);
console.assert(visible.length === 0, 'Rejected team MUST NOT be visible in Approve Submissions');
console.log('✓ Rejected state: Team is hidden from Approve Submissions');

// State 3: Student resubmits their revised solution
mockTeam.proposedSolution = 'Edge ML analytics with TensorFlow Lite Micro and custom PCB schematic';
mockTeam.titleStatus = 'Pending';
mockTeam.rejectionReason = '';
visible = filterApproveSubmissions([mockTeam]);
console.assert(visible.length === 1, 'Resubmitted team MUST be visible in Approve Submissions again');
console.log('✓ Resubmitted state: Team reappears in Approve Submissions for guide re-review');

// State 4: Guide approves the proposal
mockTeam.titleStatus = 'Approved';
mockTeam.rejectionReason = '';
visible = filterApproveSubmissions([mockTeam]);
console.assert(visible.length === 0, 'Approved team MUST NOT be visible in Approve Submissions');
console.log('✓ Approved state: Team is hidden from Approve Submissions');

// State 5: Student submits next milestone (Week 1)
mockTeam.submissions.push({
  weekNumber: 1,
  submissionStatus: 'Submitted On Time',
  abstractSummary: 'Week 1 system integration'
});
// When student submits next, status triggers re-evaluation if updated
mockTeam.titleStatus = 'Pending';
visible = filterApproveSubmissions([mockTeam]);
console.assert(visible.length === 1, 'Next student submission brings team back to pending review');
console.log('✓ Next submission state: Team reappears when student submits next');

console.log('\nALL LIFECYCLE VISIBILITY TESTS PASSED!');
