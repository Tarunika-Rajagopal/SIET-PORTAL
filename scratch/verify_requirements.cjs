const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');

function readFile(relPath) {
  return fs.readFileSync(path.join(srcDir, relPath), 'utf-8');
}

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

console.log('--- 1. Guide Portal Navigation & Submission History ---');
const guideLayout = readFile('layouts/GuideLayout.jsx');
assert('GuideLayout has NO "Submission History" navItem', !guideLayout.includes('Submission History'));
assert('GuideLayout has Approve Project, My Teams, Weekly Submissions', 
  guideLayout.includes('Approve Project') && 
  guideLayout.includes('My Teams') && 
  guideLayout.includes('Weekly Submissions')
);

const guidePortalPage = readFile('pages/GuidePortalPage.tsx');
assert('GuidePortalPage redirects submission-history to teams', 
  guidePortalPage.includes('to="/guide/teams" replace')
);

console.log('\n--- 2. Guide Portal Approve Project & View Proposal ---');
const approveProject = readFile('pages/guide/ApproveProject.jsx');
assert('ApproveProject removed Exclusive Faculty Guide Authority banner', 
  !approveProject.includes('Exclusive Faculty Guide Authority')
);
assert('ApproveProject uses Students instead of Cohorts', 
  !approveProject.toLowerCase().includes('cohort')
);
assert('ApproveProject has RefreshCw button in filter row', 
  approveProject.includes('RefreshCw') && approveProject.includes('window.location.reload()')
);

const teamDetailsModal = readFile('components/guide/TeamDetailsModal.jsx');
assert('TeamDetailsModal removed "Assigned Sub-Role" column', 
  !teamDetailsModal.includes('Assigned Sub-Role')
);
assert('TeamDetailsModal uses Enrolled Students instead of Cohort', 
  !teamDetailsModal.toLowerCase().includes('cohort')
);

const approveConfirmModal = readFile('components/guide/ApproveConfirmModal.jsx');
assert('ApproveConfirmModal uses Total Students instead of Cohort Strength', 
  approveConfirmModal.includes('Total Students') && !approveConfirmModal.includes('Cohort Strength')
);

console.log('\n--- 3. Guide Portal Assigned Teams (MyTeams.jsx) ---');
const myTeams = readFile('pages/guide/MyTeams.jsx');
assert('MyTeams lists all assigned teams with filter & search', 
  myTeams.includes('All Assigned Teams') && myTeams.includes('filter')
);
assert('MyTeams has refresh button in filter row', 
  myTeams.includes('RefreshCw') && myTeams.includes('window.location.reload()')
);
assert('MyTeams shows team members without assigned roles', 
  myTeams.includes('Enrolled Students') && !myTeams.includes('Assigned Sub-Role')
);
assert('MyTeams shows all weeks', 
  myTeams.includes('ALL_WEEKS') || (myTeams.includes('Week 1') && myTeams.includes('Week 8'))
);
assert('MyTeams allows guide to approve / evaluate each week', 
  myTeams.includes('evaluateWeeklySubmission') && 
  myTeams.includes('Approve & Lock') && 
  myTeams.includes('Request Revision')
);
assert('MyTeams supports authentic PDF and PPT downloads', 
  myTeams.includes('handleDownloadFile') && 
  myTeams.includes('application/pdf') && 
  myTeams.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation')
);

console.log('\n--- 4. HOD Portal Students & Project Details ---');
const hodStudentsView = readFile('components/hod/HodStudentsView.tsx');
assert('HodStudentsView removed the promotional header banner', 
  !hodStudentsView.includes('Class Student Cohort (12 Students) Class Roster')
);
assert('HodStudentsView has RefreshCw button in filter row', 
  hodStudentsView.includes('RefreshCw') && hodStudentsView.includes('window.location.reload()')
);
assert('HodStudentsView replaces cohort with student', 
  !hodStudentsView.toLowerCase().includes('cohort')
);

const hodProjectDetails = readFile('components/hod/HodProjectDetailsView.tsx');
assert('HodProjectDetails search resets batch/class to ALL and clears text', 
  hodProjectDetails.includes("setBatchFilter('ALL')") && 
  hodProjectDetails.includes("setClassFilter('ALL')") && 
  hodProjectDetails.includes("setSearchTerm('')")
);
assert('HodProjectDetails removed "Click any team to inspect details"', 
  !hodProjectDetails.includes('Click any team to inspect details')
);
assert('HodProjectDetails has RefreshCw button in filter row', 
  hodProjectDetails.includes('RefreshCw') && hodProjectDetails.includes('window.location.reload()')
);
assert('HodProjectDetails hides progress percentages', 
  !hodProjectDetails.includes('% Progress') && !hodProjectDetails.includes('Overall Progress')
);

console.log('\n--- 5. Advisors Portal & Universal Standards ---');
const hodAdvisorsView = readFile('components/hod/HodAdvisorsView.tsx');
assert('HodAdvisorsView has RefreshCw button in filter row', 
  hodAdvisorsView.includes('RefreshCw') && hodAdvisorsView.includes('window.location.reload()')
);

const adminAdvisorsView = readFile('components/admin/AdminAdvisorsView.tsx');
assert('AdminAdvisorsView has RefreshCw button in filter row', 
  adminAdvisorsView.includes('RefreshCw') && adminAdvisorsView.includes('window.location.reload()')
);

const adminStudentsView = readFile('components/admin/AdminStudentsView.tsx');
assert('AdminStudentsView has RefreshCw button in filter row', 
  adminStudentsView.includes('RefreshCw') && adminStudentsView.includes('window.location.reload()')
);

const advisorPortalPage = readFile('pages/AdvisorPortalPage.tsx');
assert('AdvisorPortalPage has RefreshCw button in header', 
  advisorPortalPage.includes('RefreshCw') && advisorPortalPage.includes('window.location.reload()')
);

console.log('\n=========================================');
if (allPassed) {
  console.log('ALL 20 VERIFICATION CHECKS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error('SOME CHECKS FAILED!');
  process.exit(1);
}
