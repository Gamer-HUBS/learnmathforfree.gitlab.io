// ALWAYS LOAD THIS ASAP — make it the first script in <head>.
(function () {
  const originalSetInterval = window.setInterval;
  window.setInterval = function (callback, delay, ...args) {
    const fnStr = callback?.toString?.() || "";
    if (fnStr.includes("content") || fnStr.includes("scan")) {
      console.log("[settings-loader] Blocked suspicious interval");
      return 0;
    }
    return originalSetInterval(callback, delay, ...args);
  };
})();