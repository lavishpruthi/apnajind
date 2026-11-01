import { esc } from "./Dom.js";

const ICONS = new Set([
  "arrow-left", "bag", "bed", "book", "building", "cake", "car", "check",
  "chevron-left", "chevron-right", "copy", "edit", "flag", "heart", "home",
  "key", "list", "logout", "phone", "pin", "plus", "scissors", "search",
  "share", "shield", "store", "tag", "trash", "users", "utensils", "wrench", "x",
]);

export function icon(name, label = "") {
  const glyph = ICONS.has(name) ? name : "list";
  const accessible = label
    ? `role="img" aria-label="${esc(label)}"`
    : 'aria-hidden="true"';
  return `<svg class="ic" viewBox="0 0 24 24" ${accessible} focusable="false"><use href="./icons/${glyph}.svg#icon"></use></svg>`;
}
