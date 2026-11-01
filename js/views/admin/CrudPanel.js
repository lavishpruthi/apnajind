import { esc } from "../../core/Dom.js";
import { icon } from "../../core/Icons.js";
import { Modal } from "../../core/Modal.js";
import { Toast } from "../../core/Toast.js";
/** Abstract master-data panel. Subclass and provide:
 *    get title(), get columns() [{label, cell(row)->html}], fields(row)->Fields[] (row is {} when adding),
 *    async fetch() -> rows, async save(data) , async remove(row), optional get toolbarExtra().
 *  The base class renders the table, add/edit dialog, delete confirm, and refreshes after each change. */
export class CrudPanel {
  constructor(host) {
    this.host = host;
    this.rows = [];
    this.host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (b) this.#act(b.dataset.act, b.dataset.i);
    });
  }
  get title() {
    throw new Error("title not implemented");
  }
  get columns() {
    throw new Error("columns not implemented");
  }
  fields() {
    throw new Error("fields not implemented");
  }
  async fetch() {
    throw new Error("fetch not implemented");
  }
  async save() {
    throw new Error("save not implemented");
  }
  async remove() {
    throw new Error("remove not implemented");
  }
  get toolbarExtra() {
    return "";
  }
  get defaults() {
    return {};
  }
  async render() {
    this.rows = await this.fetch();
    this.draw();
  }
  draw() {
    const head =
      this.columns.map((c) => `<th>${esc(c.label)}</th>`).join("") +
      '<th><span class="sr">Actions</span></th>';
    const body = this.rows
      .map(
        (r, i) =>
          `<tr>${this.columns.map((c) => `<td>${c.cell(r)}</td>`).join("")}<td class="act"><button class="icon-btn" data-act="edit" data-i="${i}" aria-label="Edit">${icon("edit")}</button><button class="icon-btn no" data-act="del" data-i="${i}" aria-label="Delete">${icon("trash")}</button></td></tr>`,
      )
      .join("");
    this.host.innerHTML = `<div class="toolbar"><h2>${esc(this.title)}</h2><div class="toolbar-actions">${this.toolbarExtra}<button class="btn ac" data-act="add">${icon("plus")} Add</button></div></div>
      ${this.rows.length ? `<div class="tbl"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` : '<div class="empty">Nothing here yet. Tap Add to create the first record.</div>'}`;
  }
  async #act(act, i) {
    const row = this.rows[i];
    if (act === "add" || act === "edit") {
      try {
        const values = act === "edit" ? row : this.defaults;
        const saved = await Modal.form({
          title: `${act === "edit" ? "Edit" : "Add"} ${this.title.toLowerCase()}`,
          fields: this.fields(values),
          values,
          onSubmit: (d) =>
            this.save({ ...(act === "edit" ? { id: row.id } : {}), ...d }),
        });
        if (saved) {
          Toast.show("Saved");
          await this.render();
        }
      } catch (error) {
        Toast.show(error.message);
      }
    } else if (
      act === "del" &&
      (await Modal.confirm(
        `Delete this ${this.title.toLowerCase()} record? This cannot be undone.`,
      ))
    ) {
      try {
        await this.remove(row);
        Toast.show("Deleted");
        await this.render();
      } catch (x) {
        Toast.show(x.message);
      }
    } else if (this.onAction) {
      try {
        await this.onAction(act, row);
      } catch (error) {
        Toast.show(error.message);
      }
    }
  }
}
