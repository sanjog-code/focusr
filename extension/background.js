// Focusr Companion Background Service Worker (Manifest V3)

function extractDomain(urlStr) {
  try {
    if (!urlStr) return '';
    const u = new URL(urlStr);
    return u.hostname || '';
  } catch (e) {
    return '';
  }
}

// Find all open Focusr tabs across any port/domain
async function getFocusrTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    return tabs.filter(t => {
      if (!t.url) return false;
      const url = t.url.toLowerCase();
      return url.includes('focusr') ||
             url.includes('localhost') ||
             url.includes('127.0.0.1') ||
             url.includes('vercel.app');
    });
  } catch (e) {
    return [];
  }
}

// Broadcast active tab change to Focusr tabs
async function broadcastActiveTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return;

    const domain = extractDomain(tab.url);
    const payload = {
      type: 'FOCUSR_ACTIVE_TAB_CHANGED',
      domain: domain,
      url: tab.url,
      title: tab.title || domain,
      favIconUrl: tab.favIconUrl || ''
    };

    const focusrTabs = await getFocusrTabs();
    for (const fTab of focusrTabs) {
      if (fTab.id) {
        chrome.tabs.sendMessage(fTab.id, payload).catch(() => {});
      }
    }
  } catch (err) {}
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  broadcastActiveTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    if (tab.active) {
      broadcastActiveTab(tabId);
    }
  }
});

// Bridge to local Desktop Bridge at 127.0.0.1:42069
let lastActiveApp = { processName: '', windowTitle: '', pid: 0 };
let bridgeConnected = false;

async function checkDesktopBridge() {
  try {
    const res = await fetch('http://127.0.0.1:42069/status', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      bridgeConnected = true;
      if (data.activeWindow && data.activeWindow.processName) {
        if (data.activeWindow.processName !== lastActiveApp.processName || data.activeWindow.windowTitle !== lastActiveApp.windowTitle) {
          lastActiveApp = data.activeWindow;
          // Broadcast active desktop app change to Focusr tabs
          const focusrTabs = await getFocusrTabs();
          for (const fTab of focusrTabs) {
            if (fTab.id) {
              chrome.tabs.sendMessage(fTab.id, {
                type: 'FOCUSR_ACTIVE_APP_CHANGED',
                processName: lastActiveApp.processName,
                windowTitle: lastActiveApp.windowTitle,
                pid: lastActiveApp.pid
              }).catch(() => {});
            }
          }
        }
      }
    } else {
      bridgeConnected = false;
    }
  } catch (e) {
    bridgeConnected = false;
  }
}

// Poll desktop bridge every 2s
setInterval(checkDesktopBridge, 2000);
checkDesktopBridge();

// Message handler from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'GET_OPEN_TABS') {
    chrome.tabs.query({}, (tabs) => {
      const openTabs = [];
      for (const t of tabs || []) {
        if (!t.url) continue;
        const domain = extractDomain(t.url);
        if (!domain) continue;
        if (t.url.startsWith('chrome://') || t.url.startsWith('edge://') || t.url.startsWith('about:')) continue;

        openTabs.push({
          id: t.id,
          title: t.title || domain,
          url: t.url,
          domain: domain,
          favIconUrl: t.favIconUrl || '',
          active: !!t.active
        });
      }
      sendResponse({ tabs: openTabs });
    });
    return true;
  }

  if (message.type === 'GET_HISTORY') {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    chrome.history.search({
      text: '',
      startTime: oneWeekAgo,
      maxResults: 2000
    }, (items) => {
      const domainMap = new Map();
      for (const item of items || []) {
        if (!item.url) continue;
        const domain = extractDomain(item.url);
        if (!domain || domain === 'localhost' || domain === '127.0.0.1') continue;
        if (item.url.startsWith('chrome://') || item.url.startsWith('edge://') || item.url.startsWith('about:')) continue;

        const count = item.visitCount || 1;
        if (!domainMap.has(domain)) {
          domainMap.set(domain, {
            domain: domain,
            title: item.title || domain,
            visitCount: count,
            url: item.url
          });
        } else {
          const existing = domainMap.get(domain);
          existing.visitCount += count;
          if (item.title && (!existing.title || existing.title === existing.domain)) {
            existing.title = item.title;
          }
        }
      }

      const sortedHistory = Array.from(domainMap.values())
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 25);

      sendResponse({ history: sortedHistory });
    });
    return true;
  }

  if (message.type === 'GET_RUNNING_APPS') {
    fetch('http://127.0.0.1:42069/apps', { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(data => {
        sendResponse({ apps: data.apps || [], connected: true });
      })
      .catch(err => {
        sendResponse({ apps: [], connected: false, error: err.message });
      });
    return true;
  }

  if (message.type === 'GET_BRIDGE_STATUS') {
    sendResponse({ connected: bridgeConnected, activeApp: lastActiveApp });
    return false;
  }
});
