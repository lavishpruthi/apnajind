const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function parseHours(value) {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || "null") || null; } catch { return null; }
}

export function formatHours(value, { compact = false, language = "en" } = {}) {
  const schedule = parseHours(value);
  if (!schedule) return typeof value === "string" ? value : "";
  return DAYS.map((day, index) => {
    const entry = schedule[day];
    if (!entry) return "";
    const label = compact ? (language === "hi" ? ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"][index] : DAY_NAMES[index].slice(0, 3)) : DAY_NAMES[index];
    return `${label}: ${entry.closed ? language === "hi" ? "बंद" : "Closed" : `${entry.open || "—"}–${entry.close || "—"}`}`;
  }).filter(Boolean).join(compact ? " · " : "\n");
}

export function isOpenNow(value, now = new Date()) {
  const schedule = parseHours(value);
  if (!schedule) return false;
  const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(now).toLowerCase().slice(0, 3);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":").map(Number);
  const current = parts[0] * 60 + parts[1];
  const minutes = (time) => /^\d{2}:\d{2}$/.test(time || "") ? time.split(":").map(Number).reduce((hour, minute) => hour * 60 + minute) : NaN;
  const today = schedule[day];
  const todayOpen = minutes(today?.open);
  const todayClose = minutes(today?.close);
  if (today && !today.closed && Number.isFinite(todayOpen) && Number.isFinite(todayClose) && (todayOpen < todayClose ? current >= todayOpen && current < todayClose : current >= todayOpen)) return true;
  const previousDay = weekdays[(weekdays.indexOf(day) + 6) % 7];
  const previous = schedule[previousDay];
  const previousOpen = minutes(previous?.open);
  const previousClose = minutes(previous?.close);
  return Boolean(previous && !previous.closed && Number.isFinite(previousOpen) && Number.isFinite(previousClose) && previousOpen > previousClose && current < previousClose);
}

export function hoursMarkup(value, language = "en") {
  const schedule = parseHours(value);
  if (!schedule) return value ? `<p>${escapeHtml(String(value))}</p>` : "<p>Hours haven’t been added yet. Please call to confirm before visiting.</p>";
  const names = language === "hi" ? ["सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"] : DAY_NAMES;
  const closedLabel = language === "hi" ? "बंद" : "Closed";
  return `<dl class="hours-list">${DAYS.map((day, index) => {
    const entry = schedule[day] || { closed: true };
    const times = `${escapeHtml(String(entry.open || "—"))}–${escapeHtml(String(entry.close || "—"))}`;
    return `<div><dt>${names[index]}</dt><dd>${entry.closed ? closedLabel : times}</dd></div>`;
  }).join("")}</dl>`;
}

export function scheduleFields(value) {
  const current = parseHours(value) || {};
  return DAYS.map((day, index) => {
    const entry = current[day] || {};
    return `<fieldset class="hours-day"><legend>${DAY_NAMES[index]}</legend><label class="hours-closed"><input type="checkbox" name="hours-${day}-closed" ${entry.closed || (!entry.open && !entry.close) ? "checked" : ""}> Closed</label><div class="hours-times"><label>Opens<input type="time" name="hours-${day}-open" value="${/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.open || "") ? entry.open : "09:00"}" ${entry.closed ? "disabled" : ""}></label><label>Closes<input type="time" name="hours-${day}-close" value="${/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.close || "") ? entry.close : "17:00"}" ${entry.closed ? "disabled" : ""}></label></div></fieldset>`;
  }).join("");
}

export function readSchedule(form) {
  const schedule = {};
  for (const day of DAYS) {
    const closed = form.elements[`hours-${day}-closed`].checked;
    const open = form.elements[`hours-${day}-open`].value;
    const close = form.elements[`hours-${day}-close`].value;
    if (!closed && (!open || !close || open === close)) throw new Error("Set valid opening and closing times, or mark each day closed.");
    schedule[day] = { closed, open: closed ? "" : open, close: closed ? "" : close };
  }
  return schedule;
}

export function dayNames() { return [...DAY_NAMES]; }

function escapeHtml(value) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
