import { registerSW } from "/active/prxy/register-sw.mjs";
import { rAlert } from "./utils.mjs";

const TRANSPORT_NAME = "EpoxyRuntime";
const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const WISP_URL = `${protocol}//${location.host}/wisp/`;

let proxyReadyPromise = null;

export function search(input, template) {
  try {
    const url = new URL(input);
    return url.toString();
  } catch (err) {}
  try {
    const url = new URL(`http://${input}`);
    if (url.hostname.includes(".")) return url.toString();
  } catch (err) {}
  return template.replace("%s", encodeURIComponent(input));
}

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

async function loadScript(url) {
  console.log(`[prxy] Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const code = await res.text();
  if (!code.length) throw new Error(`Received empty response from ${url}`);
  (0, eval)(code); // global eval
  console.log(`[prxy] Loaded ${url} (${code.length} bytes)`);
}

async function loadScramjetAndProxy() {
  console.log("[prxy] Loading Scramjet and transport scripts...");
  
  const scripts = [
    "/scramjet/scramjet.codecs.js",
    "/scramjet/scramjet.config.js",
    "/scramjet/scramjet.bundle.js",
    "/vendor/bare-mux-v1/bare.js",
    "/vendor/epoxy/index.js",
  ];

  for (const url of scripts) {
    await loadScript(url);
  }
}

async function initTransport() {
  try {
    console.log("[prxy] Loading Scramjet and transport scripts...");
    await loadScramjetAndProxy();
    
    console.log("[prxy] Checking for loaded globals...");
    const bareMux = globalThis.BareMux;
    const epoxyTransport = globalThis.EpoxyTransport?.default;
    
    if (!bareMux) throw new Error("BareMux not available after loading scripts");
    if (!epoxyTransport) throw new Error("EpoxyTransport not available after loading scripts");
    if (!bareMux.SetTransport) throw new Error("BareMux.SetTransport not available");

    console.log("[prxy] Defining EpoxyRuntime transport class...");
    class EpoxyRuntime extends epoxyTransport {
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

    globalThis[TRANSPORT_NAME] = EpoxyRuntime;
    console.log("[prxy] Setting transport with BareMux...");
    bareMux.SetTransport(TRANSPORT_NAME, { wisp: WISP_URL });
    console.log("[prxy] Bare transport initialized successfully.");
    
    // Expose Scramjet config globally for tab frames to access
    if (globalThis.scramjet && globalThis.scramjet.config) {
      globalThis.__scramjet$config = globalThis.scramjet.config;
      console.log("[prxy] Exported Scramjet config as __scramjet$config");
    }
  } catch (err) {
    console.error("[prxy] Transport initialization failed:", err);
    throw err;
  }
}
export async function ensureProxyReady() {
  if (!proxyReadyPromise) {
    proxyReadyPromise = (async () => {
      await registerSW();
      await initTransport();
    })().catch((error) => {
      proxyReadyPromise = null;
      throw error;
    });
  }
  return proxyReadyPromise;
}

export async function getUV(input) {
  try {
    await ensureProxyReady();
  } catch (err) {
    rAlert(`Proxy failed to initialize.<br>${err.toString()}`);
    throw err;
  }
  const url = search(input, "https://html.duckduckgo.com/html?t=h_&q=%s");
  return `/active/loader.html?url=${encodeURIComponent(url)}`;
}

export async function safeProxyCall(fn) {
  await ensureProxyReady();
  return fn();
}
