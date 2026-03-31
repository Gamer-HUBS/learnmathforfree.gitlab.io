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

function waitForGlobals(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const bareMux = globalThis.BareMux;
      const epoxyTransport = globalThis.EpoxyTransport?.default;
      if (bareMux?.SetTransport && epoxyTransport) {
        clearInterval(interval);
        resolve({ bareMux, epoxyTransport });
        return;
      }
      if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(
          new Error(
            `Timed out waiting for globals. BareMux=${!!bareMux} Epoxy=${!!epoxyTransport}`
          )
        );
      }
    }, 50);
  });
}
async function loadScramjetAndProxy() {
  const scripts = [
    "/scramjet/scramjet.codecs.js",
    "/scramjet/scramjet.config.js",
    "/scramjet/scramjet.bundle.js",
    "/vendor/bare-mux-v1/bare.js",
    "/vendor/epoxy/index.js",
  ];

  for (const url of scripts) {
    console.log("Fetching", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const code = await res.text();
    (0, eval)(code); // global eval
    console.log("Loaded", url, code.length, "bytes");
  }
}
async function initTransport() {
  loadScramjetAndProxy().catch((err) => { 
    console.error("Failed to load Scramjet or transport scripts:", err);
  });
  console.log("[prxy] Waiting for globals...");
  const { bareMux, epoxyTransport } = await waitForGlobals();

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
  bareMux.SetTransport(TRANSPORT_NAME, { wisp: WISP_URL });
  console.log("[prxy] Bare transport initialized.");
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