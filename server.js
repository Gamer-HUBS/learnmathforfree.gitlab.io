import { createServer } from "node:http";
import { hostname } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

var __dir = path.dirname(fileURLToPath(import.meta.url));
var pub = path.join(__dir, "public");
var hub = path.join(__dir, "active");

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  dns_servers: ["1.1.1.1", "1.0.0.1"],
});

var app = express();
app.disable("x-powered-by");

// strip fingerprinting headers, add isolation headers quietly
app.use(function (req, res, next) {
  res.removeHeader("X-Powered-By");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Custom scramjet hardcoded file intercepts
app.get("/k12/portal/math.js", (req, res) => {
  res.type("application/javascript");
  res.header("Cache-Control", "public, max-age=2592000"); // 30 days
  res.sendFile(path.join(scramjetPath, "scramjet.all.js"));
});
app.get("/k12/portal/math.wasm", (req, res) => {
  res.type("application/wasm");
  res.header("Cache-Control", "public, max-age=2592000"); // 30 days
  res.sendFile(path.join(scramjetPath, "scramjet.wasm.wasm"));
});
app.get("/k12/portal/math.sync.js", (req, res) => {
  res.type("application/javascript");
  res.header("Cache-Control", "public, max-age=2592000"); // 30 days
  res.sendFile(path.join(scramjetPath, "scramjet.sync.js"));
});

// scramjet dist — served under /k12/portal/ so it looks educational
app.use("/k12/portal/", express.static(scramjetPath, {
  maxAge: "30d",
  setHeaders: function (res, fp) {
    if (fp.endsWith(".js")) res.type("application/javascript");
    if (fp.endsWith(".wasm")) res.type("application/wasm");
  },
}));

// bare-mux worker — also under /k12/
app.use("/k12/data/", express.static(baremuxPath, {
  setHeaders: function (res, fp) {
    if (/\.(js|mjs|cjs)$/.test(fp)) res.type("application/javascript");
  },
}));

// libcurl transport
app.use("/k12/net/", express.static(libcurlPath, {
  setHeaders: function (res, fp) {
    if (/\.(js|mjs|cjs)$/.test(fp)) res.type("application/javascript");
    if (fp.endsWith(".wasm")) res.type("application/wasm");
  },
}));

// active (browser UI) — masked as signup
app.use("/entrypint/siginup/", express.static(hub, {
  extensions: ["html"],
  index: ["index.html"],
  setHeaders: function (res, fp) {
    if (/\.(mjs|cjs)$/.test(fp)) res.type("application/javascript");
  },
}));

// URL hashing helper - implements the same XOR + base64 as client
function hashUrl(str) {
  const XK = [0x4d, 0x61, 0x74, 0x68, 0x48, 0x75, 0x62]; // "MathHub"
  const raw = Buffer.from(str);
  const shifted = Buffer.alloc(raw.length);
  for (var i = 0; i < raw.length; i++) {
    shifted[i] = raw[i] ^ XK[i % XK.length];
  }
  return shifted.toString('base64')
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Root path — serve main landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(pub, 'index.html'));
});

// debug endpoint - shows how to properly hash URLs for the proxy
app.get("/debug/hash", function (req, res) {
  var url = req.query.url;
  if (!url) {
    return res.json({
      error: "Missing ?url= parameter",
      example: "/debug/hash?url=https://duckduckgo.com/",
      usage: "This endpoint hashes URLs using XOR+Base64 for proxy obfuscation",
    });
  }
  var hashed = hashUrl(url);
  res.json({
    original: url,
    hashed: hashed,
    proxyLink: "/entrypint/siginup/index.html?url=" + hashed,
    quickLink: "/a?q=" + encodeURIComponent(url),
  });
});

// redirect /a shortcut into the masked browser page
app.get("/a", function (req, res) {
  var q = req.query.q;
  // If we have a URL, hash it and redirect to the masked portal.
  if (q) {
    var hashed = hashUrl(q);
    res.redirect("/entrypint/siginup/index.html?url=" + hashed);
  } else {
    res.redirect("/entrypint/siginup/index.html");
  }
});

// main public site — index.html is the real homepage
app.use(express.static(pub, {
  extensions: ["html"],
  index: ["index.html"],
  setHeaders: function (res, fp) {
    if (/\.(mjs|cjs)$/.test(fp)) res.type("application/javascript");
  },
}));


app.get('/k12/portal/load/new', (req, res) => {
    res.sendFile(path.join(pub, 'main.html'));
});

app.get('/k12/portal/load/subbimt', (req, res) => {
    res.sendFile(path.join(pub, 'apps.html'));
});

app.get('/k12/portal/feedback', (req, res) => {
    res.sendFile(path.join(pub, 'chats.html'));
});

app.get('/k12/portal/view', (req, res) => {
    res.sendFile(path.join(pub, 'admin.html'));
});

app.get('/main.html', (req, res) => {
    res.status(404).send('Not found');
});

app.get('/apps.html', (req, res) => {
    res.status(404).send('Not found');
});

app.get('/chats.html', (req, res) => {
    res.status(404).send('Not found');
});

app.get('/admin.html', (req, res) => {
    res.status(404).send('Not found');
});

app.get('/subbimmisons/load/subbimt', (req, res) => {
    res.sendFile(path.join(pub, 'games.html'));
});

app.get('/subbimmisons/view', (req, res) => {
    res.sendFile(path.join(pub, 'admin.html'));
});

app.get('/subbimmisons/feedback', (req, res) => {
    res.sendFile(path.join(pub, 'chats.html'));
});

app.get('/k12/lessons/:id', (req, res) => {
    res.sendFile(path.join(pub, 'game', 'index.html'));
});
// 404 fallback
app.use(function (req, res) {
  res.status(404).sendFile(path.join(pub, "404.html"), function (e) {
    if (e) res.status(404).send("Not found");
  });
});

var server = createServer(app);

server.on("upgrade", function (req, socket, head) {
  if (req.url && req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

var port = Number(process.env.PORT) || 3457;
server.listen(port, "0.0.0.0", function () {
  console.log("up on http://localhost:" + port);
  console.log("up on http://" + hostname() + ":" + port);
});

process.on("SIGINT", function () { server.close(); process.exit(0); });
process.on("SIGTERM", function () { server.close(); process.exit(0); });
