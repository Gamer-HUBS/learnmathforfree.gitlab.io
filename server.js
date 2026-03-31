const express = require("express");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("path");
const { scramjetPath } = require("@mercuryworkshop/scramjet");
const { server: wisp } = require("@mercuryworkshop/wisp-js/server");
const { createBareServer } = require("@tomphttp/bare-server-node");

const app = express();
const bare = createBareServer("/bare/");

const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const activeDir = path.join(rootDir, "active");
const activeRuntimeDir = path.join(activeDir, "prxy");

const epoxyDistDir = path.join(
  rootDir,
  "node_modules",
  "@mercuryworkshop",
  "epoxy-transport",
  "dist"
);

const bareMuxV1DistDir = path.join(
  rootDir,
  "node_modules",
  "bare-mux-v1",
  "dist"
);

const forcedSettingsLoaderTag = '<script src="/js/settings-loader.js" defer></script>';
const port = Number(process.env.PORT) || 3457;

app.disable("x-powered-by");

app.use(
  "/scramjet",
  express.static(scramjetPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs")) {
        res.type("application/javascript");
      }
    },
  })
);

// Vendor 
app.use(
  "/vendor/bare-mux-v1",
  express.static(bareMuxV1DistDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".cjs")) res.type("application/javascript");
    },
  })
);
app.use("/vendor/epoxy", express.static(epoxyDistDir));

app.use("/active/runtime", express.static(activeRuntimeDir));
app.use("/active", express.static(activeDir, { extensions: ["html"], index: ["index.html"] }));

app.use(express.static(publicDir, { extensions: ["html"], index: ["index.html"] }));


app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

app.use((req, res, next) => {
  if (req.path === "/scramjet.sw.js") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
  }
  next();
});

app.use((req, res, next) => {
  if (req.path.endsWith(".js") || req.path.endsWith(".mjs") || req.path.endsWith(".cjs")) {
    res.type("application/javascript");
  }
  next();
});

function injectSettingsLoader(html) {
  if (html.includes("/js/settings-loader.js")) return html;
  if (html.includes("</head>")) return html.replace("</head>", `  ${forcedSettingsLoaderTag}\n</head>`);
  return `${forcedSettingsLoaderTag}\n${html}`;
}

function normalizeRequestPath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath || "/");
  const normalizedPath = path.posix.normalize(decodedPath);
  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
}

function getHtmlCandidates(baseDir, requestPath) {
  const normalizedPath = normalizeRequestPath(requestPath);
  const trimmedPath = normalizedPath.replace(/^\/+/, "");
  const ext = path.posix.extname(trimmedPath);

  if (ext && ext !== ".html") return [];

  const candidates = [];
  if (!trimmedPath || normalizedPath.endsWith("/")) candidates.push("index.html");
  else if (ext === ".html") candidates.push(trimmedPath);
  else {
    candidates.push(`${trimmedPath}.html`);
    candidates.push(path.posix.join(trimmedPath, "index.html"));
  }

  return candidates
    .map((rel) => {
      const resolved = path.resolve(baseDir, rel);
      return resolved.startsWith(baseDir) ? resolved : null;
    })
    .filter(Boolean);
}

async function tryServeInjectedHtml(res, candidates) {
  for (const candidate of candidates) {
    try {
      const html = await fs.readFile(candidate, "utf8");
      res.type("html").send(injectSettingsLoader(html));
      return true;
    } catch (err) {
      if (err.code !== "ENOENT" && err.code !== "EISDIR") throw err;
    }
  }
  return false;
}

app.use((req, res, next) => {
  if (bare.shouldRoute(req)) return bare.routeRequest(req, res);
  next();
});


app.get("/a", (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const params = new URLSearchParams(query);
  const q = params.get("q");
  if (q) res.redirect(`/active/index.html?url=${encodeURIComponent(q)}`);
  else res.redirect(`/active/index.html`);
});

app.get("/main.html", (req, res) => {
  res.sendFile(path.join(publicDir, "main.html"));
});

app.get("/vendor/bare-mux-v1/bare.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(bareMuxV1DistDir, "bare.cjs"));
});

app.get(["*.html", "/active", "/active/*"], async (req, res, next) => {
  try {
    const requestPath = req.path || "/";
    const isActive = requestPath === "/active" || requestPath.startsWith("/active/");
    const baseDir = isActive ? activeDir : publicDir;
    const trimmedPath = isActive ? requestPath.replace(/^\/active/, "") || "/" : requestPath;

    const candidates = getHtmlCandidates(baseDir, trimmedPath);
    if (!candidates.length) return next();

    const served = await tryServeInjectedHtml(res, candidates);
    if (!served) next();
  } catch (err) {
    next(err);
  }
});

app.use("/active/scripts/", express.static(activeRuntimeDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".mjs") || filePath.endsWith(".cjs") || filePath.endsWith(".js")) {
      res.type("application/javascript");
    }
  }
}));

app.use("/active/prxy", express.static(path.join(rootDir, "active", "prxy"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".mjs")) res.type("application/javascript");
  }
}));

// Fallback 404
app.use(async (req, res, next) => {
  try {
    const fallback = await fs.readFile(path.join(publicDir, "404.html"), "utf8");
    res.status(404).type("html").send(injectSettingsLoader(fallback));
  } catch (err) {
    next(err);
  }
});

const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) return bare.routeUpgrade(req, socket, head);
  if (req.url && req.url.startsWith("/wisp/")) return wisp.routeRequest(req, socket, head);
  socket.destroy();
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log("scramjetPath:", scramjetPath);
});