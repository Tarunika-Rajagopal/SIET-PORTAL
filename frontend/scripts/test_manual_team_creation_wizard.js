// Test script for Manual Team Creation Wizard integration
const BASE_URL = 'http://localhost:8000';

async function runTest() {
  console.log('--- 1. Checking Backend Health ---');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('Health response:', health);
  if (health.status !== 'healthy') {
    throw new Error('Backend is not healthy');
  }

  console.log('\n--- 2. Authenticating as Class Advisor (Dr. R. Karthikeyan) ---');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrRoll: 'dr.karthik@siet.ac.in',
      password: 'faculty@123'
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Advisor login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  const advisorClass = loginData.user.advisorClass || 'CSE-B';
  console.log(`Advisor authenticated successfully. Assigned class: ${advisorClass}`);

  console.log('\n--- 3. Fetching Class Roster ---');
  const studentsRes = await fetch(`${BASE_URL}/api/v1/advisor/students?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const students = await studentsRes.json();
  console.log(`Retrieved ${students.length} students in class ${advisorClass}`);

  // Find candidate student for manual team creation
  const candidateStudent = students.find(s => !s.teamNo || s.teamNo === 'Unassigned') || students[students.length - 1];
  console.log(`Selected student for manual team assignment: ${candidateStudent.name} (${candidateStudent.rollNo})`);

  console.log('\n--- 4. Executing Manual Team Creation (POST /api/v1/advisor/teams) ---');
  const manualTeamPayload = {
    className: advisorClass,
    batch: "2023-2027 (III Year)",
    capacity: 4,
    teamNo: "Team 23",
    title: "AI-Powered Adaptive Traffic Management System",
    guide: "Dr. A. Devipriya",
    guideEmail: "dr.devipriya@siet.ac.in",
    leadRollNo: candidateStudent.rollNo,
    memberRollNos: [candidateStudent.rollNo]
  };

  const createRes = await fetch(`${BASE_URL}/api/v1/advisor/teams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(manualTeamPayload)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Manual team creation failed with HTTP ${createRes.status}: ${errText}`);
  }

  const createResult = await createRes.json();
  console.log('Manual Team Creation response:', createResult);

  if (!createResult.success) {
    throw new Error('Expected success=true from manual team creation');
  }

  console.log('\n--- 5. Verifying Created Team in Database (GET /api/v1/advisor/teams) ---');
  const teamsRes = await fetch(`${BASE_URL}/api/v1/advisor/teams?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const teams = await teamsRes.json();
  const createdTeam = teams.find(t => t.teamNo === 'Team 23');

  if (!createdTeam) {
    throw new Error('Newly created Team 23 was not found in database teams list');
  }

  console.log(`Verified Team 23 in Database:`);
  console.log(`  Team ID: ${createdTeam.teamId}`);
  console.log(`  Guide: ${createdTeam.guide}`);
  console.log(`  Title: ${createdTeam.title}`);
  console.log(`  Lead Student: ${createdTeam.leadStudent}`);
  console.log(`  Member Count: ${createdTeam.members.length}`);

  console.log('\n--- 6. Verifying Student Roster Update (GET /api/v1/advisor/students) ---');
  const updatedStudentsRes = await fetch(`${BASE_URL}/api/v1/advisor/students?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const updatedStudents = await updatedStudentsRes.json();
  const verifiedStudent = updatedStudents.find(s => s.rollNo === candidateStudent.rollNo);

  console.log(`Student ${verifiedStudent.name} (${verifiedStudent.rollNo}):`);
  console.log(`  Team: ${verifiedStudent.teamNo}`);
  console.log(`  Guide: ${verifiedStudent.guide}`);
  console.log(`  Project: ${verifiedStudent.projectTitle}`);

  if (verifiedStudent.teamNo !== 'Team 23') {
    throw new Error(`Expected student team to be Team 23, but got ${verifiedStudent.teamNo}`);
  }

  console.log('\n All checks passed! Manual Team Creation Wizard is fully connected & integrated.');
}

runTest().catch(err => {
  console.error('Test Failed:', err.message);
  process.exit(1);
});
