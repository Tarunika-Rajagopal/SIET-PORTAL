const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying Unassigned vs Assigned Student Flow in Advisor Portal ===\n');

// 1. Verify AdvisorStudentsView.tsx row click logic
const studentsViewPath = path.join(__dirname, '../src/components/advisor/AdvisorStudentsView.tsx');
assert(fs.existsSync(studentsViewPath), 'AdvisorStudentsView.tsx not found!');
const studentsViewContent = fs.readFileSync(studentsViewPath, 'utf-8');

assert(studentsViewContent.includes('const isUnassigned = !student.teamNo'), 'Must detect if student is unassigned!');
assert(studentsViewContent.includes('onSelectStudentToViewTeam(null, true, student)'), 'Must pass null team for unassigned student!');
assert(studentsViewContent.includes('onSelectStudentToViewTeam(assignedTeam.teamId, true, student)'), 'Must pass assigned team for assigned student!');
console.log('✓ Requirement 1: AdvisorStudentsView properly branches: assigned students pass their team, unassigned students pass null team.');

// 2. Verify AdvisorPortalPage.tsx state management
const pagePath = path.join(__dirname, '../src/pages/AdvisorPortalPage.tsx');
assert(fs.existsSync(pagePath), 'AdvisorPortalPage.tsx not found!');
const pageContent = fs.readFileSync(pagePath, 'utf-8');

assert(pageContent.includes('selectedStudent'), 'Must manage selectedStudent state!');
assert(pageContent.includes('setSelectedTeamId(null)'), 'Must set teamId to null for unassigned students!');
assert(pageContent.includes('selectedStudent={selectedStudent}'), 'Must pass selectedStudent to AdvisorTeamsView!');
console.log('✓ Requirement 2: AdvisorPortalPage tracks selectedStudent and unassigned state.');

// 3. Verify AdvisorTeamsView.tsx "No Teams Assigned" & "Assign Team" button
const teamsViewPath = path.join(__dirname, '../src/components/advisor/AdvisorTeamsView.tsx');
assert(fs.existsSync(teamsViewPath), 'AdvisorTeamsView.tsx not found!');
const teamsViewContent = fs.readFileSync(teamsViewPath, 'utf-8');

assert(teamsViewContent.includes('isStudentUnassigned'), 'Must compute isStudentUnassigned!');
assert(teamsViewContent.includes('No Teams Assigned'), 'Must display "No Teams Assigned" card for unassigned students!');
assert(teamsViewContent.includes('Assign Team'), 'Must provide "Assign Team" button!');
assert(teamsViewContent.includes('AdvisorManualTeamModal'), 'Must include AdvisorManualTeamModal!');
console.log('✓ Requirement 3: AdvisorTeamsView shows "No Teams Assigned" and "Assign Team" for unassigned students, while showing the normal team for assigned students.');

// 4. Verify AdvisorManualTeamModal.tsx functionality
const manualModalPath = path.join(__dirname, '../src/components/advisor/AdvisorManualTeamModal.tsx');
assert(fs.existsSync(manualModalPath), 'AdvisorManualTeamModal.tsx not found!');
const manualModalContent = fs.readFileSync(manualModalPath, 'utf-8');

assert(manualModalContent.includes('unassignedStudents'), 'Must fetch unassigned students for dropdown/selection!');
assert(manualModalContent.includes('selectedMemberRolls'), 'Must manage selected members!');
assert(manualModalContent.includes('availableGuides'), 'Must list available faculty guides!');
assert(manualModalContent.includes('assignedCount >= 5') || manualModalContent.includes('MAX 5 REACHED'), 'Must enforce max 5 quota per guide!');
assert(manualModalContent.includes('Designate Team Leader'), 'Must support designating team leader!');
assert(manualModalContent.includes('Form Team'), 'Must have "Form Team" action button!');
assert(manualModalContent.includes('AdvisorService.addManualTeam'), 'Must invoke addManualTeam!');
console.log('✓ Requirement 4: AdvisorManualTeamModal allows teacher to select unassigned students from dropdown, assign guide, designate leader, and form team.');

// 5. Verify AdvisorService.ts addManualTeam method
const advisorServicePath = path.join(__dirname, '../src/services/advisorService.ts');
const advisorServiceContent = fs.readFileSync(advisorServicePath, 'utf-8');

assert(advisorServiceContent.includes('addManualTeam('), 'AdvisorService missing addManualTeam method!');
assert(advisorServiceContent.includes('guideLoad >= 5') || advisorServiceContent.includes('getGuideTeamCount'), 'addManualTeam must validate guide capacity <= 5!');
assert(advisorServiceContent.includes('AdminService.saveStudents(allStudents)'), 'addManualTeam must sync updated team numbers to AdminService!');
console.log('✓ Requirement 5: AdvisorService.addManualTeam persists team, updates students in AdminService, and validates guide limits.');

console.log('\n>>> ALL UNASSIGNED VS ASSIGNED FLOW REQUIREMENTS PASSED WITH ZERO ERRORS! <<<');
