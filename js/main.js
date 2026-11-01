import { CONFIG } from "./config.js";
import { $ } from "./core/Dom.js";
import { icon } from "./core/Icons.js";
import { Loader } from "./core/Loader.js";
import { Toast } from "./core/Toast.js";
import { Router } from "./core/Router.js";
import { HomeView } from "./views/HomeView.js";
import { FoodView } from "./views/FoodView.js";
import { DetailView } from "./views/DetailView.js";
import { MerchantView } from "./views/MerchantView.js";
import { AdminView } from "./views/AdminView.js";
import { AuthService } from "./services/AuthService.js";
import { CustomerService } from "./services/CustomerService.js";
import { AccessView } from "./views/AccessView.js";
import { ProfileView } from "./views/ProfileView.js";
import { SavedView } from "./views/SavedView.js";
import { BusinessService } from "./services/BusinessService.js";
import { Locale } from "./core/Locale.js";

const MERCHANT_TOKEN = "apnajind_merchant_token";
const RECENT_SEARCHES_KEY = "apnajind_recent_searches_v1";

function renderRecentSearches() {
  let searches = [];
  try { searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]"); } catch { /* Ignore invalid local data. */ }
  const suggestions = $("#searchSuggestions");
  if (suggestions) suggestions.innerHTML = searches.map((term) => `<option value="${String(term).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[char])}"></option>`).join("");
}

function saveRecentSearch(term) {
  try {
    const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([term, ...searches.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 6)));
  } catch { /* Search still works if storage is unavailable. */ }
  renderRecentSearches();
}

function currentRole() {
  if (AuthService.loggedIn) return "admin";
  if (CustomerService.loggedIn) return "customer";
  if (sessionStorage.getItem(MERCHANT_TOKEN)) return "merchant";
  return "guest";
}

function updateRoleShell() {
  document.documentElement.lang = Locale.language;
  const role = currentRole();
  const routes = {
    customer: [
      ["home", Locale.t("home"), "#/", "home"],
      ["food", Locale.t("food"), "#/food", "utensils"],
      ["saved", Locale.t("saved"), "#/saved", "heart"],
      ["profile", Locale.t("profile"), "#/profile", "users"],
    ],
    merchant: [["merchant", "My business", "#/merchant", "store"]],
    admin: [["admin", "Admin", "#/admin", "shield"]],
  };
  $("#nav").hidden = role === "guest";
  $("#nav").innerHTML = (routes[role] || [])
    .map(
      ([key, label, href, glyph]) =>
        `<a href="${href}" data-nav="${key}">${icon(glyph)}${label}</a>`,
    )
    .join("");
  $("#searchForm").hidden = role !== "customer";
  $("#q").placeholder = Locale.language === "hi" ? "दुकान, खाना, डॉक्टर या इलाका खोजें" : "Search shop, food, doctor, area";
  const logout = $("#sessionLogout");
  const language = $("#languageToggle");
  language.textContent = Locale.language === "hi" ? "English" : "हिन्दी";
  language.setAttribute("aria-label", Locale.language === "hi" ? "Switch language to English" : "भाषा हिंदी में बदलें");
  logout.hidden = role === "guest";
  logout.innerHTML = `${icon("logout")}<span>Log out</span>`;
}

/** Application bootstrap: wires core services, nav, routes and the service worker. */
class App {
  static async start() {
    Loader.init($("#loader"));
    Toast.init($("#toast"));
    updateRoleShell();
    renderRecentSearches();
    let installPrompt = null;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      $("#installApp").hidden = false;
    });
    $("#installApp").addEventListener("click", async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      $("#installApp").hidden = true;
    });
    $("#sessionLogout").addEventListener("click", () => {
      const role = currentRole();
      if (role === "admin") AuthService.logout();
      else if (role === "customer") CustomerService.logout();
      else if (role === "merchant") {
        sessionStorage.removeItem(MERCHANT_TOKEN);
        window.dispatchEvent(new Event("apnajind:authchange"));
      }
      location.hash = "#/auth";
    });
    $("#languageToggle").addEventListener("click", () => {
      Locale.toggle();
      updateRoleShell();
      App.router?.route();
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      $("#installApp").hidden = true;
    });
    window.addEventListener("apnajind:authchange", () => {
      updateRoleShell();
      App.router?.route();
    });
    window.addEventListener("apnajind:directoryupdated", () => {
      const route = location.hash.split("?")[0];
      if (currentRole() === "customer" && (route === "#/" || route === "#" || route === "#/food" || route === "#/saved" || route.startsWith("#/c/") || route.startsWith("#/s/"))) App.router?.route();
    });
    ["online", "offline"].forEach((eventName) => window.addEventListener(eventName, () => {
      BusinessService.offline = eventName === "offline";
      if (eventName === "online") BusinessService.lastRefreshFailedAt = 0;
      const route = location.hash.split("?")[0];
      if (currentRole() === "customer" && (route === "#/" || route === "#" || route === "#/food" || route === "#/saved" || route.startsWith("#/c/") || route.startsWith("#/s/"))) App.router?.route();
    }));
    $("#searchForm").onsubmit = (e) => {
      e.preventDefault();
      const q = $("#q").value.trim();
      if (q) {
        saveRecentSearch(q);
        location.hash = "#/s/" + encodeURIComponent(q);
      }
    };
    if (!CONFIG.API_URL) {
      $("#app").innerHTML =
        '<div class="empty"><h1>Almost there</h1>Set <b>API_URL</b> in <code>js/config.js</code> to your Apps Script web app URL.</div>';
      return;
    }
    if (!location.hash) {
      const destination =
        currentRole() === "customer"
          ? "#/"
          : currentRole() === "merchant"
            ? "#/merchant"
            : currentRole() === "admin"
              ? "#/admin"
              : "#/auth";
      location.hash = destination;
    }
    App.router = new Router($("#app"))
      .setRoleResolver(currentRole)
      .add("auth(?:/(login|admin|register))?", AccessView, "guest")
      .add("", HomeView)
      .add("c/.+", HomeView)
      .add("s/.+", HomeView)
      .add("food", FoodView)
      .add("saved", SavedView)
      .add("profile", ProfileView)
      .add("b/(.+)", DetailView)
      .add("merchant/login", AccessView, "guest")
      .add("merchant/(new)", MerchantView, "guest")
      .add("merchant/(login)", MerchantView, "guest")
      .add("merchant", MerchantView, "merchant")
      .add("admin(?:/(\\w+))?", AdminView);
    App.router.start();
    AuthService.restore().catch((error) => Toast.show(error.message));
    CustomerService.restore().catch((error) => Toast.show(error.message));
    if ("serviceWorker" in navigator)
      addEventListener("load", () =>
        navigator.serviceWorker.register("sw.js").catch(() => {}),
      );
  }

  static router = null;
}
App.start();
