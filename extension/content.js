// Focusr Companion Content Script
// Acts as a secure bridge between the Focusr web app (window.postMessage) and extension background worker.

(function() {
  const FOCUSR_EXT_VERSION = '1.0.0';

  // Announce extension presence to the page
  function announcePresence() {
    window.postMessage({
      type: 'FOCUSR_EXTENSION_READY',
      version: FOCUSR_EXT_VERSION,
      source: 'focusr-extension'
    }, '*');
  }

  // Relay messages from extension background to the web page
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'FOCUSR_ACTIVE_TAB_CHANGED') {
      window.postMessage({
        type: 'FOCUSR_ACTIVE_TAB_CHANGED',
        domain: msg.domain,
        url: msg.url,
        title: msg.title,
        favIconUrl: msg.favIconUrl,
        source: 'focusr-extension'
      }, '*');
    }
  });

  // Listen to requests from the webpage
  window.addEventListener('message', (event) => {
    // Only accept messages from the current window
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    const { type, requestId } = event.data;

    // Ping check
    if (type === 'FOCUSR_PING') {
      window.postMessage({
        type: 'FOCUSR_PONG',
        version: FOCUSR_EXT_VERSION,
        requestId,
        source: 'focusr-extension'
      }, '*');
      return;
    }

    // Request open tabs
    if (type === 'FOCUSR_REQ_TABS') {
      chrome.runtime.sendMessage({ type: 'GET_OPEN_TABS' }, (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: 'FOCUSR_RESP_TABS',
            error: chrome.runtime.lastError.message,
            tabs: [],
            requestId,
            source: 'focusr-extension'
          }, '*');
          return;
        }
        window.postMessage({
          type: 'FOCUSR_RESP_TABS',
          tabs: (response && response.tabs) || [],
          requestId,
          source: 'focusr-extension'
        }, '*');
      });
      return;
    }

    // Request browsing history
    if (type === 'FOCUSR_REQ_HISTORY') {
      chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: 'FOCUSR_RESP_HISTORY',
            error: chrome.runtime.lastError.message,
            history: [],
            requestId,
            source: 'focusr-extension'
          }, '*');
          return;
        }
        window.postMessage({
          type: 'FOCUSR_RESP_HISTORY',
          history: (response && response.history) || [],
          requestId,
          source: 'focusr-extension'
        }, '*');
      });
      return;
    }
  });

  // Announce when ready and periodically in the first few seconds in case webpage loads later
  announcePresence();
  if (document.readyState !== 'complete') {
    window.addEventListener('DOMContentLoaded', announcePresence);
    window.addEventListener('load', announcePresence);
  }
})();
