const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying All New User Requirements ===\n');

// 1. Verify Green Hero Banner in AdvisorStudentsView.tsx
const studentsViewPath = path.join(__dirname, '../src/components/advisor/AdvisorStudentsView.tsx');
assert(fs.existsSync(studentsViewPath), 'AdvisorStudentsView.tsx not found!');
const studentsViewContent = fs.readFileSync(studentsViewPath, 'utf-8');

// Banner style and fields
assert(studentsViewContent.includes('bg-[#0B7A4D]') || studentsViewContent.includes('bg-mint-700'), 'Missing green hero banner!');
assert(studentsViewContent.includes('Advisor: {advisorName}'), 'Missing advisor name in hero banner!');
assert(studentsViewContent.includes('Class {className}'), 'Missing class in hero banner!');
assert(studentsViewContent.includes('BATCH {batch}'), 'Missing batch in hero banner!');

// ONLY 3 stat boxes: TOTAL STRENGTH, ASSIGNED TEAMS, UNASSIGNED STUDENTS
assert(studentsViewContent.includes('TOTAL STRENGTH'), 'Missing TOTAL STRENGTH stat box!');
assert(studentsViewContent.includes('ASSIGNED TEAMS'), 'Missing ASSIGNED TEAMS stat box!');
assert(studentsViewContent.includes('UNASSIGNED STUDENTS'), 'Missing UNASSIGNED STUDENTS stat box!');

// Ensure other screenshot badges like GUIDE MAPPED and MILESTONE STAGE are NOT present
assert(!studentsViewContent.includes('GUIDE MAPPED'), 'Must NOT include GUIDE MAPPED box!');
assert(!studentsViewContent.includes('MILESTONE STAGE'), 'Must NOT include MILESTONE STAGE box!');
console.log('✓ Requirement 1: Green hero banner matches screenshot with ONLY total strength, assigned teams, and unassigned students, plus advisor name, class, and batch.');

// 2. Verify Single Team View on Student Click Flow
assert(studentsViewContent.includes('onSelectStudentToViewTeam(assignedTeam.teamId, true, student)'), 'Row click must pass onlyShowTeam=true and student');

const pagePath = path.join(__dirname, '../src/pages/AdvisorPortalPage.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf-8');
assert(pageContent.includes('onlyShowStudentTeam'), 'AdvisorPortalPage missing onlyShowStudentTeam state!');
assert(pageContent.includes('setOnlyShowStudentTeam(false)'), 'Clicking View Teams tab directly must reset filter to show all teams!');

const teamsViewPath = path.join(__dirname, '../src/components/advisor/AdvisorTeamsView.tsx');
const teamsViewContent = fs.readFileSync(teamsViewPath, 'utf-8');
assert(teamsViewContent.includes('onlyShowStudentTeam && activeTeam'), 'AdvisorTeamsView must branch on onlyShowStudentTeam!');
assert(teamsViewContent.includes('Displaying Respective Team for Selected Student'), 'Must show banner when filtered to single team!');
assert(teamsViewContent.includes('View All Class Teams'), 'Must provide option to view all teams!');
console.log('✓ Requirement 2: Clicking a student displays ONLY that respective student\'s team in View Teams, while direct navigation displays all teams.');

// 3. Verify Download as PDF and Format Alone Preview
const pdfModalPath = path.join(__dirname, '../src/components/advisor/AdvisorHistoryPdfModal.tsx');
assert(fs.existsSync(pdfModalPath), 'AdvisorHistoryPdfModal.tsx not found!');
const pdfModalContent = fs.readFileSync(pdfModalPath, 'utf-8');
assert(pdfModalContent.includes('jsPDF'), 'Missing jsPDF import for actual PDF download!');
assert(pdfModalContent.includes('html2canvas'), 'Missing html2canvas import for high-res document rendering!');
assert(pdfModalContent.includes('pdf.save('), 'Must trigger actual client-side .pdf file download!');
assert(pdfModalContent.includes('Document Format Preview'), 'Must display document format alone before download!');
assert(pdfModalContent.includes('Sri Shakthi Institute of Engineering and Technology'), 'Must have official institutional letterhead!');
console.log('✓ Requirement 3: Download as PDF previews format alone first, then downloads authentic .pdf file via jsPDF/html2canvas.');

// 4. Verify History Navigation across Roles with Filters
const historyServicePath = path.join(__dirname, '../src/services/advisorHistoryService.ts');
const historyServiceContent = fs.readFileSync(historyServicePath, 'utf-8');
assert(historyServiceContent.includes('Class Advisor'), 'Missing Class Advisor role in history!');
assert(historyServiceContent.includes('Faculty Guide'), 'Missing Faculty Guide role in history!');
assert(historyServiceContent.includes('Head of Department'), 'Missing Head of Department role in history!');
assert(historyServiceContent.includes('Admin'), 'Missing Admin role in history!');

const historyViewPath = path.join(__dirname, '../src/components/advisor/AdvisorHistoryView.tsx');
const historyViewContent = fs.readFileSync(historyViewPath, 'utf-8');
assert(historyViewContent.includes('selectedRole'), 'Missing role filter in HistoryView!');
assert(historyViewContent.includes('selectedAction'), 'Missing action type filter in HistoryView!');
assert(historyViewContent.includes('fromDate'), 'Missing fromDate filter in HistoryView!');
assert(historyViewContent.includes('toDate'), 'Missing toDate filter in HistoryView!');
assert(historyViewContent.includes('searchTerm'), 'Missing search filter in HistoryView!');

const hodPagePath = path.join(__dirname, '../src/pages/HodPortalPage.tsx');
const hodPageContent = fs.readFileSync(hodPagePath, 'utf-8');
assert(hodPageContent.includes("activeTab === 'history'"), 'HOD Portal missing History tab!');

const guideLayoutPath = path.join(__dirname, '../src/layouts/GuideLayout.jsx');
const guideLayoutContent = fs.readFileSync(guideLayoutPath, 'utf-8');
assert(guideLayoutContent.includes("label: 'History'"), 'Guide Layout missing History navigation!');
console.log('✓ Requirement 4: History navigation displays changes by respective roles with filters for Role, Action, and Date range.');

// 5. Verify Student Portal Strictly Has NO History Options
const studentPagePath = path.join(__dirname, '../src/pages/StudentPortalPage.tsx');
const studentPageContent = fs.readFileSync(studentPagePath, 'utf-8');
assert(!studentPageContent.toLowerCase().includes('history'), 'StudentPortalPage must NEVER contain history navigation or options!');
console.log('✓ Requirement 5: Student Portal strictly contains NO history options or navigation.');

console.log('\n>>> ALL NEW REQUIREMENTS VERIFIED SUCCESSFULLY! <<<');
