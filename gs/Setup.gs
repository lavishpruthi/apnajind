/** Run ONCE from the editor (select setup > Run). Safe to re-run: only seeds empty sheets. */
function setup() {
  const pw =
    PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD");
  if (!pw || pw.length < 8)
    throw new Error("Set script property ADMIN_PASSWORD (min 8 chars) first.");
  const types = new CodeTypeRepo(),
    codes = new CodeRepo(),
    roles = new RoleRepo(),
    users = new UserRepo();
  new BusinessRepo().sheet;
  new ReportRepo().sheet;
  new CustomerRepo().sheet;
  if (!types.all().length) {
    types.insert({
      code: "CATEGORY",
      description: "Business categories",
      active: true,
    });
    types.insert({ code: "AREA", description: "Areas of Jind", active: true });
  }
  if (!codes.all().length) {
    [
      ["FOOD", "Food & Restaurants", "icon=utensils;food=1"],
      ["SWEETS", "Sweets & Bakery", "icon=cake;food=1"],
      ["SHOP", "Shopping", "icon=bag"],
      ["EDU", "Education & Coaching", "icon=book"],
      ["HEALTH", "Health & Clinics", "icon=heart"],
      ["SERVICE", "Home Services", "icon=wrench"],
      ["HOTEL", "Hotels & Banquets", "icon=bed"],
      ["AUTO", "Auto & Transport", "icon=car"],
      ["BEAUTY", "Beauty & Salon", "icon=scissors"],
      ["REALTY", "Real Estate", "icon=building"],
      ["OTHER", "Other", "icon=tag"],
    ].forEach((c, i) =>
      codes.insert({
        type: "CATEGORY",
        code: c[0],
        description: c[1],
        sort: i + 1,
        meta: c[2],
        active: true,
      }),
    );
    [
      "Hansi Road",
      "Gohana Road",
      "Civil Lines",
      "Safidon Gate",
      "Rani Talab",
      "Patiala Chowk",
      "Narwana Road",
      "Sector 7",
      "Bus Stand",
    ].forEach((a, i) =>
      codes.insert({
        type: "AREA",
        code: a.toUpperCase().replace(/\s+/g, "_"),
        description: a,
        sort: i + 1,
        meta: "",
        active: true,
      }),
    );
  }
  if (!roles.all().length) {
    roles.insert({
      code: "SUPER_ADMIN",
      name: "Super Admin",
      permissions: "*",
    });
    roles.insert({
      code: "MODERATOR",
      name: "Moderator",
      permissions: "business.approve",
    });
  }
  if (!users.all().length)
    users.insert({
      name: "Administrator",
      username: "admin",
      phone: "",
      roleId: roles.all().find((r) => r.code === "SUPER_ADMIN").id,
      status: "active",
      pwHash: Auth.hash(pw, "admin"),
    });
  CodeService.bust();
  return "Setup complete. Log in as admin with ADMIN_PASSWORD, then delete that script property.";
}
