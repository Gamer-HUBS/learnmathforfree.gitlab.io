const protocol = self.location.protocol === "https:" ? "wss:" : "ws:";
const wispUrl = `${protocol}//${self.location.host}/wisp/`;

console.log("[SW] Scramjet Service Worker is running.");
console.log(`[SW] WISP URL: ${wispUrl}`);

importScripts("/scramjet/scramjet.codecs.js");
importScripts("/scramjet/scramjet.config.js");
importScripts("/scramjet/scramjet.worker.js");
importScripts("/vendor/bare-mux-v1/bare.js");
importScripts("/vendor/epoxy/index.js");

let swReady = false;
let initError = null;

function normalizeHeaders(headers) {
  if (!headers) return [];
  if (headers instanceof Headers) return Array.from(headers.entries());
  if (Array.isArray(headers)) return headers;
  if (typeof headers[Symbol.iterator] === "function") return Array.from(headers);
  return Object.entries(headers).flatMap(([key, value]) => {
    if (Array.isArray(value)) return value.map((entry) => [key, String(entry)]);
    return [[key, String(value)]];
  });
}

if (BareMux && EpoxyTransport) {
  console.log("[SW] Initializing Bare transport...");
  class EpoxyRuntime extends EpoxyTransport.default {
    async request(remote, method, body, headers, signal) {
      return super.request(remote, method, body, normalizeHeaders(headers), signal);
    }
    connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
      return super.connect(
        url,
        protocols,
        normalizeHeaders(requestHeaders),
        onopen,
        onmessage,
        onclose,
        onerror
      );
    }
  }
  self.EpoxyRuntime = EpoxyRuntime;
  BareMux.SetTransport("EpoxyRuntime", { wisp: wispUrl });
  console.log("[SW] Bare transport initialized with WISP:", wispUrl);
} else {
  console.warn("[SW] BareMux or EpoxyTransport not available. BareMux:", !!BareMux, "EpoxyTransport:", !!EpoxyTransport);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (!globalThis.scramjet) {
          console.warn("[SW] Scramjet not available during install");
          return self.skipWaiting();
        }
        if (typeof scramjet.loadConfig === "function") {
          await scramjet.loadConfig();
          console.log("[SW] Scramjet config loaded.");
        }
        return self.skipWaiting();
      } catch (err) {
        console.error("[SW] Failed to load Scramjet config:", err);
        initError = err;
        return self.skipWaiting();
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  swReady = true;
  console.log("[SW] Scramjet engine initialized and ready.");
});

function handleRequest(event) {
  try {
    const url = new URL(event.request.url);
    
    // Handle /proxy/<encoded_url> requests by routing through Bare transport
    if (url.pathname.startsWith('/proxy/')) {
      const encodedTarget = url.pathname.replace('/proxy/', '');
      const targetUrl = decodeURIComponent(encodedTarget);
      
      console.log("[SW] Proxy request detected, target:", targetUrl);
      
      // Return the promise directly - don't call event.respondWith() here
      return (async () => {
        try {
          // Generate HTML that will load Scramjet and fetch through it
          // We need to properly escape the targetUrl for use in JavaScript
          const escapedUrl = JSON.stringify(targetUrl);
          
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; }
    #loader { display: flex; align-items: center; justify-content: center; height: 100vh; background: #020617; color: #e2e8f0; font-family: monospace; }
  </style>
</head>
<body>
  <div id="loader">Initializing proxy...</div>
  
  <script src="/scramjet/scramjet.codecs.js"></script>
  <script src="/scramjet/scramjet.config.js"></script>
  <script src="/scramjet/scramjet.bundle.js"></script>
  <script src="/vendor/bare-mux-v1/bare.js"></script>
  <script src="/vendor/epoxy/index.js"></script>
  
  <script>
    (async function() {
      const targetUrl = ${escapedUrl};
      console.log("[proxy-page] Target URL:", targetUrl);
      
      try {
        // Wait for all scripts to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("[proxy-page] Checking available transport...");
        console.log("[proxy-page] BareMux available:", typeof window.BareMux !== 'undefined');
        console.log("[proxy-page] EpoxyTransport available:", typeof window.EpoxyTransport !== 'undefined');
        console.log("[proxy-page] scramjet available:", typeof window.scramjet !== 'undefined');
        
        // Initialize transport like prxy.mjs does
        const BareMux = window.BareMux;
        const EpoxyTransport = window.EpoxyTransport?.default;
        
        if (BareMux && EpoxyTransport) {
          console.log("[proxy-page] Initializing Bare transport...");
          
          // Determine WISP URL
          const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wispUrl = \`\${protocol}//\${location.host}/wisp/\`;
          console.log("[proxy-page] WISP URL:", wispUrl);
          
          class EpoxyRuntime extends EpoxyTransport {
            async request(remote, method, body, headers, signal) {
              return super.request(remote, method, body, 
                Array.isArray(headers) ? headers : Object.entries(headers || {}), 
                signal);
            }
            connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
              return super.connect(url, protocols,
                Array.isArray(requestHeaders) ? requestHeaders : Object.entries(requestHeaders || {}),
                onopen, onmessage, onclose, onerror);
            }
          }
          
          window.EpoxyRuntime = EpoxyRuntime;
          BareMux.SetTransport('EpoxyRuntime', { wisp: wispUrl });
          console.log("[proxy-page] Bare transport initialized");
          
          // Now fetch through Bare's routing
          console.log("[proxy-page] Fetching through Bare-mux proxy...");
          const response = await fetch(targetUrl);
          console.log("[proxy-page] Response received, status:", response.status);
          
          if (response.ok) {
            const contentType = response.headers.get('content-type') || 'text/html';
            
            if (contentType.includes('text/html')) {
              const html = await response.text();
              // Write to document
              document.open('text/html', 'replace');
              document.write(html);
              document.close();
            } else if (contentType.includes('text/')) {
              const text = await response.text();
              document.body.innerHTML = '<pre>' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
            } else {
              document.body.innerHTML = '<p>Binary content (status: ' + response.status + ')</p>';
            }
          } else {
            document.body.innerHTML = '<p style="color: red;">Server returned status: ' + response.status + '</p>';
          }
        } else {
          throw new Error('BareMux or EpoxyTransport not available');
        }
      } catch (err) {
        console.error('[proxy-page] Error:', err);
        document.body.innerHTML = '<div style="color: red; padding: 20px;"><h3>Proxy Error</h3><p>' + 
          err.message + '</p><pre>' + err.stack.substring(0, 500) + '</pre></div>';
      }
    })();
  </script>
</body>
</html>`;
          
          return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        } catch (err) {
          console.error("[SW] Proxy handler error:", err);
          return new Response("Proxy error: " + err.message, { status: 502 });
        }
      })();
    }
    
    // Original Scramjet routing for other paths
    if (globalThis.scramjet && typeof scramjet.route === 'function') {
      if (scramjet.route(event)) {
        console.log(`[SW] Proxying via Scramjet: ${url.pathname}`);
        return scramjet.fetch(event);
      }
    }
  } catch (err) {
    console.error("[SW] Request handling error:", err);
  }
  
  // Default: pass through
  return fetch(event.request).catch((err) => {
    console.error(`[SW] Fetch failed for ${event.request.url}:`, err);
    return new Response("Network error", { status: 503 });
  });
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
