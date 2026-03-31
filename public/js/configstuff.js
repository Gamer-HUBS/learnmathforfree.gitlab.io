// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAIzv7rOF5LtQmC1AVeQqAjrGHUZnJomFY",
  authDomain: "track-study-9f2eb.firebaseapp.com",
  projectId: "track-study-9f2eb",
  storageBucket: "track-study-9f2eb.firebasestorage.app",
  messagingSenderId: "461107985386",
  appId: "1:461107985386:web:15c694a7c946da0a5d1093",
  databaseURL: "https://track-study-9f2eb-default-rtdb.firebaseio.com"
};

// Init Firebase
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  if (e.code !== 'app/duplicate-app') {
    console.error("Firebase init error:", e);
  } else {
    console.log("Firebase already initialized (duplicate warning ignored)");
  }
}
const auth = firebase.auth();
const db = firebase.database();

// Make global
window.auth = auth;
window.db = db;

firebase.database().ref(".info/connected").on("value", snap => {
  console.log("DB connected:", snap.val());
});

function isChromebook() {
  return navigator.userAgent.includes("CrOS");
}

function launchIframe(src) {
  console.log("[launchIframe] Called with src:", src);

  const contentDiv = document.getElementById("thestuff");
  if (!contentDiv) {
    console.error("[launchIframe] No element with ID 'thestuff' found.");
    return;
  }
  console.log("[launchIframe] Found content div.");

  // Only ever create ONE iframe
  let iframe = document.getElementById("mainGameFrame");
  if (!iframe) {
    console.log("[launchIframe] Creating new iframe.");
    iframe = document.createElement("iframe");
    iframe.id = "mainGameFrame";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.zIndex = "999999";
    iframe.allowFullscreen = true;
    document.body.appendChild(iframe);
  } else {
    console.log("[launchIframe] Reusing existing iframe.");
  }

  iframe.src = src;
  document.body.style.overflow = "hidden";
  contentDiv.style.display = "none";

  console.log("[launchIframe] Iframe launched with src:", src);
}

async function googleLogin(options = {}) {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await window.auth.signInWithPopup(provider);
    const user = result.user;
    const { uid, email, displayName, photoURL } = user;

    const ADMIN_EMAILS = ["advikmurthy12@gmail.com", "632547@stu.sandi.net", "650210@stu.sandi.net", "631129@stu.sandi.net", "647114@stu.sandi.net"];
    const userRef = window.db.ref("users/" + uid);

    let role = "user"; // Default role

    // Determine role with clear priority: admin > blocked > user
    if (ADMIN_EMAILS.includes(email)) {
      role = "admin";
    } else if (!email.endsWith("@stu.sandi.net")) {
      role = "blocked";
    }

    const snap = await userRef.get();

    if (!snap.exists()) {
      // First login: set up the user profile in the database
      await userRef.set({
        email,
        role: role, // Use the determined role
        name: displayName,
        icon: photoURL,
        created: Date.now(),
        online: true,
        timeSpent: 0,
        banned: false
      });
    } else {
      // Existing user: ensure their role is up-to-date, especially for new admins
      const dbRole = snap.child("role").val();
      if (role === "admin" && dbRole !== "admin") {
        await userRef.update({ role: "admin" });
      } else if (dbRole === "blocked") {
         role = "blocked"; // If blocked in DB, override everything
      } else {
        role = dbRole || role; // Trust DB role if it exists
      }
    }

    if (role === "blocked") {
      alert("Your account has been blocked by an administrator.");
      window.location.replace("https://www.youtube.com/watch?v=8ELbX5CMomE");
      return null;
    }

    localStorage.setItem("uid", uid);

    // If caller requested a redirect to the chat/talk page, do it now.
    if (options && options.redirectToTalk) {
      // Use a relative path to keep behavior consistent across hosting setups
      window.location.replace('./chats.html');
      return null; // navigation will occur
    }

    return role;

  } catch (error) {
    console.error("Login failed:", error);
    alert("Login failed. Please try again.");
    return null;
  }
}


async function codefree() {
  if (getCookie("Code")) {
    const role = await googleLogin();
    launchIframe(
      role === "admin"
        ? "./main.html?admin=True"
        : "./main.html?admin=False"
    );
  }
}


// Passcode handler
async function checkPasscodeClick() {
  const input = document.getElementById("passcodeInput").value;
  const year = new Date().getFullYear().toString().slice(-2);

  // Wait for the passwords to load
  const passwords = await window.fetchPasswords();
  const correctPasscode = passwords[0];
  const freeAccessCode = passwords[1];
  const correctPasscode2 = passwords[2];
  sessionStorage.clear();

  if (input === correctPasscode) {
    const role = await googleLogin();
    if (role === "blocked") {
      alert("Access Denied!");
      window.location.replace("https://www.youtube.com/watch?v=8ELbX5CMomE");
      return;
    }
    document.cookie = "Code=true; path=/; max-age=" + 14 * 24 * 60 * 60; //2 days
    launchIframe(
      role === "admin"
        ? "./main.html?admin=True"
        : "./main.html?admin=False"
    );


  } else if (input === freeAccessCode) {
    document.cookie = "Codefree=true";
    launchIframe("./main.html?free=True");

  } else if (input === correctPasscode2) {
    const role = await googleLogin();
    if (role === "blocked") {
      alert("Access Denied!");
      window.location.replace("https://www.youtube.com/watch?v=8ELbX5CMomE");
      return;
    }
    document.cookie = "Code=true; path=/; max-age=" + 60 * 60 * 24 * 14; //14 days
    launchIframe(
      role === "admin"
        ? "./main.html?admin=True"
        : "./main.html?admin=False"
    );
  } else {
    alert("Access Denied!");
    window.location.replace("https://www.youtube.com/watch?v=8ELbX5CMomE");
  }
}


// Expose handler
window.checkPasscodeClick = checkPasscodeClick;
window.googleLogin = googleLogin;
window.codefree = codefree;
// trackUser and trackUserOnlineStatus are defined in user.js and attached to window there.
