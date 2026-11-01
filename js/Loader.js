/** Full-screen loading overlay. Reference-counted, so parallel requests keep it up until the last one ends.
 *  While active, all other <body> children are `inert` (no pointer, keyboard or AT access) and pointer-events:none (see base.css). */
export class Loader {
  static #n = 0;
  static #el = null;
  static init(el) {
    Loader.#el = el;
  }
  static #toggle(on) {
    const el = Loader.#el;
    [...document.body.children].forEach((c) => {
      if (c !== el) c.toggleAttribute("inert", on);
    });
    document.body.classList.toggle("is-busy", on);
    try {
      on ? el.showPopover() : el.hidePopover();
    } catch (e) {
      el.classList.toggle("on", on);
    }
  }
  /** Wrap any promise: `await Loader.track(somePromise)`. */
  static async track(promise) {
    if (++Loader.#n === 1) Loader.#toggle(true);
    try {
      return await promise;
    } finally {
      if (--Loader.#n === 0) Loader.#toggle(false);
    }
  }
}
