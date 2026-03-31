export async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  const registration = await navigator.serviceWorker.register("/scramjet.sw.js", {
    scope: "/",
  });

  console.log("[register-sw] Registered with scope:", registration.scope);

  if (registration.installing) {
    await new Promise((resolve, reject) => {
      registration.installing.addEventListener("statechange", function handler(e) {
        if (e.target.state === "activated") {
          this.removeEventListener("statechange", handler);
          resolve();
        }
        if (e.target.state === "redundant") {
          this.removeEventListener("statechange", handler);
          reject(new Error("Service worker became redundant during install."));
        }
      });
    });
  }

  await navigator.serviceWorker.ready;
  console.log("[register-sw] Service worker is ready.");
}