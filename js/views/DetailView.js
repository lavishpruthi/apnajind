import { BaseView } from "./BaseView.js";
import { esc, safeImageSrc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { CodeService } from "../services/CodeService.js";
import { BusinessService } from "../services/BusinessService.js";
import { Toast } from "../core/Toast.js";
import { SavedService } from "../services/SavedService.js";
import { CustomerService } from "../services/CustomerService.js";
import { RecentService } from "../services/RecentService.js";
import { hoursMarkup } from "../core/Hours.js";
import { Locale } from "../core/Locale.js";

export class DetailView extends BaseView {
  static nav = "home";
  static access = "customer";
  constructor(host, id) {
    super(host);
    this.id = id;
  }

  async render() {
    await CodeService.load();
    const business = await BusinessService.get(this.id);
    RecentService.add(business.id);
    const category = CodeService.byCode("CATEGORY", business.category);
    const photos = (business.photos || []).map(safeImageSrc).filter(Boolean);
    const pictures = photos.length
      ? photos
          .map(
            (photo, index) => `<img class="gallery-image" src="${esc(photo)}" alt="Photo of ${esc(business.name)}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer">`,
          )
          .join("")
      : `<div class="gallery-placeholder">${esc((business.name || "?")[0])}</div>`;
    const photoCount = photos.length;
    const saved = SavedService.has(business.id);
    const updatedDate = this.formatDate(business.updated || business.created);
    const map =
      business.lat && business.lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${business.lat},${business.lng}`)}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${business.name} ${business.address} ${business.area || ""} Jind Haryana`)}`;
    this.html = `<div class="detail-toolbar"><a class="btn ghost detail-back" href="${esc(this.returnHash || "#/")}">${icon("arrow-left")}<span>${Locale.t("back")}</span></a><div class="detail-tools"><button class="icon-btn detail-save ${saved ? "is-saved" : ""}" type="button" data-act="save" aria-label="${saved ? "Remove" : "Save"} ${esc(business.name)} ${saved ? "from" : "to"} saved businesses" aria-pressed="${saved}" title="${saved ? "Remove saved listing" : "Save listing"}">${icon("heart")}</button><button class="icon-btn detail-share" type="button" data-act="share" aria-label="Share ${esc(business.name)}" title="Share listing">${icon("share")}</button></div></div>
      <section class="detail-gallery-shell" aria-label="Business photos">
        <div class="gallery" id="business-gallery" role="region" aria-label="Photos of ${esc(business.name)}" tabindex="0">${pictures}</div>
        ${photoCount > 1 ? `<button class="gallery-control gallery-prev" type="button" data-gallery="prev" aria-label="Previous photo">${icon("chevron-left")}</button><button class="gallery-control gallery-next" type="button" data-gallery="next" aria-label="Next photo">${icon("chevron-right")}</button><div class="gallery-footer"><div class="gallery-dots" role="group" aria-label="Choose a photo">${photos.map((_, index) => `<button class="gallery-dot ${index === 0 ? "on" : ""}" type="button" data-slide-to="${index}" aria-label="Show photo ${index + 1}" aria-pressed="${index === 0}"></button>`).join("")}</div><span class="gallery-count" id="gallery-count">1 / ${photoCount}</span></div>` : ""}
      </section><h1 class="detail-title">${esc(business.name)} ${business.verified ? '<span class="verified-badge">✓ ApnaJind verified</span>' : ""}</h1>
      <p class="meta">${esc(category?.description || business.category)} · ${esc(business.area || "Jind")}${updatedDate ? ` · Updated ${esc(updatedDate)}` : ""}</p>
      ${business.availability === "temporarily_closed" ? `<p class="availability-badge closed">${Locale.t("closed")}</p>` : business.availability === "seasonal" ? `<p class="availability-badge seasonal">${Locale.t("seasonal")}</p>` : business.availability === "available" ? `<p class="availability-badge">${Locale.t("available")}</p>` : ""}
      <p class="detail-description">${esc(business.description)}</p>
      <div class="btns">
        <a class="btn ok" href="tel:+91${esc(business.phone)}">${icon("phone")} ${Locale.t("call")}</a>
        ${business.whatsapp ? `<a class="btn ac" target="_blank" rel="noopener noreferrer" href="https://wa.me/91${esc(business.whatsapp)}">WhatsApp</a>` : ""}
        <a class="btn ghost" target="_blank" rel="noopener noreferrer" href="${map}">${icon("pin")} ${Locale.t("directions")}</a>
      </div>
      <section class="box"><h2>${Locale.t("services")}</h2>${(business.services || []).map((service) => `<span class="tag">${esc(service)}</span>`).join("") || '<span class="meta">Not listed</span>'}</section>
      <section class="box"><h2>${Locale.t("hours")}</h2>${hoursMarkup(business.hours, Locale.language)}</section>
      <section class="box"><h2>${Locale.t("location")}</h2><p id="business-address">${esc(business.address)}${business.area ? `, ${esc(business.area)}` : ""}, Jind</p><button class="btn ghost address-copy" type="button" data-act="copy-address">${icon("copy")} Copy address</button></section>
      <section class="box"><h2>${Locale.t("contact")}</h2><p>${esc(business.owner || "Business owner")} · ${esc(business.phone)}</p><details class="listing-report"><summary>Report incorrect listing details</summary><form id="listing-report"><label for="report-reason">What needs correcting?</label><select id="report-reason" required><option value="">Choose a reason</option><option value="wrong_contact">Contact details are wrong</option><option value="wrong_address">Address or area is wrong</option><option value="closed">Business appears closed</option><option value="other">Other issue</option></select><label for="report-details">Details <span class="label-hint">Optional</span></label><textarea id="report-details" rows="3" maxlength="500" placeholder="Help us understand what is out of date"></textarea><button class="btn ghost" type="submit">Send report</button></form></details></section>`;
    document.title = `${business.name} – ApnaJind`;
    this.actions({
      save: (_event, button) => {
        try {
          const isSaved = SavedService.toggle(business.id);
          button.classList.toggle("is-saved", isSaved);
          button.setAttribute("aria-pressed", String(isSaved));
          button.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${business.name} ${isSaved ? "from" : "to"} saved businesses`);
          button.title = isSaved ? "Remove saved listing" : "Save listing";
          Toast.show(isSaved ? "Saved for later." : "Removed from saved businesses.");
        } catch (error) { Toast.show(error.message); }
      },
      share: async () => {
        try {
          if (navigator.share)
            await navigator.share({ title: business.name, url: location.href });
          else {
            await navigator.clipboard.writeText(location.href);
            Toast.show("Link copied");
          }
        } catch (error) {
          if (error.name !== "AbortError")
            Toast.show("Unable to share this listing.");
        }
      },
      "copy-address": async () => {
        try {
          await navigator.clipboard.writeText(`${business.address}${business.area ? `, ${business.area}` : ""}, Jind`);
          Toast.show("Address copied");
        } catch { Toast.show("Could not copy the address on this device."); }
      },
    });
    this.on("#listing-report", "submit", (event) => this.submitReport(event, business.id));
    if (photoCount > 1) this.setupGallery(photoCount);
  }

  formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  async submitReport(event, businessId) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await BusinessService.report({ businessId, reason: this.$("#report-reason").value, details: this.$("#report-details").value.trim() }, CustomerService.token);
      form.reset();
      form.closest("details").open = false;
      Toast.show("Thanks. Your report was sent for review.");
    } catch (error) { Toast.show(error.message); }
    finally { button.disabled = false; }
  }

  setupGallery(count) {
    const gallery = this.$("#business-gallery");
    const shell = this.$(".detail-gallery-shell");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = 0;
    let timer = null;
    let scrollTimer = null;
    let hovering = false;
    let focusing = false;
    let touching = false;
    const clearTimer = () => {
      window.clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      clearTimer();
      if (reduceMotion || document.hidden || hovering || focusing || touching) return;
      timer = window.setTimeout(() => goTo(current + 1, false), 2500);
    };
    const update = () => {
      current = Math.max(0, Math.min(count - 1, Math.round(gallery.scrollLeft / gallery.clientWidth)));
      this.host.querySelectorAll(".gallery-dot").forEach((dot, index) => {
        const active = index === current;
        dot.classList.toggle("on", active);
        dot.setAttribute("aria-pressed", String(active));
      });
      const counter = this.$("#gallery-count");
      if (counter) counter.textContent = `${current + 1} / ${count}`;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(schedule, 180);
    };
    const goTo = (index, userInitiated = true) => {
      current = (index + count) % count;
      if (reduceMotion) gallery.scrollLeft = current * gallery.clientWidth;
      else gallery.scrollTo({ left: current * gallery.clientWidth, behavior: "smooth" });
      if (userInitiated) schedule();
    };
    this.host.querySelectorAll("[data-gallery]").forEach((button) => {
      button.addEventListener("click", () => goTo(current + (button.dataset.gallery === "next" ? 1 : -1)));
    });
    this.host.querySelectorAll("[data-slide-to]").forEach((dot) => {
      dot.addEventListener("click", () => goTo(Number(dot.dataset.slideTo)));
    });
    gallery.addEventListener("scroll", update, { passive: true });
    gallery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(current + (event.key === "ArrowRight" ? 1 : -1));
      }
    });
    gallery.addEventListener("pointerdown", () => { touching = true; clearTimer(); }, { passive: true });
    gallery.addEventListener("pointerup", () => { touching = false; schedule(); }, { passive: true });
    gallery.addEventListener("pointercancel", () => { touching = false; schedule(); }, { passive: true });
    shell.addEventListener("mouseenter", () => { hovering = true; clearTimer(); });
    shell.addEventListener("mouseleave", () => { hovering = false; schedule(); });
    shell.addEventListener("focusin", () => { focusing = true; clearTimer(); });
    shell.addEventListener("focusout", () => { focusing = false; schedule(); });
    const onVisibility = () => document.hidden ? clearTimer() : schedule();
    document.addEventListener("visibilitychange", onVisibility);
    this.destroy = () => {
      clearTimer();
      window.clearTimeout(scrollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    schedule();
  }
}
