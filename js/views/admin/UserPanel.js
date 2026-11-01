import { CrudPanel } from "./CrudPanel.js";
import { esc } from "../../core/Dom.js";
import { MasterService } from "../../services/MasterService.js";

export class UserPanel extends CrudPanel {
  roles = [];
  get title() {
    return "User";
  }
  get defaults() {
    return { status: "active" };
  }
  get columns() {
    return [
      { label: "Name", cell: (row) => `<b>${esc(row.name)}</b>` },
      { label: "Username", cell: (row) => esc(row.username) },
      { label: "Role", cell: (row) => esc(row.roleName) },
      { label: "Mobile", cell: (row) => esc(row.phone) },
      { label: "Email", cell: (row) => esc(row.email) },
      {
        label: "Status",
        cell: (row) =>
          `<span class="st ${esc(row.status)}">${esc(row.status)}</span>`,
      },
    ];
  }
  fields() {
    return [
      { key: "name", label: "Full name", required: true, max: 60 },
      {
        key: "username",
        label: "Username",
        required: true,
        max: 30,
        locked: (value) => !!value.id,
        pattern: /^[a-zA-Z0-9_.]{3,30}$/,
        patternMsg: "Username: 3–30 letters, digits, . or _",
      },
      {
        key: "phone",
        label: "Mobile (optional)",
        type: "tel",
        max: 10,
        pattern: /^[6-9]\d{9}$/,
        patternMsg: "Enter a valid 10-digit mobile number",
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        max: 120,
      },
      {
        key: "roleId",
        label: "Role",
        type: "select",
        required: true,
        options: this.roles.map((role) => ({
          value: role.id,
          label: role.name,
        })),
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "active", label: "Active" },
          { value: "disabled", label: "Disabled" },
        ],
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        max: 60,
        hint: "Min 8 characters. Leave blank to keep the current password.",
      },
    ];
  }
  async fetch() {
    this.roles = (await MasterService.roles.list()).roles;
    return MasterService.users.list();
  }
  save(data) {
    return MasterService.users.save(data);
  }
  remove(row) {
    return MasterService.users.remove(row.id);
  }
}
