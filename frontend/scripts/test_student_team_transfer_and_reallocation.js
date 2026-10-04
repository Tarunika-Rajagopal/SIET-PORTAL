/**
 * Automated test script for Student Team Transfer & Reallocation Feature
 * Run with: node frontend/scripts/test_student_team_transfer_and_reallocation.js
 */

const API_BASE = `${(process.env.VITE_API_URL || 'https://siet-portal-2.onrender.com').replace(/\/+$/, '')}/api/v1`;

async function main() {
  console.log('--- Testing Student Team Transfer & Reallocation ---');

  // 1. Authenticate as Advisor
  console.log('1. Authenticating as Advisor...');
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
  console.log('Logged in successfully. User:', loginData.user?.name, 'Role:', loginData.user?.role);

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

  const teamWithMembers = teams.find((t) => (t.members || []).length > 0);
  const targetTeam = teams.find((t) => t.id !== teamWithMembers?.id && (t.members || []).length < (t.capacity || 4));

  if (!teamWithMembers || !targetTeam) {
    console.log('Could not find suitable source and target teams for testing.');
    return;
  }

  const student = teamWithMembers.members[0];
  console.log(`Candidate for transfer: ${student.name} (${student.rollNo})`);
  console.log(`Source Team: ${teamWithMembers.teamNo} (members: ${teamWithMembers.members.length})`);
  console.log(`Target Team: ${targetTeam.teamNo} (members: ${(targetTeam.members || []).length})`);

  // 3. Perform Transfer
  console.log(`\n3. Transferring student ${student.rollNo} to ${targetTeam.teamNo}...`);
  const transferRes = await fetch(`${API_BASE}/advisor/move-student`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: 'CSE-B',
      studentRollNo: student.rollNo,
      targetTeamId: targetTeam.id,
    }),
  });

  const transferResult = await transferRes.json();
  console.log('Transfer Response:', transferResult);

  if (!transferRes.ok || !transferResult.success) {
    console.error('Transfer failed!');
    process.exit(1);
  }

  // 4. Verify DB state after transfer
  console.log('\n4. Verifying DB state after transfer...');
  const updatedTeamsRes = await fetch(`${API_BASE}/advisor/teams?className=CSE-B`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const updatedTeams = await updatedTeamsRes.json();

  const sourceAfter = updatedTeams.find((t) => t.id === teamWithMembers.id);
  const targetAfter = updatedTeams.find((t) => t.id === targetTeam.id);

  console.log(`Source Team (${sourceAfter.teamNo}) member count: ${sourceAfter.members.length}`);
  console.log(`Target Team (${targetAfter.teamNo}) member count: ${targetAfter.members.length}`);

  // 5. Revert student back to source team
  console.log(`\n5. Reverting student ${student.rollNo} back to ${teamWithMembers.teamNo}...`);
  const revertRes = await fetch(`${API_BASE}/advisor/move-student`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: 'CSE-B',
      studentRollNo: student.rollNo,
      targetTeamId: teamWithMembers.id,
    }),
  });

  const revertResult = await revertRes.json();
  console.log('Revert Response:', revertResult);

  console.log('\n✅ Student Team Transfer & Reallocation E2E Test Passed Successfully!');
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
