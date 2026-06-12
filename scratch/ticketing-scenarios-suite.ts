import fs from 'fs';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const LOG_FILE = './planning/ticketing_execution_evidence.md';
const COOKIE_FILE = './cookies-test.txt';

const USERS = {
  'Parent': { email: 'parent@divergencie.com', password: 'demo' },
  'Fin Manager': { email: 'finance@divergencie.com', password: 'demo' },
  'Acct. Assistant': { email: 'finance-assistant@divergencie.com', password: 'demo' },
  'IT Manager': { email: 'it@divergencie.com', password: 'demo' },
  'IT Assistant': { email: 'it-assistant@divergencie.com', password: 'demo' },
  'Candidate': { email: 'candidate@divergencie.com', password: 'demo' },
  'HR Assistant': { email: 'hr-assistant@divergencie.com', password: 'demo' },
  'Management': { email: 'management@divergencie.com', password: 'demo' },
  'PR Assistant': { email: 'pr-assistant@divergencie.com', password: 'demo' },
  'SM Manager': { email: 'marketing@divergencie.com', password: 'demo' },
  'SM Assistant': { email: 'marketing-assistant@divergencie.com', password: 'demo' },
  'Teacher': { email: 'teacher@divergencie.com', password: 'demo' },
  'Assoc. PM': { email: 'pr@divergencie.com', password: 'demo' },
  'Teaching Asst.': { email: 'ta-pr@divergencie.com', password: 'demo' },
  'AI Intern': { email: 'ai-intern@divergencie.com', password: 'demo' },
  'SWE Intern': { email: 'swe-intern@divergencie.com', password: 'demo' },
  'HR Manager': { email: 'hr@divergencie.com', password: 'demo' },
  'Student': { email: 'student@divergencie.com', password: 'demo' },
  'Ambassador': { email: 'ambassador@divergencie.com', password: 'demo' },
};

async function log(message: string, isCode = false) {
  const timestamp = new Date().toISOString();
  const formattedMessage = isCode ? `\`\`\`json\n${message}\n\`\`\`` : message;
  fs.appendFileSync(LOG_FILE, `\n[${timestamp}] ${formattedMessage}\n`);
  console.log(`[${timestamp}] ${message}`);
}

function runCurl(args: string) {
  try {
    const output = execSync(`curl -s -b ${COOKIE_FILE} -c ${COOKIE_FILE} ${args}`).toString();
    return output;
  } catch (e: any) {
    return `ERROR: ${e.message}`;
  }
}

async function login(role: string) {
  const user = USERS[role as keyof typeof USERS];
  if (!user) return false;

  // 1. Get CSRF
  const csrfRes = JSON.parse(runCurl(`${BASE_URL}/api/auth/csrf`));
  const token = csrfRes.csrfToken;

  // 2. POST login
  const res = execSync(`curl -s -o /dev/null -w "%{http_code}" -b ${COOKIE_FILE} -c ${COOKIE_FILE} -X POST ${BASE_URL}/api/auth/callback/credentials -d "email=${encodeURIComponent(user.email)}&password=${user.password}&csrfToken=${token}&redirect=false"`).toString();
  
  return res === '200' || res === '302';
}

async function logout() {
  const csrfRes = JSON.parse(runCurl(`${BASE_URL}/api/auth/csrf`));
  const token = csrfRes.csrfToken;
  execSync(`curl -s -o /dev/null -b ${COOKIE_FILE} -c ${COOKIE_FILE} -X POST ${BASE_URL}/api/auth/signout -d "csrfToken=${token}&redirect=false"`);
  if (fs.existsSync(COOKIE_FILE)) fs.unlinkSync(COOKIE_FILE);
}

async function getUserId(role: string) {
  const user = USERS[role as keyof typeof USERS];
  const data = JSON.parse(runCurl(`${BASE_URL}/api/users?email=${encodeURIComponent(user.email)}`));
  return data?.id;
}

async function runStep(source: string, action: string, data: any) {
  await log(`### ${source} performing ${action}`);
  if (!(await login(source))) {
    await log(`❌ Login failed for ${source}`);
    return null;
  }

  let resBody;
  let url = `${BASE_URL}/api/tickets`;
  let method = 'POST';
  let payload = { ...data };

  if (action === 'REPLY') {
    url = `${BASE_URL}/api/tickets/${payload.id}/messages`;
    payload = { body: payload.body, isInternal: payload.isInternal || false };
  } else if (action !== 'CREATE') {
    url = `${BASE_URL}/api/tickets/${payload.id}`;
    method = 'PATCH';
    payload = { action, ...payload };
  }

  const result = runCurl(`-X ${method} ${url} -H "Content-Type: application/json" -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`);
  
  try {
    resBody = JSON.parse(result);
    await log(JSON.stringify(resBody, null, 2), true);
  } catch (e) {
    await log(`Failed to parse response: ${result}`);
  }

  await logout();
  return resBody;
}

async function runAll() {
  fs.writeFileSync(LOG_FILE, '# 🧪 Ticketing Scenario Execution Log\n');
  if (fs.existsSync(COOKIE_FILE)) fs.unlinkSync(COOKIE_FILE);

  let t1, t2, t3, t4, t5, t6, t7, t8, t9, t10;

  // SCENARIO 1
  await log('## Scenario 1: The Missing Tuition Saga');
  t1 = await runStep('Parent', 'CREATE', { title: "Missing Tuition", description: "I paid Jason’s tuition three days ago!", department: "Finance", priority: "HIGH" });
  await runStep('Fin Manager', 'ASSIGN', { id: t1.id, assigneeId: await login('Fin Manager') && await getUserId('Acct. Assistant'), note: "Verify payment." });
  await runStep('Acct. Assistant', 'FORWARD', { id: t1.id, department: "IT", note: "Payment cleared. Lift hold." });
  await runStep('IT Manager', 'ASSIGN', { id: t1.id, assigneeId: await login('IT Manager') && await getUserId('IT Assistant'), note: "Run sync script." });
  await runStep('IT Assistant', 'CLOSE', { id: t1.id });

  // SCENARIO 2
  await log('## Scenario 2: The Candidate\'s Second Chance');
  t2 = await runStep('Candidate', 'CREATE', { title: "Reopening Request", description: "I finally received my official transcripts...", department: "HR" });
  await runStep('Management', 'REOPEN', { id: t2.id, note: "Candidate requested review." });
  await runStep('HR Assistant', 'REPLY', { id: t2.id, body: "Hi Alex, please upload documents." });
  await runStep('Candidate', 'REPLY', { id: t2.id, body: "Files uploaded!" });
  await runStep('HR Assistant', 'CLOSE', { id: t2.id });

  // SCENARIO 3
  await log('## Scenario 3: The PR Crisis Delegation');
  t3 = await runStep('Management', 'CREATE', { title: "Dorm Scandal Response", description: "Draft response to local news article.", department: "PR" });
  await runStep('Management', 'ASSIGN', { id: t3.id, assigneeId: await login('Management') && await getUserId('PR Assistant'), note: "Immediate action required." });
  await runStep('PR Assistant', 'FORWARD', { id: t3.id, department: "Marketing", note: "Draft approved." });
  await runStep('SM Manager', 'ASSIGN', { id: t3.id, assigneeId: await login('SM Manager') && await getUserId('SM Assistant'), note: "Queue up on Hootsuite." });
  await runStep('SM Assistant', 'CLOSE', { id: t3.id });

  // SCENARIO 4
  await log('## Scenario 4: The Associate PM\'s Iron Fist');
  t4 = await runStep('Teacher', 'CREATE', { title: "Broken Scantron", description: "Machine in building B is broken.", department: "IT" });
  await runStep('IT Manager', 'FORWARD', { id: t4.id, department: "PR", note: "Can your team handle manual upload?" });
  await runStep('Assoc. PM', 'ASSIGN', { id: t4.id, assigneeId: await login('Assoc. PM') && await getUserId('Teaching Asst.'), note: "200 scans manually processed." });
  await runStep('Teaching Asst.', 'CLOSE', { id: t4.id });

  // SCENARIO 5
  await log('## Scenario 5: The Intern\'s Big Discovery');
  t5 = await runStep('AI Intern', 'CREATE', { title: "Zero-Day Leak Detected", description: "Anomaly detection flagged leak.", department: "IT" });
  await runStep('IT Manager', 'ASSIGN', { id: t5.id, assigneeId: await login('IT Manager') && await getUserId('SWE Intern'), note: "Patch auth endpoint." });
  await runStep('SWE Intern', 'FORWARD', { id: t5.id, department: "Management", note: "Alerting board." });
  await runStep('Management', 'CLOSE', { id: t5.id });

  // SCENARIO 6
  await log('## Scenario 6: The "Takebacks" Incident');
  t6 = await runStep('HR Manager', 'CREATE', { title: "Onboarding Alex", description: "Offer letter signed.", department: "HR" });
  await runStep('HR Manager', 'CLOSE', { id: t6.id });
  await runStep('HR Manager', 'REOPEN', { id: t6.id, note: "Wait! Felony flag found." });
  await runStep('HR Manager', 'REPLY', { id: t6.id, body: "Onboarding paused." });
  await runStep('HR Manager', 'CLOSE', { id: t6.id });

  // SCENARIO 7
  await log('## Scenario 7: An Intern Wants to Get Paid');
  t7 = await runStep('SWE Intern', 'CREATE', { title: "Stipend Discrepancy", description: "Short by $50.", department: "Finance" });
  await runStep('Fin Manager', 'ASSIGN', { id: t7.id, assigneeId: await login('Fin Manager') && await getUserId('Acct. Assistant'), note: "Audit timesheet." });
  await runStep('Acct. Assistant', 'CLOSE', { id: t7.id });

  // SCENARIOS 8, 9, 10 (INVALID)
  await log('## Scenario 8: The Bossy Student (INVALID)');
  t8 = await runStep('Student', 'CREATE', { title: "WiFi Issue", description: "IP conflict.", department: "IT" });
  await runStep('Student', 'ASSIGN', { id: t8.id, assigneeId: await login('Management') && await getUserId('IT Manager'), note: "Fix it now." });

  await log('🏁 ALL SCENARIOS COMPLETE.');
}

runAll().catch(e => log(`FATAL ERROR: ${e.message}`));
