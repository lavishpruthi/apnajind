import { Api } from "./Api.js";
import { AuthService } from "./AuthService.js";

const TOKEN_KEY = "apnajind_customer_token";
const PROFILE_KEY = "apnajind_customer_profile";
const MERCHANT_TOKEN_KEY = "apnajind_merchant_token";

export class CustomerService {
  static token = sessionStorage.getItem(TOKEN_KEY) || "";
  static profile = CustomerService.readProfile();

  static readProfile() {
    try {
      return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || "null");
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
      sessionStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(CustomerService.profile),
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

  static async login(identity, password) {
    const result = await Api.request("customerLogin", { identity, password });
    AuthService.logout();
    sessionStorage.removeItem(MERCHANT_TOKEN_KEY);
    CustomerService.setSession(result);
    return CustomerService.profile;
  }

  static async register(data) {
    const result = await Api.request("customerRegister", data);
    AuthService.logout();
    sessionStorage.removeItem(MERCHANT_TOKEN_KEY);
    CustomerService.setSession(result);
    return CustomerService.profile;
  }

  static setSession(result) {
    CustomerService.token = result.token;
    CustomerService.profile = result.profile;
    sessionStorage.setItem(TOKEN_KEY, result.token);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(result.profile));
    window.dispatchEvent(new Event("apnajind:authchange"));
  }

  static logout(notify = true) {
    CustomerService.token = "";
    CustomerService.profile = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    if (notify) window.dispatchEvent(new Event("apnajind:authchange"));
  }
}

window.addEventListener("apnajind:authchange", () => {
  if (!sessionStorage.getItem(TOKEN_KEY)) {
    CustomerService.token = "";
    CustomerService.profile = null;
  }
});
