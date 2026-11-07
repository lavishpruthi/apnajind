const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Replace with the local API URL used by your development environment. */
const LOCAL_API_URL = "https://script.google.com/macros/s/AKfycbxV1QKhpU7JikhsjRjBcKtbFQfFjFv__tCsC1OL-jreBOpdk4yXCudOvSuMKv0-z-Uo/exec";

/** Configure the production Apps Script Web App (/exec) URL. */
const PRODUCTION_API_URL =
  "https://script.google.com/macros/s/AKfycbyc9pF6PkBp381t6Z5EjG7NDUwCwu-BPnFO1eFMIj8xRBNKH8r564Cs0zmJY9ef-fuc/exec";

export const CONFIG = {
  API_URL: LOCAL_HOSTS.has(window.location.hostname)
    ? LOCAL_API_URL
    : PRODUCTION_API_URL,
};
