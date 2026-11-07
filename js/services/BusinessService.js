import { Api } from "./Api.js";
import { AuthService } from "./AuthService.js";

export class BusinessService {
  static cacheKey = "apnajind_public_businesses_v1";
  static offline = false;
  static usingSavedCopy = false;
  static refreshing = null;
  static lastRefreshFailedAt = 0;

  static readCache() {
    try {
      const entry = JSON.parse(localStorage.getItem(BusinessService.cacheKey) || "null");
      return Array.isArray(entry?.items) ? entry : null;
    } catch { return null; }
  }

  static writeCache(items) {
    try { localStorage.setItem(BusinessService.cacheKey, JSON.stringify({ savedAt: Date.now(), items })); } catch { /* Cache is optional on devices with limited storage. */ }
  }

  static refreshList() {
    if (!BusinessService.refreshing) {
      BusinessService.refreshing = Api.request("list", {}, "GET", { silent: true })
        .then((items) => {
          BusinessService.writeCache(items);
          BusinessService.offline = false;
          BusinessService.usingSavedCopy = false;
          BusinessService.lastRefreshFailedAt = 0;
          window.dispatchEvent(new Event("apnajind:directoryupdated"));
          return items;
        })
        .catch(() => {
          BusinessService.offline = true;
          BusinessService.lastRefreshFailedAt = Date.now();
          window.dispatchEvent(new Event("apnajind:directoryupdated"));
          return null;
        })
        .finally(() => { BusinessService.refreshing = null; });
    }
    return BusinessService.refreshing;
  }

  static async list() {
    const cached = BusinessService.readCache();
    if (!navigator.onLine && !cached) throw new Error("You’re offline and no saved business listings are available yet.");
    if (cached && BusinessService.lastRefreshFailedAt && Date.now() - BusinessService.lastRefreshFailedAt < 60000) {
      BusinessService.offline = true;
      BusinessService.usingSavedCopy = true;
      return cached.items;
    }
    if (cached && !navigator.onLine) {
      BusinessService.offline = true;
      BusinessService.usingSavedCopy = true;
      return cached.items;
    }
    if (cached && Date.now() - cached.savedAt < 30000) {
      BusinessService.offline = false;
      BusinessService.usingSavedCopy = false;
      return cached.items;
    }
    if (cached) {
      BusinessService.offline = false;
      BusinessService.usingSavedCopy = true;
      void BusinessService.refreshList();
      return cached.items;
    }
    try {
      const items = await Api.request("list", {}, "GET");
      BusinessService.writeCache(items);
      BusinessService.offline = false;
      BusinessService.usingSavedCopy = false;
      return items;
    } catch (error) {
      if (cached) {
        BusinessService.offline = true;
        BusinessService.usingSavedCopy = true;
        return cached.items;
      }
      throw error;
    }
  }

  static async get(id) {
    const cached = BusinessService.readCache();
    if (!navigator.onLine && cached) {
      const item = cached.items.find((business) => String(business.id) === String(id));
      if (item) { BusinessService.offline = true; BusinessService.usingSavedCopy = true; return item; }
    }
    try {
      const business = await Api.request("get", { id }, "GET");
      if (cached) {
        const items = cached.items.filter((item) => String(item.id) !== String(id));
        BusinessService.writeCache([...items, business]);
      }
      BusinessService.offline = false;
      BusinessService.usingSavedCopy = false;
      return business;
    } catch (error) {
      const item = cached?.items.find((business) => String(business.id) === String(id));
      if (item) { BusinessService.offline = true; BusinessService.usingSavedCopy = true; return item; }
      throw error;
    }
  }
  static register(data) {
    return Api.request("register", data);
  }
  static login(phone, pin, rememberMe = false) {
    return Api.request("mLogin", { phone, pin, rememberMe });
  }
  static mine(token) {
    return Api.request("mMine", { token });
  }
  static save(data, token) {
    return Api.request("mSave", { ...data, token });
  }
  static adminList() {
    return Api.request("bList", { token: AuthService.token });
  }
  static adminSet(data) {
    return Api.request("bSet", { ...data, token: AuthService.token });
  }
  static adminPasswordRequests() {
    return Api.request("pwResetList", { token: AuthService.token });
  }
  static adminGeneratePassword(id) {
    return Api.request("pwResetGenerate", { id, token: AuthService.token });
  }
  static adminReports() {
    return Api.request("reportList", { token: AuthService.token });
  }
  static adminSetReport(data) {
    return Api.request("reportSet", { ...data, token: AuthService.token });
  }
  static report(data, token) {
    return Api.request("report", { ...data, token });
  }
}
