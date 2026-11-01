import { BaseView } from "./BaseView.js";
import { esc, safeImageSrc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { CodeService } from "../services/CodeService.js";
import { BusinessService } from "../services/BusinessService.js";
import { SavedService } from "../services/SavedService.js";
import { Toast } from "../core/Toast.js";
import { RecentService } from "../services/RecentService.js";
import { Locale } from "../core/Locale.js";

export class SavedView extends BaseView {
  static nav = "saved";
  static access = "customer";

  async render() {
    await CodeService.load();
    const savedIds = new Set(SavedService.list());
    const allBusinesses = await BusinessService.list();
    const businesses = allBusinesses.filter((business) => savedIds.has(String(business.id)));
    const recentIds = new Set(RecentService.list());
    const businessById = new Map(allBusinesses.map((business) => [String(business.id), business]));
    const recent = RecentService.list().map((id) => businessById.get(id)).filter(Boolean);
    const notice = BusinessService.offline ? '<p class="network-notice" role="status">Offline: these are saved listings from this device.</p>' : "";
    this.html = `${notice}<header class="saved-heading"><p class="hero-kicker">Your shortlist</p><h1>${Locale.t("savedTitle")}</h1><p class="intro">Places you’ve kept for later.</p></header>
      <section class="listing-section"><h2>${Locale.t("savedTitle")}</h2>${businesses.length ? businesses.map((business) => this.card(business)).join("") : '<div class="empty"><h2>No saved businesses yet</h2><p>Tap the heart on a listing to keep it here.</p><a class="btn" href="#/">Explore businesses</a></div>'}</section>
      <section class="listing-section"><h2>${Locale.t("recentTitle")}</h2>${recent.length ? recent.map((business) => this.card(business, !savedIds.has(String(business.id)))).join("") : '<div class="empty"><p>Businesses you open will appear here for easy access.</p></div>'}</section>`;
    this.host.querySelectorAll("[data-save]").forEach((button) => button.addEventListener("click", async () => {
      try {
        SavedService.toggle(button.dataset.save);
        await this.render();
      } catch (error) { Toast.show(error.message); }
    }));
  }

  card(business, recentOnly = false) {
    const category = CodeService.byCode("CATEGORY", business.category);
    const image = safeImageSrc(business.photos?.[0]);
    const thumb = image
      ? `<img class="business-thumb" src="${esc(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : `<div class="business-thumb thumb-placeholder" aria-hidden="true">${esc((business.name || "?")[0])}</div>`;
    const saved = SavedService.has(business.id);
    return `<article class="business-card"><a class="business-card-main" href="#/b/${encodeURIComponent(business.id)}">${thumb}<div class="business-content"><h3>${esc(business.name)}${business.verified ? ' <span class="verified-inline" title="ApnaJind verified">✓</span>' : ""}</h3><p class="meta">${esc(category?.description || business.category)} · ${esc(business.area || "Jind")}</p><div>${(business.services || []).slice(0, 3).map((service) => `<span class="tag">${esc(service)}</span>`).join("")}</div></div></a>${!recentOnly || saved ? `<button class="save-toggle ${saved ? "is-saved" : ""}" type="button" data-save="${esc(business.id)}" aria-label="${saved ? "Remove" : "Save"} ${esc(business.name)} ${saved ? "from" : "to"} saved businesses" aria-pressed="${saved}">${icon("heart")}</button>` : ""}</article>`;
  }
}
