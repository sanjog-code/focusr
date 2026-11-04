import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bridgePath = path.join(__dirname, 'bridge.mjs');

console.log('--- Verifying Focusr Desktop Bridge & Windows API ---');

// 1. Spawn bridge process
const bridgeProc = spawn('node', [bridgePath], {
  cwd: path.join(__dirname, '..'),
  stdio: ['ignore', 'pipe', 'pipe']
});

let bridgeStarted = false;

bridgeProc.stdout.on('data', (d) => {
  const text = d.toString();
  if (text.includes('Focusr Desktop Bridge running on')) {
    bridgeStarted = true;
  }
});

bridgeProc.stderr.on('data', (d) => {
  console.error('[Bridge STDERR]', d.toString());
});

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:42069${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  let attempts = 0;
  while (!bridgeStarted && attempts < 10) {
    await wait(400);
    attempts++;
  }

  console.log('✓ Bridge process spawned successfully');

  // Test 1: Health & status
  const statusRes = await fetchJson('/status');
  console.log('✓ GET /status:', statusRes.status, statusRes.body.status, 'Version:', statusRes.body.version);
  if (statusRes.status !== 200 || statusRes.body.status !== 'ok') {
    throw new Error('Status check failed');
  }

  // Test 2: CORS & Private Network Access Headers
  if (statusRes.headers['access-control-allow-private-network'] !== 'true') {
    throw new Error('Missing Access-Control-Allow-Private-Network header');
  }
  console.log('✓ Access-Control-Allow-Private-Network: true confirmed');

  // Test 3: Process list
  const appsRes = await fetchJson('/apps');
  console.log(`✓ GET /apps: ${appsRes.body.apps.length} interactive applications detected`);
  if (!Array.isArray(appsRes.body.apps) || appsRes.body.apps.length === 0) {
    throw new Error('No apps returned');
  }

  const sampleApps = appsRes.body.apps.slice(0, 5).map(a => `${a.displayName} (${a.processName}) [${a.category}]`);
  console.log('  Sample applications:', sampleApps.join(', '));

  // Test 4: Active window check
  const activeRes = await fetchJson('/active');
  console.log('✓ GET /active:', activeRes.body.activeWindow);

  // Test 5: Simulation endpoint
  const simRes = await fetchJson('/simulate?process=Code.exe&title=Focusr%20Studio');
  console.log('✓ GET /simulate:', simRes.body);
  if (simRes.body.activeWindow.processName !== 'Code.exe') {
    throw new Error('Simulate endpoint failed');
  }

  // Clean shutdown
  bridgeProc.kill('SIGINT');
  console.log('\n🌟 ALL FOCUSR DESKTOP BRIDGE TESTS PASSED PERFECTLY! 🌟\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  if (bridgeProc) bridgeProc.kill();
  process.exit(1);
});
