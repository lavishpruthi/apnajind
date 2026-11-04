import { esc } from "./Dom.js";

const ICONS = new Set([
  "arrow-left", "bag", "bed", "book", "building", "calendar", "cake", "car", "check",
  "chevron-left", "chevron-right", "copy", "edit", "flag", "heart", "home",
  "basket", "briefcase", "dumbbell", "hammer", "key", "list", "logout",
  "mandi", "party", "phone", "pin", "plus", "scissors", "search", "sofa",
  "share", "shield", "store", "tag", "trash", "users", "utensils", "wrench", "x",
]);

export function icon(name, label = "") {
  const glyph = ICONS.has(name) ? name : "list";
  const accessible = label
    ? `role="img" aria-label="${esc(label)}"`
    : 'aria-hidden="true"';
  return `<svg class="ic" viewBox="0 0 24 24" ${accessible} focusable="false"><use href="./icons/${glyph}.svg#icon"></use></svg>`;
}
