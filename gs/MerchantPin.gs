/** Server-side temporary PIN issuance, merchant PIN changes and attempt throttling. */
class MerchantPinService {
  static generate_() {
    let digits = "";
    while (digits.length < 6) digits += Utilities.getUuid().replace(/\D/g, "");
    return digits.slice(0, 6);
  }

  static issue_(phone) {
    const pin = MerchantPinService.generate_();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
      pin,
      pinHash: Auth.hash(pin, String(phone)),
      pinExpiresAt: expiresAt,
      pinChangeRequired: true,
    };
  }

  static token_(phone, version, rememberMe) {
    return Auth.sign(
      "m",
      String(phone) + "|" + String(Number(version) || 0),
      rememberMe,
    );
  }

  static checkAttempts_(phone) {
    const key = "merchant_pin_attempt_" + String(phone);
    const attempts = Number(CacheService.getScriptCache().get(key) || 0);
    if (attempts >= 10)
      throw new AppError(
        "Too many PIN attempts. Please wait 15 minutes and try again.",
      );
  }

  static failedAttempt_(phone) {
    const cache = CacheService.getScriptCache();
    const key = "merchant_pin_attempt_" + String(phone);
    cache.put(key, String(Number(cache.get(key) || 0) + 1), 900);
  }

  static clearAttempts_(phone) {
    CacheService.getScriptCache().remove(
      "merchant_pin_attempt_" + String(phone),
    );
  }

  static adminGenerate(d) {
    const repo = new BusinessRepo();
    const business = repo.find(d.id);
    if (!business) throw new AppError("Business listing not found.");
    const issued = MerchantPinService.issue_(business.phone);
    const version = (Number(business.pinVersion) || 0) + 1;
    repo.update(business.id, {
      pinHash: issued.pinHash,
      pinExpiresAt: issued.pinExpiresAt,
      pinChangeRequired: true,
      pinVersion: version,
    });
    MerchantPinService.clearAttempts_(business.phone);
    return {
      pin: issued.pin,
      expiresAt: issued.pinExpiresAt,
      phone: String(business.phone),
      whatsapp: String(business.whatsapp || business.phone),
      businessName: String(business.name),
    };
  }

  static change(d) {
    const subject = Auth.verify(d.token, "m");
    const parts = subject.split("|");
    const phone = parts[0];
    const repo = new BusinessRepo();
    const business = repo
      .all()
      .find((record) => String(record.phone) === phone);
    if (!business) throw new AppError("Merchant listing not found.");
    const tokenVersion = parts.length > 1 ? Number(parts[1]) : 0;
    if (tokenVersion !== (Number(business.pinVersion) || 0))
      throw new AppError("Your session was reset. Please sign in again.");
    MerchantPinService.checkAttempts_(phone);

    const oldPin = String(d.oldPin || "");
    const newPin = String(d.newPin || "");
    const confirmPin = String(d.confirmPin || "");
    if (!/^\d{6}$/.test(newPin))
      throw new AppError("Choose a new 6-digit PIN.");
    if (newPin !== confirmPin)
      throw new AppError("The new PIN entries do not match.");
    if (
      !/^\d{4,6}$/.test(oldPin) ||
      business.pinHash !== Auth.hash(oldPin, phone)
    ) {
      MerchantPinService.failedAttempt_(phone);
      Utilities.sleep(500);
      throw new AppError("Your current PIN is incorrect.");
    }
    if (
      business.pinExpiresAt &&
      new Date(business.pinExpiresAt).getTime() <= Date.now()
    )
      throw new AppError(
        "Your temporary PIN expired. Ask an admin to generate a new one.",
      );

    const nextVersion = (Number(business.pinVersion) || 0) + 1;
    repo.update(business.id, {
      pinHash: Auth.hash(newPin, phone),
      pinExpiresAt: "",
      pinChangeRequired: false,
      pinVersion: nextVersion,
    });
    MerchantPinService.clearAttempts_(phone);
    return {
      token: MerchantPinService.token_(phone, nextVersion, isOn_(d.rememberMe)),
      pinChangeRequired: false,
    };
  }
}
