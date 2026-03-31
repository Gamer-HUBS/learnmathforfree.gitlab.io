// launchfirebase.js - Firebase v8
//<script src="./js/launchfirebase.js"></script> in HTML

// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>



// Export globally

/* ------------------ USER LOGIN / SIGNUP ------------------ */
async function handleLogin(user) {
  const uid = user.uid;
  sessionStorage.setItem("uid", uid);
  const email = user.email.toLowerCase();
  const userRef = db.ref("users/" + uid);
  const snap = await userRef.once("value");


  let role = "blocked";
  if (email.endsWith("@stu")) role = "user";
  if (!snap.exists()) {
    await userRef.set({
      email: email,
      role: role,
      created: Date.now(),
      online: true,
      timeSpent: 0,
      banned: false
    });
  }
  if (email === "advikmurthy12@gmail.com") role = "admin";

  // Optional Chromebook redirect
  const chromeb = window.isChromebook ? isChromebook() : false;
  if ((role === "user" || role === "blocked") && !chromeb) {
    alert("This account requires a Chromebook.");
    console.log("blocked for chromebook")
    await userRef.update({ role: "blocked" });
    window.location.replace("https://www.youtube.com/watch?v=8ELbX5CMomE");
  }

  return role;
}

async function emailSignup(email, password) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  return await handleLogin(cred.user);
}

async function emailLogin(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return await handleLogin(cred.user);
}

async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const res = await auth.signInWithPopup(provider);
  return await handleLogin(res.user);
}

const logout = () => auth.signOut();



// Export functions globally
window.handleLogin = handleLogin;
window.emailSignup = emailSignup;
window.emailLogin = emailLogin;
window.googleLogin = googleLogin;
window.logout = logout;
window.onUserChange = onUserChange;
