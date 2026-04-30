// uttils.js - Firebase v8
// Assumes firebase.initializeApp() has already been called in configstuff.js

// Assumes firebase.initializeApp() has already been called in configstuff.js
// auth and db are global variables from configstuff.js

async function imageUrlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image:", error);
    return null;
  }
}

async function checkifinadmin() {
  const uid = sessionStorage.getItem("uid");
  if (!uid) return false;
  try {
    const snap = await firebase.database().ref(`users/${uid}/role`).once("value");
    return snap.val() === "admin";
  } catch (err) {
    console.error("Error checking admin status:", err);
    return false;
  }
}

async function ensureUserSchema(uid, defaultSchema) {
  const ref = firebase.database().ref("users/" + uid);

  const snap = await ref.once("value");
  const user = snap.val() || {};

  const updates = {};
  let changed = false;

  for (const key in defaultSchema) {
    if (!(key in user)) {
      const val = typeof defaultSchema[key] === "function"
        ? defaultSchema[key]()
        : defaultSchema[key];

      updates[key] = val;
      changed = true;
    }
  }

  if (changed) {
    await ref.update(updates);
    console.log("User schema repaired:", uid, updates);
  }
}

function safeAtob(v) {
  try { return atob(v); } catch (e) {
    console.warn("Base64 decode failed:", v, e);
    return null;
  }
}

async function fetchPasswords() {
  console.log("Fetching /info from Firebase...");

  const snap = await firebase.database().ref("info").once("value");
  const data = snap.val();
  if (!data) return [];

  const year = new Date().getFullYear().toString().slice(-2);
  console.log("Year suffix:", year);

  const results = [];

  for (const key of ["fireauth", "free", "fireauth2"]) {
    const raw = data[key];
    if (typeof raw !== "string") continue;

    const decoded = safeAtob(raw);
    if (decoded) results.push(decoded + year);
  }

  return results;
}

function onUserChange(cb) {
  auth.onAuthStateChanged(async user => {
    if (!user) return cb(null);
    const snap = await db.ref("users/" + user.uid).once("value");
    const profile = snap.val();
    if (profile.role === "blocked") {
      alert("Your account is blocked.");
      await auth.signOut();
      return cb(null);
    }
    cb(profile);
  });
}

function deleteProp(key) {
  if (!db) return console.error("DB not init");
  return db.ref(`${key}`).remove();
}

window.getPeopleCount = function() {
  const onlineRef = db.ref("users").orderByChild("online").equalTo(true);
  onlineRef.on("value", snap => {
    const count = snap.numChildren();
    const onlineEl = document.getElementById("online-users");
    if (onlineEl) onlineEl.textContent = `USERS ONLINE: ${count}${count === 1 ? " user" : " users"}`;
  }, err => {
    const onlineEl = document.getElementById("online-users");
    if (onlineEl) onlineEl.textContent = `USERS ONLINE: 0`;
  });
};

document.addEventListener("DOMContentLoaded", () => {
  window.getPeopleCount();
});


async function getSubfolderCountRTDB(folderPath) {
  try {
    const snapshot = await firebase.database().ref(folderPath).once('value');
    return snapshot.numChildren();
  } catch (error) {
    console.error("Error fetching RTDB count:", error);
    return 0;
  }
}

// Example Usage:



const defaultUserSchema = { "created": () => Date.now(), "email": "", "icon": "", "online": false, "role": "", "timeSpent": 0, "banned": false, "name": "" };


window.imageUrlToBase64 = imageUrlToBase64;
window.checkifinadmin = checkifinadmin;
window.ensureUserSchema = ensureUserSchema;
window.fetchPasswords = fetchPasswords;
window.onUserChange = onUserChange;
window.getSubfolderCountRTDB = getSubfolderCountRTDB;
window.deleteProp = deleteProp;

// XOR Encryption for Stealth URLs
const XK = [0x4d, 0x61, 0x74, 0x68, 0x48, 0x75, 0x62]; // "MathHub"
function xorShift(buf) {
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ XK[i % XK.length];
  }
  return out;
}

window.encodeForProxy = function(str) {
  const raw = new TextEncoder().encode(str);
  const shifted = xorShift(raw);
  let binStr = "";
  for (let i = 0; i < shifted.length; i++) binStr += String.fromCharCode(shifted[i]);
  return btoa(binStr)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

window.decodeForProxy = function(enc) {
  const b64 = enc.replace(/-/g, "+").replace(/_/g, "/");
  const pad = 4 - (b64.length % 4);
  const binStr = atob(b64 + (pad < 4 ? "=".repeat(pad) : ""));
  const buf = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) buf[i] = binStr.charCodeAt(i);
  const decoded = xorShift(buf);
  return new TextDecoder().decode(decoded);
};

window.openProxyFromGames = function (injectUrl) {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const params = new URLSearchParams();
  params.set('returnTo', returnTo);
  if (injectUrl) {
    // Double check that encodeForProxy is available
    if (window.encodeForProxy) {
      params.set('url', window.encodeForProxy(injectUrl));
    } else {
      params.set('q', injectUrl);
    }
  }
  window.location.href = `/a?${params.toString()}`;
};