/** Business rules. Each service is stateless; repositories do the I/O. */
class CodeService {
  static bust() {
    CacheService.getScriptCache().removeAll(["codes", "list"]);
  }
  static exists(type, code) {
    return new CodeRepo()
      .all()
      .some((r) => r.type === type && r.code === code && isOn_(r.active));
  }
  static publicCodes() {
    const c = CacheService.getScriptCache(),
      hit = c.get("codes");
    if (hit) return JSON.parse(hit);
    const out = {};
    new CodeRepo()
      .all()
      .filter((r) => isOn_(r.active))
      .sort((a, b) => a.sort - b.sort)
      .forEach((r) =>
        (out[r.type] = out[r.type] || []).push({
          code: r.code,
          description: r.description,
          meta: r.meta,
        }),
      );
    c.put("codes", JSON.stringify(out), CFG.CACHE_SEC);
    return out;
  }
  static typeList() {
    return new CodeTypeRepo()
      .all()
      .map((r) => Object.assign(r, { active: isOn_(r.active) }));
  }
  static typeSave(d) {
    const repo = new CodeTypeRepo(),
      desc = clean_(d.description, 80),
      act = !!d.active;
    if (!desc) throw new AppError("Description is required");
    let rec;
    if (d.id) rec = repo.update(d.id, { description: desc, active: act });
    else {
      const code = clean_(d.code, 30).toUpperCase();
      if (!/^[A-Z0-9_]{2,30}$/.test(code))
        throw new AppError("Code type must be 2–30 letters, digits or _");
      if (repo.all().some((r) => r.code === code))
        throw new AppError("This code type already exists");
      rec = repo.insert({ code, description: desc, active: act });
    }
    CodeService.bust();
    return rec;
  }
  static typeDelete(d) {
    const t = new CodeTypeRepo().find(d.id);
    if (!t) throw new AppError("Record not found");
    if (new CodeRepo().all().some((c) => c.type === t.code))
      throw new AppError("Delete this type's codes first");
    new CodeTypeRepo().remove(d.id);
    CodeService.bust();
    return true;
  }
  static list(d) {
    return new CodeRepo()
      .all()
      .filter((r) => !d.type || r.type === d.type)
      .map((r) => Object.assign(r, { active: isOn_(r.active) }));
  }
  static save(d) {
    const repo = new CodeRepo(),
      desc = clean_(d.description, 100);
    if (!desc) throw new AppError("Description is required");
    const patch = {
      description: desc,
      sort: Number(d.sort) || 0,
      meta: clean_(d.meta, 100),
      active: !!d.active,
    };
    let rec;
    if (d.id) rec = repo.update(d.id, patch);
    else {
      const type = clean_(d.type, 30),
        code = clean_(d.code, 40).toUpperCase().replace(/\s+/g, "_");
      if (!new CodeTypeRepo().all().some((t) => t.code === type))
        throw new AppError("Unknown code type");
      if (!code) throw new AppError("Code is required");
      if (repo.all().some((r) => r.type === type && r.code === code))
        throw new AppError("This code already exists in the type");
      rec = repo.insert(Object.assign({ type, code }, patch));
    }
    CodeService.bust();
    return rec;
  }
  static remove(d) {
    const c = new CodeRepo().find(d.id);
    if (!c) throw new AppError("Record not found");
    const col = { CATEGORY: "category", AREA: "area" }[c.type];
    if (col && new BusinessRepo().all().some((b) => b[col] === c.code))
      throw new AppError("Used by a business. Mark it inactive instead.");
    new CodeRepo().remove(d.id);
    CodeService.bust();
    return true;
  }
}
class RoleService {
  static list() {
    return {
      perms: PERMS,
      roles: new RoleRepo().all().map((r) =>
        Object.assign(r, {
          permissions: String(r.permissions).split(",").filter(Boolean),
        }),
      ),
    };
  }
  static save(d) {
    const repo = new RoleRepo(),
      name = clean_(d.name, 60);
    if (!name) throw new AppError("Role name is required");
    const perms = (Array.isArray(d.permissions) ? d.permissions : []).filter(
      (p) => PERMS[p],
    );
    if (d.id) {
      const r = repo.find(d.id);
      return repo.update(d.id, {
        name,
        permissions: r.code === "SUPER_ADMIN" ? "*" : perms.join(","),
      });
    }
    const code = clean_(d.code, 30).toUpperCase();
    if (!/^[A-Z0-9_]{2,30}$/.test(code))
      throw new AppError("Role code must be 2–30 letters, digits or _");
    if (repo.all().some((r) => r.code === code))
      throw new AppError("This role already exists");
    return repo.insert({ code, name, permissions: perms.join(",") });
  }
  static remove(d) {
    const r = new RoleRepo().find(d.id);
    if (!r) throw new AppError("Record not found");
    if (r.code === "SUPER_ADMIN")
      throw new AppError("The Super Admin role cannot be deleted");
    if (new UserRepo().all().some((u) => u.roleId === r.id))
      throw new AppError("Users still have this role");
    new RoleRepo().remove(d.id);
    return true;
  }
}
class UserService {
  static list() {
    const roles = {};
    new RoleRepo().all().forEach((r) => (roles[r.id] = r.name));
    return new UserRepo().all().map((u) => {
      delete u.pwHash;
      delete u._row;
      u.phone = String(u.phone);
      u.roleName = roles[u.roleId] || "—";
      return u;
    });
  }
  static superCount_(excludeId) {
    const sa = new RoleRepo().all().find((r) => r.code === "SUPER_ADMIN");
    return new UserRepo()
      .all()
      .filter(
        (u) =>
          sa &&
          u.roleId === sa.id &&
          u.status === "active" &&
          u.id !== excludeId,
      ).length;
  }
  static save(d, ctx) {
    const repo = new UserRepo(),
      name = clean_(d.name, 60),
      phone = clean_(d.phone, 10).replace(/\D/g, "");
    const email = clean_(d.email, 120).toLowerCase();
    if (!name) throw new AppError("Name is required");
    if (phone && !/^[6-9]\d{9}$/.test(phone))
      throw new AppError("Enter a valid 10-digit mobile number");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new AppError("Enter a valid email address");
    if (
      email &&
      repo
        .all()
        .some((u) => u.email === email && String(u.id) !== String(d.id || ""))
    )
      throw new AppError("This email is already in use");
    if (
      phone &&
      repo
        .all()
        .some(
          (u) =>
            String(u.phone || "") === phone &&
            String(u.id) !== String(d.id || ""),
        )
    )
      throw new AppError("This mobile number is already in use");
    const role = new RoleRepo().find(d.roleId);
    if (!role) throw new AppError("Choose a role");
    const status = d.status === "disabled" ? "disabled" : "active";
    if (d.password && String(d.password).length < 8)
      throw new AppError("Password must be at least 8 characters");
    if (d.id) {
      const u = repo.find(d.id);
      if (!u) throw new AppError("Record not found");
      const wasSuper = new RoleRepo().find(u.roleId).code === "SUPER_ADMIN";
      if (
        wasSuper &&
        (role.code !== "SUPER_ADMIN" || status !== "active") &&
        UserService.superCount_(u.id) === 0
      )
        throw new AppError("At least one active Super Admin is required");
      const patch = { name, phone, email, roleId: role.id, status };
      if (d.password) patch.pwHash = Auth.hash(d.password, u.username);
      repo.update(d.id, patch);
      return true;
    }
    const username = clean_(d.username, 30).toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(username))
      throw new AppError("Username: 3–30 letters, digits, . or _");
    if (!d.password) throw new AppError("Password is required for new users");
    if (repo.all().some((u) => u.username === username))
      throw new AppError("Username already taken");
    repo.insert({
      name,
      username,
      phone,
      email,
      roleId: role.id,
      status,
      pwHash: Auth.hash(d.password, username),
    });
    return true;
  }
  static remove(d, ctx) {
    const u = new UserRepo().find(d.id);
    if (!u) throw new AppError("Record not found");
    if (u.id === ctx.user.id)
      throw new AppError("You cannot delete your own account");
    if (
      new RoleRepo().find(u.roleId).code === "SUPER_ADMIN" &&
      UserService.superCount_(u.id) === 0
    )
      throw new AppError("At least one active Super Admin is required");
    new UserRepo().remove(d.id);
    return true;
  }
}
class AuthService {
  static profile(ctx) {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      username: ctx.user.username,
      phone: String(ctx.user.phone || ""),
      email: ctx.user.email || "",
      role: { code: ctx.role.code, name: ctx.role.name },
      permissions: ctx.perms,
    };
  }
  static login(d) {
    const identity = clean_(d.identity || d.username, 120).toLowerCase();
    const u = new UserRepo()
      .all()
      .find(
        (x) =>
          x.username === identity ||
          String(x.phone || "") === identity ||
          String(x.email || "").toLowerCase() === identity,
      );
    if (
      !u ||
      u.status !== "active" ||
      u.pwHash !== Auth.hash(String(d.password), u.username)
    ) {
      Utilities.sleep(1500);
      throw new AppError("Wrong username or password");
    }
    return {
      token: Auth.sign("s", u.id),
      profile: AuthService.profile(Auth.staff(Auth.sign("s", u.id))),
    };
  }
}
class CustomerAuthService {
  static profile(customer) {
    return {
      id: customer.id,
      name: customer.name,
      phone: String(customer.phone),
      email: customer.email,
    };
  }
  static register(d) {
    const name = clean_(d.name, 60);
    const phone = clean_(d.phone, 10).replace(/\D/g, "");
    const email = clean_(d.email, 120).toLowerCase();
    const password = String(d.password || "");
    if (!name) throw new AppError("Enter your name");
    if (!/^[6-9]\d{9}$/.test(phone))
      throw new AppError("Enter a valid 10-digit mobile number");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new AppError("Enter a valid email address");
    if (password.length < 8)
      throw new AppError("Password must be at least 8 characters");
    const repo = new CustomerRepo(),
      customers = repo.all();
    if (customers.some((c) => String(c.phone) === phone))
      throw new AppError(
        "This mobile number is already registered. Please log in.",
      );
    if (customers.some((c) => String(c.email).toLowerCase() === email))
      throw new AppError("This email is already registered. Please log in.");
    const customer = repo.insert({
      name,
      phone,
      email,
      status: "active",
      pwHash: Auth.hash(password, email),
    });
    const token = Auth.sign("c", customer.id);
    return { token, profile: CustomerAuthService.profile(customer) };
  }
  static login(d) {
    const identity = clean_(d.identity, 120).toLowerCase();
    const customer = new CustomerRepo()
      .all()
      .find(
        (c) =>
          String(c.email).toLowerCase() === identity ||
          String(c.phone) === identity,
      );
    if (
      !customer ||
      customer.status !== "active" ||
      customer.pwHash !==
        Auth.hash(
          String(d.password || ""),
          String(customer.email).toLowerCase(),
        )
    ) {
      Utilities.sleep(1000);
      throw new AppError("Wrong phone/email or password");
    }
    return {
      token: Auth.sign("c", customer.id),
      profile: CustomerAuthService.profile(customer),
    };
  }
}
class BusinessService {
  static pub_(o) {
    const c = Object.assign({}, o);
    delete c.pinHash;
    delete c.pinExpiresAt;
    delete c.pinChangeRequired;
    delete c.pinVersion;
    delete c._row;
    c.services = String(c.services || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      c.photos = JSON.parse(c.photos || "[]");
    } catch (e) {
      c.photos = [];
    }
    c.phone = String(c.phone);
    c.whatsapp = String(c.whatsapp || "");
    c.featured = isOn_(c.featured);
    c.verified = isOn_(c.verified);
    const rawHours = String(c.hours || "");
    try {
      c.hours = JSON.parse(rawHours);
    } catch (e) {
      c.hours = clean_(rawHours, 120);
    }
    c.availability = clean_(c.availability, 30);
    return c;
  }
  static photos_(arr, id) {
    if (arr == null) arr = [];
    if (!Array.isArray(arr) || arr.length > 10)
      throw new AppError("Add no more than 10 business photos.");
    const encodedTotal = arr.reduce(
      (sum, photo) => sum + String(photo || "").length,
      0,
    );
    if (encodedTotal > 4500000)
      throw new AppError("Photos are too large. Please use smaller images.");
    const photos = arr.map((photo) => String(photo || ""));
    photos.forEach((value) => {
      const hostedImage =
        /^https:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?(?:\/[^\s]*)?$/i.test(value);
      const jpegData =
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value) &&
        value.length <= 700000;
      if (!hostedImage && !jpegData)
        throw new AppError(
          "Photos must be JPEG images smaller than 500 KB each.",
        );
    });
    const hasUploads = photos.some((value) =>
      value.startsWith("data:image/jpeg;base64,"),
    );
    let folder = null;
    if (hasUploads) {
      const it = DriveApp.getFoldersByName("ApnaJind Photos");
      folder = it.hasNext()
        ? it.next()
        : DriveApp.createFolder("ApnaJind Photos");
    }
    return photos.map((value, i) => {
      if (!value.startsWith("data:image/jpeg;base64,")) return value;
      const f = folder.createFile(
        Utilities.newBlob(
          Utilities.base64Decode(value.split(",")[1]),
          "image/jpeg",
          id + "_" + Date.now() + "_" + i + ".jpg",
        ),
      );
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return "https://lh3.googleusercontent.com/d/" + f.getId();
    });
  }
  static fields_(d, id) {
    const phone = clean_(d.phone, 10).replace(/\D/g, "");
    const availability = clean_(d.availability, 30) || "available";
    if (!/^[6-9]\d{9}$/.test(phone))
      throw new AppError("Enter a valid 10-digit mobile number");
    if (!clean_(d.name, 80)) throw new AppError("Business name is required");
    if (!CodeService.exists("CATEGORY", d.category))
      throw new AppError("Choose a valid category");
    if (d.area && !CodeService.exists("AREA", d.area))
      throw new AppError("Choose a valid business area");
    if (!["available", "seasonal", "temporarily_closed"].includes(availability))
      throw new AppError("Choose a valid availability status");
    const lat = d.lat === "" || d.lat == null ? "" : Number(d.lat);
    const lng = d.lng === "" || d.lng == null ? "" : Number(d.lng);
    if (
      (lat !== "" && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lng !== "" && (!Number.isFinite(lng) || lng < -180 || lng > 180)) ||
      (lat === "") !== (lng === "")
    )
      throw new AppError("Enter a valid latitude and longitude pair.");
    const whatsapp = clean_(d.whatsapp, 20).replace(/\D/g, "");
    if (whatsapp && !/^[6-9]\d{9}$/.test(whatsapp))
      throw new AppError("Enter a valid 10-digit WhatsApp number.");
    const hours = BusinessService.hours_(d.hours);
    return {
      name: clean_(d.name, 80),
      category: d.category,
      description: clean_(d.description, 600),
      services: clean_(d.services, 300),
      address: clean_(d.address, 200),
      area: clean_(d.area, 60),
      lat,
      lng,
      phone,
      whatsapp,
      owner: clean_(d.owner, 60),
      hours,
      availability,
      verified: false,
      photos: JSON.stringify(BusinessService.photos_(d.photos, id)),
    };
  }
  static hours_(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new AppError("Add opening hours for every day of the week.");
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const schedule = {};
    days.forEach((day) => {
      const entry = value[day];
      if (!entry || typeof entry.closed !== "boolean")
        throw new AppError("Complete the weekly opening hours schedule.");
      const open = String(entry.open || "");
      const close = String(entry.close || "");
      if (
        !entry.closed &&
        (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(close) ||
          open === close)
      )
        throw new AppError(
          "Choose valid opening and closing times for each open day.",
        );
      schedule[day] = {
        closed: entry.closed,
        open: entry.closed ? "" : open,
        close: entry.closed ? "" : close,
      };
    });
    return JSON.stringify(schedule);
  }
  static list() {
    const c = CacheService.getScriptCache(),
      hit = c.get("list");
    if (hit) return JSON.parse(hit);
    const out = new BusinessRepo()
      .all()
      .filter((r) => r.status === "approved")
      .map(BusinessService.pub_);
    const s = JSON.stringify(out);
    if (s.length < 95000) c.put("list", s, CFG.CACHE_SEC); // 100KB/key limit: shard by category past ~300 listings
    return out;
  }
  static get(d) {
    const r = new BusinessRepo().find(d.id);
    if (!r || r.status !== "approved") throw new AppError("Not found");
    return BusinessService.pub_(r);
  }
  static register(d) {
    const repo = new BusinessRepo(),
      f = BusinessService.fields_(d, "new");
    if (repo.all().some((r) => String(r.phone) === f.phone))
      throw new AppError("This number is already registered. Please log in.");
    const issued = MerchantPinService.issue_(f.phone);
    const { pin, pinHash, pinExpiresAt, pinChangeRequired } = issued;
    const business = repo.insert(
      Object.assign(f, {
        status: "pending",
        featured: false,
        pinHash,
        pinExpiresAt,
        pinChangeRequired,
        pinVersion: 0,
      }),
    );
    CodeService.bust();
    return {
      token: MerchantPinService.token_(f.phone, 0),
      pin,
      expiresAt: pinExpiresAt,
      phone: f.phone,
      whatsapp: f.whatsapp || f.phone,
      businessName: f.name,
    };
  }
  static login(d) {
    const ph = clean_(d.phone, 10).replace(/\D/g, "");
    MerchantPinService.checkAttempts_(ph);
    const pin = String(d.pin || ""),
      r = new BusinessRepo().all().find((x) => String(x.phone) === ph);
    if (!r || r.pinHash !== Auth.hash(pin, ph)) {
      MerchantPinService.failedAttempt_(ph);
      Utilities.sleep(1000);
      throw new AppError("Wrong number or PIN");
    }
    if (r.pinExpiresAt && new Date(r.pinExpiresAt).getTime() <= Date.now())
      throw new AppError("Your temporary PIN expired. Ask an admin to generate a new PIN.");
    // A permanent PIN has no expiry. Only legacy records (version 0 with no
    // temporary expiry metadata) need the one-time migration reset.
    const needsPinChange = isOn_(r.pinChangeRequired) ||
      (!r.pinExpiresAt && (Number(r.pinVersion) || 0) === 0);
    if (needsPinChange && !isOn_(r.pinChangeRequired))
      new BusinessRepo().update(r.id, {
        pinChangeRequired: true,
        pinExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    MerchantPinService.clearAttempts_(ph);
    return {
      token: MerchantPinService.token_(ph, r.pinVersion),
      pinChangeRequired: needsPinChange,
    };
  }
  static mine_(d) {
    const subject = Auth.verify(d.token, "m"),
      parts = subject.split("|"),
      ph = parts[0],
      r = new BusinessRepo().all().find((x) => String(x.phone) === ph);
    if (!r) throw new AppError("Listing not found");
    const tokenVersion = parts.length > 1 ? Number(parts[1]) : 0;
    if (tokenVersion !== (Number(r.pinVersion) || 0))
      throw new AppError("Your session was reset. Please sign in again.");
    return r;
  }
  static mine(d) {
    const record = BusinessService.mine_(d);
    return Object.assign(BusinessService.pub_(record), {
      pinChangeRequired: isOn_(record.pinChangeRequired),
      pinExpiresAt: String(record.pinExpiresAt || ""),
    });
  }
  static save(d) {
    const r = BusinessService.mine_(d);
    if (isOn_(r.pinChangeRequired))
      throw new AppError("Change your temporary PIN before updating your listing.");
    d.phone = String(r.phone);
    const f = BusinessService.fields_(d, r.id);
    f.status = "pending";
    new BusinessRepo().update(r.id, f);
    CodeService.bust();
    return true;
  }
  static adminList() {
    return new BusinessRepo().all().map((record) => Object.assign(
      BusinessService.pub_(record),
      {
        pinChangeRequired: isOn_(record.pinChangeRequired),
        pinExpiresAt: String(record.pinExpiresAt || ""),
      },
    ));
  }
  static adminSet(d) {
    const p = {};
    if (["approved", "rejected", "pending"].includes(d.status)) {
      p.status = d.status;
      if (d.status === "approved") p.verified = true;
      if (d.status === "rejected") p.verified = false;
    }
    if (d.featured !== undefined) p.featured = isOn_(d.featured);
    if (d.verified !== undefined) p.verified = isOn_(d.verified);
    new BusinessRepo().update(d.id, p);
    CodeService.bust();
    return true;
  }
  static reportList() {
    const names = {};
    new BusinessRepo().all().forEach((business) => {
      names[business.id] = business.name;
    });
    return new ReportRepo()
      .all()
      .filter((report) => report.status === "open")
      .map((report) => {
        delete report._row;
        report.businessName = names[report.businessId] || "Removed business";
        return report;
      });
  }
  static reportSet(d) {
    if (!["resolved", "dismissed"].includes(d.status))
      throw new AppError("Choose a valid report status.");
    new ReportRepo().update(d.id, { status: d.status });
    return true;
  }
  static report(d, customer) {
    const businessId = clean_(d.businessId, 40);
    const reason = clean_(d.reason, 40);
    const rawDetails = clean_(d.details, 500);
    const details = /^[=+\-@]/.test(rawDetails) ? "'" + rawDetails : rawDetails;
    const allowed = ["wrong_contact", "wrong_address", "closed", "other"];
    const business = new BusinessRepo().find(businessId);
    if (!business || business.status !== "approved")
      throw new AppError("This listing is no longer available.");
    if (!allowed.includes(reason))
      throw new AppError("Choose a report reason.");
    const key = `report_${customer.id}_${businessId}`;
    const cache = CacheService.getScriptCache();
    if (cache.get(key))
      throw new AppError(
        "You recently reported this listing. Thanks for helping keep it accurate.",
      );
    new ReportRepo().insert({
      businessId,
      reporterId: customer.id,
      reason,
      details,
      status: "open",
    });
    cache.put(key, "1", 21600);
    return { submitted: true };
  }
}
