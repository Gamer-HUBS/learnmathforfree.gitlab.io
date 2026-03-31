/**
 * antiblock.js - MAXIMUM BLOCKSI DESTRUCTION
 *
 * - Removes ALL Blocksi/GoGuardian/filter overlays and injections
 * - Blocks Blocksi domains and scripts
 * - Retries blocked images using safe proxy
 * - Prevents redirect hijacking
 * - About:blank only navigation
 */

(() => {
  console.log("[AntiBlock] MAXIMUM PROTECTION Initializing...");

  // ===================================================
  // 1. COMPREHENSIVE BLOCKSI KEYWORD LIST
  // ===================================================

  const blocksiKeywords = [
    // Blocksi variations
    "blocksi", "bl0cksi", "bloksi", "bl0ksi", "bI0cksi",
    "bsecure", "b-secure", "bsecur", "bsec",
    
    // Common filter keywords
    "webfilter", "web-filter", "filtering", "filtered",
    "blocked", "block-page", "blockpage", "access-denied",
    "overlay", "filter-overlay", "content-filter",
    
    // Specific blocking services
    "securly", "goguardian", "go-guardian",
    "linewize", "lightspeed", "relay", "contentkeeper",
    "iboss", "cisco-umbrella", "umbrella",
    "fortiguard", "barracuda", "smoothwall",
    "netsweeper", "websense", "forcepoint",
    
    // Generic filter terms
    "web_filter", "webblock", "siteblock", "urlfilter",
    "schoolfilter", "school-filter", "edufilter",
    "parentalcontrol", "parental-control",
    
    // Blocksi-specific domains
    "bsecur.io", "blocksi.net", "api.blocksi",
    "cdn.blocksi", "static.blocksi", "block.si"
  ];

  // ===================================================
  // 2. COMPREHENSIVE BLOCKSI DOMAIN BLACKLIST
  // ===================================================

  const blockedDomains = [
    // Core Blocksi domains
    "blocksi.net",
    "blocksi.io", 
    "bsecur.io",
    "bl0cksi.net",
    "block.si",
    
    // Blocksi services (from your list)
    "service.blocksi.net",
    "service1.blocksi.net",
    "service2.blocksi.net",
    "bm.blocksi.net",
    "blocksimanager.appspot.com",
    "blocksimanagerv2.appspot.com",
    "teacher.blocksi.net",
    "parent.blocksi.net",
    "teacher-v2.blocksi.net",
    
    // Blocksi API/CDN
    "api.blocksi.net",
    "cdn.blocksi.net",
    "static.blocksi.net",
    
    // Other web filters
    "securly.com",
    "goguardian.com",
    "linewize.io",
    "lightspeedsystems.com",
    "contentkeeper.com",
    "relay.school",
    "iboss.com",
    "fortiguard.com",
    "barracudanetworks.com",
    "smoothwall.com",
    "netsweeper.com",
    "websense.com",
    "forcepoint.com"
  ];

  function isBlockedDomain(url) {
    try {
      const hostname = new URL(url, location.href).hostname.toLowerCase();
      
      // Direct match or subdomain match
      const isBlocked = blockedDomains.some(d => 
        hostname === d || hostname.endsWith('.' + d)
      );
      
      // Special case: Block accounts.google.com ONLY if it's Blocksi-related
      // (We don't want to break legitimate Google login)
      if (hostname === "accounts.google.com") {
        const urlStr = url.toLowerCase();
        if (urlStr.includes("blocksi") || urlStr.includes("bsecur")) {
          console.warn("[AntiBlock] 🚫 Blocked Blocksi Google redirect:", url);
          return true;
        }
        // Allow normal Google accounts
        return false;
      }
      
      return isBlocked;
    } catch {
      return false;
    }
  }

  // ===================================================
  // 3. AGGRESSIVE DOM CLEANER
  // ===================================================

  function shouldRemove(node) {
    if (!node || node.nodeType !== 1) return false;

    // Check all attributes and text content
    const haystack = (
      (node.id || "") + " " +
      (node.className || "") + " " +
      (node.getAttribute?.("name") || "") + " " +
      (node.getAttribute?.("data-id") || "") + " " +
      (node.getAttribute?.("data-name") || "") + " " +
      (node.textContent || "").substring(0, 200) // First 200 chars of text
    ).toLowerCase();

    // Check for keywords
    if (blocksiKeywords.some(k => haystack.includes(k))) {
      return true;
    }

    // Check iframe/script sources
    if (node.tagName === "IFRAME" || node.tagName === "SCRIPT") {
      const src = (node.src || "").toLowerCase();
      if (src && blocksiKeywords.some(k => src.includes(k))) {
        return true;
      }
      if (src && isBlockedDomain(src)) {
        return true;
      }
    }

    // Check for suspicious z-index overlays
    if (node.style) {
      const zIndex = parseInt(node.style.zIndex);
      if (zIndex > 999999 && (node.style.position === 'fixed' || node.style.position === 'absolute')) {
        const rect = node.getBoundingClientRect();
        // If it covers most of the screen, it's probably a block overlay
        if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
          return true;
        }
      }
    }

    return false;
  }

  function aggressiveClean(node) {
    try {
      if (shouldRemove(node)) {
        console.warn("[AntiBlock] 🗑️ REMOVED:", node.tagName, node.className || node.id || "");
        node.remove();
        return true;
      }

      // Special handling for iframes
      if (node.tagName === "IFRAME") {
        const src = (node.src || "").toLowerCase();
        
        // Block if source contains keywords
        if (blocksiKeywords.some(k => src.includes(k))) {
          console.warn("[AntiBlock] 🗑️ REMOVED IFRAME:", src);
          node.remove();
          return true;
        }
        
        // Block if source is from blocked domain
        if (src && isBlockedDomain(src)) {
          console.warn("[AntiBlock] 🗑️ REMOVED IFRAME (blocked domain):", src);
          node.remove();
          return true;
        }
      }

      // Special handling for scripts
      if (node.tagName === "SCRIPT") {
        const src = (node.src || "").toLowerCase();
        const content = (node.textContent || "").toLowerCase();
        
        if (src && isBlockedDomain(src)) {
          console.warn("[AntiBlock] 🗑️ REMOVED SCRIPT (blocked domain):", src);
          node.remove();
          return true;
        }
        
        if (blocksiKeywords.some(k => content.includes(k))) {
          console.warn("[AntiBlock] 🗑️ REMOVED SCRIPT (keyword match)");
          node.remove();
          return true;
        }
      }

      // Remove external stylesheets from blocked domains
      if (node.tagName === "LINK" && node.rel === "stylesheet") {
        const href = (node.href || "").toLowerCase();
        if (href && isBlockedDomain(href)) {
          console.warn("[AntiBlock] 🗑️ REMOVED STYLESHEET:", href);
          node.remove();
          return true;
        }
      }

    } catch (e) {
      console.error("[AntiBlock] Clean error:", e);
    }
    return false;
  }

  // Initial aggressive sweep
  console.log("[AntiBlock] Starting initial sweep...");
  let removedCount = 0;
  
  const walker = document.createTreeWalker(
    document.documentElement,
    NodeFilter.SHOW_ELEMENT
  );
  
  while (walker.nextNode()) {
    if (aggressiveClean(walker.currentNode)) {
      removedCount++;
    }
  }
  
  console.log(`[AntiBlock] ✅ Initial sweep complete. Removed ${removedCount} elements.`);

  // ===================================================
  // 4. CONTINUOUS MUTATION OBSERVER
  // ===================================================

  const domObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      // Check removed nodes (if they're being re-added)
      for (const n of m.addedNodes) {
        if (aggressiveClean(n)) continue;
        
        // Also check children
        if (n.querySelectorAll) {
          n.querySelectorAll("*").forEach(aggressiveClean);
        }
      }
      
      // Check attribute changes for dynamic class/id injection
      if (m.type === 'attributes' && m.target) {
        aggressiveClean(m.target);
      }
    }
  });

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true, // Watch for attribute changes too
    attributeFilter: ['class', 'id', 'style', 'data-id', 'data-name']
  });

  // ===================================================
  // 5. NETWORK REQUEST BLOCKER
  // ===================================================

  // Override fetch to block Blocksi domains
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && isBlockedDomain(url)) {
      console.warn("[AntiBlock] 🚫 BLOCKED FETCH:", url);
      return Promise.reject(new Error("Blocked by AntiBlock"));
    }
    return originalFetch.apply(this, args);
  };

  // Override XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && isBlockedDomain(url)) {
      console.warn("[AntiBlock] 🚫 BLOCKED XHR:", url);
      throw new Error("Blocked by AntiBlock");
    }
    return originalOpen.call(this, method, url, ...args);
  };

  // ===================================================
  // 6. IMAGE UNBLOCKER (SAFE PROXY RETRY)
  // ===================================================

  const imageProxies = [
    url => "https://wsrv.nl/?url=" + encodeURIComponent(url),
    url => "https://images.weserv.nl/?url=" + encodeURIComponent(url)
  ];

  window.addEventListener(
    "error",
    e => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;

      const tries = parseInt(img.dataset.proxyTries || "0");
      if (tries >= imageProxies.length) return;

      console.warn("[AntiBlock] 🔄 Image blocked, trying proxy:", img.src);
      img.dataset.proxyTries = String(tries + 1);
      img.src = imageProxies[tries](img.src);
    },
    true
  );

  // ===================================================
  // 7. NAVIGATION SHIELD (ABOUT:BLANK ONLY)
  // ===================================================

  function isSafe(url) {
    try {
      if (!url) return true;

      // ALLOW navigation to local pages (the website itself)
      const targetUrl = new URL(url, location.href);
      if (targetUrl.origin === location.origin) return true;

      // ONLY allow about:blank and safe inline content
      if (url === "about:blank" || url.startsWith("about:blank")) return true;
      if (url.startsWith("data:")) return true;
      if (url.startsWith("blob:")) return true;

      // Block Blocksi domains explicitly
      if (isBlockedDomain(url)) {
        console.error("[AntiBlock] 🚫 BLOCKED Blocksi domain:", url);
        return false;
      }

      // Block everything else
      return false;
    } catch {
      return false;
    }
  }

  function block(url) {
    console.error("🚨 BLOCKED redirect/navigation:", url);
    return null;
  }

  // --- Navigation overrides ---
  const realAssign = location.assign.bind(location);
  const realReplace = location.replace.bind(location);

  location.assign = url => (isSafe(url) ? realAssign(url) : block(url));
  location.replace = url => (isSafe(url) ? realReplace(url) : block(url));

  const realPush = history.pushState.bind(history);
  const realReplaceState = history.replaceState.bind(history);

  history.pushState = function (state, title, url) {
    if (url && !isSafe(url)) return block(url);
    return realPush(state, title, url);
  };

  history.replaceState = function (state, title, url) {
    if (url && !isSafe(url)) return block(url);
    return realReplaceState(state, title, url);
  };

  const realOpen = window.open.bind(window);
  window.open = function (url, target, ...args) {
    if (url && !isSafe(url)) return block(url);
    return realOpen(url, target, ...args);
  };

  // --- Click interception ---
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a?.href && !isSafe(a.href)) {
      e.preventDefault();
      e.stopPropagation();
      block(a.href);
    }
  }, true);

  // --- Form submission blocker ---
  document.addEventListener('submit', e => {
    const form = e.target;
    if (form.action && !isSafe(form.action)) {
      e.preventDefault();
      block(form.action);
    }
  }, true);

  // ===================================================
  // 8. PREVENT WINDOW/TAB CLOSE HIJACKING
  // ===================================================

  window.addEventListener('beforeunload', e => {
    // Allow normal navigation, just remove hijack attempts
    delete e.returnValue;
  });

  // ===================================================
  // 9. CSS INJECTION TO HIDE BLOCKSI ELEMENTS
  // ===================================================

  const style = document.createElement('style');
  style.textContent = `
    /* Hide elements with Blocksi-related classes/IDs */
    [class*="blocksi" i],
    [class*="bsecur" i],
    [class*="webfilter" i],
    [class*="goguardian" i],
    [class*="securly" i],
    [id*="blocksi" i],
    [id*="bsecur" i],
    [id*="webfilter" i],
    [id*="goguardian" i],
    [id*="securly" i] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
    }
  `;
  
  // Insert at the very beginning
  (document.head || document.documentElement).insertBefore(
    style, 
    (document.head || document.documentElement).firstChild
  );

  // ===================================================
  // 10. PERIODIC CLEANUP (every 500ms)
  // ===================================================

  setInterval(() => {
    let cleaned = 0;
    document.querySelectorAll('*').forEach(node => {
      if (aggressiveClean(node)) cleaned++;
    });
    if (cleaned > 0) {
      console.log(`[AntiBlock] 🧹 Periodic cleanup removed ${cleaned} elements`);
    }
  }, 500);

  // ===================================================
  // STATUS
  // ===================================================

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[AntiBlock] ✅ MAXIMUM PROTECTION ACTIVE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✓ DOM cleaner active");
  console.log("✓ Mutation observer active");
  console.log("✓ Network request blocker active");
  console.log("✓ Image proxy active");
  console.log("✓ Navigation locked (about:blank only)");
  console.log("✓ CSS injection active");
  console.log("✓ Periodic cleanup active");
  console.log(`✓ Blocking ${blockedDomains.length} domains`);
  console.log(`✓ Scanning for ${blocksiKeywords.length} keywords`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎯 Blocksi-specific domains blocked:");
  console.log("   - service.blocksi.net");
  console.log("   - service1.blocksi.net");
  console.log("   - service2.blocksi.net");
  console.log("   - bm.blocksi.net");
  console.log("   - blocksimanager.appspot.com");
  console.log("   - blocksimanagerv2.appspot.com");
  console.log("   - teacher.blocksi.net");
  console.log("   - parent.blocksi.net");
  console.log("   - teacher-v2.blocksi.net");
  console.log("   - block.si");
  console.log("   - accounts.google.com (Blocksi redirects only)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
})();
