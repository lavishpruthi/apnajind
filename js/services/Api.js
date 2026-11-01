import { CONFIG } from "../config.js";
import { Loader } from "../core/Loader.js";

export class Api {
  static async request(action, data = {}, method = "POST", { silent = false } = {}) {
    if (!CONFIG.API_URL)
      throw new Error(
        "The directory API is not configured. Contact your site administrator.",
      );
    const url = new URL(CONFIG.API_URL);
    const options = { method };
    if (method === "GET") {
      url.searchParams.set("action", action);
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null)
          url.searchParams.set(key, String(value));
      });
    } else {
      options.headers = { "Content-Type": "text/plain;charset=utf-8" };
      options.body = JSON.stringify({ action, ...data });
    }

    const request = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 45000);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok)
          throw new Error(`The directory service returned ${response.status}.`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          throw new Error(
            "The endpoint did not return JSON. Use the deployed Apps Script /exec URL.",
          );
        }
        const result = await response.json();
        if (!result.ok)
          throw new Error(result.error || "The request could not be completed.");
        return result.data;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error("The directory service took too long to respond. Please try again.");
        }
        if (error instanceof TypeError) {
          throw new Error(
            "Unable to reach the directory service. Check your connection or contact the site administrator.",
          );
        }
        throw error;
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return silent ? request : Loader.track(request);
  }
}
