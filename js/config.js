const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Replace with the local API URL used by your development environment. */
const LOCAL_API_URL = "https://script.google.com/macros/s/AKfycbxV1QKhpU7JikhsjRjBcKtbFQfFjFv__tCsC1OL-jreBOpdk4yXCudOvSuMKv0-z-Uo/exec";

/** Configure the production Apps Script Web App (/exec) URL. */
const PRODUCTION_API_URL =
  "https://script.google.com/macros/s/AKfycbyvNAZ9PFeNAIXxOL0unpXtoTZF7M53FdFFuZxH0bysikIcgzRSAzryBeXBwjMeH13w/exec";

export const CONFIG = {
  API_URL: LOCAL_HOSTS.has(window.location.hostname)
    ? LOCAL_API_URL
    : PRODUCTION_API_URL,
};
