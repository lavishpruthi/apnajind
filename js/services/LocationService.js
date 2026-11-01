const CACHE_KEY = "apnajind_location_lookup_v1";
const GEOCODER = "https://nominatim.openstreetmap.org";

export class LocationService {
  static lastRequestAt = 0;
  static queue = Promise.resolve();

  static async search(query) {
    const cleanQuery = String(query || "").trim().slice(0, 120);
    if (cleanQuery.length < 3) throw new Error("Enter at least 3 characters to search for a place.");
    return LocationService.lookup(`search:${cleanQuery.toLocaleLowerCase()}`, async () => {
      const params = new URLSearchParams({ q: `${cleanQuery}, Jind, Haryana, India`, format: "jsonv2", addressdetails: "1", limit: "1", countrycodes: "in", "accept-language": document.documentElement.lang || "en" });
      const response = await LocationService.fetch(`${GEOCODER}/search?${params}`);
      if (!response.ok) throw new Error("Location search is temporarily unavailable. Try again or enter the address manually.");
      const results = await response.json();
      if (!Array.isArray(results) || !results.length) throw new Error("No matching place found. Try a nearby landmark or area name.");
      return LocationService.normalize(results[0]);
    });
  }

  static async reverse(lat, lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Could not read those coordinates.");
    const cacheKey = `reverse:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    return LocationService.lookup(cacheKey, async () => {
      const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: "jsonv2", addressdetails: "1", "accept-language": document.documentElement.lang || "en" });
      const response = await LocationService.fetch(`${GEOCODER}/reverse?${params}`);
      if (!response.ok) throw new Error("We found your coordinates, but couldn’t look up the address. You can enter it manually.");
      const result = await response.json();
      if (!result?.display_name) throw new Error("We found your coordinates, but couldn’t look up the address. You can enter it manually.");
      return LocationService.normalize(result);
    });
  }

  static async lookup(key, load) {
    const task = LocationService.queue.then(async () => {
      const cache = LocationService.readCache();
      if (cache[key]) return cache[key];
      const wait = Math.max(0, 1200 - (Date.now() - LocationService.lastRequestAt));
      if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
      LocationService.lastRequestAt = Date.now();
      const value = await load();
      cache[key] = value;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(Object.entries(cache).slice(-30)))); } catch { /* Geocoder cache is optional. */ }
      return value;
    });
    LocationService.queue = task.catch(() => {});
    return task;
  }

  static async fetch(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try { return await fetch(url, { headers: { Accept: "application/json" }, referrerPolicy: "strict-origin-when-cross-origin", signal: controller.signal }); }
    catch (error) { if (error.name === "AbortError") throw new Error("Location lookup took too long. Try again or enter the address manually."); throw error; }
    finally { window.clearTimeout(timeout); }
  }

  static readCache() {
    try { const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
    catch { return {}; }
  }

  static normalize(result) {
    const lat = Number(result?.lat);
    const lng = Number(result?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("The selected place did not include map coordinates.");
    return { lat: lat.toFixed(6), lng: lng.toFixed(6), address: String(result.display_name || "").slice(0, 200), parts: result.address || {} };
  }
}
