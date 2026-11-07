/** Entry points + route table. To add an endpoint: write a service method, add one line here.
 *  perm: undefined = public | null = any logged-in staff | 'x.y' = staff with permission. Merchant routes verify their own token. */
const ROUTES = {
  list: { fn: () => BusinessService.list() },
  get: { fn: (d) => BusinessService.get(d) },
  codes: { fn: () => CodeService.publicCodes() },
  settings: { fn: () => SettingsService.publicSettings() },
  settingsSave: { perm: "settings.manage", fn: (d) => SettingsService.save(d) },
  offers: { fn: (d) => DiscoveryService.offers(d) },
  posts: { fn: (d) => DiscoveryService.posts(d) },
  events: { fn: () => DiscoveryService.events() },
  reviews: { fn: (d) => DiscoveryService.reviews(d) },
  merchantContent: {
    merchant: true,
    fn: (d) => DiscoveryService.merchantContent(d),
  },
  offerSave: { merchant: true, fn: (d) => DiscoveryService.offerSave(d) },
  offerDelete: { merchant: true, fn: (d) => DiscoveryService.offerDelete(d) },
  postSave: { merchant: true, fn: (d) => DiscoveryService.postSave(d) },
  reviewReply: { merchant: true, fn: (d) => DiscoveryService.reviewReply(d) },
  customerReview: {
    auth: "customer",
    fn: (d, c) => DiscoveryService.reviewSave(d, c),
  },
  customerMyReview: {
    auth: "customer",
    fn: (d, c) => DiscoveryService.myReview(d, c),
  },
  customerFollow: {
    auth: "customer",
    fn: (d, c) => DiscoveryService.toggleFollow(d, c),
  },
  customerFollows: {
    auth: "customer",
    fn: (d, c) => DiscoveryService.customerFollows(c),
  },
  customerActivity: {
    auth: "customer",
    fn: (d, c) => DiscoveryService.customerActivity(c),
  },
  eventAdminList: {
    perm: "events.manage",
    fn: () => DiscoveryService.eventList(),
  },
  eventSave: {
    perm: "events.manage",
    fn: (d) => DiscoveryService.eventSave(d),
  },
  eventSet: { perm: "events.manage", fn: (d) => DiscoveryService.eventSet(d) },
  reviewAdminList: {
    perm: "events.manage",
    fn: () => DiscoveryService.reviewAdminList(),
  },
  reviewSet: {
    perm: "events.manage",
    fn: (d) => DiscoveryService.reviewSet(d),
  },
  register: { fn: (d) => BusinessService.register(d) },
  mLogin: { fn: (d) => BusinessService.login(d) },
  mMine: { fn: (d) => BusinessService.mine(d) },
  mPinChange: { fn: (d) => MerchantPinService.change(d) },
  mSave: { fn: (d) => BusinessService.save(d) },
  login: { fn: (d) => AuthService.login(d) },
  me: { perm: null, fn: (d, c) => AuthService.profile(c) },
  customerRegister: { fn: (d) => CustomerAuthService.register(d) },
  customerLogin: { fn: (d) => CustomerAuthService.login(d) },
  customerResetRequest: { fn: (d) => CustomerAuthService.resetRequest(d) },
  customerPasswordChange: {
    auth: "customer",
    fn: (d, c) => CustomerAuthService.changePassword(d, c),
  },
  pwResetList: { perm: "user.manage", fn: () => CustomerAuthService.resetList() },
  pwResetGenerate: { perm: "user.manage", fn: (d) => CustomerAuthService.resetGenerate(d) },
  customerMe: {
    auth: "customer",
    fn: (d, c) => CustomerAuthService.profile(c),
  },
  customerDelete: {
    auth: "customer",
    fn: (d, c) => CustomerAuthService.remove(d, c),
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
  "customerResetRequest",
  "customerPasswordChange",
  "pwResetGenerate",
  "customerDelete",
  "offerSave",
  "offerDelete",
  "postSave",
  "reviewReply",
  "customerReview",
  "customerFollow",
  "customerActivity",
  "eventSave",
  "eventSet",
  "reviewSet",
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
const GET_ACTIONS = new Set([
  "list",
  "get",
  "codes",
  "settings",
  "offers",
  "posts",
  "events",
  "reviews",
]);
function dispatch_(action, d) {
  const r = Object.prototype.hasOwnProperty.call(ROUTES, action)
    ? ROUTES[action]
    : null;
  if (!r) throw new AppError("Unknown action");
  if (r.auth === "customer") return r.fn(d, Auth.customer(d.token));
  if (r.merchant) return r.fn(d);
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
