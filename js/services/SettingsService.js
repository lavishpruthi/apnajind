import { Api } from "./Api.js";
import { AuthService } from "./AuthService.js";

export class SettingsService {
  static public() { return Api.request("settings", {}, "GET", { silent: true }); }
  static save(data) { return Api.request("settingsSave", { ...data, token: AuthService.token }); }
}
