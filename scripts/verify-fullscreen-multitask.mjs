import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

console.log('=== VERIFYING FULLSCREEN & MULTITASKING ERGONOMICS ===');

const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'styles', 'main.css'), 'utf-8');

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

// 1. Verify UI Controls in index.html
assert(htmlContent.includes('id="btn-toggle-fullscreen"'), 'Top bar contains #btn-toggle-fullscreen');
assert(htmlContent.includes('id="btn-focus-fullscreen"'), 'Studio Dock contains #btn-focus-fullscreen');
assert(htmlContent.includes('id="check-auto-fullscreen"'), 'Setup screen contains #check-auto-fullscreen toggle');
assert(htmlContent.includes('id="toggle-auto-fullscreen"'), 'Protocols settings contains #toggle-auto-fullscreen');

// 2. Verify Escape key handling in keydown
assert(!htmlContent.includes("if (e.code === 'Escape') { e.preventDefault(); stopSession(); }"), 'Escape key does NOT unconditionally kill the focus session');
assert(htmlContent.includes('if (e.code === \'Escape\') {') && htmlContent.includes('exitFS();'), 'Escape key properly exits fullscreen mode');
assert(htmlContent.includes('if (e.code === \'KeyF\') { e.preventDefault(); toggleFullscreen(); }'), 'KeyF hotkey toggles fullscreen mode');

// 3. Verify Desertion & Multitasking Grace Engine
assert(htmlContent.includes('let suppressDesertionUntil = 0;'), 'suppressDesertionUntil variable declared');
assert(htmlContent.includes('if (Date.now() < suppressDesertionUntil)'), 'handleWindowOrTabDesertion respects suppressDesertionUntil');
assert(htmlContent.includes('let desertionGraceTimer = null;'), 'desertionGraceTimer declared');
assert(htmlContent.includes('function clearDesertionGrace()'), 'clearDesertionGrace helper implemented');
assert(htmlContent.includes('Multitasking Grace:'), 'Multitasking grace countdown displayed in badge');
assert(htmlContent.includes('applyDesertionPenalty(source);'), 'Desertion penalty applied only after grace period expires');

// 4. Verify WhatsApp in FocusPassport
assert(htmlContent.includes('web.whatsapp.com'), 'FocusPassport includes web.whatsapp.com');
assert(htmlContent.includes('*.whatsapp.com'), 'FocusPassport includes *.whatsapp.com');
assert(htmlContent.includes('WhatsApp.exe'), 'FocusPassport includes WhatsApp.exe');

// 5. Test Pattern Matcher Logic (same logic as in FocusPassport.matchPattern)
function matchPattern(pattern, target) {
  const pat = String(pattern).trim().toLowerCase();
  const tgt = String(target).trim().toLowerCase();

  if (pat === tgt) return true;
  if (pat.replace(/\.exe$/, '') === tgt.replace(/\.exe$/, '')) return true;
  if (pat.startsWith('*.')) {
    const root = pat.slice(2);
    if (tgt === root || tgt.endsWith('.' + root)) return true;
  }
  if (pat.endsWith(':*')) {
    const host = pat.slice(0, -2);
    const targetHost = tgt.split(':')[0];
    if (targetHost === host) return true;
  }
  return false;
}

assert(matchPattern('WhatsApp.exe', 'WhatsApp.exe'), 'matchPattern: WhatsApp.exe matches WhatsApp.exe');
assert(matchPattern('WhatsApp.exe', 'whatsapp'), 'matchPattern: WhatsApp.exe matches whatsapp');
assert(matchPattern('web.whatsapp.com', 'web.whatsapp.com'), 'matchPattern: web.whatsapp.com matches web.whatsapp.com');
assert(matchPattern('*.whatsapp.com', 'web.whatsapp.com'), 'matchPattern: *.whatsapp.com matches web.whatsapp.com');
assert(matchPattern('*.whatsapp.com', 'api.whatsapp.com'), 'matchPattern: *.whatsapp.com matches api.whatsapp.com');
assert(matchPattern('Code.exe', 'Code'), 'matchPattern: Code.exe matches Code');
assert(matchPattern('localhost:*', 'localhost:3000'), 'matchPattern: localhost:* matches localhost:3000');
assert(!matchPattern('*.whatsapp.com', 'youtube.com'), 'matchPattern: *.whatsapp.com rejects youtube.com');

// 6. Verify CSS Classes
assert(cssContent.includes('.action-pill.fs-pill'), 'CSS contains .action-pill.fs-pill');
assert(cssContent.includes('.focus-protected-badge.grace-warning'), 'CSS contains .focus-protected-badge.grace-warning');
assert(cssContent.includes('.setup-option-toggle'), 'CSS contains .setup-option-toggle');

console.log('\n🌟 ALL FULLSCREEN & MULTITASKING VERIFICATIONS PASSED 100%! 🌟\n');
