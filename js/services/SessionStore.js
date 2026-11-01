/** Storage helpers for optional persistent customer and merchant sessions. */
export class SessionStore {
  static read(key) {
    try { return localStorage.getItem(key) || sessionStorage.getItem(key) || ""; }
    catch { try { return sessionStorage.getItem(key) || ""; } catch { return ""; } }
  }

  static readJSON(key) {
    const value = SessionStore.read(key);
    if (!value) return null;
    try { return JSON.parse(value); }
    catch { SessionStore.remove(key); return null; }
  }

  static persistent(key) {
    try { return Boolean(localStorage.getItem(key)); }
    catch { return false; }
  }

  static write(key, value, persistent = false) {
    SessionStore.remove(key);
    if (persistent) {
      try { localStorage.setItem(key, value); return true; }
      catch { /* Fall back to a tab session when persistent storage is unavailable. */ }
    }
    sessionStorage.setItem(key, value);
    return false;
  }

  static remove(key) {
    try { localStorage.removeItem(key); } catch { /* Storage may be blocked. */ }
    try { sessionStorage.removeItem(key); } catch { /* Storage may be blocked. */ }
  }
}
