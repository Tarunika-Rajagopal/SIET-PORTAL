const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Running Verification for All Requested Updates ===');

// 1. Check GuideLayout.jsx
const guideLayoutPath = path.join(__dirname, '../src/layouts/GuideLayout.jsx');
const guideLayout = fs.readFileSync(guideLayoutPath, 'utf-8');
assert(!guideLayout.includes('Submission History'), 'GuideLayout still contains "Submission History"!');
console.log('✓ GuideLayout: "Submission History" successfully removed from navItems.');

// 2. Check ApproveProject.jsx
const approveProjPath = path.join(__dirname, '../src/pages/guide/ApproveProject.jsx');
const approveProj = fs.readFileSync(approveProjPath, 'utf-8');
assert(!approveProj.includes('Exclusive Faculty Guide Authority'), 'ApproveProject still has exclusive authority banner!');
assert(approveProj.includes('RefreshCw'), 'ApproveProject is missing RefreshCw symbol!');
assert(!approveProj.includes('cohort scopes'), 'ApproveProject still mentions cohort scopes!');
console.log('✓ ApproveProject: Exclusive banner removed, cohort replaced, RefreshCw button added.');

// 3. Check TeamDetailsModal.jsx
const teamDetailsPath = path.join(__dirname, '../src/components/guide/TeamDetailsModal.jsx');
const teamDetails = fs.readFileSync(teamDetailsPath, 'utf-8');
assert(!teamDetails.includes('Assigned Sub-Role'), 'TeamDetailsModal still has "Assigned Sub-Role" column!');
assert(!teamDetails.includes('Enrolled Student Cohort Roster'), 'TeamDetailsModal still has Cohort Roster title!');
console.log('✓ TeamDetailsModal: Assigned sub-role removed, cohort title replaced.');

// 4. Check ApproveConfirmModal.jsx
const approveConfirmPath = path.join(__dirname, '../src/components/guide/ApproveConfirmModal.jsx');
const approveConfirm = fs.readFileSync(approveConfirmPath, 'utf-8');
assert(approveConfirm.includes('Total Students'), 'ApproveConfirmModal missing "Total Students"!');
assert(!approveConfirm.includes('Cohort Strength'), 'ApproveConfirmModal still mentions "Cohort Strength"!');
console.log('✓ ApproveConfirmModal: "Total Students" replaced "Cohort Strength".');

// 5. Check GuidePortalPage.tsx redirect
const guidePortalPath = path.join(__dirname, '../src/pages/GuidePortalPage.tsx');
const guidePortal = fs.readFileSync(guidePortalPath, 'utf-8');
assert(guidePortal.includes('path="submission-history" element={<Navigate to="/guide/teams" replace />}'), 'GuidePortalPage missing submission-history redirect to /guide/teams!');
console.log('✓ GuidePortalPage: Redirect /guide/submission-history to /guide/teams confirmed.');

// 6. Check MyTeams.jsx
const myTeamsPath = path.join(__dirname, '../src/pages/guide/MyTeams.jsx');
const myTeams = fs.readFileSync(myTeamsPath, 'utf-8');
assert(myTeams.includes('RefreshCw'), 'MyTeams missing RefreshCw button!');
assert(myTeams.includes('handleApproveWeek'), 'MyTeams missing weekly approval action!');
assert(myTeams.includes('handleDownloadFile'), 'MyTeams missing authentic file downloads!');
assert(myTeams.includes('All Assigned Teams'), 'MyTeams missing list of all assigned teams!');
assert(myTeams.includes('W{sub.weekNumber}'), 'MyTeams missing weekly milestone list!');
assert(!myTeams.includes('Assigned Sub-Role'), 'MyTeams has assigned sub-role!');
console.log('✓ MyTeams: Fully overhauled to mirror student MySubmission with weekly approval & downloads.');

// 7. Check HodStudentsView.tsx
const hodStudentsPath = path.join(__dirname, '../src/components/hod/HodStudentsView.tsx');
const hodStudents = fs.readFileSync(hodStudentsPath, 'utf-8');
assert(!hodStudents.includes('Class Student Cohort (12 Students)'), 'HodStudentsView still has screenshot banner!');
assert(hodStudents.includes('RefreshCw'), 'HodStudentsView missing RefreshCw button!');
console.log('✓ HodStudentsView: Screenshot banner removed, clean filter row with RefreshCw added.');

// 8. Check HodProjectDetailsView.tsx
const hodProjPath = path.join(__dirname, '../src/components/hod/HodProjectDetailsView.tsx');
const hodProj = fs.readFileSync(hodProjPath, 'utf-8');
assert(hodProj.includes("setSearchTerm('')"), 'HodProjectDetailsView handleSearchClick does not clear text!');
assert(!hodProj.includes('Click any team to inspect details'), 'HodProjectDetailsView still has "Click any team to inspect details"!');
assert(!hodProj.includes('% Progress'), 'HodProjectDetailsView still shows "% Progress"!');
assert(hodProj.includes('RefreshCw'), 'HodProjectDetailsView missing RefreshCw button!');
console.log('✓ HodProjectDetailsView: Search click clears text and resets filters, helper removed, progress % hidden, RefreshCw added.');

// 9. Check HodAdvisorsView.tsx
const hodAdvisorsPath = path.join(__dirname, '../src/components/hod/HodAdvisorsView.tsx');
const hodAdvisors = fs.readFileSync(hodAdvisorsPath, 'utf-8');
assert(hodAdvisors.includes('RefreshCw'), 'HodAdvisorsView missing RefreshCw button!');
console.log('✓ HodAdvisorsView: RefreshCw button verified.');

// 10. Check AdvisorPortalPage.tsx
const advisorPath = path.join(__dirname, '../src/pages/AdvisorPortalPage.tsx');
const advisor = fs.readFileSync(advisorPath, 'utf-8');
assert(!advisor.includes('{t.progress}%'), 'AdvisorPortalPage still shows {t.progress}%!');
assert(!advisor.includes('Cohort & Guide Mapping'), 'AdvisorPortalPage still mentions Cohort & Guide Mapping!');
assert(advisor.includes('RefreshCw'), 'AdvisorPortalPage missing RefreshCw button!');
console.log('✓ AdvisorPortalPage: Progress % removed, Cohort replaced, RefreshCw button added.');

// 11. Check Admin Views for RefreshCw
const adminAdvisors = fs.readFileSync(path.join(__dirname, '../src/components/admin/AdminAdvisorsView.tsx'), 'utf-8');
const adminStudents = fs.readFileSync(path.join(__dirname, '../src/components/admin/AdminStudentsView.tsx'), 'utf-8');
const adminGuides = fs.readFileSync(path.join(__dirname, '../src/components/admin/AdminGuidesView.tsx'), 'utf-8');
const adminHistory = fs.readFileSync(path.join(__dirname, '../src/components/admin/AdminHistoryView.tsx'), 'utf-8');
assert(adminAdvisors.includes('RefreshCw'), 'AdminAdvisorsView missing RefreshCw!');
assert(adminStudents.includes('RefreshCw'), 'AdminStudentsView missing RefreshCw!');
assert(adminGuides.includes('RefreshCw'), 'AdminGuidesView missing RefreshCw!');
assert(adminHistory.includes('RefreshCw'), 'AdminHistoryView missing RefreshCw!');
console.log('✓ Admin Views: RefreshCw button verified across Advisors, Students, Guides, and History views.');

// 12. Check that marks references like "Awarded 92/100" are removed
const hodService = fs.readFileSync(path.join(__dirname, '../src/services/hodService.ts'), 'utf-8');
assert(!hodService.includes('92/100'), 'hodService still contains "92/100" marks reference!');
console.log('✓ hodService: Marks string references removed.');

// 13. Check global absence of "cohort" in src (case-insensitive)
function checkNoCohort(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkNoCohort(fullPath);
    } else if (entry.isFile() && /\.(jsx|js|tsx|ts)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = content.match(/\bcohort\b/i);
      assert(!matches, `File ${fullPath} contains "cohort" reference!`);
    }
  }
}
checkNoCohort(path.join(__dirname, '../src'));
console.log('✓ Universal check: "cohort" has been eliminated across all source files in src/.');

console.log('\nAll verification checks PASSED successfully!');
