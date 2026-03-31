import { getFavicon, rAlert } from "./utils.mjs";
import { getUV, search, safeProxyCall } from "./prxy.mjs";

const { span, iframe, button, img } = van.tags;
const { tags: { "ion-icon": ionIcon } } = van;

var tabs = [];
var selectedTab = null;

const sideBar      = document.querySelector("header");
const pageBack     = document.getElementById("page-back");
const pageForward  = document.getElementById("page-forward");
const pageRefresh  = document.getElementById("page-refresh");
const urlForm      = document.getElementById("url-form");
const urlInput     = document.getElementById("url-input");
const newTabButton = document.getElementById("new-tab");
const tabList      = document.getElementById("tab-list");
const tabView      = document.getElementById("tab-view");

window.onmousemove = (e) => {
  sideBar.classList.toggle("hovered", e.clientX < 50);
};

pageBack.onclick    = () => selectedTab?.view.contentWindow.history.back();
pageForward.onclick = () => selectedTab?.view.contentWindow.history.forward();
pageRefresh.onclick = () => selectedTab?.view.contentWindow.location.reload();
newTabButton.onclick = () => addTab("uvsearch.rhw.one");

const devtoolsOption = document.getElementById("devtools-option");
const abcOption      = document.getElementById("abc-option");
const gitOption      = document.getElementById("git-option");

const erudaScript = `fetch("https://cdn.jsdelivr.net/npm/eruda")
.then(r => r.text())
.then(data => {
  eval(data);
  if (!window.erudaLoaded) {
    eruda.init({ defaults: { displaySize: 45, theme: "AMOLED" } });
    window.erudaLoaded = true;
  }
});`;

devtoolsOption.onclick = () => {
  try {
    selectedTab.view.contentWindow.eval(erudaScript);
    rAlert("Injected successfully.<br>Click the icon on the bottom right.");
  } catch {
    rAlert("Failed to inject.");
  }
};

abcOption.onclick = () => {
  abCloak(selectedTab.view.src);
  rAlert("Opened in about:blank");
};

gitOption.onclick = () => {
  window.open("https://github.com/rhenryw/UV-Static-2.0", "_blank");
};

urlForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!selectedTab) return;
  try {
    selectedTab.view.src = await getUV(urlInput.value);
  } catch (err) {
    rAlert(`Navigation failed.<br>${err.toString()}`);
  }
};

function abCloak(cloakUrl) {
  const win = window.open();
  const el = win.document.createElement("iframe");
  el.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none";
  el.src = cloakUrl;
  win.document.body.style.margin = "0";
  win.document.body.appendChild(el);
}

const tabItem = (tab) =>
  button(
    {
      onclick: (e) => {
        if (
          !e.target.classList.contains("close") &&
          !e.target.classList.contains("close-icon")
        ) {
          focusTab(tab);
        }
      },
      class: "tab-item hover-focus1",
    },
    img({ src: getFavicon(tab.url) }),
    span(tab.title),
    button(
      {
        onclick: () => removeTab(tab),
        class: "close",
      },
      ionIcon({ name: "close", class: "close-icon" })
    )
  );

function removeTab(tab) {
  tabs.splice(tabs.indexOf(tab), 1);

  if (tab === selectedTab) {
    selectedTab = null;
    if (tabs.length) {
      focusTab(tabs[tabs.length - 1]);
    } else {
      setTimeout(() => addTab("uvsearch.rhw.one"), 100);
    }
  }

  tabView.removeChild(tab.view);
  persistTabs();

  tab.item.style.animation = "slide-out-from-bottom 0.1s ease";
  setTimeout(() => {
    tabList.removeChild(tab.item);
  }, 75);
}

const tabFrame = (tab) =>
  iframe({
    class: "tab-frame",
    src: tab.proxiedUrl,
    onload: (e) => {
      const frameWindow = e.target.contentWindow;
      let pathname = "";
      try {
        pathname = frameWindow.location.pathname || "";
      } catch {
        // Cross-origin frame — can't read pathname
        return;
      }

      if (pathname.includes("/loader.html")) return;

      const config = self.__scramjet$config;
      if (!config || !pathname.startsWith(config.prefix)) return;

      try {
        const parts = pathname.slice(config.prefix.length).split("/");
        const encodedTarget = parts[parts.length - 1];
        const targetUrl = config.codec.decode(encodedTarget);

        if (!targetUrl) return;

        tab.title = frameWindow.document.title || targetUrl.replace(/^https?:\/\//, "");
        tab.url = targetUrl;

        const tabEl = tabList.children[tabs.indexOf(tab)];
        if (tabEl) {
          tabEl.children[1].textContent = tab.title;
          tabEl.children[0].src = getFavicon(targetUrl);
        }

        if (tab === selectedTab) urlInput.value = targetUrl;
        persistTabs();
      } catch (err) {
        console.warn("[tabs] Failed to decode proxied URL:", err);
      }
    },
  });

function persistTabs() {
  localStorage.setItem("tabs", JSON.stringify(tabs.map((t) => t.url)));
}

function focusTab(tab) {
  if (selectedTab) {
    selectedTab.view.style.display = "none";
    tabList.children[tabs.indexOf(selectedTab)]?.classList.remove("selectedTab");
  }
  selectedTab = tab;
  tab.view.style.display = "block";
  urlInput.value = tab.url;
  tabList.children[tabs.indexOf(tab)]?.classList.add("selectedTab");
}

async function addTab(link) {
  let proxiedUrl;
  try {
    proxiedUrl = await getUV(link);
  } catch (err) {
    rAlert(`Failed to open tab.<br>${err.toString()}`);
    return;
  }

  const targetUrl = search(link, "https://html.duckduckgo.com/html?t=h_&q=%s");

  const tab = {
    title:      targetUrl.replace(/^https?:\/\//, ""),
    url:        targetUrl,
    proxiedUrl,
    icon:       null,
  };

  tab.view = tabFrame(tab);
  tab.item = tabItem(tab);

  tabs.push(tab);
  tabList.appendChild(tab.item);
  tabView.appendChild(tab.view);
  focusTab(tab);
}

// Restore persisted tabs or open default
const savedTabs = (() => {
  try {
    return JSON.parse(localStorage.getItem("tabs") || "[]");
  } catch {
    return [];
  }
})();

if (savedTabs.length) {
  savedTabs.forEach((url) => addTab(url));
} else {
  addTab("uvsearch.rhw.one");
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("inject")) {
  setTimeout(() => addTab(urlParams.get("inject")), 100);
}