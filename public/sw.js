importScripts("/k12/portal/math.js?v=3");

var sw = (function () {
  var m = $scramjetLoadWorker();
  return new m.ScramjetServiceWorker();
})();

self.addEventListener("fetch", function (e) {
  e.respondWith((async function () {
    await sw.loadConfig();
    if (sw.route(e)) return sw.fetch(e);
    return fetch(e.request);
  })());
});
