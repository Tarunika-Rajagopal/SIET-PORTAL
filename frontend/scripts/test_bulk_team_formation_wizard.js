const BASE_URL = (process.env.VITE_API_URL || 'https://siet-portal-2.onrender.com').replace(/\/+$/, '');

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
  console.log(`Advisor logged in. Class: ${advisorClass}`);

  console.log('\n--- 3. Fetching Current Roster to Form Bulk Teams ---');
  const studentsRes = await fetch(`${BASE_URL}/api/v1/advisor/students?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const students = await studentsRes.json();
  console.log(`Current class roster: ${students.length} students.`);

  // Pick candidate students to form 2 new prospective teams
  const candidatePool = students.slice(0, 4);
  if (candidatePool.length < 2) {
    throw new Error('Not enough students to test bulk formation');
  }

  const teamA_members = candidatePool.slice(0, 2);
  const teamB_members = candidatePool.slice(2, 4);

  const bulkPayload = {
    className: advisorClass,
    batch: "2023-2027 (III Year)",
    capacity: 4,
    teams: [
      {
        teamNo: "Team 21",
        title: "Intelligent IoT Water Quality Sensor",
        guide: "Dr. A. Devipriya",
        guideEmail: "devipriya.a@siet.ac.in",
        leadRollNo: teamA_members[0].rollNo,
        memberRollNos: teamA_members.map(m => m.rollNo),
      },
      {
        teamNo: "Team 22",
        title: "Autonomous Drone Obstacle Detection",
        guide: "Dr. K. Vignesh",
        guideEmail: "vignesh.k@siet.ac.in",
        leadRollNo: teamB_members[0].rollNo,
        memberRollNos: teamB_members.map(m => m.rollNo),
      }
    ]
  };

  console.log('\n--- 4. Executing Bulk Team Formation (POST /api/v1/advisor/teams/bulk) ---');
  const bulkRes = await fetch(`${BASE_URL}/api/v1/advisor/teams/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(bulkPayload)
  });

  if (!bulkRes.ok) {
    const errText = await bulkRes.text();
    throw new Error(`Bulk team creation failed: ${bulkRes.status} ${errText}`);
  }
  const bulkResult = await bulkRes.json();
  console.log('Bulk creation result:', bulkResult);

  if (!bulkResult.success) {
    throw new Error('Expected success=true from bulk team formation');
  }

  console.log('\n--- 5. Verifying Created Teams in Database (GET /api/v1/advisor/teams) ---');
  const teamsRes = await fetch(`${BASE_URL}/api/v1/advisor/teams?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const teams = await teamsRes.json();
  const createdTeam21 = teams.find(t => t.teamNo === 'Team 21');
  const createdTeam22 = teams.find(t => t.teamNo === 'Team 22');

  console.log('Found Team 21 in DB:', createdTeam21 ? `Yes (ID: ${createdTeam21.teamId}, Members: ${createdTeam21.members.length})` : 'No');
  console.log('Found Team 22 in DB:', createdTeam22 ? `Yes (ID: ${createdTeam22.teamId}, Members: ${createdTeam22.members.length})` : 'No');

  if (!createdTeam21 || !createdTeam22) {
    throw new Error('Newly created bulk teams were not found in database');
  }

  console.log('\n--- 6. Verifying Students Updated with Team Assignments ---');
  const updatedStudentsRes = await fetch(`${BASE_URL}/api/v1/advisor/students?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const updatedStudents = await updatedStudentsRes.json();
  const student1 = updatedStudents.find(s => s.rollNo === teamA_members[0].rollNo);
  const student2 = updatedStudents.find(s => s.rollNo === teamB_members[0].rollNo);

  console.log(`Student ${student1.name} (${student1.rollNo}) -> Team: ${student1.teamNo} (Expected: Team 21)`);
  console.log(`Student ${student2.name} (${student2.rollNo}) -> Team: ${student2.teamNo} (Expected: Team 22)`);

  if (student1.teamNo !== 'Team 21' || student2.teamNo !== 'Team 22') {
    throw new Error('Students team numbers were not updated in database');
  }

  console.log('\n All checks passed! Bulk Team Formation Wizard is fully integrated with backend & database.');
}

runTest().catch(err => {
  console.error('Test Failed:', err.message);
  process.exit(1);
});
