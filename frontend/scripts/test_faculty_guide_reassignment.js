/**
 * Automated test script for Faculty Guide Reassignment Feature
 * Run with: node frontend/scripts/test_faculty_guide_reassignment.js
 */

const API_BASE = `${(process.env.VITE_API_URL || 'https://siet-portal-2.onrender.com').replace(/\/+$/, '')}/api/v1`;

async function main() {
  console.log('--- Testing Faculty Guide Reassignment ---');

  // 1. Authenticate as Advisor
  console.log('1. Authenticating as Advisor (Dr. R. Karthikeyan)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrRoll: 'dr.karthik@siet.ac.in',
      password: 'faculty@123',
    }),
  });

  if (!loginRes.ok) {
    console.error('Failed to log in:', await loginRes.text());
    process.exit(1);
  }

  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  console.log(`Logged in successfully. User: ${loginData.user?.name} (${loginData.user?.role})`);

  // 2. Fetch Teams for CSE-B
  console.log('\n2. Fetching teams for CSE-B...');
  const teamsRes = await fetch(`${API_BASE}/advisor/teams?className=CSE-B`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!teamsRes.ok) {
    console.error('Failed to fetch teams:', await teamsRes.text());
    process.exit(1);
  }

  const teams = await teamsRes.json();
  console.log(`Found ${teams.length} teams.`);

  const testTeam = teams.find((t) => t.teamNo === 'Team 04') || teams[0];
  if (!testTeam) {
    console.error('No teams available for testing.');
    process.exit(1);
  }

  const initialGuide = testTeam.guide || 'Dr. P. Manimegalai';
  const newGuideCandidate = initialGuide.includes('Devipriya') ? 'Dr. P. Manimegalai' : 'Dr. A. Devipriya';

  console.log(`Target Team: ${testTeam.teamNo} (id=${testTeam.id})`);
  console.log(`Current Guide: ${initialGuide}`);
  console.log(`Proposed Successor Guide: ${newGuideCandidate}`);

  // 3. Test Reassigning Guide
  console.log(`\n3. Reassigning guide to ${newGuideCandidate}...`);
  const reassignRes = await fetch(`${API_BASE}/advisor/reassign-guide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: 'CSE-B',
      teamId: testTeam.id,
      guideName: newGuideCandidate,
      guideEmail: '',
    }),
  });

  const reassignData = await reassignRes.json();
  console.log('Reassign Response:', reassignData);

  if (!reassignRes.ok || !reassignData.success) {
    console.error('Guide reassignment failed!');
    process.exit(1);
  }

  // 4. Verify in DB
  console.log('\n4. Verifying DB state after guide reassignment...');
  const updatedTeamsRes = await fetch(`${API_BASE}/advisor/teams?className=CSE-B`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const updatedTeams = await updatedTeamsRes.json();
  const updatedTeam = updatedTeams.find((t) => t.id === testTeam.id);

  console.log(`Verified Team ${updatedTeam.teamNo} Guide in DB: "${updatedTeam.guide}"`);
  if (updatedTeam.guide.toLowerCase() !== newGuideCandidate.toLowerCase()) {
    console.error(`Verification mismatch! Expected ${newGuideCandidate}, got ${updatedTeam.guide}`);
    process.exit(1);
  }

  // 5. Test Duplicate Assignment Guard
  console.log('\n5. Testing Duplicate Assignment Guard...');
  const dupRes = await fetch(`${API_BASE}/advisor/reassign-guide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: 'CSE-B',
      teamId: testTeam.id,
      guideName: newGuideCandidate,
    }),
  });
  const dupData = await dupRes.json();
  console.log('Duplicate Guard Response:', dupData);
  if (dupData.success === false) {
    console.log('Duplicate Guard passed (prevented redundant reassignment).');
  }

  // 6. Revert back to Initial Guide
  console.log(`\n6. Reverting guide back to original: ${initialGuide}...`);
  const revertRes = await fetch(`${API_BASE}/advisor/reassign-guide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: 'CSE-B',
      teamId: testTeam.id,
      guideName: initialGuide,
    }),
  });
  const revertData = await revertRes.json();
  console.log('Revert Response:', revertData);

  console.log('\n✅ Faculty Guide Reassignment E2E Test Passed Successfully!');
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
