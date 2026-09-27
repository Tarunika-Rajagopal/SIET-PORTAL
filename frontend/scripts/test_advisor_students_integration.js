// Test script for Student Directory & Live Roster backend integration
const BASE_URL = 'http://localhost:8000';

async function runTest() {
  console.log('--- 1. Testing Backend Health ---');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('Health response:', health);
  if (health.status !== 'healthy') {
    throw new Error('Backend is not healthy');
  }

  console.log('\n--- 2. Logging in as Class Advisor (Dr. R. Karthikeyan) ---');
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
  console.log('Advisor logged in successfully.');
  console.log('Advisor Name:', loginData.user.name);
  console.log('Advisor Class:', loginData.user.advisorClass);

  console.log('\n--- 3. Fetching Live Student Directory from Backend Database ---');
  const token = loginData.token;
  const studentsRes = await fetch(`${BASE_URL}/api/v1/advisor/students?className=CSE-B&batch=2023-2027 (III Year)`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!studentsRes.ok) {
    const errText = await studentsRes.text();
    throw new Error(`Failed to fetch advisor students: ${studentsRes.status} ${errText}`);
  }

  const students = await studentsRes.json();
  console.log(`Successfully fetched ${students.length} students from database for CSE-B.`);
  console.log('Sample students:');
  students.slice(0, 3).forEach(s => {
    console.log(` - ${s.rollNo}: ${s.name} | Team: ${s.teamNo} | Guide: ${s.guide}`);
  });

  if (students.length === 0) {
    throw new Error('Expected at least 1 student in database for class CSE-B');
  }

  // Validate required schema properties
  for (const s of students) {
    if (!s.rollNo || !s.name || !s.classSection) {
      throw new Error('Student missing required fields: ' + JSON.stringify(s));
    }
  }

  console.log('\n All checks passed! Student Directory & Live Roster is connected to the backend database.');
}

runTest().catch(err => {
  console.error('Test Failed:', err.message);
  process.exit(1);
});
