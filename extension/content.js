// Focusr Companion Content Script
// Acts as a bi-directional bridge between the Focusr web app and the extension background worker.

(function() {
  const host = window.location.hostname.toLowerCase();
  const isFocusr = host === 'localhost' ||
                   host === '127.0.0.1' ||
                   host.includes('focusr') ||
                   host.endsWith('vercel.app');

  if (!isFocusr) return;

  const FOCUSR_EXT_VERSION = '1.1.0';

  function announcePresence() {
    window.postMessage({
      type: 'FOCUSR_EXTENSION_READY',
      version: FOCUSR_EXT_VERSION,
      source: 'focusr-extension'
    }, '*');
  }

  // Relay messages from background worker to web page
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'FOCUSR_ACTIVE_TAB_CHANGED' || msg.type === 'FOCUSR_ACTIVE_APP_CHANGED') {
      window.postMessage({
        ...msg,
        source: 'focusr-extension'
      }, '*');
    }
  });

  // Listen to requests from web page
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    const { type, requestId } = event.data;

    if (type === 'FOCUSR_PING') {
      // Query bridge status alongside pong
      chrome.runtime.sendMessage({ type: 'GET_BRIDGE_STATUS' }, (bridgeRes) => {
        window.postMessage({
          type: 'FOCUSR_PONG',
          version: FOCUSR_EXT_VERSION,
          bridgeStatus: bridgeRes,
          requestId,
          source: 'focusr-extension'
        }, '*');
      });
      return;
    }

    if (type === 'FOCUSR_REQ_TABS') {
      chrome.runtime.sendMessage({ type: 'GET_OPEN_TABS' }, (response) => {
        window.postMessage({
          type: 'FOCUSR_RESP_TABS',
          tabs: (response && response.tabs) || [],
          requestId,
          source: 'focusr-extension'
        }, '*');
      });
      return;
    }

    if (type === 'FOCUSR_REQ_HISTORY') {
      chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
        window.postMessage({
          type: 'FOCUSR_RESP_HISTORY',
          history: (response && response.history) || [],
          requestId,
          source: 'focusr-extension'
        }, '*');
      });
      return;
    }

    if (type === 'FOCUSR_REQ_APPS') {
      chrome.runtime.sendMessage({ type: 'GET_RUNNING_APPS' }, (response) => {
        window.postMessage({
          type: 'FOCUSR_RESP_APPS',
          apps: (response && response.apps) || [],
          connected: !!(response && response.connected),
          requestId,
          source: 'focusr-extension'
        }, '*');
      });
      return;
    }
  });

  announcePresence();
  if (document.readyState !== 'complete') {
    window.addEventListener('DOMContentLoaded', announcePresence);
    window.addEventListener('load', announcePresence);
  }
})();
