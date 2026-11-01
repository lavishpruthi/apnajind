/** Keep text values literal when user-controlled content starts with a Sheets formula prefix. */
function sheetValue_(value) {
  return typeof value === "string" && /^[\s]*[=+\-@]/.test(value)
    ? "'" + value
    : value;
}

/** Generic sheet-backed repository. Subclasses only declare sheet name, headers and id prefix. */
class Repository {
  constructor(sheetName, headers, prefix, textCols) {
    this.sheetName = sheetName;
    this.headers = headers;
    this.prefix = prefix;
    this.textCols = textCols || [];
  }
  get sheet() {
    const ss = SpreadsheetApp.getActive();
    let s = ss.getSheetByName(this.sheetName);
    if (!s) {
      s = ss.insertSheet(this.sheetName);
      s.appendRow(this.headers);
      s.setFrozenRows(1);
      s.getRange(1, 1, 1, this.headers.length).setFontWeight("bold");
      this.textCols.forEach((c) =>
        s.getRange(1, c, s.getMaxRows(), 1).setNumberFormat("@"),
      );
    }
    return s;
  }
  all() {
    const v = this.sheet.getDataRange().getValues();
    v.shift();
    return v.map((r, i) => {
      const o = { _row: i + 2 };
      this.headers.forEach((h, j) => (o[h] = r[j]));
      return o;
    });
  }
  find(id) {
    return this.all().find((r) => String(r.id) === String(id)) || null;
  }
  insert(o) {
    const now = new Date().toISOString();
    o.id =
      o.id ||
      this.prefix +
        Date.now().toString(36) +
        Math.floor(Math.random() * 1296).toString(36);
    o.created = now;
    o.updated = now;
    this.sheet.appendRow(this.headers.map((h) => sheetValue_(o[h] == null ? "" : o[h])));
    return o;
  }
  update(id, patch) {
    const r = this.find(id);
    if (!r) throw new AppError("Record not found");
    const rec = Object.assign({}, r, patch, {
      updated: new Date().toISOString(),
    });
    this.sheet
      .getRange(r._row, 1, 1, this.headers.length)
      .setValues([this.headers.map((h) => sheetValue_(rec[h] == null ? "" : rec[h]))]);
    return rec;
  }
  remove(id) {
    const r = this.find(id);
    if (!r) throw new AppError("Record not found");
    this.sheet.deleteRow(r._row);
  }
}
class BusinessRepo extends Repository {
  constructor() {
    super(
      "Businesses",
      [
        "id",
        "name",
        "category",
        "description",
        "services",
        "address",
        "area",
        "lat",
        "lng",
        "phone",
        "whatsapp",
        "owner",
        "photos",
        "status",
        "pinHash",
        "featured",
        "created",
        "updated",
        "hours",
        "availability",
        "verified",
        "pinExpiresAt",
        "pinChangeRequired",
        "pinVersion",
      ],
      "B",
      [10, 11],
    );
  }
  get sheet() {
    const sheet = super.sheet;
    const lastColumn = Math.max(1, sheet.getLastColumn());
    const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    this.headers.forEach((header) => {
      if (!existing.includes(header)) {
        const nextColumn = sheet.getLastColumn() + 1;
        sheet.getRange(1, nextColumn).setValue(header).setFontWeight("bold");
        existing.push(header);
      }
    });
    return sheet;
  }
}

class ReportRepo extends Repository {
  constructor() {
    super("BusinessReports", ["id", "businessId", "reporterId", "reason", "details", "status", "created", "updated"], "Q");
  }
}
class CodeTypeRepo extends Repository {
  constructor() {
    super(
      "CodeTypes",
      ["id", "code", "description", "active", "created", "updated"],
      "T",
    );
  }
}
class CodeRepo extends Repository {
  constructor() {
    super(
      "Codes",
      [
        "id",
        "type",
        "code",
        "description",
        "sort",
        "meta",
        "active",
        "created",
        "updated",
      ],
      "C",
    );
  }
}
class RoleRepo extends Repository {
  constructor() {
    super(
      "Roles",
      ["id", "code", "name", "permissions", "created", "updated"],
      "R",
    );
  }
}
class UserRepo extends Repository {
  constructor() {
    super(
      "Users",
      [
        "id",
        "name",
        "username",
        "phone",
        "roleId",
        "status",
        "pwHash",
        "created",
        "updated",
        "email",
      ],
      "U",
      [4, 10],
    );
  }
  get sheet() {
    const sheet = super.sheet;
    const emailHeader = sheet.getRange(1, 10);
    if (emailHeader.getValue() !== "email") {
      if (sheet.getLastColumn() >= 10)
        throw new AppError(
          "The Users sheet has an unexpected column after updated.",
        );
      emailHeader.setValue("email").setFontWeight("bold");
    }
    sheet.getRange(1, 10, sheet.getMaxRows(), 1).setNumberFormat("@");
    return sheet;
  }
}
class CustomerRepo extends Repository {
  constructor() {
    super(
      "Customers",
      [
        "id",
        "name",
        "phone",
        "email",
        "status",
        "pwHash",
        "created",
        "updated",
      ],
      "C",
      [3],
    );
  }
}
