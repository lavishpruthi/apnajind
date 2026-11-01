import { BaseView } from "./BaseView.js";
import { esc, metaValue, safeImageSrc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { CodeService } from "../services/CodeService.js";
import { BusinessService } from "../services/BusinessService.js";
import { SavedService } from "../services/SavedService.js";
import { Toast } from "../core/Toast.js";

export class FoodView extends BaseView {
  static nav = "food";
  static access = "customer";
  async render() {
    await CodeService.load();
    const [businesses, categories, areas] = await Promise.all([
      BusinessService.list(),
      Promise.resolve(
        CodeService.list("CATEGORY").filter(
          (category) => metaValue(category.meta, "food") === "1",
        ),
      ),
      Promise.resolve(CodeService.list("AREA")),
    ]);
    const categoryCodes = new Set(categories.map((category) => category.code));
    const foods = businesses.filter((business) =>
      categoryCodes.has(business.category),
    );
    const selectedArea =
      new URLSearchParams(location.hash.split("?")[1] || "").get("area") ||
      "all";
    const availableAreas = areas.filter((area) =>
      foods.some((business) => business.area === area.code),
    );
    const areaButtons = ["all", ...availableAreas.map((area) => area.code)]
      .map(
        (code) => `
      <a class="chip ${selectedArea === code ? "on" : ""}" href="#/food?area=${encodeURIComponent(code)}">${esc(code === "all" ? "All areas" : areas.find((area) => area.code === code)?.description || code)}</a>`,
      )
      .join("");
    const shown = foods
      .filter(
        (business) => selectedArea === "all" || business.area === selectedArea,
      )
      .sort((left, right) => Number(right.featured) - Number(left.featured));

    const notice = BusinessService.offline || CodeService.offline ? '<p class="network-notice" role="status">Offline: showing food listings saved on this device.</p>' : "";
    this.html = `${notice}<h1>Best food spots in Jind</h1><div class="chips">${areaButtons}</div>
      <section class="listing-section">${shown.length ? shown.map((business) => this.businessCard(business, categories, areas)).join("") : '<div class="empty">No food listings found for this area.</div>'}</section>`;
    this.host.querySelectorAll("[data-save]").forEach((button) => button.addEventListener("click", () => {
      try {
        const saved = SavedService.toggle(button.dataset.save);
        button.classList.toggle("is-saved", saved);
        button.setAttribute("aria-pressed", String(saved));
        button.setAttribute("aria-label", `${saved ? "Remove" : "Save"} ${button.dataset.name} ${saved ? "from" : "to"} saved businesses`);
        Toast.show(saved ? "Saved for later." : "Removed from saved businesses.");
      } catch (error) { Toast.show(error.message); }
    }));
  }

  businessCard(business, categories, areas) {
    const category = categories.find((item) => item.code === business.category);
    const area = areas.find((item) => item.code === business.area);
    const photo = safeImageSrc(business.photos?.[0]);
    const saved = SavedService.has(business.id);
    return `<article class="business-card"><a class="business-card-main" href="#/b/${encodeURIComponent(business.id)}">
      ${photo ? `<img class="business-thumb" src="${esc(photo)}" alt="${esc(business.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<div class="business-thumb thumb-placeholder">${esc((business.name || "?")[0])}</div>`}
      <div class="business-content"><h3>${esc(business.name)}${business.featured ? ' <span class="star">★</span>' : ""}${business.verified ? ' <span class="verified-inline" title="ApnaJind verified">✓</span>' : ""}</h3>
      <p class="meta">${esc(category?.description || business.category)} · ${esc(area?.description || business.area || "Jind")}</p>
      <div>${(business.services || [])
        .slice(0, 3)
        .map((service) => `<span class="tag">${esc(service)}</span>`)
        .join("")}</div></div>
    </a><button class="save-toggle ${saved ? "is-saved" : ""}" type="button" data-save="${esc(business.id)}" data-name="${esc(business.name)}" aria-label="${saved ? "Remove" : "Save"} ${esc(business.name)} ${saved ? "from" : "to"} saved businesses" aria-pressed="${saved}">${icon("heart")}</button></article>`;
  }
}
