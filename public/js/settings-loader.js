/**
 * settings-loader.js
 * Handles persistence for MathLearnHub settings:
 * - Favicon & Tab Title (Cloaking)
 * - Panic Key & URL
 * - About:Blank cloaking
 */

(function () {
    // --- Constants & Defaults ---
    const DEFAULTS = {
        title: "Settings Panel — PowerSchool Style",
        favicon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVQYV2NkQAP/Gf4n4GBgYAAA/wP///+5AADeRgobNJd7TQAAAABJRU5ErkJggg==", // Black square default
        panicUrl: "https://classroom.google.com",
        panicKey: "`" // Default panic key is Backtick
    };

    const PRESETS = {
        "default": {
            title: "MathLearnHub",
            favicon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVQYV2NkQAP/Gf4n4GBgYAAA/wP///+5AADeRgobNJd7TQAAAABJRU5ErkJggg=="
        },
        "classroom": {
            title: "Classes",
            favicon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAB4ElEQVQ4T6WUP2hUURjGn1nYhEVFBaDCRFVogLKlBLWKSgkFqQkFAoIqWqELYF9gX7AFmvQXqMsdX0DhRFIyQ1QY7yzgcD9kbvFu+zszs3u8fMYWwWz3/uec77nnvPPfuYo9QxT9D74Nk8x3P8QrpJKm2wD+92u9+043s4x7IMqRiu9q9g4hGz/NQRkLV6I+ODoOC9IVyOslmAKmQT+kAC4IcMekipKo1TyzNf0CXMpqWy6lsbBwb0AB+YGknRHUzyMKM6EHoBcrgGx7qvQiPJbJdmArIDM0dvznKslfikm3C8Xg4Jxjx+NmHctj1pEPIkU4+cDQRjN/EDMs0QqMJYcBJCQBiSC+VNNyk3wJp8TA4LmzylDCL43QtrIEykiS6JLDLpBp0yoh9FsrYAhIRp2gVWgC4wSz5VpULPqvE47dsTj0u1R76gV0VhOJGV3kfPe9H1zwFMUX6a40AWMJWFAfQHnU5sQLa8D5GgiQpqJFCHoK+ITq7ZZC7QmQMCqEjOEo8yxawJN0l5u9qe7Jr9E0jcFShcwzLW0H6hNQI6foA9g0BGIZZgHYZPz9W/GuAmG2s3RdTtt8GxCU0FpB8bDawGpV6km5G9rZV43wCOoihQ25wz4AAAAASUVORK5CYII="
        },
        "drive": {
            title: "My Drive",
            favicon: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAgNTAiIGZpbGw9IiMzQjYyRjIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTUwIDE0LjkzTDI1IDUwIDAgMTQuOTNMNDAgNTB6Ii8+PC9zdmc+"
        },
        "docs": {
            title: "Google Docs",
            favicon: "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMjMxNUZGIiBoZWlnaHQ9IjUwcHgiIHZpZXdCb3g9IjAgMCA0OCA1MCIgd2lkdGg9IjUwcHgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTQyIDEwSDI0bC02LTZINTJ2NDRIMTBWMGhNNCAwaDM2djQwSDRWMHoiLz48L3N2Zz4="
        },
        "powerschool": {
            title: "Grades and Attendance",
            favicon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgc3R5bGU9ImZpbGw6I0M0Q0Q0QyIvPjxwYXRoIGQ9Ik0xNiAxOEg0OEw0OCA0NEgxNkwxNiAxOFoiIHN0eWxlPSJmaWxsOiNGRkYiLz48L3N2Zz4="
        },
        "gmail": {
            title: "Inbox (1) - gmail.com",
            favicon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico"
        }
    };

    // --- Core Functions ---

    function getStorage(key, def) {
        try {
            return localStorage.getItem(key) || def;
        } catch (e) {
            console.warn("Storage access denied:", e.message);
            return def;
        }
    }

    function setStorage(key, val) {
        try {
            if (val === null || val === undefined) localStorage.removeItem(key);
            else localStorage.setItem(key, val);
        } catch (e) {
            console.warn("Storage access denied:", e.message);
        }
    }

    function setFavicon(url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }
        link.href = url;
    }

    function setTitle(text) {
        document.title = text;
    }

    function applySettings() {
        const savedFav = getStorage("cloakedFavicon", DEFAULTS.favicon);
        const savedTitle = getStorage("cloakedTitle", "");

        if (savedFav) setFavicon(savedFav);
        if (savedTitle) setTitle(savedTitle);
    }

    function triggerPanic() {
        const url = getStorage("panicUrl", DEFAULTS.panicUrl);
        // Force full redirect
        window.location.href = url;
    }

    // --- Exposed API ---

    window.settings = {
        presets: PRESETS,

        setCloak: function (presetName) {
            const p = PRESETS[presetName];
            if (!p) return;
            setStorage("cloakedTitle", p.title);
            setStorage("cloakedFavicon", p.favicon);
            applySettings();
        },

        setCustomCloak: function (title, faviconUrl) {
            if (title) setStorage("cloakedTitle", title);
            if (faviconUrl) setStorage("cloakedFavicon", faviconUrl);
            applySettings();
        },

        setPanicUrl: function (url) {
            setStorage("panicUrl", url);
        },

        setPanicKey: function (key) {
            setStorage("panicKey", key);
        },

        getPanicKey: function () {
            return getStorage("panicKey", DEFAULTS.panicKey);
        },

        openAboutBlank: function (contentUrl) {
            // This technique opens the content in an about:blank blob/iframe
            const win = window.open();
            if (!win) return alert("Popup blocked!");

            win.document.body.style.margin = "0";
            win.document.body.style.height = "100vh";
            win.document.body.style.backgroundColor = "black"; // Better UX while loading

            const iframe = win.document.createElement("iframe");
            iframe.style.border = "none";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.margin = "0";

            // Apply current cloaking to the new window
            const savedFav = getStorage("cloakedFavicon", DEFAULTS.favicon);
            const savedTitle = getStorage("cloakedTitle", "");

            if (savedTitle) win.document.title = savedTitle;

            const link = win.document.createElement("link");
            link.rel = "icon";
            link.href = savedFav;
            win.document.head.appendChild(link);


            const urlObj = new URL(contentUrl, window.location.href);
            const cleanUrl = urlObj.origin + urlObj.pathname;
            const qParam = urlObj.searchParams.get('q');

            fetch(cleanUrl)
                .then(res => res.text())
                .then(html => {
                    // Inject BASE tag for relative assets
                    // Inject CONFIG for the loader
                    const baseHref = cleanUrl.substring(0, cleanUrl.lastIndexOf('/') + 1);
                    const injection = `
                        <base href="${baseHref}">
                        <script>window.CLOAK_Q = "${qParam || ''}";</script>
                    `;

                    // Insert after <head>
                    const modifiedHtml = html.replace('<head>', '<head>' + injection);

                    const blob = new Blob([modifiedHtml], { type: 'text/html' });
                    iframe.src = URL.createObjectURL(blob);
                    win.document.body.appendChild(iframe);
                })
                .catch(err => {
                    console.error("Failed to blobify:", err);
                    // Fallback to direct URL if fetch fails
                    iframe.src = contentUrl;
                    win.document.body.appendChild(iframe);
                });
        }
    };

    // --- Initialization ---

    // Apply immediately on load
    applySettings();

    // Global Key Listener for Panic
    document.addEventListener("keydown", (e) => {
        const storedKey = getStorage("panicKey", DEFAULTS.panicKey).toLowerCase();
        if (e.key.toLowerCase() === storedKey) {
            triggerPanic();
        }
    });

})();
