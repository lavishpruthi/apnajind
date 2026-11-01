import { Api } from "./Api.js";
import { AuthService } from "./AuthService.js";

export class PinService {
  static change(token, oldPin, newPin, confirmPin) {
    return Api.request("mPinChange", { token, oldPin, newPin, confirmPin });
  }

  static generateForMerchant(businessId) {
    return Api.request("bPinGenerate", {
      id: businessId,
      token: AuthService.token,
    });
  }

  static expiryLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "within 24 hours";
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  static whatsappUrl(phone, pin, businessName, expiresAt) {
    const digits = String(phone || "").replace(/\D/g, "");
    const number = digits.length === 10 ? `91${digits}` : digits;
    if (!/^91[6-9]\d{9}$/.test(number)) return "";
    const message = `ApnaJind merchant PIN for ${businessName}: ${pin}. It expires on ${PinService.expiryLabel(expiresAt)}. Please change it after your first login.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
}
