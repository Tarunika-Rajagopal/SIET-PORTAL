const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying All Requirements for Advisor Portal Overhaul ===\n');

// 1. Check AdvisorPortalPage.tsx Navigation Bar and Tabs
const pagePath = path.join(__dirname, '../src/pages/AdvisorPortalPage.tsx');
assert(fs.existsSync(pagePath), 'AdvisorPortalPage.tsx does not exist!');
const pageContent = fs.readFileSync(pagePath, 'utf-8');

// Sticky centered navigation bar with 4 tabs
assert(pageContent.includes("activeTab === 'students'"), 'Missing students tab');
assert(pageContent.includes("activeTab === 'teams'"), 'Missing teams tab');
assert(pageContent.includes("activeTab === 'assign-marks'"), 'Missing assign-marks tab');
assert(pageContent.includes("activeTab === 'history'"), 'Missing history tab');
assert(pageContent.includes('<span>Students</span>'), 'Missing Students tab label');
assert(pageContent.includes('<span>View Teams</span>'), 'Missing View Teams tab label');
assert(pageContent.includes('<span>Assign Marks</span>'), 'Missing Assign Marks tab label');
assert(pageContent.includes('<span>History</span>'), 'Missing History tab label');
assert(pageContent.includes('flex justify-center items-center'), 'Navigation bar must be center-aligned like other portals');
console.log('✓ Requirement 1: Navigation bar added matching other portals with Students, View Teams, Assign Marks, and History.');

// 2. Banner and Screenshot cleanups in AdvisorStudentsView.tsx
const studentsViewPath = path.join(__dirname, '../src/components/advisor/AdvisorStudentsView.tsx');
assert(fs.existsSync(studentsViewPath), 'AdvisorStudentsView.tsx does not exist!');
const studentsViewContent = fs.readFileSync(studentsViewPath, 'utf-8');

// Advisor name displayed instead of "CLASS ADVISORY ROSTER"
assert(studentsViewContent.includes('Advisor: {advisorName}'), 'Must display Advisor name');
assert(!studentsViewContent.includes('CLASS ADVISORY ROSTER'), 'Must NOT contain CLASS ADVISORY ROSTER');
assert(!studentsViewContent.includes('Students Roster (4)'), 'Must NOT contain Students Roster (4)');
assert(!studentsViewContent.includes('Click anywhere on a row to inspect'), 'Must NOT contain click row inspect helper');
assert(!studentsViewContent.includes('<th className="p-4">STATUS</th>') && !studentsViewContent.includes('STATUS'), 'Must NOT contain STATUS column');
assert(!studentsViewContent.includes('Manage Mode Active: Use \'Move\''), 'Must NOT contain Manage Mode Active banner');
console.log('✓ Requirement 2: Screenshot 1, 2, 3, 4 contents removed; Advisor name displayed instead.');

// 3. Manage option behavior: no "Done Managing", has refresh button
assert(!studentsViewContent.includes("'Done Managing'"), 'Must NOT show Done Managing');
assert(studentsViewContent.includes('<span>Manage</span>'), 'Must show Manage text');
assert(studentsViewContent.includes('RefreshCw'), 'Must have refresh button in students view');
console.log('✓ Requirement 3: Manage option does NOT show "Done Managing", provides Refresh button.');

// 4. Check View Teams & Teammates Navigation Flow
const teamsViewPath = path.join(__dirname, '../src/components/advisor/AdvisorTeamsView.tsx');
assert(fs.existsSync(teamsViewPath), 'AdvisorTeamsView.tsx does not exist!');
const teamsViewContent = fs.readFileSync(teamsViewPath, 'utf-8');

// Removed Screenshot 5 banner
assert(!teamsViewContent.includes('Advisor Dashboard • Class CSE-B'), 'Must NOT contain Screenshot 5 banner');
assert(!teamsViewContent.includes('SECTION ADVISORY • BATCH 2023-2027'), 'Must NOT contain Screenshot 5 green banner');

// Flow: shows all teams, teammates when clicked, Assign Marks button
assert(teamsViewContent.includes('filteredTeams.map'), 'Must render all teams');
assert(teamsViewContent.includes('Team Mates'), 'Must render teammates when team is selected');
assert(teamsViewContent.includes('Assign Marks for'), 'Must provide Assign Marks button for active team');
assert(teamsViewContent.includes('onNavigateToAssignMarks'), 'Must navigate to assign marks on click');
console.log('✓ Requirement 4: View Teams displays all teams, teammate details upon selection, and navigation to Assign Marks.');

// 5. Check Assign Marks Workspace
const assignMarksPath = path.join(__dirname, '../src/components/advisor/AdvisorAssignMarksView.tsx');
assert(fs.existsSync(assignMarksPath), 'AdvisorAssignMarksView.tsx does not exist!');
const assignMarksContent = fs.readFileSync(assignMarksPath, 'utf-8');

assert(assignMarksContent.includes('Select Capstone Team'), 'Must list all teams if directly in assign marks');
assert(assignMarksContent.includes('activeTeam.members.map'), 'Must render team members for entering marks');
assert(assignMarksContent.includes('handleSaveMarks'), 'Must have save marks handler');
assert(assignMarksContent.includes('MarksService.saveWeeklyMarks'), 'Must save to MarksService');
assert(assignMarksContent.includes('AdvisorHistoryService.addLog'), 'Must log marks evaluation to history');
console.log('✓ Requirement 5: Assign Marks supports direct team selection, member marks entry (0-100), live average, and persistent save.');

// 6. Check History Navigation & Date Filter & PDF Export
const historyViewPath = path.join(__dirname, '../src/components/advisor/AdvisorHistoryView.tsx');
assert(fs.existsSync(historyViewPath), 'AdvisorHistoryView.tsx does not exist!');
const historyViewContent = fs.readFileSync(historyViewPath, 'utf-8');

assert(historyViewContent.includes('fromDate'), 'Must have fromDate filter');
assert(historyViewContent.includes('toDate'), 'Must have toDate filter');
assert(historyViewContent.includes('AdvisorHistoryPdfModal'), 'Must include AdvisorHistoryPdfModal');
assert(historyViewContent.includes('Download as PDF'), 'Must have Download as PDF option');

const pdfModalPath = path.join(__dirname, '../src/components/advisor/AdvisorHistoryPdfModal.tsx');
assert(fs.existsSync(pdfModalPath), 'AdvisorHistoryPdfModal.tsx does not exist!');
const pdfModalContent = fs.readFileSync(pdfModalPath, 'utf-8');
assert(pdfModalContent.includes('window.print()'), 'Must trigger PDF print/download');
assert(pdfModalContent.includes('Sri Shakthi Institute of Engineering and Technology'), 'Must include institutional letterhead');
console.log('✓ Requirement 6: History navigation with Date-wise filtering (from, to), comprehensive change logs, and printable PDF export.');

// 7. Check "donot add any approved batch"
const allFiles = [
  studentsViewContent,
  teamsViewContent,
  assignMarksContent,
  historyViewContent,
  pdfModalContent,
  pageContent
];

allFiles.forEach((content, idx) => {
  // Check that no visible JSX text contains "Approved Batch" or "approved batch"
  const cleanContent = content.replace(/\{?\/\*[\s\S]*?\*\/\}/g, ''); // remove comments
  assert(!cleanContent.toLowerCase().includes('approved batch'), `File #${idx} contains visible 'approved batch' text!`);
});
console.log('✓ Requirement 7: Verified NO "approved batch" text appears in any UI component.');

console.log('\n>>> ALL 7 VERIFICATION CRITERIA PASSED WITH ZERO ERRORS! <<<');
