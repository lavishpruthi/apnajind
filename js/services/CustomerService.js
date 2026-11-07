import { Api } from "./Api.js";
import { AuthService } from "./AuthService.js";
import { SessionStore } from "./SessionStore.js";

const TOKEN_KEY = "apnajind_customer_token";
const PROFILE_KEY = "apnajind_customer_profile";
const MERCHANT_TOKEN_KEY = "apnajind_merchant_token";

export class CustomerService {
  static token = SessionStore.read(TOKEN_KEY);
  static profile = CustomerService.readProfile();

  static readProfile() {
    try {
      return SessionStore.readJSON(PROFILE_KEY);
    } catch {
      sessionStorage.removeItem(PROFILE_KEY);
      return null;
    }

  }

  static get loggedIn() {
    return Boolean(CustomerService.token && CustomerService.profile);
  }

  static async restore() {
    if (!CustomerService.token) return false;
    const hadProfile = Boolean(CustomerService.profile);
    try {
      CustomerService.profile = await Api.request("customerMe", {
        token: CustomerService.token,
      });
      SessionStore.write(
        PROFILE_KEY,
        JSON.stringify(CustomerService.profile),
        SessionStore.persistent(TOKEN_KEY),
      );
      if (!hadProfile) window.dispatchEvent(new Event("apnajind:authchange"));
      return true;
    } catch (error) {
      if (error.message === "Session expired. Please log in again.") {
        CustomerService.logout();
        return false;
      }
      throw error;
    }
  }

  static async login(identity, password, rememberMe = false) {
    const result = await Api.request("customerLogin", { identity, password, rememberMe });
    AuthService.logout();
    SessionStore.remove(MERCHANT_TOKEN_KEY);
    CustomerService.setSession(result, rememberMe);
    return CustomerService.profile;
  }

  static async register(data) {
    const rememberMe = Boolean(data.rememberMe);
    const result = await Api.request("customerRegister", data);
    AuthService.logout();
    SessionStore.remove(MERCHANT_TOKEN_KEY);
    CustomerService.setSession(result, rememberMe);
    return CustomerService.profile;
  }

  static resetRequest(identity) {
    return Api.request("customerResetRequest", { identity });
  }

  static async deleteAccount(password) {
    await Api.request("customerDelete", { token: CustomerService.token, password });
    CustomerService.logout(false);
  }

  static setSession(result, rememberMe = false) {
    CustomerService.token = result.token;
    CustomerService.profile = result.profile;
    SessionStore.write(TOKEN_KEY, result.token, rememberMe);
    const persistent = SessionStore.persistent(TOKEN_KEY);
    SessionStore.write(PROFILE_KEY, JSON.stringify(result.profile), persistent);
    window.dispatchEvent(new Event("apnajind:authchange"));
  }

  static logout(notify = true) {
    CustomerService.token = "";
    CustomerService.profile = null;
    SessionStore.remove(TOKEN_KEY);
    SessionStore.remove(PROFILE_KEY);
    if (notify) window.dispatchEvent(new Event("apnajind:authchange"));
  }
}

window.addEventListener("apnajind:authchange", () => {
  if (!SessionStore.read(TOKEN_KEY)) {
    CustomerService.token = "";
    CustomerService.profile = null;
  }
});
