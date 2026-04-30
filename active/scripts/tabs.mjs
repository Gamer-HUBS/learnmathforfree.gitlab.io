import { getFavicon, rAlert } from "./utils.mjs";
import { getUV, search, safeProxyCall, decodeForProxy } from "./prxy.mjs";

var { span, iframe, button, img } = van.tags;
var ionIcon = van.tags["ion-icon"];

var tabs = [];
var selectedTab = null;

var sideBar      = document.querySelector("header");
var pageBack     = document.getElementById("page-back");
var pageForward  = document.getElementById("page-forward");
var pageRefresh  = document.getElementById("page-refresh");
var urlForm      = document.getElementById("url-form");
var urlInput     = document.getElementById("url-input");
var newTabButton = document.getElementById("new-tab");
var tabList      = document.getElementById("tab-list");
var tabView      = document.getElementById("tab-view");

window.onmousemove = function (e) {
  sideBar.classList.toggle("hovered", e.clientX < 50);
};

pageBack.onclick    = function () { if (selectedTab) selectedTab.view.contentWindow.history.back(); };
pageForward.onclick = function () { if (selectedTab) selectedTab.view.contentWindow.history.forward(); };
pageRefresh.onclick = function () { if (selectedTab) selectedTab.view.contentWindow.location.reload(); };
newTabButton.onclick = function () { addTab("uvsearch.rhw.one"); };

var devtoolsOption = document.getElementById("devtools-option");
var abcOption      = document.getElementById("abc-option");
var gitOption      = document.getElementById("git-option");

var erudaSnippet = 'fetch("https://cdn.jsdelivr.net/npm/eruda").then(function(r){return r.text()}).then(function(d){eval(d);if(!window.erudaLoaded){eruda.init({defaults:{displaySize:45,theme:"AMOLED"}});window.erudaLoaded=true}})';

devtoolsOption.onclick = function () {
  try {
    selectedTab.view.contentWindow.eval(erudaSnippet);
    rAlert("Injected.<br>Look bottom-right.");
  } catch (e) {
    rAlert("Inject failed.");
  }
};

abcOption.onclick = function () {
  abCloak(selectedTab.view.src);
  rAlert("Opened in about:blank");
};

gitOption.onclick = function () {
  window.open("https://github.com/rhenryw/UV-Static-2.0", "_blank");
};

urlForm.onsubmit = async function (e) {
  e.preventDefault();
  if (!selectedTab) return;
  try {
    console.log("[Tabs] Navigating to URL:", urlInput.value);
    selectedTab.view.src = await getUV(urlInput.value);
    console.log("[Tabs] Navigation successful");
  } catch (err) {
    console.error("[Tabs] Navigation error:", err);
    rAlert("Nav failed.<br>" + err.toString());
  }
};

function abCloak(url) {
  var w = window.open();
  var f = w.document.createElement("iframe");
  f.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none";
  f.src = url;
  w.document.body.style.margin = "0";
  w.document.body.appendChild(f);
}

function tabItem(tab) {
  return button(
    {
      onclick: function (e) {
        if (!e.target.classList.contains("close") && !e.target.classList.contains("close-icon")) {
          focusTab(tab);
        }
      },
      class: "tab-item hover-focus1",
    },
    img({ src: getFavicon(tab.url) }),
    span(tab.title),
    button(
      { onclick: function () { removeTab(tab); }, class: "close" },
      ionIcon({ name: "close", class: "close-icon" })
    )
  );
}

function removeTab(tab) {
  tabs.splice(tabs.indexOf(tab), 1);
  if (tab === selectedTab) {
    selectedTab = null;
    if (tabs.length) focusTab(tabs[tabs.length - 1]);
    else setTimeout(function () { addTab("uvsearch.rhw.one"); }, 100);
  }
  tabView.removeChild(tab.view);
  persistTabs();
  tab.item.style.animation = "slide-out-from-bottom 0.1s ease";
  setTimeout(function () { tabList.removeChild(tab.item); }, 75);
}

function tabFrame(tab) {
  return iframe({
    class: "tab-frame",
    src: tab.proxiedUrl,
    onload: function (e) {
      var fw = e.target.contentWindow;
      var pn = "";
      try { pn = fw.location.pathname || ""; } catch (x) { return; }

      // scramjet proxied pages live under /k12/portal/
      if (!pn.startsWith("/k12/portal/")) return;

      try {
        var t = fw.document.title;
        if (t) tab.title = t;

        var el = tabList.children[tabs.indexOf(tab)];
        if (el) {
          el.children[1].textContent = tab.title;
          el.children[0].src = getFavicon(tab.url);
        }
        if (tab === selectedTab) urlInput.value = tab.url;
        persistTabs();
      } catch (err) {
        // can't read cross-origin frame, no big deal
      }
    },
  });
}

function persistTabs() {
  localStorage.setItem("tabs", JSON.stringify(tabs.map(function (t) { return t.url; })));
}

function focusTab(tab) {
  if (selectedTab) {
    selectedTab.view.style.display = "none";
    var prev = tabList.children[tabs.indexOf(selectedTab)];
    if (prev) prev.classList.remove("selectedTab");
  }
  selectedTab = tab;
  tab.view.style.display = "block";
  urlInput.value = tab.url;
  var cur = tabList.children[tabs.indexOf(tab)];
  if (cur) cur.classList.add("selectedTab");
}

async function addTab(link) {
  console.log("[Tabs] Adding tab for link:", link);
  var proxiedUrl;
  try {
    console.log("[Tabs] Getting UV proxy URL...");
    proxiedUrl = await getUV(link);
    console.log("[Tabs] Got proxy URL:", proxiedUrl);
  } catch (err) {
    console.error("[Tabs] Error getting proxy URL:", err);
    rAlert("Couldn't open tab.<br>" + err.toString());
    return;
  }

  var targetUrl = search(link, "https://html.duckduckgo.com/html?t=h_&q=%s");

  var tab = {
    title:      targetUrl.replace(/^https?:\/\//, ""),
    url:        targetUrl,
    proxiedUrl: proxiedUrl,
    icon:       null,
  };

  tab.view = tabFrame(tab);
  tab.item = tabItem(tab);

  tabs.push(tab);
  tabList.appendChild(tab.item);
  tabView.appendChild(tab.view);
  focusTab(tab);
}

// restore saved tabs or start fresh
var saved = (function () {
  try { return JSON.parse(localStorage.getItem("tabs") || "[]"); }
  catch (e) { return []; }
})();

console.log("[Tabs] Checking for initial URL in query parameters...");
var qp = new URLSearchParams(window.location.search);
var initialUrl = qp.get("url") || qp.get("inject");
if (initialUrl) {
  console.log("[Tabs] Found initial URL, attempting to decode if hashed:", initialUrl);
  // Try to decode hashed URLs (XOR + Base64)
  // Hashed URLs typically don't contain URL-like characters
  var decodedUrl = initialUrl;
  try {
    // Only attempt decode if it looks like it might be hashed
    // (no protocol, looks like base64)
    if (!initialUrl.startsWith("http://") && !initialUrl.startsWith("https://")) {
      decodedUrl = decodeForProxy(initialUrl);
      console.log("[Tabs] Successfully decoded hashed URL to:", decodedUrl);
    } else {
      console.log("[Tabs] URL appears to be non-hashed, using as-is");
    }
  } catch (e) {
    // If decoding fails, use the URL as-is
    console.warn("[Tabs] URL decode failed, using raw string:", initialUrl, "Error:", e);
    decodedUrl = initialUrl;
  }
  console.log("[Tabs] Adding tab with URL:", decodedUrl);
  setTimeout(function () { addTab(decodedUrl); }, 100);
} else if (saved.length) {
  console.log("[Tabs] Loading", saved.length, "saved tabs...");
  saved.forEach(function (u) { addTab(u); });
} else {
  console.log("[Tabs] No saved tabs, loading default...");
  addTab("uvsearch.rhw.one");
}