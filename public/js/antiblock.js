/**
 * antiblock.js - Popup Protection
 *
 * This script runs inside iframe popups to provide protection 
 * against common school filters like Blocksi.
 */

(() => {
  console.log("[AntiBlock] Popup protection active.");

  const blockedDomains = [
    "blocksi.net", "blocksi.io", "bsecur.io", "bl0cksi.net", "block.si",
    "teacher.blocksi.net", "parent.blocksi.net", "api.blocksi.net",
    "goguardian.com", "securly.com"
  ];

  function isBlocked(url) {
    try {
      const hostname = new URL(url, location.href).hostname.toLowerCase();
      return blockedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch { return false; }
  }

  // Block fetch/XHR to filter domains
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    if (typeof args[0] === 'string' && isBlocked(args[0])) {
      return Promise.reject(new Error("Blocked by AntiBlock"));
    }
    return originalFetch.apply(this, args);
  };

  // Basic DOM protection
  const style = document.createElement('style');
  style.textContent = `
    [class*="blocksi" i], [id*="blocksi" i], 
    [class*="goguardian" i], [id*="goguardian" i] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
})();
