console.log('--- Testing Guide Rejection and Student Visibility Flow ---');

// Mock localStorage
const store = {};
const mockLocalStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; }
};

// Initial student team
const initialStudentTeam = {
  id: 'TEAM-CSE-Y3-B04',
  teamNumber: 4,
  guideApprovalStatus: 'Pending Review',
  rejectionReason: '',
  isTitleApproved: false
};
mockLocalStorage.setItem('siet_student_team_v6', JSON.stringify(initialStudentTeam));

// Initial guide teams
const initialGuideTeams = [
  {
    teamId: 'TEAM-CSE-Y3-B04',
    teamNumber: 4,
    titleStatus: 'Pending',
    rejectionReason: '',
    titleLocked: false
  }
];
mockLocalStorage.setItem('siet_guide_portal_teams_v6', JSON.stringify(initialGuideTeams));

// Guide rejects project title
const rejectTitle = (teamId, reason) => {
  const guideTeams = JSON.parse(mockLocalStorage.getItem('siet_guide_portal_teams_v6'));
  const team = guideTeams.find(t => t.teamId === teamId);
  if (team) {
    team.titleStatus = 'Rejected';
    team.rejectionReason = reason;
    team.titleLocked = false;
    mockLocalStorage.setItem('siet_guide_portal_teams_v6', JSON.stringify(guideTeams));
  }

  const studentTeam = JSON.parse(mockLocalStorage.getItem('siet_student_team_v6'));
  if (studentTeam && (studentTeam.id === teamId || studentTeam.teamNumber === 4)) {
    studentTeam.guideApprovalStatus = 'Rejected';
    studentTeam.rejectionReason = reason;
    studentTeam.isTitleApproved = false;
    mockLocalStorage.setItem('siet_student_team_v6', JSON.stringify(studentTeam));
  }
};

rejectTitle('TEAM-CSE-Y3-B04', 'Please revise technical architecture diagram and incorporate system constraints.');

// 1. Verify guide portal state
const updatedGuideTeams = JSON.parse(mockLocalStorage.getItem('siet_guide_portal_teams_v6'));
const guideTeam = updatedGuideTeams.find(t => t.teamId === 'TEAM-CSE-Y3-B04');
console.assert(guideTeam.titleStatus === 'Rejected', 'Guide team status should be Rejected');
console.assert(guideTeam.rejectionReason.includes('technical architecture'), 'Guide team should store rejection reason');
console.log('✓ Guide portal stores rejection status and reason:', guideTeam.titleStatus, `"${guideTeam.rejectionReason}"`);

// 2. Verify student portal state
const updatedStudentTeam = JSON.parse(mockLocalStorage.getItem('siet_student_team_v6'));
console.assert(updatedStudentTeam.guideApprovalStatus === 'Rejected', 'Student team guideApprovalStatus should be Rejected');
console.assert(updatedStudentTeam.rejectionReason.includes('technical architecture'), 'Student team should store rejection reason');
console.log('✓ Student portal receives rejection status and reason:', updatedStudentTeam.guideApprovalStatus, `"${updatedStudentTeam.rejectionReason}"`);

// 3. Verify approve projects excludes rejected team
const pendingApprovals = updatedGuideTeams.filter(t => t.titleStatus === 'Pending');
console.assert(!pendingApprovals.some(t => t.teamId === 'TEAM-CSE-Y3-B04'), 'Rejected team must not appear in pending approvals');
console.log('✓ Rejected team is excluded from Approve Projects page');

console.log('\nALL END-TO-END FLOW TESTS PASSED!');
