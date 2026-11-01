const KEY = "apnajind_saved_businesses";

export class SavedService {
  static list() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value.map(String) : [];
    } catch {
      return [];
    }
  }

  static has(id) {
    return SavedService.list().includes(String(id));
  }

  static toggle(id) {
    const items = SavedService.list();
    const key = String(id);
    const saved = !items.includes(key);
    const next = saved ? [...items, key] : items.filter((item) => item !== key);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new Error("Unable to save this business on this device.");
    }
    window.dispatchEvent(new CustomEvent("apnajind:savedchange", { detail: { id: key, saved } }));
    return saved;
  }
}
