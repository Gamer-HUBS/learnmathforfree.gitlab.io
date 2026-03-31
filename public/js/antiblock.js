(() => {
  console.log("[AntiBlock] Protection active - popup/redirect blocking + exploit loaded.");

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

  const locationHandler = {
    get href() { return window.location.href; },
    set href(url) { console.log("[AntiBlock] Redirect blocked:", url); },
    get pathname() { return window.location.pathname; },
    set pathname(val) { console.log("[AntiBlock] Pathname redirect blocked"); },
    get search() { return window.location.search; },
    set search(val) { console.log("[AntiBlock] Search redirect blocked"); },
  };
  
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;
  const originalReload = window.location.reload;
  
  window.location.assign = function(url) {
    console.log("[AntiBlock] Redirect (assign) blocked:", url);
  };
  window.location.replace = function(url) {
    console.log("[AntiBlock] Redirect (replace) blocked:", url);
  };
  window.location.reload = function() {
    console.log("[AntiBlock] Page reload blocked");
  };

  // Block meta refresh redirects
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === "META" && node.getAttribute("http-equiv") === "refresh") {
            console.log("[AntiBlock] Meta refresh blocked:", node.getAttribute("content"));
            node.remove();
          }
        });
      }
    });
  });
  observer.observe(document.head, { childList: true });

  // Block popups and window.open
  const originalOpen = window.open;
  window.open = function(url, target, features) {
    console.log("[AntiBlock] Popup blocked:", url);
    return null;
  };

  document.addEventListener('click', (e) => {
    e.preventDefault = function() {
      console.log("[AntiBlock] Popup click prevented");
      Event.prototype.preventDefault.call(this);
    };
  }, true);

  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    console.log("[AntiBlock] Beforeunload redirect blocked");
  });

  const style = document.createElement('style');
  style.textContent = `
    [class*="blocksi" i], [id*="blocksi" i], 
    [class*="goguardian" i], [id*="goguardian" i],
    [class*="popup" i], [id*="popup" i],
    [class*="redirect" i], [id*="redirect" i] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  const scriptTag = document.createElement('script');
  scriptTag.src = '/js/exploit.js';
  scriptTag.onerror = () => console.log("[AntiBlock] Exploit.js failed to load");
  scriptTag.onload = () => console.log("[AntiBlock] Exploit.js loaded successfully");
  document.head.appendChild(scriptTag);
})();
