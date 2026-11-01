export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

/** Image URLs are data from listings or browser storage; allow only HTTPS and raster image data URLs. */
export function safeImageSrc(value) {
  const source = String(value ?? "").trim();
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/]+=*$/i.test(source))
    return source;
  try {
    const url = new URL(source, location.origin);
    return !url.username && !url.password &&
      (url.protocol === "https:" || url.origin === location.origin)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function metaValue(meta, key) {
  const entry = String(meta || "")
    .split(";")
    .find((item) => item.trim().startsWith(`${key}=`));
  return entry ? entry.trim().slice(key.length + 1) : "";
}
