/** Shared constants and base error type. Script property required: ADMIN_PASSWORD (used once by setup()). */
const CFG = { CACHE_SEC: 300, TOKEN_HOURS: { m: 72, s: 8, c: 168 } };
/** Permission catalogue. Roles store a comma-separated subset; '*' means everything. */
const PERMS = {
  "business.approve": "Approve / reject / feature businesses",
  "code.manage": "Manage code master",
  "role.manage": "Manage roles",
  "user.manage": "Manage users",
  "settings.manage": "Manage support contact details",
  "events.manage": "Manage Jind events and reviews",
};
/** Errors safe to show to end users. Anything else is logged and masked. */
class AppError extends Error {}
const isOn_ = (v) => v === true || v === "TRUE" || v === "true";
const clean_ = (v, n) =>
  String(v == null ? "" : v)
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, n);
