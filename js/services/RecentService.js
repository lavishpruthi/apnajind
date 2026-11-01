const KEY = "apnajind_recent_businesses_v1";

export class RecentService {
  static list() {
    try { const value = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value.map(String).slice(0, 20) : []; }
    catch { return []; }
  }
  static add(id) {
    try { localStorage.setItem(KEY, JSON.stringify([String(id), ...RecentService.list().filter((item) => item !== String(id))].slice(0, 20))); } catch { /* Recent history is optional. */ }
  }
}
