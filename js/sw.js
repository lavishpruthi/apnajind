const CACHE = "apnajind-shell-v57";
const SHELL = [
  "./",
  "./index.html",
  "./js/main.js",
  "./js/config.js",
  "./manifest.json",
  "./icons/app-icon.svg",
  ...["arrow-left", "bag", "basket", "bed", "book", "briefcase", "building", "calendar", "cake", "car", "check", "chevron-left", "chevron-right", "copy", "dumbbell", "edit", "flag", "hammer", "heart", "home", "instagram", "key", "list", "logout", "mandi", "party", "phone", "pin", "plus", "scissors", "search", "share", "shield", "sofa", "store", "tag", "trash", "users", "utensils", "wrench", "x"].map((name) => `./icons/${name}.svg`),
  "./css/base.css",
  "./css/components.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // API, maps and fonts always go to the network.
  if (url.origin !== self.location.origin) return;

  // Pages: network first so updates show up, cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }

  // Static files: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
