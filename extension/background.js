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

// Helper to broadcast active tab changed to all Focusr tabs
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

    // Find all Focusr tabs matching our patterns
    const focusrTabs = await chrome.tabs.query({
      url: [
        '*://localhost/*',
        '*://127.0.0.1/*',
        'https://focusr-seven.vercel.app/*',
        'https://*.vercel.app/*'
      ]
    });

    for (const fTab of focusrTabs) {
      if (fTab.id) {
        chrome.tabs.sendMessage(fTab.id, payload).catch(() => {
          // Tab might not be loaded or content script not ready, ignore
        });
      }
    }
  } catch (err) {
    // Tab might have been closed immediately
  }
}

// Tab activation listener
chrome.tabs.onActivated.addListener((activeInfo) => {
  broadcastActiveTab(activeInfo.tabId);
});

// Tab update listener (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    if (tab.active) {
      broadcastActiveTab(tabId);
    }
  }
});

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
        // Skip browser internal pages
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
    return true; // Keep channel open for async response
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

      // Sort by visit count descending and take top 20
      const sortedHistory = Array.from(domainMap.values())
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 20);

      sendResponse({ history: sortedHistory });
    });
    return true; // Keep channel open for async response
  }
});
