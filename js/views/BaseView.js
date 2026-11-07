import { $ } from "../core/Dom.js";

export class BaseView {
  constructor(host) {
    this.host = host;
  }

  set html(value) {
    this.host.innerHTML = value;
    this.host.querySelectorAll('input[type="password"]:not(.pin-code-input)').forEach((input) => {
      const wrap = document.createElement("div");
      wrap.className = "password-wrap";
      input.before(wrap);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "password-toggle";
      button.textContent = "👁";
      button.setAttribute("aria-label", "Show password");
      button.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.textContent = show ? "🙈" : "👁";
        button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
      wrap.append(input, button);
    });
  }

  get html() {
    return this.host.innerHTML;
  }

  $(selector) {
    return $(selector, this.host);
  }

  on(selector, eventName, handler) {
    const element = this.$(selector);
    if (!element)
      throw new Error(
        `Cannot bind ${eventName}: ${selector} was not rendered.`,
      );
    element.addEventListener(eventName, handler);
  }

  actions(handlers) {
    this.host.querySelectorAll("[data-act]").forEach((element) => {
      const handler = handlers[element.dataset.act];
      if (handler)
        element.addEventListener("click", (event) => handler(event, element));
    });
  }

  async render() {}
}
