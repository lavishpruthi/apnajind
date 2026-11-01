import { Api } from "./Api.js";

export class CodeService {
  static cache = null;
  static loading = null;
  static offline = false;
  static cacheKey = "apnajind_public_codes_v1";

  static async load() {
    if (CodeService.cache) { CodeService.offline = !navigator.onLine; return CodeService.cache; }
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(CodeService.cacheKey) || "null"); } catch { /* Ignore a damaged local cache. */ }
    if (saved?.codes && typeof saved.codes === "object") {
      CodeService.cache = saved.codes;
      CodeService.offline = !navigator.onLine;
      if (navigator.onLine && Date.now() - Number(saved.savedAt || 0) > 86400000) {
        void Api.request("codes", {}, "GET", { silent: true }).then((codes) => {
          CodeService.cache = codes;
          CodeService.offline = false;
          try { localStorage.setItem(CodeService.cacheKey, JSON.stringify({ savedAt: Date.now(), codes })); } catch { /* Cache is optional. */ }
          window.dispatchEvent(new Event("apnajind:directoryupdated"));
        }).catch(() => {});
      }
      return CodeService.cache;
    }
    if (!navigator.onLine) throw new Error("You’re offline and category data has not been saved on this device yet.");
    if (!CodeService.loading) {
      CodeService.loading = Api.request("codes", {}, "GET")
        .then((codes) => {
          CodeService.cache = codes;
          CodeService.offline = false;
          try { localStorage.setItem(CodeService.cacheKey, JSON.stringify({ savedAt: Date.now(), codes })); } catch { /* Cache is optional. */ }
          return codes;
        })
        .catch((error) => {
          if (saved?.codes) { CodeService.cache = saved.codes; CodeService.offline = true; return saved.codes; }
          throw error;
        })
        .finally(() => {
          CodeService.loading = null;
        });
    }
    return CodeService.loading;
  }

  static clear() {
    CodeService.cache = null;
  }

  static list(type) {
    return (CodeService.cache?.[type] || []).filter(
      (code) => code.active !== false,
    );
  }

  static byCode(type, code) {
    return CodeService.list(type).find((item) => item.code === code);
  }
}
