// user.js - Firebase v8

// user.js - Firebase v8
// Assumes firebase.initializeApp() has already been called in configstuff.js

// Assumes firebase.initializeApp() has already been called in configstuff.js
// auth and db are already defined globally in configstuff.js



if (typeof db !== 'undefined') {
  db.ref(".info/connected").on("value", snap => {
    console.log("db connected:", snap.val());
  });
} else {
  console.error("User.js: db is not defined! Make sure configstuff.js is loaded first.");
}

function makeUserProp(uid, key, value) {
  if (!db) return console.error("DB not init");
  return db.ref(`users/${uid}/${key}`).set(value);
}

/* Read a user property */
function getUserProp(uid, key) {
  if (!db) return Promise.reject("DB not init");
  return db.ref(`users/${uid}/${key}`).once("value")
    .then(snap => snap.exists() ? snap.val() : null);
}

/* Edit an existing property */
function editUserProp(uid, key, value) {
  if (!db) return console.error("DB not init");
  return db.ref(`users/${uid}`).update({ [key]: value });
}

/* Delete a property */
function deleteUserProp(uid, key) {
  if (!db) return console.error("DB not init");
  return db.ref(`users/${uid}/${key}`).remove();
}


//Timespent
//online

function trackUserOnlineStatus(uid) {
  if (!uid) return;
  if (typeof db === 'undefined' || !db) {
    console.error("trackUserOnlineStatus: db is not defined!");
    return;
  }
  const userRef = db.ref(`users/${uid}`);
  const connectedRef = db.ref(".info/connected");

  console.log("Tracking online status for UID:", uid);
  console.log("Initial online status set to true.");
  console.log("Tracking online/offline status changes.");
  connectedRef.on("value", snap => {
    if (snap.val() === true) {
      userRef.update({ online: true });
      userRef.onDisconnect().update({ online: false });
    } else {
      userRef.update({ online: false });
    }
  });

  window.addEventListener("online", () => userRef.update({ online: true }));
  window.addEventListener("offline", () => userRef.update({ online: false }));
}



let timeInterval = null;

function trackUser(uid) {
  if (!uid) {
    console.warn("trackUser: No UID provided");
    return;
  }
  if (typeof db === 'undefined' || !db) {
    console.error("trackUser: db is not defined!");
    return;
  }

  console.log("Starting trackUser for:", uid);

  const userRef = db.ref(`users/${uid}`);
  // sessionStart unused?
  // const sessionStart = Date.now();

  // Mark online
  userRef.update({ online: true }).catch(e => console.error("trackUser update failed:", e));

  // Clean disconnect handler
  userRef.onDisconnect().update({ online: false });

  // Start timer (only once)
  if (timeInterval) clearInterval(timeInterval);

  timeInterval = setInterval(() => {
    if (typeof firebase === 'undefined') {
      console.error("trackUser: firebase global is missing!");
      return;
    }
    userRef.update({
      timeSpent: firebase.database.ServerValue.increment(10)
    }).catch(err => console.error("trackUser inc failed:", err));
  }, 10000);

  // Stop timer on tab close
  window.addEventListener("beforeunload", () => {
    clearInterval(timeInterval);
    userRef.update({ online: false });
  });
}


function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}



// Run tracking on page load if uid exists
const uid = sessionStorage.getItem('uid') || localStorage.getItem('uid');
if (uid) {
  console.log("Auto-starting tracking for:", uid);
  trackUser(uid);
  trackUserOnlineStatus(uid);
} else {
  console.log("No UID found in storage, skipping auto-track.");
}
async function checkUserBanStatus() {

  const user = firebase.auth().currentUser;
  if (!user) return;

  const snap = await db.ref(`users/${user.uid}/role`).once("value");
  const role = snap.val();

  if (role === "blocked") {
    alert("You have been banned by an administrator.");
    worker.postMessage({ type: "STOP" });
    window.location.href = "https://www.youtube.com/watch?v=8ELbX5CMomE";
  }
}

/* SECURE ADMIN CHECK - Always verify via database, never trust localStorage/sessionStorage */
async function checkUserAdminStatus(uid) {
  if (!uid) return false;
  if (!db) return false;
  
  try {
    const snap = await db.ref(`users/${uid}/role`).once("value");
    return snap.val() === "admin";
  } catch (err) {
    console.error("Error checking admin status:", err);
    return false;
  }
}

/* Initialize admin status for current user - called after auth */
async function initializeAdminStatus() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  const isAdmin = await checkUserAdminStatus(user.uid);
  // Store only in session for UI hints, but protect sensitive operations with DB checks
  if (isAdmin) {
    sessionStorage.setItem("_userIsAdmin", "true");
  } else {
    sessionStorage.removeItem("_userIsAdmin");
  }
}



function onUserChange(callback) {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      db.ref(`users/${user.uid}`).once('value').then(snap => {
        callback(snap.val());
      });
    } else {
      callback(null);
    }
  });
}

setInterval(checkUserBanStatus, 15000); // Check every 15 seconds

window.makeUserProp = makeUserProp;
window.getUserProp = getUserProp;
window.editUserProp = editUserProp;
window.deleteUserProp = deleteUserProp;
window.trackUserOnlineStatus = trackUserOnlineStatus;
window.trackUser = trackUser;
window.onUserChange = onUserChange;
