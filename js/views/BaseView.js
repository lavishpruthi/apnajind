import { $ } from "../core/Dom.js";

export class BaseView {
  constructor(host) {
    this.host = host;
  }

  set html(value) {
    this.host.innerHTML = value;
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
