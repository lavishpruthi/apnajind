import { esc } from "./Dom.js";
import { Loader } from "./Loader.js";

export class Router {
  constructor(host) {
    this.host = host;
    this.routes = [];
    this.currentView = null;
    this.navigationId = 0;
    this.roleResolver = () => "guest";
    this.handleRoute = () => this.route();
  }

  add(pattern, View, access = View.access || "public") {
    this.routes.push({ expression: new RegExp(`^${pattern}$`), View, access });
    return this;
  }

  setRoleResolver(resolver) {
    this.roleResolver = resolver;
    return this;
  }

  start() {
    window.addEventListener("hashchange", this.handleRoute);
    return this.route();
  }

  async route() {
    const navigationId = ++this.navigationId;
    this.currentView?.destroy?.();
    this.currentView = null;
    const [rawPath] = (location.hash.slice(1) || "/").split("?");
    const path = rawPath.replace(/^\/+|\/+$/g, "");
    if (path === "" || path === "food" || path.startsWith("c/") || path.startsWith("s/"))
      this.lastBrowseHash = location.hash || "#/";
    document.title = "ApnaJind – Jind ka apna directory";
    const match = this.routes
      .map((route) => ({ ...route, match: path.match(route.expression) }))
      .find((route) => route.match);
    if (!match) {
      this.host.innerHTML =
        '<div class="empty">This page could not be found.</div>';
      return;
    }

    const role = this.roleResolver();
    if (match.access !== "public" && match.access !== role) {
      const destination =
        role === "guest"
          ? "#/auth"
          : role === "admin"
            ? "#/admin"
            : role === "merchant"
              ? "#/merchant"
              : "#/";
      if (location.hash !== destination) location.hash = destination;
      return;
    }

    document.querySelectorAll("#nav a").forEach((link) => {
      link.classList.toggle("on", link.dataset.nav === match.View.nav);
    });
    const parameters = match.match
      .slice(1)
      .map((value) => (value ? decodeURIComponent(value) : undefined));
    const stagingHost = document.createElement("div");
    const view = new match.View(stagingHost, ...parameters);
    view.returnHash = this.lastBrowseHash || "#/";
    try {
      await Loader.track(view.render());
      if (navigationId !== this.navigationId) return;
      this.host.replaceChildren(...stagingHost.childNodes);
      view.host = this.host;
      this.currentView = view;
      this.host.focus({ preventScroll: true });
    } catch (error) {
      if (navigationId !== this.navigationId) return;
      const offlineMessage = navigator.onLine ? "Check your connection and try again." : "You’re offline. Reconnect to refresh this page.";
      this.host.innerHTML = `<section class="empty error-state" role="alert"><h1>We couldn’t load this page</h1><p>${esc(error.message || "Your information is still safe.")}</p><p class="meta">${esc(offlineMessage)}</p><button class="btn" type="button" id="retry">Try again</button></section>`;
      this.host.querySelector("#retry").onclick = () => this.route();
    }
  }
}
