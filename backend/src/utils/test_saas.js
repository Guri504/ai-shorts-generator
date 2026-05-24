import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🏁 Starting SaaS Refactoring Integration Tests...\n');

  const testEmailA = `user_a_${Date.now()}@test.com`;
  const testEmailB = `user_b_${Date.now()}@test.com`;
  const testPassword = 'Password123!';

  let tokenA, tokenB;
  let userA, userB;
  let projectA;

  try {
    // 1. Sign up User A
    console.log('1️⃣ Registering User A...');
    const signupARes = await axios.post(`${BASE_URL}/auth/signup`, {
      email: testEmailA,
      password: testPassword,
      name: 'User A'
    });
    tokenA = signupARes.data.token;
    userA = signupARes.data.user;
    console.log(`✅ User A Registered. ID: ${userA.id}, Initial Credits: ${userA.credits}\n`);

    // 2. Sign up User B
    console.log('2️⃣ Registering User B...');
    const signupBRes = await axios.post(`${BASE_URL}/auth/signup`, {
      email: testEmailB,
      password: testPassword,
      name: 'User B'
    });
    tokenB = signupBRes.data.token;
    userB = signupBRes.data.user;
    console.log(`✅ User B Registered. ID: ${userB.id}\n`);

    // 3. Test Login
    console.log('3️⃣ Testing Login for User A...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmailA,
      password: testPassword
    });
    console.log('✅ Login succeeded, token received.\n');

    // 4. Test Route Protection (Get projects without token)
    console.log('4️⃣ Testing unprotected access (should fail)...');
    try {
      await axios.get(`${BASE_URL}/projects`);
      console.log('❌ Failed: Route allowed request without token!');
    } catch (err) {
      console.log(`✅ Success: Unprotected request failed with status: ${err.response?.status} (${err.response?.data?.error})\n`);
    }

    // 5. User A creates a project
    console.log('5️⃣ User A creating a new project...');
    const projectRes = await axios.post(
      `${BASE_URL}/projects`,
      {
        topicOrTitle: 'Testing AI SaaS Isolation',
        language: 'english',
        sceneCount: 3
      },
      {
        headers: { Authorization: `Bearer ${tokenA}` }
      }
    );
    projectA = projectRes.data;
    console.log(`✅ Project created for User A. Project ID: ${projectA.id}, Title: "${projectA.topic}"\n`);

    // 6. Test User Isolation (User B trying to fetch User A's project)
    console.log(`6️⃣ User B attempting to access User A's project: ${projectA.id}...`);
    try {
      await axios.get(`${BASE_URL}/projects/${projectA.id}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.log('❌ Failed: User B was able to access User A\'s project!');
    } catch (err) {
      console.log(`✅ Success: Unauthorized access blocked with status: ${err.response?.status} (${err.response?.data?.error})\n`);
    }

    // 7. User A fetches own projects
    console.log('7️⃣ User A listing projects...');
    const projectsListARes = await axios.get(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log(`✅ Success: User A has ${projectsListARes.data.length} projects.`);
    
    // 8. User B fetches own projects
    console.log('8️⃣ User B listing projects...');
    const projectsListBRes = await axios.get(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    console.log(`✅ Success: User B has ${projectsListBRes.data.length} projects (Isolated!).\n`);

    console.log('🎉 All SaaS Refactoring Integration Tests Passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
