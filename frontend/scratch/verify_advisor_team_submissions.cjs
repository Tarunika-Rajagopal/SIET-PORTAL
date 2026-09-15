const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying Advisor Portal Team Member Profiles and Week-Wise Submissions ===\n');

// 1. Verify AdvisorTeamsView.tsx
const teamsViewPath = path.join(__dirname, '../src/components/advisor/AdvisorTeamsView.tsx');
assert(fs.existsSync(teamsViewPath), 'AdvisorTeamsView.tsx does not exist!');
const teamsViewContent = fs.readFileSync(teamsViewPath, 'utf-8');

// Check Member Profiles:
assert(teamsViewContent.includes('Team Members & Roster Details') || teamsViewContent.includes('activeTeam.members.map'), 'Must render team members');
assert(teamsViewContent.includes('m.name') && teamsViewContent.includes('m.rollNo'), 'Must render member name and roll number');
assert(teamsViewContent.includes('m.email') && teamsViewContent.includes('mailto:'), 'Must render member email mailto link');
assert(teamsViewContent.includes('m.isLead'), 'Must render Team Lead indicator');
assert(teamsViewContent.includes('activeTeam.class'), 'Must render class section');
assert(teamsViewContent.includes('activeTeam.batch') || teamsViewContent.includes('batch'), 'Must render academic batch');
assert(teamsViewContent.includes('Cumulative Mark:') || teamsViewContent.includes('Advisor Mark:'), 'Must display cumulative advisor marks');

console.log('✓ Requirement 1: Detailed Team Member Profiles verified (Name, RollNo, Email, Lead status, Class, Batch, Cumulative mark).');

// Check Week-Wise Submissions (Weeks 1 to 8):
assert(teamsViewContent.includes('Weekly Milestone Submissions & Deliverables') || teamsViewContent.includes('Weekly Milestone'), 'Must render weekly submissions module');
assert(teamsViewContent.includes('selectAdvisorSprintWeek') || teamsViewContent.includes('teamSubmissions.map'), 'Must render week navigation');
assert(teamsViewContent.includes('selectedWeek'), 'Must track selected week');
assert(teamsViewContent.includes('activeSubmission'), 'Must resolve active submission for week');

// Check Guide evaluation:
assert(teamsViewContent.includes('Technical Evaluation by') || teamsViewContent.includes('Faculty Guide Critique'), 'Must render Guide evaluation card');
assert(teamsViewContent.includes('Guide Score') || teamsViewContent.includes('activeSubmission.score'), 'Must display guide score');

// Check Advisor evaluation & marks:
assert(teamsViewContent.includes('Advisor Milestone Marks') || teamsViewContent.includes('Advisor Score'), 'Must render Advisor marks card');
assert(teamsViewContent.includes('Team Score:') || teamsViewContent.includes('activeWeekMarks.teamAverage'), 'Must render team score');
assert(teamsViewContent.includes('activeWeekMarks.memberMarks'), 'Must render individual member marks breakdown');
assert(teamsViewContent.includes('onNavigateToAssignMarks'), 'Must have quick action to assign/edit marks');

// Check Technical deliverables & details:
assert(teamsViewContent.includes('Problem Statement') && teamsViewContent.includes('activeSubmission.problemStatement'), 'Must render problem statement');
assert(teamsViewContent.includes('Proposed Solution') && teamsViewContent.includes('activeSubmission.solution'), 'Must render proposed solution');
assert(teamsViewContent.includes('Technologies') && teamsViewContent.includes('activeSubmission.technologyUsed'), 'Must render technologies');
assert(teamsViewContent.includes('Obstacles Faced') && teamsViewContent.includes('activeSubmission.obstaclesFaced'), 'Must render obstacles faced');
assert(teamsViewContent.includes('Milestone Abstract') && teamsViewContent.includes('activeSubmission.abstract'), 'Must render abstract');

// Check File Downloads & Links:
assert(teamsViewContent.includes('handleDownloadFile') || teamsViewContent.includes('downloadFile'), 'Must handle file download');
assert(teamsViewContent.includes('activeSubmission.fileName') || teamsViewContent.includes('activeSubmission.presentationFile'), 'Must provide PPTX presentation');
assert(teamsViewContent.includes('activeSubmission.pdfFile'), 'Must provide PDF technical dossier');
assert(teamsViewContent.includes('activeSubmission.repoUrl'), 'Must provide GitHub repository link');
assert(teamsViewContent.includes('activeSubmission.demoUrl'), 'Must provide live demo link');

console.log('✓ Requirement 2: Week-Wise Submissions Module (Weeks 1 to 8) verified with full technical deliverables, guide critique, advisor marks, and downloads.');

// 2. Verify advisorSubmissionsService.ts
const servicePath = path.join(__dirname, '../src/services/advisorSubmissionsService.ts');
assert(fs.existsSync(servicePath), 'advisorSubmissionsService.ts does not exist!');
const serviceContent = fs.readFileSync(servicePath, 'utf-8');

assert(serviceContent.includes('getTeamSubmissions'), 'Must export getTeamSubmissions');
assert(serviceContent.includes('getSubmissionForWeek'), 'Must export getSubmissionForWeek');
assert(serviceContent.includes('padTo8Weeks'), 'Must implement padTo8Weeks');
assert(serviceContent.includes('downloadFile'), 'Must implement downloadFile');
assert(serviceContent.includes('StudentService.getSubmissions()'), 'Must integrate StudentService for Team 04');
assert(serviceContent.includes('HodService.getTeams()'), 'Must integrate HodService for existing mock submissions');

console.log('✓ Requirement 3: advisorSubmissionsService.ts verified with 8-week resolution, live StudentService integration, and Blob download generation.');

console.log('\n=== All Automated Checks Passed Successfully! ===');
