// Focusr Companion Background Service Worker (Manifest V3)
// Relays active tabs, browsing history, and local Windows bridge to Focusr tabs

const BRIDGE_URL = 'http://127.0.0.1:42069';
const BRIDGE_WS_URL = 'ws://127.0.0.1:42069';

const registeredFocusrTabs = new Set();
let bridgeConnected = false;
let bridgeSocket = null;
let lastActiveApp = { processName: '', windowTitle: '', pid: 0 };
let currentActiveTabInfo = { domain: '', url: '', title: '', favIconUrl: '' };

function extractDomain(urlStr) {
  try {
    if (!urlStr) return '';
    const u = new URL(urlStr);
    return u.hostname || '';
  } catch (e) {
    return '';
  }
}

// Find all open Focusr tabs across localhost, IP, or Vercel production
async function getFocusrTabs() {
  const tabIds = new Set(registeredFocusrTabs);
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs || []) {
      if (!t.url) continue;
      const url = t.url.toLowerCase();
      if (url.includes('focusr') ||
          url.includes('localhost') ||
          url.includes('127.0.0.1') ||
          url.includes('vercel.app')) {
        if (t.id) tabIds.add(t.id);
      }
    }
  } catch (e) {}
  return Array.from(tabIds);
}

// Broadcast an event to all open Focusr tabs
async function broadcastToFocusr(payload) {
  const tabIds = await getFocusrTabs();
  for (const tid of tabIds) {
    chrome.tabs.sendMessage(tid, payload, () => {
      if (chrome.runtime.lastError) {
        registeredFocusrTabs.delete(tid);
      }
    });
  }
}

// Broadcast active tab change
async function handleActiveTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return;

    const domain = extractDomain(tab.url);
    currentActiveTabInfo = {
      domain,
      url: tab.url,
      title: tab.title || domain,
      favIconUrl: tab.favIconUrl || ''
    };

    broadcastToFocusr({
      type: 'FOCUSR_ACTIVE_TAB_CHANGED',
      domain: currentActiveTabInfo.domain,
      url: currentActiveTabInfo.url,
      title: currentActiveTabInfo.title,
      favIconUrl: currentActiveTabInfo.favIconUrl
    });
  } catch (err) {}
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  handleActiveTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    if (tab.active) {
      handleActiveTab(tabId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  registeredFocusrTabs.delete(tabId);
});

// WebSocket Connection to Local Windows Desktop Bridge
function connectBridgeWebSocket() {
  if (bridgeSocket && (bridgeSocket.readyState === WebSocket.OPEN || bridgeSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    bridgeSocket = new WebSocket(BRIDGE_WS_URL);

    bridgeSocket.onopen = () => {
      bridgeConnected = true;
      broadcastToFocusr({
        type: 'FOCUSR_BRIDGE_STATUS_CHANGED',
        connected: true,
        activeApp: lastActiveApp
      });
    };

    bridgeSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'BRIDGE_CONNECTED') {
          bridgeConnected = true;
          if (data.activeWindow) {
            lastActiveApp = data.activeWindow;
          }
          broadcastToFocusr({
            type: 'FOCUSR_BRIDGE_STATUS_CHANGED',
            connected: true,
            activeApp: lastActiveApp
          });
        } else if (data.type === 'ACTIVE_WINDOW') {
          lastActiveApp = {
            processName: data.processName || '',
            windowTitle: data.windowTitle || '',
            pid: data.pid || 0
          };
          broadcastToFocusr({
            type: 'FOCUSR_ACTIVE_APP_CHANGED',
            processName: lastActiveApp.processName,
            windowTitle: lastActiveApp.windowTitle,
            pid: lastActiveApp.pid
          });
        } else if (data.type === 'RUNNING_APPS') {
          broadcastToFocusr({
            type: 'FOCUSR_RESP_APPS',
            apps: data.apps || [],
            connected: true
          });
        }
      } catch (e) {}
    };

    bridgeSocket.onclose = () => {
      bridgeConnected = false;
      bridgeSocket = null;
      broadcastToFocusr({
        type: 'FOCUSR_BRIDGE_STATUS_CHANGED',
        connected: false,
        activeApp: lastActiveApp
      });
      setTimeout(connectBridgeWebSocket, 3000);
    };

    bridgeSocket.onerror = () => {
      bridgeConnected = false;
      try { bridgeSocket.close(); } catch (e) {}
      bridgeSocket = null;
    };
  } catch (err) {
    bridgeConnected = false;
    setTimeout(connectBridgeWebSocket, 4000);
  }
}

// Start WebSocket connection to bridge
connectBridgeWebSocket();

// Periodic HTTP fallback status probe
async function pollBridgeHttp() {
  try {
    const res = await fetch(`${BRIDGE_URL}/status`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      bridgeConnected = true;
      if (data.activeWindow && data.activeWindow.processName) {
        if (data.activeWindow.processName !== lastActiveApp.processName ||
            data.activeWindow.windowTitle !== lastActiveApp.windowTitle) {
          lastActiveApp = data.activeWindow;
          broadcastToFocusr({
            type: 'FOCUSR_ACTIVE_APP_CHANGED',
            processName: lastActiveApp.processName,
            windowTitle: lastActiveApp.windowTitle,
            pid: lastActiveApp.pid
          });
        }
      }
    } else {
      bridgeConnected = false;
    }
  } catch (e) {
    if (!bridgeSocket || bridgeSocket.readyState !== WebSocket.OPEN) {
      bridgeConnected = false;
    }
  }
}

setInterval(pollBridgeHttp, 4000);
pollBridgeHttp();

// Message handler from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (sender && sender.tab && sender.tab.id) {
    registeredFocusrTabs.add(sender.tab.id);
  }

  if (message.type === 'REGISTER_FOCUSR_TAB') {
    if (sender && sender.tab && sender.tab.id) {
      registeredFocusrTabs.add(sender.tab.id);
    }
    sendResponse({
      registered: true,
      bridgeConnected,
      activeApp: lastActiveApp,
      currentActiveTab: currentActiveTabInfo
    });
    return false;
  }

  if (message.type === 'GET_OPEN_TABS') {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({ tabs: [] });
        return;
      }
      const openTabs = [];
      for (const t of tabs || []) {
        if (!t.url) continue;
        const domain = extractDomain(t.url);
        if (!domain) continue;
        if (t.url.startsWith('chrome://') ||
            t.url.startsWith('edge://') ||
            t.url.startsWith('about:') ||
            t.url.startsWith('chrome-extension://')) continue;

        openTabs.push({
          id: t.id,
          title: t.title || domain,
          url: t.url,
          domain: domain,
          favIconUrl: t.favIconUrl || '',
          active: !!t.active
        });
      }
      // Sort active tab first, then title
      openTabs.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
      sendResponse({ tabs: openTabs });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_HISTORY') {
    // Search all browsing history with zero cutoff to guarantee full work domains
    chrome.history.search({
      text: '',
      startTime: 0,
      maxResults: 5000
    }, (items) => {
      if (chrome.runtime.lastError || !items) {
        sendResponse({ history: [] });
        return;
      }

      const domainMap = new Map();
      for (const item of items) {
        if (!item.url) continue;
        const domain = extractDomain(item.url);
        if (!domain ||
            domain === 'localhost' ||
            domain === '127.0.0.1' ||
            domain.startsWith('chrome-extension://')) continue;

        if (item.url.startsWith('chrome://') ||
            item.url.startsWith('edge://') ||
            item.url.startsWith('about:')) continue;

        const count = item.visitCount || 1;
        if (!domainMap.has(domain)) {
          domainMap.set(domain, {
            domain: domain,
            title: item.title || domain,
            visitCount: count,
            url: item.url,
            lastVisitTime: item.lastVisitTime || 0
          });
        } else {
          const existing = domainMap.get(domain);
          existing.visitCount += count;
          if (item.title && (!existing.title || existing.title === existing.domain)) {
            existing.title = item.title;
          }
          if (item.lastVisitTime && item.lastVisitTime > existing.lastVisitTime) {
            existing.lastVisitTime = item.lastVisitTime;
          }
        }
      }

      const sortedHistory = Array.from(domainMap.values())
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 40);

      sendResponse({ history: sortedHistory });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_RUNNING_APPS') {
    fetch(`${BRIDGE_URL}/apps`, { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(data => {
        bridgeConnected = true;
        sendResponse({ apps: data.apps || [], connected: true });
      })
      .catch(err => {
        sendResponse({ apps: [], connected: bridgeConnected, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_BRIDGE_STATUS') {
    sendResponse({
      connected: bridgeConnected,
      activeApp: lastActiveApp,
      currentActiveTab: currentActiveTabInfo
    });
    return false;
  }
});
