#!/usr/bin/env node

/**
 * Focusr Desktop Bridge (scripts/bridge.mjs)
 * Standalone, zero-dependency Node.js bridge for Windows desktop app discovery
 * and active foreground window streaming to Focusr via WebSocket (127.0.0.1:42069).
 */

import http from 'node:http';
import crypto from 'node:crypto';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline';

const execAsync = promisify(exec);
const PORT = 42069;
const HOST = '127.0.0.1';
const BRIDGE_VERSION = '1.0.0';

// Known Windows system/background processes to filter out from user application list
const SYSTEM_PROCESSES = new Set([
  'system idle process', 'system', 'secure system', 'registry', 'smss.exe', 'csrss.exe',
  'wininit.exe', 'services.exe', 'lsaiso.exe', 'lsass.exe', 'svchost.exe', 'fontdrvhost.exe',
  'wudfhost.exe', 'memory compression', 'unsecapp.exe', 'spoolsv.exe', 'dwm.exe', 'conhost.exe',
  'runtimebroker.exe', 'sihost.exe', 'ctfmon.exe', 'taskhostw.exe', 'shellexperiencehost.exe',
  'startmenuexperiencehost.exe', 'searchhost.exe', 'lockapp.exe', 'searchapp.exe',
  'searchprotocolhost.exe', 'searchfilterhost.exe', 'wmiprvse.exe', 'audiodg.exe',
  'backgroundtaskhost.exe', 'gamebarpresencewriter.exe', 'tasklist.exe', 'cmd.exe',
  'dllhost.exe', 'smartscreen.exe', 'mousocoreworker.exe', 'monotificationux.exe',
  'aggregatorhost.exe', 'presentmonservice.exe', 'ipfsvc.exe', 'ipf_uf.exe', 'omencap.exe',
  'apphelpercap.exe', 'diagscap.exe', 'networkcap.exe', 'sysinfocap.exe', 'rtkauduservice64.exe',
  'rtkbtmanserv.exe', 'etdservice.exe', 'hpcommrecovery.exe', 'hpprintscandoctorservice.exe',
  'touchpointanalyticsclientservice.exe', 'mc-fw-host.exe', 'mc-neo-host.exe', 'filecoauth.exe',
  'useroobebroker.exe', 'widgetservice.exe', 'widgets.exe', 'crossdeviceservice.exe',
  'crossdeviceresume.exe', 'dataexchangehost.exe', 'defendersessionhelper.exe', 'desktopextension.exe',
  'applicationframehost.exe', 'accountscontrolhost.exe', 'appvshnotify.exe'
]);

let currentActiveWindow = {
  processName: '',
  windowTitle: '',
  pid: 0,
  updatedAt: Date.now()
};

/**
 * Fetch list of running user-facing desktop applications
 */
async function getRunningUserApps() {
  try {
    const { stdout } = await execAsync('tasklist /fo csv /nh');
    const lines = stdout.split('\r\n').filter(Boolean);
    const seen = new Set();
    const apps = [];

    for (const line of lines) {
      const match = line.match(/^"([^"]+)","([^"]+)","([^"]+)"/);
      if (!match) continue;
      const [, imageName, pidStr, sessionName] = match;
      const lower = imageName.toLowerCase();

      // Only inspect interactive user session processes
      if (sessionName.toLowerCase() !== 'console') continue;
      if (SYSTEM_PROCESSES.has(lower)) continue;

      if (!seen.has(lower)) {
        seen.add(lower);
        const displayName = imageName.replace(/\.exe$/i, '');
        apps.push({
          processName: imageName,
          displayName,
          pid: parseInt(pidStr, 10)
        });
      }
    }

    return apps.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (err) {
    console.error('[Bridge] Error reading tasklist:', err.message);
    return [];
  }
}

/**
 * WebSocket frame encoder (RFC 6455)
 */
function encodeWebSocketFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const length = payload.length;
  let header;
  if (length <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = length;
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  return Buffer.concat([header, payload]);
}

const activeSockets = new Set();

function broadcast(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const frame = encodeWebSocketFrame(text);
  for (const socket of activeSockets) {
    try {
      if (!socket.destroyed && socket.writable) {
        socket.write(frame);
      }
    } catch {
      activeSockets.delete(socket);
    }
  }
}

function sendToSocket(socket, data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  if (!socket.destroyed && socket.writable) {
    socket.write(encodeWebSocketFrame(text));
  }
}

/**
 * HTTP Server handling CORS and upgrade to WebSocket
 */
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health' || url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      bridge: 'focusr-desktop',
      version: BRIDGE_VERSION,
      activeWindow: currentActiveWindow
    }));
    return;
  }

  if (url.pathname === '/apps') {
    const apps = await getRunningUserApps();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ apps }));
    return;
  }

  if (url.pathname === '/active') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ activeWindow: currentActiveWindow }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n'
  ];

  socket.write(headers.join('\r\n'));
  activeSockets.add(socket);

  // Send initial state on connection
  sendToSocket(socket, {
    type: 'BRIDGE_CONNECTED',
    version: BRIDGE_VERSION,
    activeWindow: currentActiveWindow
  });

  let buffer = Buffer.alloc(0);

  socket.on('data', async chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const byte1 = buffer[0];
      const byte2 = buffer[1];
      const opcode = byte1 & 0x0f;
      const isMasked = (byte2 & 0x80) !== 0;
      let payloadLen = byte2 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) break;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) break;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let maskKey = null;
      if (isMasked) {
        if (buffer.length < offset + 4) break;
        maskKey = buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + payloadLen) break;

      const rawPayload = buffer.subarray(offset, offset + payloadLen);
      const unmasked = Buffer.alloc(payloadLen);

      if (isMasked && maskKey) {
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = rawPayload[i] ^ maskKey[i % 4];
        }
      } else {
        rawPayload.copy(unmasked);
      }

      buffer = buffer.subarray(offset + payloadLen);

      if (opcode === 0x8) {
        socket.end();
        activeSockets.delete(socket);
        break;
      } else if (opcode === 0x9) {
        socket.write(Buffer.from([0x8A, 0x00])); // Pong
      } else if (opcode === 0x1) {
        try {
          const msgStr = unmasked.toString('utf8');
          const message = JSON.parse(msgStr);

          if (message.type === 'PING') {
            sendToSocket(socket, { type: 'PONG', time: Date.now() });
          } else if (message.type === 'GET_RUNNING_APPS') {
            const apps = await getRunningUserApps();
            sendToSocket(socket, {
              type: 'RUNNING_APPS',
              apps,
              requestId: message.requestId
            });
          } else if (message.type === 'GET_ACTIVE_WINDOW') {
            sendToSocket(socket, {
              type: 'ACTIVE_WINDOW',
              processName: currentActiveWindow.processName,
              windowTitle: currentActiveWindow.windowTitle,
              pid: currentActiveWindow.pid,
              requestId: message.requestId
            });
          }
        } catch {
          // ignore malformed message
        }
      }
    }
  });

  socket.on('close', () => activeSockets.delete(socket));
  socket.on('error', () => activeSockets.delete(socket));
});

/**
 * Foreground window poller via persistent PowerShell process
 */
function startForegroundWindowPoller() {
  const psScript = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinUtil {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
$lastPid = -1
$lastTitle = ""
while ($true) {
  try {
    $hwnd = [WinUtil]::GetForegroundWindow()
    if ($hwnd -ne [IntPtr]::Zero) {
      $pidOut = 0
      [WinUtil]::GetWindowThreadProcessId($hwnd, [ref]$pidOut) | Out-Null
      $sb = New-Object System.Text.StringBuilder 512
      [WinUtil]::GetWindowText($hwnd, $sb, 512) | Out-Null
      $title = $sb.ToString()
      if ($pidOut -ne $lastPid -or $title -ne $lastTitle) {
        $proc = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
        $procName = if ($proc) { $proc.ProcessName + ".exe" } else { "unknown.exe" }
        $obj = @{ type = "ACTIVE_WINDOW"; processName = $procName; windowTitle = $title; pid = $pidOut }
        [Console]::WriteLine((ConvertTo-Json -Compress -InputObject $obj))
        $lastPid = $pidOut
        $lastTitle = $title
      }
    }
  } catch {}
  Start-Sleep -Milliseconds 1500
}
`;

  try {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      windowsHide: true
    });

    const rl = readline.createInterface({ input: ps.stdout });

    rl.on('line', line => {
      try {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) return;
        const data = JSON.parse(trimmed);
        if (data.type === 'ACTIVE_WINDOW') {
          currentActiveWindow = {
            processName: data.processName || '',
            windowTitle: data.windowTitle || '',
            pid: data.pid || 0,
            updatedAt: Date.now()
          };
          // Broadcast to all connected clients
          broadcast({
            type: 'ACTIVE_WINDOW',
            processName: currentActiveWindow.processName,
            windowTitle: currentActiveWindow.windowTitle,
            pid: currentActiveWindow.pid
          });
        }
      } catch {
        // ignore parsing errors
      }
    });

    ps.on('exit', () => {
      // Auto restart after a small delay if exited unexpectedly
      setTimeout(startForegroundWindowPoller, 3000);
    });

    ps.on('error', err => {
      console.error('[Bridge] Poller spawn error:', err.message);
    });
  } catch (err) {
    console.error('[Bridge] Failed to launch foreground poller:', err.message);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`  Focusr Desktop Bridge running on http://${HOST}:${PORT}`);
  console.log(`  WebSocket ready at ws://${HOST}:${PORT}`);
  console.log(`  Version: ${BRIDGE_VERSION}`);
  console.log(`======================================================\n`);
  startForegroundWindowPoller();
});
