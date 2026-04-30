import { rAlert } from "./utils.mjs";

// xor key — just some bytes to scramble the url string before b64
var XK = [0x4d, 0x61, 0x74, 0x68, 0x48, 0x75, 0x62]; // "MathHub"

var _ready = null;
var _ctrl = null;

var wProto = (location.protocol === "https:") ? "wss:" : "ws:";
var wURL = wProto + "//" + location.host + "/wisp/";

function xorShift(buf) {
  var out = new Uint8Array(buf.length);
  for (var i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ XK[i % XK.length];
  }
  return out;
}

// encode a url so it can't be pattern-matched by content filters
function encodeForProxy(str) {
  var raw = new TextEncoder().encode(str);
  var shifted = xorShift(raw);
  // btoa needs a binary string
  var binStr = "";
  for (var i = 0; i < shifted.length; i++) binStr += String.fromCharCode(shifted[i]);
  return btoa(binStr)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeForProxy(enc) {
  // undo url-safe b64
  var b64 = enc.replace(/-/g, "+").replace(/_/g, "/");
  var pad = 4 - (b64.length % 4);
  if (pad < 4) b64 += "=".repeat(pad);
  var binStr = atob(b64);
  var buf = new Uint8Array(binStr.length);
  for (var i = 0; i < binStr.length; i++) buf[i] = binStr.charCodeAt(i);
  var decoded = xorShift(buf);
  return new TextDecoder().decode(decoded);
}

// figure out if the user typed a url or wants to search
function toUrl(input, tmpl) {
  try { return new URL(input).toString(); } catch (e) {}
  // try decode base64
  try {
    var decoded = atob(input);
    return new URL(decoded).toString();
  } catch (e) {}
  try {
    var u = new URL("http://" + input);
    if (u.hostname.includes(".")) return u.toString();
  } catch (e) {}
  return tmpl.replace("%s", encodeURIComponent(input));
}

async function boot() {
  if (!("serviceWorker" in navigator)) {
      alert("Service Worker requires a secure context! Please access via HTTPS or http://localhost (not IP/Hostname).");
      throw new Error("no sw support");
  }

  console.log("[Proxy] Starting boot sequence...");

  // Verify Scramjet globals are loaded
  if (typeof $scramjetLoadController === 'undefined') {
    throw new Error("Scramjet not loaded - $scramjetLoadController is undefined. Ensure /k12/portal/math.js is loaded before proxy initialization.");
  }
  if (typeof BareMux === 'undefined') {
    throw new Error("BareMux not loaded - ensure /k12/data/index.js is loaded before proxy initialization.");
  }

  console.log("[Proxy] Scramjet and BareMux globals verified");

  // Clear legacy Scramjet database to prevent "NotFoundError: config store" issues
  try {
    const dbName = "scramjet"; // default scramjet DB name
    const dbs = await indexedDB.databases?.();
    const exists = dbs?.some(db => db.name === dbName);
    if (exists || !localStorage.getItem("scramjet_v3_init")) {
       console.log("[Proxy] Resetting Scramjet database...");
       indexedDB.deleteDatabase(dbName);
       localStorage.setItem("scramjet_v3_init", "true");
    }
  } catch (e) {
    console.warn("[Proxy] DB reset warning:", e);
  }

  console.log("[Proxy] Registering service worker at /sw.js");
  var reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

  if (reg.installing) {
    console.log("[Proxy] Waiting for service worker to activate...");
    await new Promise(function (ok, bail) {
      reg.installing.addEventListener("statechange", function fn(e) {
        console.log("[Proxy] Service worker state:", e.target.state);
        if (e.target.state === "activated") { this.removeEventListener("statechange", fn); ok(); }
        if (e.target.state === "redundant") { this.removeEventListener("statechange", fn); bail(new Error("sw died")); }
      });
    });
  }
  
  console.log("[Proxy] Waiting for service worker ready...");
  await navigator.serviceWorker.ready;
  console.log("[Proxy] Service worker ready!");

  // init scramjet controller with disguised paths and cache-busting version
  console.log("[Proxy] Initializing Scramjet controller...");
  var load = $scramjetLoadController();
  _ctrl = new load.ScramjetController({
    prefix: "/k12/portal/",
    files: {
      wasm: "/k12/portal/math.wasm",
      all: "/k12/portal/math.js",
      sync: "/k12/portal/math.sync.js",
    },
  });

  console.log("[Proxy] Initializing controller...");
  await _ctrl.init("/sw.js");
  console.log("[Proxy] Controller initialized!");

  // hook up the transport through the hidden paths
  console.log("[Proxy] Setting up BareMux connection...");
  console.log("[Proxy] WebSocket URL:", wURL);
  var conn = new BareMux.BareMuxConnection("/k12/data/worker.js");
  await conn.setTransport("/k12/net/index.mjs", [{ wisp: wURL }]);
  console.log("[Proxy] BareMux connection ready!");

  console.log("[Proxy] Proxy boot complete!");
  return _ctrl;
}

function ready() {
  if (!_ready) {
    _ready = boot().catch(function (err) {
      _ready = null;
      throw err;
    });
  }
  return _ready;
}

async function openSite(input) {
  console.log("[Proxy] openSite called with input:", input);
  try {
    console.log("[Proxy] Ensuring proxy ready...");
    var ctrl = await ready();
    console.log("[Proxy] Proxy ready, proceeding...");
  } catch (err) {
    console.error("[Proxy] Error during proxy initialization:", err);
    rAlert("Couldn't start proxy.<br>" + err.toString());
    throw err;
  }
  var url = toUrl(input, "https://html.duckduckgo.com/html?t=h_&q=%s");
  console.log("[Proxy] Resolved URL:", url);
  console.log("[Proxy] Encoding URL...");
  var encoded = ctrl.encodeUrl(url);
  console.log("[Proxy] Encoded URL:", encoded);
  return encoded;
}

function safeCall(fn) {
  return ready().then(fn);
}

export { toUrl as search, ready as ensureProxyReady, openSite as getUV, safeCall as safeProxyCall };
export { encodeForProxy, decodeForProxy };
