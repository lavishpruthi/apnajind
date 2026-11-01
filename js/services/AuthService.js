import { Api } from "./Api.js";
import { SessionStore } from "./SessionStore.js";

const TOKEN_KEY = "apnajind_staff_token";
const PROFILE_KEY = "apnajind_staff_profile";
const CUSTOMER_TOKEN_KEY = "apnajind_customer_token";
const CUSTOMER_PROFILE_KEY = "apnajind_customer_profile";
const MERCHANT_TOKEN_KEY = "apnajind_merchant_token";

export class AuthService {
  static token = sessionStorage.getItem(TOKEN_KEY) || "";
  static profile = AuthService.readProfile();

  static readProfile() {
    try {
      return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || "null");
    } catch {
      sessionStorage.removeItem(PROFILE_KEY);
      return null;
    }
  }

  static get loggedIn() {
    return Boolean(AuthService.token && AuthService.profile);
  }

  static async restore() {
    if (!AuthService.token) return false;
    const hadProfile = Boolean(AuthService.profile);
    try {
      AuthService.profile = await Api.request("me", {
        token: AuthService.token,
      });
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify(AuthService.profile));
      if (!hadProfile) window.dispatchEvent(new Event("apnajind:authchange"));
      return true;
    } catch (error) {
      if (error.message === "Session expired. Please log in again.") {
        AuthService.logout();
        return false;
      }
      throw error;
    }
  }

  static async login(identity, password) {
    const result = await Api.request("login", { identity, password });
    SessionStore.remove(CUSTOMER_TOKEN_KEY);
    SessionStore.remove(CUSTOMER_PROFILE_KEY);
    SessionStore.remove(MERCHANT_TOKEN_KEY);
    AuthService.token = result.token;
    AuthService.profile = result.profile;
    sessionStorage.setItem(TOKEN_KEY, result.token);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(result.profile));
    window.dispatchEvent(new Event("apnajind:authchange"));
    return result.profile;
  }

  static logout() {
    AuthService.token = "";
    AuthService.profile = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event("apnajind:authchange"));
  }

  static can(permission) {
    const permissions = AuthService.profile?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  }
}
