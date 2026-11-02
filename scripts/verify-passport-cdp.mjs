import { spawn } from 'node:child_process';
import http from 'node:http';

async function runTest() {
  console.log('>>> [1/5] Starting local Desktop Bridge (127.0.0.1:42069)...');
  const bridgeProc = spawn(process.execPath, ['scripts/bridge.mjs'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  bridgeProc.stdout.on('data', d => {
    // console.log('[Bridge STDOUT]:', d.toString().trim());
  });

  // Wait 1s for bridge to start
  await new Promise(r => setTimeout(r, 1200));

  console.log('>>> [2/5] Testing Bridge HTTP & WebSocket health...');
  const healthRes = await fetch('http://127.0.0.1:42069/status');
  const healthJson = await healthRes.json();
  console.log('Bridge Status:', healthJson);
  if (healthJson.status !== 'ok') {
    throw new Error('Bridge health check failed');
  }

  const appsRes = await fetch('http://127.0.0.1:42069/apps');
  const appsJson = await appsRes.json();
  console.log(`Bridge Running Apps count: ${appsJson.apps?.length || 0}`);
  if (!appsJson.apps || appsJson.apps.length === 0) {
    console.warn('Warning: No user apps returned (could be due to headless environment)');
  } else {
    console.log('Sample Apps detected:', appsJson.apps.slice(0, 5).map(a => a.processName).join(', '));
  }

  console.log('>>> [3/5] Starting local Vite preview server...');
  const previewProc = spawn('npx', ['vite', 'preview', '--port', '3456'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'pipe'
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('>>> [4/5] Launching Edge in Headless Mode with CDP...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const cdpPort = 9444;

  const browserProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3456'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  // Connect to CDP
  const versionRes = await fetch(`http://localhost:${cdpPort}/json/version`);
  const versionData = await versionRes.json();
  const listRes = await fetch(`http://localhost:${cdpPort}/json/list`);
  const pages = await listRes.json();
  const targetPage = pages.find(p => p.type === 'page');

  if (!targetPage) {
    throw new Error('No target page found in browser');
  }

  console.log('Connecting to page WebSocket:', targetPage.webSocketDebuggerUrl);

  const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  function sendCDP(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = evt => {
    const data = JSON.parse(evt.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise(r => { ws.onopen = r; });
  await sendCDP('Runtime.enable');
  await sendCDP('Page.enable');

  // Evaluate test assertions inside Focusr
  console.log('>>> [5/5] Running In-Browser Assertions...');
  const evalResult = await sendCDP('Runtime.evaluate', {
    expression: `(async () => {
      const results = [];
      const assert = (desc, cond) => {
        results.push({ desc, pass: !!cond });
        if (!cond) console.error('FAILED ASSERTION:', desc);
      };

      // 1. FocusPassport exists
      assert('window.FocusPassport exists', typeof window.FocusPassport !== 'undefined');

      // 2. Open Passport Modal
      window.FocusPassport.open();
      const modal = document.getElementById('modal-focus-passport');
      assert('Modal opened with active class', modal && modal.classList.contains('active'));

      // 3. Check Default Whitelist
      const initialCount = window.FocusPassport.whitelist.length;
      assert('Default whitelist items loaded (>= 10)', initialCount >= 10);

      // 4. Pattern matching engine
      assert('Pattern match exact domain', window.FocusPassport.matchPattern('github.com', 'github.com'));
      assert('Pattern match wildcard domain', window.FocusPassport.matchPattern('*.github.com', 'api.github.com'));
      assert('Pattern match process name', window.FocusPassport.matchPattern('Code.exe', 'code'));
      assert('Pattern match localhost wildcard port', window.FocusPassport.matchPattern('localhost:*', 'localhost:3000'));
      assert('Pattern reject mismatch', !window.FocusPassport.matchPattern('github.com', 'twitter.com'));

      // 5. Add custom item
      window.FocusPassport.addPattern('custom-docs.internal', 'domain');
      assert('Custom domain added to whitelist', window.FocusPassport.isPatternWhitelisted('custom-docs.internal', 'domain'));

      // 6. Whitelist Shelf rendering
      const shelf = document.getElementById('passport-tags-shelf');
      assert('Tags shelf rendered with children', shelf && shelf.children.length > 0);

      // Close modal before testing focus timer session
      window.FocusPassport.close();
      assert('Modal closed before session test', !modal.classList.contains('active'));

      // 7. Verify Distraction & Flow Protection Interception:
      // Setup focus session state
      window.navigate('focus');
      window.S.running = true;
      window.S.paused = false;
      window.S.distractions = 0;
      window.S.totalPenaltyMs = 0;

      // Case A: User switches to allowed application (Code.exe)
      // Mock being away
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      try {
        Document.prototype.hasFocus = () => false;
      } catch (e) {}

      console.log('TEST isAway values:', document.hidden, document.hasFocus());

      window.FocusPassport.currentActiveProcess = {
        processName: 'Code.exe',
        windowTitle: 'focusr - VS Code',
        pid: 1234
      };

      // Trigger desertion
      window.handleWindowOrTabDesertion('window');

      // Assert timer kept running seamlessly
      assert('Timer kept running when in allowed process', window.S.running === true && window.S.paused === false);
      assert('Distractions stayed 0 for allowed process', window.S.distractions === 0);
      assert('Penalty stayed 0 for allowed process', window.S.totalPenaltyMs === 0);

      const protectedBadge = document.getElementById('focus-protected-badge');
      assert('Protected badge displayed', protectedBadge && protectedBadge.style.display === 'inline-flex');
      const badgeText = document.getElementById('protected-badge-text')?.textContent || '';
      assert('Badge text indicates flow protection', badgeText.includes('Flow Protected'));

      // Case B: User switches to unauthorized app (e.g. distracting_app.exe)
      window.FocusPassport.currentActiveProcess = {
        processName: 'distracting_app.exe',
        windowTitle: 'Distraction Game',
        pid: 9999
      };
      window.FocusPassport.currentActiveTab = null;

      // Trigger desertion again
      window.handleWindowOrTabDesertion('window');

      // Assert distraction was detected and penalty added
      assert('Session paused when entering unallowed app', window.S.paused === true);
      assert('Distractions incremented', window.S.distractions === 1);
      assert('Penalty time added', window.S.totalPenaltyMs > 0);

      // Case C: User returns to Focusr
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      try { Document.prototype.hasFocus = () => true; } catch (e) {}
      window.handleWindowOrTabReturn('window');
      assert('Protected badge hidden upon return', protectedBadge.style.display === 'none');

      return results;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Evaluation Full Result:', JSON.stringify(evalResult, null, 2));

  const results = evalResult.result?.value;
  if (!Array.isArray(results)) {
    console.error('Results is not an array:', results);
    browserProc.kill();
    previewProc.kill();
    bridgeProc.kill();
    process.exit(1);
  }

  const allPassed = results.every(r => r.pass);
  console.log(`\nTEST SUMMARY: ${allPassed ? 'ALL TESTS PASSED! ✅' : 'SOME TESTS FAILED ❌'}`);

  // Cleanup processes
  browserProc.kill();
  previewProc.kill();
  bridgeProc.kill();

  if (!allPassed) {
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
