console.log("[SW] Scramjet Service Worker is running.");
importScripts("/scramjet/scramjet.codecs.js");
importScripts("/scramjet/scramjet.config.js");
importScripts("/active/scramjet.config.js");
importScripts("/scramjet/scramjet.worker.js");
importScripts("/vendor/bare-mux-v1/bare.js");
importScripts("/vendor/epoxy/index.js");

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
  console.log("[SW] Bare transport initialized.");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    scramjet
      .loadConfig()
      .then(() => {
        console.log("[SW] Scramjet config loaded.");
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error("[SW] Failed to load Scramjet config:", err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("[SW] Scramjet engine initialized and ready.");
});

function handleRequest(event) {
  try {
    if (scramjet.route(event)) {
      console.log(`[SW] Proxying: ${new URL(event.request.url).pathname}`);
      return scramjet.fetch(event);
    }
  } catch (err) {
    console.error("[SW] Scramjet routing error:", err);
  }
  return fetch(event.request).catch((err) => {
    console.error(`[SW] Fetch failed for ${event.request.url}:`, err);
    return new Response("Network error", { status: 503 });
  });
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
