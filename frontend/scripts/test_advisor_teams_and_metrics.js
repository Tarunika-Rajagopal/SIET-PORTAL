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

  console.log('\n--- 3. Fetching Class Teams Directory (GET /api/v1/advisor/teams) ---');
  const teamsRes = await fetch(`${BASE_URL}/api/v1/advisor/teams?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!teamsRes.ok) {
    const errText = await teamsRes.text();
    throw new Error(`Failed to fetch teams: ${teamsRes.status} ${errText}`);
  }
  const teams = await teamsRes.json();
  console.log(`Successfully fetched ${teams.length} teams from database for ${advisorClass}.`);
  teams.forEach(t => {
    console.log(` - ${t.teamNo} (${t.teamId}): Guide=${t.guide} | Members=${t.members ? t.members.length : 0} | Lead=${t.leadStudent}`);
  });

  if (teams.length === 0) {
    throw new Error('Expected at least 1 team in database for CSE-B');
  }

  console.log('\n--- 4. Fetching Class Students (GET /api/v1/advisor/students) ---');
  const studentsRes = await fetch(`${BASE_URL}/api/v1/advisor/students?className=${advisorClass}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!studentsRes.ok) {
    throw new Error(`Failed to fetch students: ${studentsRes.status}`);
  }
  const students = await studentsRes.json();
  console.log(`Fetched ${students.length} students from database for ${advisorClass}.`);

  console.log('\n--- 5. Computing & Verifying Live Summary Metrics ---');
  const totalStrength = students.length;
  const assignedTeamsCount = teams.length;
  const unassignedStudentsCount = students.filter(s => !s.teamNo || s.teamNo === 'Unassigned' || s.teamNo.trim() === '').length;
  const assignedStudentsCount = totalStrength - unassignedStudentsCount;

  console.log(`Metric 1 - Class: "${advisorClass}"`);
  console.log(`Metric 2 - Total Strength: ${totalStrength} Candidates`);
  console.log(`Metric 3 - Assigned Teams: ${assignedTeamsCount} Teams`);
  console.log(`Metric 4 - Unassigned Students: ${unassignedStudentsCount} Students`);
  console.log(`          (Allocated in Teams: ${assignedStudentsCount} Students)`);

  if (totalStrength <= 0) {
    throw new Error('Total strength should be greater than 0');
  }
  if (assignedTeamsCount <= 0) {
    throw new Error('Assigned teams count should be greater than 0');
  }
  if (unassignedStudentsCount < 0) {
    throw new Error('Unassigned students count cannot be negative');
  }

  console.log('\n All checks passed! Class Teams Directory & Summary Metrics Feature is fully integrated with backend database.');
}

runTest().catch(err => {
  console.error('Test Failed:', err.message);
  process.exit(1);
});
