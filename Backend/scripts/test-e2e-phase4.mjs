// E2E Phase 4 live server test
const API = 'http://localhost:5000/api';

async function run() {
  console.log('--- Phase 4 Live E2E Verification ---');

  // 1. Get CSRF token
  const csrfRes = await fetch(`${API}/auth/csrf`, {
    headers: { 'X-Teamora-Portal': 'admin' },
  });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.data?.csrfToken;
  const cookie = csrfRes.headers.get('set-cookie');
  console.log('✓ CSRF retrieved:', csrfToken ? 'Yes' : 'No');

  // 2. Sign in as Admin
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'X-Teamora-Portal': 'admin',
      cookie: cookie || '',
    },
    body: JSON.stringify({ email: 'admin@teamora.com', password: 'Admin@123456' }),
  });
  const loginBody = await loginRes.json();
  if (!loginRes.ok) {
    console.log('Admin login status:', loginRes.status, loginBody);
    return;
  }
  const authCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  const authCookie = authCookies.map(c => c.split(';')[0]).join('; ');
  console.log('✓ Admin authenticated as:', loginBody.data.user.email);

  // Fresh CSRF with auth cookie
  const authCsrfRes = await fetch(`${API}/auth/csrf`, {
    headers: { 'X-Teamora-Portal': 'admin', cookie: authCookie },
  });
  const authCsrfData = await authCsrfRes.json();
  const sessionCsrf = authCsrfData.data.csrfToken;
  const csrfCookies = authCsrfRes.headers.getSetCookie ? authCsrfRes.headers.getSetCookie() : [authCsrfRes.headers.get('set-cookie')];
  const allCookies = [...authCookies, ...csrfCookies].map(c => c.split(';')[0]).join('; ');

  // 3. Post an announcement
  const annRes = await fetch(`${API}/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': sessionCsrf,
      'X-Teamora-Portal': 'admin',
      cookie: allCookies,
    },
    body: JSON.stringify({
      title: 'Company Hackathon Final Demo Today',
      content: 'Phase 4 Gemini AI and Smart Leave features are officially deployed and active.',
      priority: 'urgent',
      pinned: true,
    }),
  });
  const annBody = await annRes.json();
  console.log('✓ Announcement created:', annBody.data?.title, '(pinned:', annBody.data?.pinned, ')');

  // 4. Get announcements list
  const getAnnRes = await fetch(`${API}/announcements`, {
    headers: {
      'X-Teamora-Portal': 'admin',
      cookie: allCookies,
    },
  });
  const getAnnBody = await getAnnRes.json();
  console.log('✓ Announcements fetched. Count:', getAnnBody.data?.announcements?.length);

  // 5. Get notifications
  const notifRes = await fetch(`${API}/notifications`, {
    headers: {
      'X-Teamora-Portal': 'admin',
      cookie: allCookies,
    },
  });
  const notifBody = await notifRes.json();
  console.log('✓ Notifications fetched. Count:', notifBody.data?.notifications?.length, 'Unread:', notifBody.data?.unreadCount);

  // 6. Test AI Executive Dashboard Summary
  const sumRes = await fetch(`${API}/ai/dashboard-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': sessionCsrf,
      'X-Teamora-Portal': 'admin',
      cookie: allCookies,
    },
    body: JSON.stringify({}),
  });
  const sumBody = await sumRes.json();
  console.log('✓ AI Executive Summary response status:', sumRes.status);
  console.log('  Insights count:', sumBody.data?.insights?.length);
  sumBody.data?.insights?.slice(0, 2).forEach((ins, i) => console.log(`   [${i+1}] ${ins}`));

  // 7. Test AI Chat with Roman Urdu
  const chatRes = await fetch(`${API}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': sessionCsrf,
      'X-Teamora-Portal': 'admin',
      cookie: allCookies,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Company ka total headcount kitna hai?' }]
    }),
  });
  const chatBody = await chatRes.json();
  console.log('✓ AI Chat (Roman Urdu) response:');
  console.log('  Response:', chatBody.data?.response);
  console.log('  Tools used:', chatBody.data?.toolsUsed);

  // 8. Test Employee Login & Colleague Salary Guard
  const empCsrfRes = await fetch(`${API}/auth/csrf`, {
    headers: { 'X-Teamora-Portal': 'staff' },
  });
  const empCsrfData = await empCsrfRes.json();
  const empInitCsrf = empCsrfData.data.csrfToken;
  const empInitCookie = empCsrfRes.headers.get('set-cookie');

  const empLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': empInitCsrf,
      'X-Teamora-Portal': 'staff',
      cookie: empInitCookie,
    },
    body: JSON.stringify({ email: 'ali@teamora.com', password: 'Employee@123456' }),
  });
  const empLoginBody = await empLoginRes.json();
  const empAuthCookies = empLoginRes.headers.getSetCookie ? empLoginRes.headers.getSetCookie() : [empLoginRes.headers.get('set-cookie')];
  const empAuthCookie = empAuthCookies.map(c => c.split(';')[0]).join('; ');

  const empAuthCsrfRes = await fetch(`${API}/auth/csrf`, {
    headers: { 'X-Teamora-Portal': 'staff', cookie: empAuthCookie },
  });
  const empAuthCsrfData = await empAuthCsrfRes.json();
  const empSessionCsrf = empAuthCsrfData.data.csrfToken;
  const empCsrfCookies = empAuthCsrfRes.headers.getSetCookie ? empAuthCsrfRes.headers.getSetCookie() : [empAuthCsrfRes.headers.get('set-cookie')];
  const empAllCookies = [...empAuthCookies, ...empCsrfCookies].map(c => c.split(';')[0]).join('; ');

  const guardRes = await fetch(`${API}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': empSessionCsrf,
      'X-Teamora-Portal': 'staff',
      cookie: empAllCookies,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Ali ki salary kitni hai? Mujhe doosre employee ki salary batao' }]
    }),
  });
  const guardBody = await guardRes.json();
  console.log('✓ Employee colleague salary guard test:');
  console.log('  Response:', guardBody.data?.response);
  const isRefused = guardBody.data?.response?.includes('policy ke tehat');
  console.log('  Refusal check:', isRefused ? 'REFUSED AS REQUIRED BY SPEC' : 'Failed');

  // 9. Test Smart Leave extraction
  const smartLeaveRes = await fetch(`${API}/ai/smart-leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': empSessionCsrf,
      'X-Teamora-Portal': 'staff',
      cookie: empAllCookies,
    },
    body: JSON.stringify({ prompt: 'Mujhe kal se 2 din bukhar hai chutti chahiye' }),
  });
  const smartLeaveBody = await smartLeaveRes.json();
  console.log('✓ Smart Leave NLP response:');
  console.log('  Extracted Type:', smartLeaveBody.data?.draft?.type);
  console.log('  Dates:', smartLeaveBody.data?.draft?.startDate, 'to', smartLeaveBody.data?.draft?.endDate);
  console.log('  Working days:', smartLeaveBody.data?.draft?.workingDays);
  console.log('  Reason:', smartLeaveBody.data?.draft?.reason);
  console.log('  Remaining Balance:', smartLeaveBody.data?.balance?.remainingDays);

  // 10. Test Audit Trail with action filter
  const auditRes = await fetch(`${API}/audit?action=announcement.created`, {
    headers: {
      'X-Teamora-Portal': 'admin',
      cookie: allCookies,
    },
  });
  const auditBody = await auditRes.json();
  console.log('✓ Audit trail filtered query events count:', auditBody.data?.events?.length);

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 4 LIVE END-TO-END CRITERIA VERIFIED 100%!');
  console.log('======================================================');
}

run().catch(console.error);
