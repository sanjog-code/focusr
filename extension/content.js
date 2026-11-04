// Focusr Companion Content Script
// Bi-directional bridge between the Focusr web application and the extension background service worker.

(function() {
  const host = window.location.hostname.toLowerCase();
  const isFocusr = host === 'localhost' ||
                   host === '127.0.0.1' ||
                   host.includes('focusr') ||
                   host.endsWith('vercel.app');

  if (!isFocusr) return;

  const FOCUSR_EXT_VERSION = '1.2.0';

  function safePost(payload) {
    try {
      window.postMessage({
        ...payload,
        version: FOCUSR_EXT_VERSION,
        source: 'focusr-companion-ext'
      }, '*');
    } catch (e) {}
  }

  function announcePresence(extra = {}) {
    safePost({
      type: 'FOCUSR_EXTENSION_READY',
      ...extra
    });
  }

  // Register this tab with background worker
  function registerTab() {
    try {
      chrome.runtime.sendMessage({ type: 'REGISTER_FOCUSR_TAB' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res) {
          announcePresence({
            bridgeConnected: !!res.bridgeConnected,
            activeApp: res.activeApp || null,
            currentActiveTab: res.currentActiveTab || null
          });
        }
      });
    } catch (e) {}
  }

  // Relay real-time broadcast events from background worker into webpage
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'FOCUSR_ACTIVE_TAB_CHANGED' ||
        msg.type === 'FOCUSR_ACTIVE_APP_CHANGED' ||
        msg.type === 'FOCUSR_BRIDGE_STATUS_CHANGED' ||
        msg.type === 'FOCUSR_RESP_APPS') {
      safePost(msg);
    }
  });

  // Listen to requests dispatched by Focusr in index.html
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    const { type, requestId } = event.data;

    if (type === 'FOCUSR_PING') {
      try {
        chrome.runtime.sendMessage({ type: 'GET_BRIDGE_STATUS' }, (bridgeRes) => {
          if (chrome.runtime.lastError) {
            safePost({
              type: 'FOCUSR_PONG',
              bridgeConnected: false,
              requestId
            });
            return;
          }
          safePost({
            type: 'FOCUSR_PONG',
            bridgeConnected: !!(bridgeRes && bridgeRes.connected),
            bridgeStatus: bridgeRes,
            activeApp: (bridgeRes && bridgeRes.activeApp) || null,
            currentActiveTab: (bridgeRes && bridgeRes.currentActiveTab) || null,
            requestId
          });
        });
      } catch (e) {
        safePost({ type: 'FOCUSR_PONG', bridgeConnected: false, requestId });
      }
      return;
    }

    if (type === 'FOCUSR_REQ_TABS') {
      try {
        chrome.runtime.sendMessage({ type: 'GET_OPEN_TABS' }, (response) => {
          if (chrome.runtime.lastError) {
            safePost({ type: 'FOCUSR_RESP_TABS', tabs: [], requestId });
            return;
          }
          safePost({
            type: 'FOCUSR_RESP_TABS',
            tabs: (response && response.tabs) || [],
            requestId
          });
        });
      } catch (e) {
        safePost({ type: 'FOCUSR_RESP_TABS', tabs: [], requestId });
      }
      return;
    }

    if (type === 'FOCUSR_REQ_HISTORY') {
      try {
        chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
          if (chrome.runtime.lastError) {
            safePost({ type: 'FOCUSR_RESP_HISTORY', history: [], requestId });
            return;
          }
          safePost({
            type: 'FOCUSR_RESP_HISTORY',
            history: (response && response.history) || [],
            requestId
          });
        });
      } catch (e) {
        safePost({ type: 'FOCUSR_RESP_HISTORY', history: [], requestId });
      }
      return;
    }

    if (type === 'FOCUSR_REQ_APPS') {
      try {
        chrome.runtime.sendMessage({ type: 'GET_RUNNING_APPS' }, (response) => {
          if (chrome.runtime.lastError) {
            safePost({ type: 'FOCUSR_RESP_APPS', apps: [], connected: false, requestId });
            return;
          }
          safePost({
            type: 'FOCUSR_RESP_APPS',
            apps: (response && response.apps) || [],
            connected: !!(response && response.connected),
            requestId
          });
        });
      } catch (e) {
        safePost({ type: 'FOCUSR_RESP_APPS', apps: [], connected: false, requestId });
      }
      return;
    }
  });

  registerTab();
  announcePresence();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerTab();
      announcePresence();
    });
  }
  window.addEventListener('load', () => {
    registerTab();
    announcePresence();
  });
})();
