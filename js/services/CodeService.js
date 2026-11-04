import { Api } from "./Api.js";

export class CodeService {
  static cache = null;
  static loading = null;
  static offline = false;
  static savedAt = 0;
  static cacheKey = "apnajind_public_codes_v1";
  static refreshInterval = 5 * 60 * 1000;

  static async load() {
    if (!CodeService.cache) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(CodeService.cacheKey) || "null"); } catch { /* Ignore a damaged local cache. */ }
      if (saved?.codes && typeof saved.codes === "object") {
        CodeService.cache = saved.codes;
        CodeService.savedAt = Number(saved.savedAt) || 0;
      }
    }

    if (!navigator.onLine) {
      if (CodeService.cache) {
        CodeService.offline = true;
        return CodeService.cache;
      }
      throw new Error("You’re offline and category data has not been saved on this device yet.");
    }

    if (CodeService.cache && Date.now() - CodeService.savedAt < CodeService.refreshInterval) {
      CodeService.offline = false;
      return CodeService.cache;
    }

    if (!CodeService.loading) {
      CodeService.loading = Api.request("codes", {}, "GET")
        .then((codes) => {
          CodeService.cache = codes;
          CodeService.savedAt = Date.now();
          CodeService.offline = false;
          try { localStorage.setItem(CodeService.cacheKey, JSON.stringify({ savedAt: Date.now(), codes })); } catch { /* Cache is optional. */ }
          return codes;
        })
        .catch((error) => {
          if (CodeService.cache) { CodeService.offline = true; return CodeService.cache; }
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
    CodeService.savedAt = 0;
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
