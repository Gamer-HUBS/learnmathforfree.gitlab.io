// Firebase was already initialized in configstuff.js
// Access global auth and db
const auth = firebase.auth();
const db = firebase.database();

// Connection listener is also in configstuff, but we can keep a local log if needed, 
// or remove it to avoid duplicate logs. Removing it to be clean.

let start = false;

const fragmentIdentifier = decodeURIComponent(window.location.hash.slice(1));
console.log("Full fragment identifier:", fragmentIdentifier);
console.log("Fragment identifier:", fragmentIdentifier);
let totalError;
var flash = ['escape-the-closet',
    'riddle-transfer',
    'escape-the-freezer',
    'rogue-soul-2',
    'achievement-unlocked-2',
    'escape-the-phonebooth',
    'rogue-soul',
    'achievement-unlocked-3',
    'minesweeper',
    'escape-the-shack',
    'stealing-the-diamond',
    'achievement-unlocked',
    'escaping-the-prison',
    'infiltratingtheairship',
    'stick-war',
    'age-of-war-hacked',
    'factory-balls',
    'submachine-0',
    'age-of-war',
    'flash-chess',
    'submachine-10',
    'bloons-td-1',
    'fleeing-the-complex',
    'submachine-2',
    'bloons-td-2',
    'gun-mayhem-2',
    'submachine-3',
    'bloons-td-3',
    'gun-mayhem',
    'submachine-32-chambers',
    'bloons-td-4',
    'infiltratingtheairship',
    'submachine-4',
    'bloons',
    'learn-to-fly-2',
    'submachine-5',
    'bloxorz',
    'run-1',
    'run-2',
    'run-3',
    'learn-to-fly-3',
    'submachine-6',
    'breaking-the-bank',
    'learn-to-fly-idle',
    'submachine-7',
    'cat-ninja',
    'learn-to-fly',
    'submachine-8',
    'creative-kill-chamber',
    'papas-freezeria',
    'submachine-9',
    'curveball',
    'papas-pizzaria',
    'submachine-flf',
    'dont-escape-2 ',
    'raft-wars-2',
    'submachine',
    'dont-escape-3',
    'raft-wars',
    'sugar-sugar',
    'fridaynightfunkin',
    'dont-escape',
    "Tanuki-Sunset",
    'riddle-school-2',
    'the-impossible-quiz',
    'duck-life-2',
    'riddle-school-3',
    'this-is-the-only-level-2',
    'duck-life-3',
    'riddle-school-4',
    'this-is-the-only-level',
    'duck-life',
    'riddle-school-5',
    'ultimate-chess',
    'escape-the-bathroom',
    'riddle-school',
    'escape-the-car',
    'riddle-transfer-2']

const other = ['adcap', 'adofai', 'baldi', 'bison', 'boxing-physics2', 'breaklock', 'burger', 'DogeMiner', 'dreader', 'flappy', 'FNAF', 'FNAF2', 'FNAF3', 'FNAF4', 'freezeria', 'friendlyfire', 'fruitninja', 'game-inside', 'jetpackjoyride', 'knifehit', 'lose95',
    'retro-bowl', 'sansfight', 'slope', 'snake', 'soccer-random', 'subway', 'superhot', 'tacomia', 'tetris', 'touch', 'tunnelrush', 'xx142-b2exe'];

const proxylinks = { "bloxd": "bloxd.io" };


let isAdmin = false;
let userRole = "user";

const doing = false;

async function smartLoadGame(id) {
    let DONE = false;
    const manifests = [
        "https://learnmathforfree.gitlab.io/vol-1/data.json",
        "https://learnmathforfree.gitlab.io/vol-2/data.json",
        "https://learnmathforfree.gitlab.io/vol-3/data.json",
        "https://learnmathforfree.gitlab.io/vol-4/data.json",
        "https://learnmathforfree.gitlab.io/vol-5/data.json",
    ];

    console.log(id);
    // 1️Check Proxy first
    for (const key in proxylinks) {
        if (Object.hasOwnProperty.call(proxylinks, key) && key === id) {
            const url = "../active/loader.html?url=" + proxylinks[key];
            console.log("Is a Proxy Game at " + url);
            iframe.src = url;
            DONE = true;
            return;
        }
    }
    if (id === "FNAF") {
        iframe.src =  `https://learnmathforfree.gitlab.io/hd_fnaf/1/index.html`;
        DONE = true;
        return;
    }
    if (id === "FNAF2") {
        iframe.src =  `https://learnmathforfree.gitlab.io/hd_fnaf/2/index.html`;
        DONE = true;
        return;
    }
    if (id === "FNAF3") {
        iframe.src =  `https://learnmathforfree.gitlab.io/hd_fnaf/3/index.html`;
        DONE = true;
        return;
    }


    if (DONE == false) {
        const res = await fetch("games.json");
        if (res.ok) {
            const json = await res.json();
            const entry = json[id];
            if (entry && entry.web) {
                const url = entry.web;
                console.log("games.json hit:", url);
                iframe.src = url;
                DONE = true;
                return;
            }
        }
    }
    
    //Since we HATE JS


    // 2 Check manifests
    if (DONE === false){
        for (const url of manifests) {
            try {
                const res = await fetch(url);
                if (!res.ok) continue;

                const json = await res.json();
                const entry = json[id];
                if (!entry) continue;

                if (entry.type === "flash") {
                    iframe.src = `https://learnmathforfree.gitlab.io/file/flash/#${encodeURIComponent(id)}`;
                    console.log("Flash (manifest):", iframe.src);
                    DONE = true;
                    return;
                }
                if (url.includes("Learning-Tools")) {
                    iframe.src = `https://learnmathforfree.gitlab.io/Learning-Tools/${id}/index.html`;
                    console.log("Learning Tool:", iframe.src);
                    DONE= true;
                    return;
                }
                if (url.includes("other.json")) {
                    iframe.src = `https://learnmathforfree.gitlab.io/file/other/${id}/index.html`;
                    console.log(" Other game:", iframe.src);
                    DONE =true;
                    return;
                }

                // Default to normal game
                iframe.src = `https://learnmathforfree.gitlab.io/file/${id}/index.html`;
                console.log(" Normal game:", iframe.src);
                DONE = true;
                return;

            } catch (err) {
                console.warn("Manifest fetch error:", url, err);
            }
        }
    }

    // 3️Fallback guesses prioritized
    const priorityPaths = [
        `https://learnmathforfree.gitlab.io/vol-1/${id}/index.html`,
        `https://learnmathforfree.gitlab.io/vol-2/${id}/index.html`,
        `https://learnmathforfree.gitlab.io/vol-3/${id}/index.html`,
        `https://learnmathforfree.gitlab.io/vol-4/${id}/index.html`,
        `https://learnmathforfree.gitlab.io/vol-5/${id}/index.html`,
        `https://learnmathforfree.gitlab.io/vol-2/other/${id}/index.html`,
        `https://learnmathforfree.gitlab.io/vol-2/flash/#${encodeURIComponent(id)}`
    ];

    for (const path of priorityPaths) {
        try {
            // Try a HEAD request first to check existence
            const check = await fetch(path, { method: 'HEAD' });
            if (check.ok) {
                iframe.src = path;
                console.log("Game found at:", path);
                return;
            }
        } catch (e) {
            // Fallback to iframe check if fetch fails (e.g. CORS)
            const ok = await new Promise(resolve => {
                const t = document.createElement("iframe");
                t.style.display = "none";
                t.onload = () => { t.remove(); resolve(true); };
                t.onerror = () => { t.remove(); resolve(false); };
                t.src = path;
                document.body.appendChild(t);
                // Timeout to prevent hanging
                setTimeout(() => {
                    if (document.body.contains(t)) { t.remove(); resolve(false); }
                }, 3000);
            });

            if (ok) {
                iframe.src = path;
                console.log("Game found (via iframe check) at:", path);
                return;
            }
        }
    }

    console.error("Game definitely not found:", id);
    throw new Error("Game not found after checking all paths.");
}


var iframe = document.createElement('iframe');

smartLoadGame(fragmentIdentifier).catch(err => {
    console.error("Error loading game:", err);
    const errEl = document.getElementById("loading");
    if (errEl) { errEl.textContent = 'Error loading game'; errEl.style.backgroundColor = 'rgba(150,0,0,0.6)' }
});
try {
    iframe.style.border = 'none';
    iframe.id = "iframe"
    iframe.style.width = '100%';
    iframe.style.height = "100%"
    iframe.allowFullscreen = true
    iframe.style.margin = '0';
    iframe.style.position = "relative"
    iframe.style.zIndex = "1"
    iframe.style.top = "0"
    iframe.referrerPolicy = "no-referrer"
    iframe.sandbox = "allow-forms allow-modals allow-pointer-lock allow-presentation allow-same-origin allow-scripts allow-popups"
    const player = document.getElementById('player') || document.body
    player.append(iframe)
} catch (error) {
    try { document.getElementById('player')?.append(iframe) } catch (e) { }
    console.error(error)
    const errEl = document.getElementById("loading")
    if (errEl) { errEl.textContent = 'Error loading game'; errEl.style.backgroundColor = 'rgba(150,0,0,0.6)' }
}

iframe.focus()

// Generic iframe error handler: show a message if the iframe fails to load
iframe.addEventListener('error', function () {
    console.error('Iframe failed to load:', iframe.src);
    const errEl = document.getElementById('loading');
    if (errEl) { errEl.textContent = 'Error loading game'; errEl.style.backgroundColor = 'rgba(150,0,0,0.6)' }
});

console.log("Checking user role...");
console.log("Testing");
if (sessionStorage.getItem("freeAccess") === "true") {
    console.log("Using free acess code how do you get it!");
    userRole = "free";
}
else {
    firebase.auth().onAuthStateChanged(async user => {
        if (!user) return;

        const snap = await firebase.database()
            .ref("users/" + user.uid + "/role")
            .once("value");

        userRole = snap.val() || "user";
        console.log("User role:", userRole);
    });
}


sessionStorage.setItem("userRole", userRole);
console.log("Final user role:", userRole);



const backBtn = document.getElementById("backBtn");
if (backBtn) {
    console.log("Found backBtn, attaching listener.");
    backBtn.addEventListener("click", goBack);
} else {
    console.error("Critical: backBtn not found in DOM!");
}

function goBack() {
    console.log("goBack triggered. UserRole:", userRole);
    if (userRole === "admin") {
        window.location.href = "../games.html?admin=True";
    } else if (userRole === "free") {
        window.location.href = "../games.html?free=True";
    } else if (userRole === "user") {
        window.location.href = "../games.html?admin=False";
    } else {
        console.log("No role matched, defaulting to games.html");
        window.location.href = "../games.html";
    }
}
document.getElementById("backBtn")?.addEventListener("click", goBack);
document.getElementById('open-new')?.addEventListener('click', () => {
    var win = window.open()
    var url = iframe.src
    var iframe = win.document.createElement('iframe')
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.src = url;
    iframe.sandbox =
"allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
    win.document.body.appendChild(iframe)
});

document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    const shell = document.querySelector('.player-shell')
    if (shell) {
        const isImmersive = shell.classList.toggle('immersive')
        // try browser fullscreen as well when entering immersive
        if (isImmersive) {
            try { iframe.requestFullscreen?.() } catch (e) { }
        } else {
            try { document.exitFullscreen?.() } catch (e) { }
        }
    } else {
        iframe.requestFullscreen?.()
    }
})
// Set title from fragment id
function humanize(id) { if (!id) return 'Game'; return id.replace(/[-_.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
const gameTitleEl = document.getElementById('gameTitle');
if (gameTitleEl) gameTitleEl.textContent = humanize(fragmentIdentifier)
// Hide loading once iframe is ready
iframe.addEventListener('load', () => { document.getElementById('loading')?.remove() })

