import { CrudPanel } from "./CrudPanel.js";
import { esc } from "../../core/Dom.js";
import { Modal } from "../../core/Modal.js";
import { Toast } from "../../core/Toast.js";
import { MasterService } from "../../services/MasterService.js";

const activeLabel = (value) =>
  `<span class="st ${value ? "active" : "disabled"}">${value ? "Active" : "Inactive"}</span>`;

export class CodeMasterPanel extends CrudPanel {
  type = "";
  types = [];

  get title() {
    return "Code";
  }
  get defaults() {
    return { type: this.type, active: true, sort: 0 };
  }
  get columns() {
    return [
      { label: "Code", cell: (row) => `<b>${esc(row.code)}</b>` },
      { label: "Description", cell: (row) => esc(row.description) },
      { label: "Order", cell: (row) => esc(row.sort) },
      {
        label: "Meta",
        cell: (row) => `<span class="meta">${esc(row.meta)}</span>`,
      },
      { label: "Status", cell: (row) => activeLabel(row.active) },
    ];
  }
  fields() {
    return [
      {
        key: "type",
        label: "Code type",
        type: "select",
        required: true,
        options: this.types.map((type) => ({
          value: type.code,
          label: `${type.code} – ${type.description}`,
        })),
        locked: (value) => !!value.id,
      },
      {
        key: "code",
        label: "Code",
        required: true,
        max: 40,
        locked: (value) => !!value.id,
        hint: "Stored in records. Cannot change later.",
      },
      {
        key: "description",
        label: "Description (shown in dropdowns)",
        required: true,
        max: 100,
      },
      { key: "sort", label: "Display order", type: "number", max: 5 },
      {
        key: "meta",
        label: "Meta (optional)",
        max: 100,
        hint: "key=value;key=value, e.g. icon=utensils;food=1",
      },
      { key: "active", label: "Active", type: "toggle" },
    ];
  }
  get toolbarExtra() {
    return `<select id="ts" aria-label="Code type" class="type-select">${this.types.map((type) => `<option value="${esc(type.code)}" ${type.code === this.type ? "selected" : ""}>${esc(type.code)}</option>`).join("")}</select>
      <button class="btn ghost" data-act="types" type="button">Types</button>`;
  }
  async fetch() {
    this.types = await MasterService.codeTypes.list();
    if (!this.type || !this.types.some((type) => type.code === this.type))
      this.type = this.types[0]?.code || "";
    return this.type ? MasterService.codes.list(this.type) : [];
  }
  save(data) {
    return MasterService.codes.save(data);
  }
  remove(row) {
    return MasterService.codes.remove(row.id);
  }
  draw() {
    super.draw();
    const select = this.host.querySelector("#ts");
    if (select)
      select.onchange = async () => {
        this.type = select.value;
        try {
          await this.render();
        } catch (error) {
          Toast.show(error.message);
        }
      };
  }
  async onAction(action) {
    if (action !== "types") return;
    const created = await Modal.form({
      title: "Add code type",
      fields: [
        {
          key: "code",
          label: "Type code (e.g. CATEGORY)",
          required: true,
          max: 30,
        },
        { key: "description", label: "Description", required: true, max: 80 },
        { key: "active", label: "Active", type: "toggle" },
      ],
      values: { active: true },
      submit: "Add type",
      onSubmit: (data) => MasterService.codeTypes.save(data),
    });
    if (created) {
      Toast.show("Code type added");
      this.type = created.code.toUpperCase();
      await this.render();
    }
  }
}
