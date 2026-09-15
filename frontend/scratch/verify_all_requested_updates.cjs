const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING ALL REQUESTED UPDATES ACROSS ALL PORTALS ===\n');
let allPassed = true;

function check(title, condition, detail) {
  if (condition) {
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`[FAIL] ${title}: ${detail}`);
    allPassed = false;
  }
}

// 1. MyTeamView.tsx
const myTeamContent = fs.readFileSync(path.join(__dirname, '../src/components/student/MyTeamView.tsx'), 'utf-8');
check(
  'Student Portal - MyTeamView: Batch and Section displayed as pill badge',
  myTeamContent.includes('rounded-full bg-slate-50 border border-[#E2E8E4] text-xs text-slate-700 font-medium') &&
  myTeamContent.includes('Batch:') &&
  myTeamContent.includes('Section:'),
  'Pill badge styling missing in MyTeamView.tsx'
);

// 2. SubmissionView.tsx
const subViewContent = fs.readFileSync(path.join(__dirname, '../src/components/student/SubmissionView.tsx'), 'utf-8');
check(
  'Student Portal - SubmissionView: SubmittedBadge present and submit buttons disabled when submitted',
  subViewContent.includes('SubmittedBadge') &&
  subViewContent.includes('isFieldSubmitted') &&
  subViewContent.includes('cursor-not-allowed opacity-90') &&
  subViewContent.includes('Rejected'),
  'Submitted badge or disabled submit buttons missing in SubmissionView.tsx'
);

// 3. MySubmissionView.tsx
const mySubContent = fs.readFileSync(path.join(__dirname, '../src/components/student/MySubmissionView.tsx'), 'utf-8');
check(
  'Student Portal - MySubmissionView: Red color only on unsubmitted items',
  !mySubContent.includes('bg-rose-50/80') &&
  mySubContent.includes('s.week <= currentAcademicWeek') &&
  mySubContent.includes('isSubmitted ?'),
  'Red color rule or currentAcademicWeek filter failed in MySubmissionView.tsx'
);

// 4. AdvisorTeamsView.tsx
const advTeamsContent = fs.readFileSync(path.join(__dirname, '../src/components/advisor/AdvisorTeamsView.tsx'), 'utf-8');
check(
  'Advisor Portal - AdvisorTeamsView: Green banner and extra instructional text removed, weeks capped',
  !advTeamsContent.includes('Displaying Respective Team for Selected Student') &&
  !advTeamsContent.includes('Inspect week-by-week submissions, student deliverables') &&
  advTeamsContent.includes('s.week <= currentAcademicWeek'),
  'Banner, instructional text or week filter not satisfied in AdvisorTeamsView.tsx'
);

// 5. AdvisorStudentsView.tsx
const advStudentsContent = fs.readFileSync(path.join(__dirname, '../src/components/advisor/AdvisorStudentsView.tsx'), 'utf-8');
check(
  'Advisor Portal - AdvisorStudentsView: Only refresh during managing, organized settings card',
  advStudentsContent.includes('!isManageMode &&') &&
  advStudentsContent.includes('Class {className} Administrative Controls') &&
  advStudentsContent.includes('Exit Manage Mode'),
  'Manage button visibility or organized controls missing in AdvisorStudentsView.tsx'
);

// 6. HodProjectDetailsView.tsx
const hodContent = fs.readFileSync(path.join(__dirname, '../src/components/hod/HodProjectDetailsView.tsx'), 'utf-8');
check(
  'HOD Portal - HodProjectDetailsView: (Marks Cannot Be Modified by HOD) removed, weeks capped',
  !hodContent.includes('(Marks Cannot Be Modified by HOD)') &&
  !hodContent.includes('Select a week from the dropdown to inspect student submissions & guide review') &&
  hodContent.includes('filter(w => w <= currentAcademicWeek)') &&
  hodContent.includes('<span>Read-Only</span>'),
  'HOD details view updates failed'
);

// 7. GuideContext.jsx & SubmissionHistory.jsx
const guideCtxContent = fs.readFileSync(path.join(__dirname, '../src/context/GuideContext.jsx'), 'utf-8');
const guideHistContent = fs.readFileSync(path.join(__dirname, '../src/pages/guide/SubmissionHistory.jsx'), 'utf-8');
const myTeamsGuideContent = fs.readFileSync(path.join(__dirname, '../src/pages/guide/MyTeams.jsx'), 'utf-8');

check(
  'Guide Portal - GuideContext logs all actions to AdvisorHistoryService',
  guideCtxContent.includes('AdvisorHistoryService.addLog') &&
  guideCtxContent.includes('Title Approved: Team #') &&
  guideCtxContent.includes('Title Rejected: Team #') &&
  guideCtxContent.includes('Week ${weekNumber} Approved:') &&
  guideCtxContent.includes('Week ${weekNumber} Needs Revision:'),
  'AdvisorHistoryService logging missing in GuideContext'
);

check(
  'Guide Portal - SubmissionHistory & MyTeams: Milestones capped to current week',
  guideHistContent.includes('sub.weekNumber <= currentAcademicWeek') &&
  myTeamsGuideContent.includes('w.weekNumber <= currentAcademicWeek') &&
  !myTeamsGuideContent.includes('(Marks Cannot Be Modified by Guide)'),
  'Guide milestone capping or Read-Only update failed'
);

if (allPassed) {
  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===');
  process.exit(0);
} else {
  console.error('\n=== SOME VERIFICATIONS FAILED! ===');
  process.exit(1);
}
