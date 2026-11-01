/** Entry points + route table. To add an endpoint: write a service method, add one line here.
 *  perm: undefined = public | null = any logged-in staff | 'x.y' = staff with permission. Merchant routes verify their own token. */
const ROUTES = {
  list: { fn: () => BusinessService.list() },
  get: { fn: (d) => BusinessService.get(d) },
  codes: { fn: () => CodeService.publicCodes() },
  register: { fn: (d) => BusinessService.register(d) },
  mLogin: { fn: (d) => BusinessService.login(d) },
  mMine: { fn: (d) => BusinessService.mine(d) },
  mPinChange: { fn: (d) => MerchantPinService.change(d) },
  mSave: { fn: (d) => BusinessService.save(d) },
  login: { fn: (d) => AuthService.login(d) },
  me: { perm: null, fn: (d, c) => AuthService.profile(c) },
  customerRegister: { fn: (d) => CustomerAuthService.register(d) },
  customerLogin: { fn: (d) => CustomerAuthService.login(d) },
  customerMe: {
    auth: "customer",
    fn: (d, c) => CustomerAuthService.profile(c),
  },
  report: { auth: "customer", fn: (d, c) => BusinessService.report(d, c) },
  bList: { perm: "business.approve", fn: () => BusinessService.adminList() },
  bSet: { perm: "business.approve", fn: (d) => BusinessService.adminSet(d) },
  bPinGenerate: {
    perm: "business.approve",
    fn: (d) => MerchantPinService.adminGenerate(d),
  },
  reportList: {
    perm: "business.approve",
    fn: () => BusinessService.reportList(),
  },
  reportSet: {
    perm: "business.approve",
    fn: (d) => BusinessService.reportSet(d),
  },
  ctList: { perm: "code.manage", fn: () => CodeService.typeList() },
  ctSave: { perm: "code.manage", fn: (d) => CodeService.typeSave(d) },
  ctDelete: { perm: "code.manage", fn: (d) => CodeService.typeDelete(d) },
  cList: { perm: "code.manage", fn: (d) => CodeService.list(d) },
  cSave: { perm: "code.manage", fn: (d) => CodeService.save(d) },
  cDelete: { perm: "code.manage", fn: (d) => CodeService.remove(d) },
  rList: { perm: "role.manage", fn: () => RoleService.list() },
  rSave: { perm: "role.manage", fn: (d) => RoleService.save(d) },
  rDelete: { perm: "role.manage", fn: (d) => RoleService.remove(d) },
  uList: { perm: "user.manage", fn: () => UserService.list() },
  uSave: { perm: "user.manage", fn: (d, c) => UserService.save(d, c) },
  uDelete: { perm: "user.manage", fn: (d, c) => UserService.remove(d, c) },
};
const SERIALIZED_ACTIONS = new Set([
  "register",
  "mSave",
  "mLogin",
  "mPinChange",
  "customerRegister",
  "report",
  "bSet",
  "bPinGenerate",
  "reportSet",
  "ctSave",
  "ctDelete",
  "cSave",
  "cDelete",
  "rSave",
  "rDelete",
  "uSave",
  "uDelete",
]);
const GET_ACTIONS = new Set(["list", "get", "codes"]);
function dispatch_(action, d) {
  const r = Object.prototype.hasOwnProperty.call(ROUTES, action)
    ? ROUTES[action]
    : null;
  if (!r) throw new AppError("Unknown action");
  if (r.auth === "customer") return r.fn(d, Auth.customer(d.token));
  return r.fn(d, r.perm === undefined ? null : Auth.staff(d.token, r.perm));
}
function respond_(fn) {
  let body;
  try {
    body = { ok: true, data: fn() };
  } catch (e) {
    if (!(e instanceof AppError)) console.error(e.stack || e);
    body = {
      ok: false,
      error:
        e instanceof AppError
          ? e.message
          : "Something went wrong. Please try again.",
    };
  }
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function doGet(e) {
  return respond_(() => {
    const action = e && e.parameter && e.parameter.action;
    if (!GET_ACTIONS.has(action))
      throw new AppError("This action requires a secure POST request.");
    return dispatch_(action, e.parameter);
  });
}
function doPost(e) {
  return respond_(() => {
    if (!e || !e.postData || !e.postData.contents)
      throw new AppError("Request body is required.");
    if (e.postData.contents.length > 8000000)
      throw new AppError(
        "Request is too large. Reduce the size of your photos.",
      );
    let d;
    try {
      d = JSON.parse(e.postData.contents);
    } catch (_) {
      throw new AppError("Request body must be valid JSON.");
    }
    if (!d || typeof d !== "object" || Array.isArray(d))
      throw new AppError("Invalid request body.");
    if (!SERIALIZED_ACTIONS.has(d.action)) return dispatch_(d.action, d);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return dispatch_(d.action, d);
    } finally {
      lock.releaseLock();
    }
  });
}
