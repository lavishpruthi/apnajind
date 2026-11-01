const CACHE = "apnajind-shell-v40";
const SHELL = [
  "./",
  "./index.html",
  "./js/main.js",
  "./js/config.js",
  "./manifest.json",
  "./icons/app-icon.svg",
  ...["arrow-left", "bag", "bed", "book", "building", "calendar", "cake", "car", "check", "chevron-left", "chevron-right", "copy", "edit", "flag", "heart", "home", "instagram", "key", "list", "logout", "phone", "pin", "plus", "scissors", "search", "share", "shield", "store", "tag", "trash", "users", "utensils", "wrench", "x"].map((name) => `./icons/${name}.svg`),
  "./css/base.css",
  "./css/components.css",
  "./js/core/Dom.js",
  "./js/core/Icons.js",
  "./js/core/Toast.js",
  "./js/core/Loader.js",
  "./js/core/Router.js",
  "./js/core/Hours.js",
  "./js/core/Locale.js",
  "./js/core/Modal.js",
  "./js/services/Api.js",
  "./js/services/AuthService.js",
  "./js/services/CustomerService.js",
  "./js/services/BusinessService.js",
  "./js/services/PinService.js",
  "./js/services/SavedService.js",
  "./js/services/RecentService.js",
  "./js/services/LocationService.js",
  "./js/services/MasterService.js",
  "./js/services/CodeService.js",
  "./js/services/SettingsService.js",
  "./js/services/DiscoveryService.js",
  "./js/services/SessionStore.js",
  "./js/views/BaseView.js",
  "./js/views/HomeView.js",
  "./js/views/FoodView.js",
  "./js/views/DetailView.js",
  "./js/views/MerchantView.js",
  "./js/views/AdminView.js",
  "./js/views/AccessView.js",
  "./js/views/ProfileView.js",
  "./js/views/PromotionView.js",
  "./js/views/ActivityView.js",
  "./js/views/MapView.js",
  "./js/views/EventsView.js",
  "./js/views/SavedView.js",
  "./js/views/admin/SettingsPanel.js",
  "./js/views/admin/CommunityPanel.js",
  "./js/views/admin/ApprovalPanel.js",
  "./js/views/admin/ReportsPanel.js",
  "./js/views/admin/CrudPanel.js",
  "./js/views/admin/CodeMasterPanel.js",
  "./js/views/admin/RolePanel.js",
  "./js/views/admin/UserPanel.js",
];
const SHELL_URLS = new Set(SHELL.map((path) => new URL(path, self.location.href).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (SHELL_URLS.has(request.url)) {
    event.respondWith(caches.match(request).then((cached) => {
      const refresh = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || refresh;
    }));
    return;
  }
  event.respondWith(
    fetch(request)
      .catch(async () => {
        if (request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      }),
  );
});
