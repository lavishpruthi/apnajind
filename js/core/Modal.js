import { esc } from "./Dom.js";

export class Modal {
  static confirm(message) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "modal";
      dialog.innerHTML = `<form method="dialog" class="modal-card">
        <p>${esc(message)}</p>
        <div class="btns"><button class="btn ghost" value="cancel">Cancel</button><button class="btn no" value="confirm">Delete</button></div>
      </form>`;
      document.body.append(dialog);
      dialog.addEventListener(
        "close",
        () => {
          const confirmed = dialog.returnValue === "confirm";
          dialog.remove();
          resolve(confirmed);
        },
        { once: true },
      );
      dialog.showModal();
    });
  }

  static form({ title, fields, values = {}, submit = "Save", onSubmit }) {
    return new Promise((resolve, reject) => {
      const dialog = document.createElement("dialog");
      dialog.className = "modal";
      const controls = fields
        .map((field) => {
          const current = values[field.key];
          const value = current ?? "";
          const disabled = field.locked?.(values) ? "disabled" : "";
          const required = field.required ? "required" : "";
          const hint = field.hint
            ? `<small class="field-hint">${esc(field.hint)}</small>`
            : "";
          let control;
          if (field.type === "toggle") {
            control = `<input id="f-${esc(field.key)}" name="${esc(field.key)}" type="checkbox" ${current ? "checked" : ""} ${disabled}>`;
          } else if (field.type === "select") {
            control = `<select id="f-${esc(field.key)}" name="${esc(field.key)}" ${required} ${disabled}>
            ${field.options.map((option) => `<option value="${esc(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${esc(option.label)}</option>`).join("")}
          </select>`;
          } else if (field.type === "multi") {
            const selected = Array.isArray(current) ? current : [];
            control = `<div class="multi-options">${field.options
              .map(
                (option) => `
            <label class="check-option"><input name="${esc(field.key)}" type="checkbox" value="${esc(option.value)}" ${selected.includes(option.value) ? "checked" : ""} ${disabled}>${esc(option.label)}</label>`,
              )
              .join("")}
          </div>`;
          } else {
            const inputType = ["number", "password", "tel", "email"].includes(
              field.type,
            )
              ? field.type
              : "text";
            control = `<input id="f-${esc(field.key)}" name="${esc(field.key)}" type="${inputType}" value="${esc(value)}" ${required} ${field.max ? `maxlength="${field.max}"` : ""} ${disabled}>`;
          }
          return `<div class="field"><label for="f-${esc(field.key)}">${esc(field.label)}</label>${control}${hint}</div>`;
        })
        .join("");
      dialog.innerHTML = `<form class="modal-card" novalidate>
        <h2>${esc(title)}</h2><div class="modal-fields">${controls}</div><p class="form-error" aria-live="polite"></p>
        <div class="btns"><button class="btn ghost" type="button" data-cancel>Cancel</button><button class="btn ac" type="submit">${esc(submit)}</button></div>
      </form>`;
      const form = dialog.querySelector("form");
      const close = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      dialog.querySelector("[data-cancel]").onclick = () => close(null);
      form.onsubmit = async (event) => {
        event.preventDefault();
        const errorElement = dialog.querySelector(".form-error");
        const data = {};
        for (const field of fields) {
          if (field.type === "toggle") {
            data[field.key] = form.elements[field.key].checked;
          } else if (field.type === "multi") {
            data[field.key] = [
              ...form.querySelectorAll(
                `input[name="${CSS.escape(field.key)}"]:checked`,
              ),
            ].map((input) => input.value);
          } else {
            const input = form.elements[field.key];
            data[field.key] = input.value.trim();
            if (field.required && !data[field.key]) {
              input.focus();
              errorElement.textContent = `${field.label} is required.`;
              return;
            }
            if (
              field.pattern &&
              data[field.key] &&
              !field.pattern.test(data[field.key])
            ) {
              input.focus();
              errorElement.textContent =
                field.patternMsg ||
                `Enter a valid ${field.label.toLowerCase()}.`;
              return;
            }
          }
        }
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        errorElement.textContent = "";
        try {
          const result = await onSubmit(data);
          close(result === undefined ? data : result);
        } catch (error) {
          errorElement.textContent = error.message || "Unable to save changes.";
          button.disabled = false;
        }
      };
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        close(null);
      });
      document.body.append(dialog);
      dialog.showModal();
    });
  }
}
