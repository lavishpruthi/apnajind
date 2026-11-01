/** Hashing, signed expiring tokens and permission checks. */
class Auth {
  static secret() {
    const p = PropertiesService.getScriptProperties();
    let s = p.getProperty("SECRET");
    if (!s) {
      s = Utilities.getUuid() + Utilities.getUuid();
      p.setProperty("SECRET", s);
    }
    return s;
  }
  static hash(v, salt) {
    return Utilities.base64Encode(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        v + ":" + salt + ":" + Auth.secret(),
      ),
    );
  }
  static sign(kind, sub) {
    const p =
      kind + "|" + sub + "|" + (Date.now() + CFG.TOKEN_HOURS[kind] * 3600000);
    return (
      Utilities.base64EncodeWebSafe(p) +
      "." +
      Utilities.base64EncodeWebSafe(
        Utilities.computeHmacSha256Signature(p, Auth.secret()),
      )
    );
  }
  static verify(tok, kind) {
    try {
      const [b, sig] = String(tok).split("."),
        p = Utilities.newBlob(
          Utilities.base64DecodeWebSafe(b),
        ).getDataAsString(),
        parts = p.split("|"),
        k = parts.shift(),
        exp = parts.pop(),
        sub = parts.join("|");
      if (
        k === kind &&
        Number(exp) > Date.now() &&
        Utilities.base64EncodeWebSafe(
          Utilities.computeHmacSha256Signature(p, Auth.secret()),
        ) === sig
      )
        return sub;
    } catch (e) {}
    throw new AppError("Session expired. Please log in again.");
  }
  /** Returns {user, role, perms}; throws if the staff user lacks `perm` (pass null for any staff). */
  static staff(token, perm) {
    const u = new UserRepo().find(Auth.verify(token, "s"));
    if (!u || u.status !== "active")
      throw new AppError("Session expired. Please log in again.");
    const role = new RoleRepo().find(u.roleId),
      perms = role ? String(role.permissions).split(",").filter(Boolean) : [];
    if (perm && !perms.includes("*") && !perms.includes(perm))
      throw new AppError("You do not have permission for this action");
    return { user: u, role, perms };
  }
  static customer(token) {
    const customer = new CustomerRepo().find(Auth.verify(token, "c"));
    if (!customer || customer.status !== "active")
      throw new AppError("Session expired. Please log in again.");
    return customer;
  }
}
