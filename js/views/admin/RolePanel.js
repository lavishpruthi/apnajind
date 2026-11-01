import { CrudPanel } from "./CrudPanel.js";
import { esc } from "../../core/Dom.js";
import { MasterService } from "../../services/MasterService.js";

export class RolePanel extends CrudPanel {
  perms = {};
  get title() {
    return "Role";
  }
  get columns() {
    return [
      { label: "Code", cell: (row) => `<b>${esc(row.code)}</b>` },
      { label: "Name", cell: (row) => esc(row.name) },
      {
        label: "Permissions",
        cell: (row) =>
          row.permissions.includes("*")
            ? "Everything"
            : row.permissions
                .map(
                  (permission) =>
                    `<span class="tag">${esc(this.perms[permission] || permission)}</span>`,
                )
                .join(""),
      },
    ];
  }
  fields() {
    return [
      {
        key: "code",
        label: "Role code",
        required: true,
        max: 30,
        locked: (value) => !!value.id,
      },
      { key: "name", label: "Role name", required: true, max: 60 },
      {
        key: "permissions",
        label: "Permissions",
        type: "multi",
        options: Object.entries(this.perms).map(([value, label]) => ({
          value,
          label,
        })),
        locked: (value) => (value.permissions || []).includes("*"),
      },
    ];
  }
  async fetch() {
    const result = await MasterService.roles.list();
    this.perms = result.perms;
    return result.roles;
  }
  save(data) {
    return MasterService.roles.save(data);
  }
  remove(row) {
    return MasterService.roles.remove(row.id);
  }
}
