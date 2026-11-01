import { BaseView } from "./BaseView.js";
import { esc, metaValue, safeImageSrc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { CodeService } from "../services/CodeService.js";
import { BusinessService } from "../services/BusinessService.js";
import { SavedService } from "../services/SavedService.js";
import { Toast } from "../core/Toast.js";
import { isOpenNow, formatHours } from "../core/Hours.js";
import { Locale } from "../core/Locale.js";

let sessionSearchLocation = null;

export class HomeView extends BaseView {
  static nav = "home";
  static access = "customer";

  constructor(host, routeValue) {
    super(host);
    this.routeValue = routeValue || "";
  }

  async render() {
    await CodeService.load();
    const path = location.hash.slice(1).split("/");
    const isSearch = path[1] === "s";
    const isCategory = path[1] === "c";
    const term = isSearch ? this.routeValue.toLocaleLowerCase() : "";
    const selectedCategory = isCategory ? this.routeValue : "";
    const query = new URLSearchParams(location.hash.split("?")[1] || "");
    const categoryFilter = query.get("category") || selectedCategory;
    const areaFilter = query.get("area") || "all";
    const sortFilter = query.get("sort") || "featured";
    const openFilter = query.get("open") === "1";
    const verifiedFilter = query.get("verified") === "1";
    const geo = this.readGeo();
    const categories = CodeService.list("CATEGORY");
    const areas = CodeService.list("AREA");
    let businesses = await BusinessService.list();

    if (categoryFilter)
      businesses = businesses.filter(
        (item) => item.category === categoryFilter,
      );
    if (areaFilter !== "all") businesses = businesses.filter((item) => item.area === areaFilter);
    if (openFilter) businesses = businesses.filter((item) => item.availability !== "temporarily_closed" && isOpenNow(item.hours));
    if (verifiedFilter) businesses = businesses.filter((item) => item.verified);
    if (term) {
      businesses = businesses.filter((item) =>
        [
          item.name,
          item.category,
          CodeService.byCode("CATEGORY", item.category)?.description,
          item.area,
          CodeService.byCode("AREA", item.area)?.description,
          item.address,
          item.description,
          (item.services || []).join(" "),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term),
      );
    }
    businesses.sort(sortFilter === "name"
      ? (left, right) => left.name.localeCompare(right.name)
      : sortFilter === "nearest" && geo
        ? (left, right) => this.distance(left, geo) - this.distance(right, geo)
        : (left, right) => Number(right.featured) - Number(left.featured));
    const hasActiveFilter = Boolean(categoryFilter || areaFilter !== "all" || openFilter || verifiedFilter || query.has("sort"));
    const visible = selectedCategory || term || hasActiveFilter ? businesses : businesses.slice(0, 30);
    const title = term
      ? `Results for “${esc(this.routeValue)}”`
      : selectedCategory
        ? esc(
            CodeService.byCode("CATEGORY", selectedCategory)?.description ||
              selectedCategory,
          )
        : "Everything in Jind, one place";
    const categoryCards =
      !selectedCategory && !term
        ? `<section class="category-section"><div class="section-heading"><div><p class="section-kicker">Explore Jind</p><h2>Find your kind of place</h2></div><p>Little local favourites, all around you.</p></div><div class="cats">${categories
            .map(
              (category) => `
      <a class="cat" href="#/c/${encodeURIComponent(category.code)}">
        <span class="cat-icon">${icon(metaValue(category.meta, "icon") || "list")}</span><span class="cat-label">${esc(category.description)}</span>
      </a>`,
            )
            .join("")}</div></section>`
        : "";
    const filters = `<form id="listing-filters" class="listing-filters" aria-label="Filter businesses">
          <label>${Locale.t("category")}<select name="category">${this.selectOptions(categories, categoryFilter, "All categories")}</select></label>
          <label>${Locale.t("area")}<select name="area">${this.selectOptions(areas, areaFilter, "All areas", "all")}</select></label>
          <label>${Locale.t("sort")}<select name="sort"><option value="featured" ${sortFilter === "featured" ? "selected" : ""}>${Locale.t("featured")}</option><option value="name" ${sortFilter === "name" ? "selected" : ""}>${Locale.t("name")}</option><option value="nearest" ${sortFilter === "nearest" ? "selected" : ""}>${Locale.t("nearest")}</option></select></label>
          <label class="filter-check"><input type="checkbox" name="open" ${openFilter ? "checked" : ""}> ${Locale.t("openNow")}</label><label class="filter-check"><input type="checkbox" name="verified" ${verifiedFilter ? "checked" : ""}> ${Locale.t("verified")}</label>
          <span class="filter-count" aria-live="polite">${businesses.length} ${businesses.length === 1 ? "business" : "businesses"}</span>
          <a class="filter-clear" href="${term ? `#/s/${encodeURIComponent(this.routeValue)}` : "#/"}">${Locale.t("clear")}</a>
        </form>`;
    const savedCopyNotice = BusinessService.offline || CodeService.offline
      ? '<p class="network-notice" role="status">You’re offline. Showing the listings saved on this device.</p>'
      : BusinessService.usingSavedCopy
        ? '<p class="network-notice" role="status">Showing listings saved on this device.</p>'
        : "";

    const featuredBusiness = !selectedCategory && !term ? businesses.find((item) => item.photos?.some((photo) => safeImageSrc(photo))) : null;
    const featuredPhoto = featuredBusiness ? safeImageSrc(featuredBusiness.photos?.find((photo) => safeImageSrc(photo))) : "";
    this.html = `${savedCopyNotice}${!selectedCategory && !term
      ? `<section class="home-hero ${featuredPhoto ? "has-feature-photo" : ""}"><div class="hero-copy"><p class="hero-kicker"><span class="hero-live-dot"></span> YOUR TOWN, YOUR FINDS</p><h1>Good places.<br><em>Closer to home.</em></h1><p class="intro">Discover the people and places that make Jind feel like yours.</p><button class="hero-explore" type="button" data-scroll-target="listing-start">Explore local <span aria-hidden="true">↓</span></button></div>${featuredBusiness ? `<a class="hero-feature" href="#/b/${encodeURIComponent(featuredBusiness.id)}" aria-label="Discover ${esc(featuredBusiness.name)}"><span class="hero-feature-photo">${featuredPhoto ? `<img src="${esc(featuredPhoto)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">` : ""}</span><span class="hero-feature-label"><span class="hero-feature-kicker">A local favourite</span><strong>${esc(featuredBusiness.name)}</strong><span>${esc(featuredBusiness.area || "Jind")} <span aria-hidden="true">↗</span></span></span></a>` : `<div class="hero-art" aria-hidden="true"><span class="hero-art-orbit orbit-one"></span><span class="hero-art-orbit orbit-two"></span><span class="hero-art-sun"></span><span class="hero-art-word">अपना<br>JIND</span></div>`}</section>`
      : `<h1>${title}</h1><p class="intro">Shops, food, doctors, tutors and services near you</p>`}
      ${categoryCards}${filters}<section class="listing-section" id="listing-start"><div class="section-heading"><div><p class="section-kicker">${selectedCategory || term || hasActiveFilter ? "YOUR SEARCH" : "MADE FOR JIND"}</p><h2>${selectedCategory || term || hasActiveFilter ? "Businesses" : "Worth a visit"}</h2></div>${!selectedCategory && !term && !hasActiveFilter ? '<p>Good people. Great places. Right here.</p>' : ''}</div>
      ${visible.length ? visible.map((business) => this.card(business, geo)).join("") : `<div class="empty"><h2>${Locale.t("noResults")}</h2><p>${Locale.t("suggestions")}</p><a class="btn ghost" href="${term ? `#/s/${encodeURIComponent(this.routeValue)}` : "#/"}">${Locale.t("clear")}</a><div class="empty-suggestions"><strong>Browse categories</strong><div>${categories.slice(0, 6).map((item) => `<a class="tag" href="#/c/${encodeURIComponent(item.code)}">${esc(item.description)}</a>`).join("")}</div><strong>Explore areas</strong><div>${areas.slice(0, 6).map((item) => `<a class="tag" href="#/?area=${encodeURIComponent(item.code)}">${esc(item.description)}</a>`).join("")}</div></div></div>`}`;
    this.host.innerHTML += '</section>';
    this.$("[data-scroll-target]")?.addEventListener("click", () => this.$(`#${this.$("[data-scroll-target]").dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    this.$("#listing-filters")?.addEventListener("change", async (event) => {
      const form = event.currentTarget;
      if (form.elements.sort.value === "nearest" && !this.readGeo()) {
        try { await this.locate(); }
        catch { Toast.show("Allow location access to sort businesses by distance."); form.elements.sort.value = "featured"; return; }
      }
      const params = new URLSearchParams();
      const category = form.elements.category.value;
      const area = form.elements.area.value;
      const sort = form.elements.sort.value;
      if (form.elements.open.checked) params.set("open", "1");
      if (form.elements.verified.checked) params.set("verified", "1");
      if (category) params.set("category", category);
      if (area && area !== "all") params.set("area", area);
      if (sort !== "featured") params.set("sort", sort);
      const base = term ? `#/s/${encodeURIComponent(this.routeValue)}` : category ? `#/c/${encodeURIComponent(category)}` : "#/";
      const queryString = params.toString();
      location.hash = queryString ? `${base}?${queryString}` : base;
    });
    this.bindSaveButtons();
  }

  selectOptions(records, selected, emptyLabel, emptyValue = "") {
    return `<option value="${esc(emptyValue)}" ${selected === emptyValue ? "selected" : ""}>${esc(emptyLabel)}</option>${records.map((record) => `<option value="${esc(record.code)}" ${record.code === selected ? "selected" : ""}>${esc(record.description)}</option>`).join("")}`;
  }

  bindSaveButtons() {
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

  readGeo() { try { const pos = JSON.parse(sessionStorage.getItem("apnajind_search_location") || "null") || sessionSearchLocation; return Number.isFinite(pos?.lat) && Number.isFinite(pos?.lng) ? pos : null; } catch { return sessionSearchLocation; } }
  locate() { return new Promise((resolve, reject) => { if (!navigator.geolocation) return reject(); navigator.geolocation.getCurrentPosition((position) => { const value = { lat: position.coords.latitude, lng: position.coords.longitude }; sessionSearchLocation = value; try { sessionStorage.setItem("apnajind_search_location", JSON.stringify(value)); } catch { /* Keep location in memory for this results view. */ } resolve(value); }, reject, { enableHighAccuracy: false, maximumAge: 300000, timeout: 12000 }); }); }
  distance(business, geo) { if (business.lat === "" || business.lng === "" || business.lat == null || business.lng == null || !Number.isFinite(Number(business.lat)) || !Number.isFinite(Number(business.lng))) return Infinity; const rad = (n) => n * Math.PI / 180; const dLat = rad(Number(business.lat) - geo.lat); const dLng = rad(Number(business.lng) - geo.lng); const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(geo.lat)) * Math.cos(rad(Number(business.lat))) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }

  card(business, geo) {
    const category = CodeService.byCode("CATEGORY", business.category);
    const image = safeImageSrc(business.photos?.[0]);
    const thumb = image
      ? `<img class="business-thumb" src="${esc(image)}" alt="${esc(business.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : `<div class="business-thumb thumb-placeholder">${esc((business.name || "?")[0])}</div>`;
    const saved = SavedService.has(business.id);
    const hours = formatHours(business.hours, { compact: true, language: Locale.language });
    const distance = geo ? this.distance(business, geo) : Infinity;
    const availability = business.availability === "temporarily_closed" ? Locale.t("closed") : business.availability === "seasonal" ? Locale.t("seasonal") : Locale.t("available");
    return `<article class="business-card discover-card"><a class="business-card-main" href="#/b/${encodeURIComponent(business.id)}">
      <span class="discover-photo-wrap">${thumb}<span class="discover-photo-shade"></span><span class="discover-photo-area">${icon("pin")}${esc(business.area || "Jind")}</span></span><div class="business-content">
        <div class="discover-title-row"><h3>${esc(business.name)}${business.featured ? ' <span class="star" aria-label="Featured">★</span>' : ""}${business.verified ? ' <span class="verified-inline" title="ApnaJind verified">✓</span>' : ""}</h3></div>
        <p class="meta">${esc(category?.description || business.category)} · ${esc(business.area || "Jind")}</p>
        <p class="business-meta-line"><span>${esc(availability)}</span>${hours ? `<span>${esc(hours)}</span>` : ""}${Number.isFinite(distance) ? `<span>${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km</span>` : ""}</p>
        <div>${(business.services || [])
          .slice(0, 3)
          .map((service) => `<span class="tag">${esc(service)}</span>`)
          .join("")}</div>
      </div>
    </a><button class="save-toggle ${saved ? "is-saved" : ""}" type="button" data-save="${esc(business.id)}" data-name="${esc(business.name)}" aria-label="${saved ? "Remove" : "Save"} ${esc(business.name)} ${saved ? "from" : "to"} saved businesses" aria-pressed="${saved}">${icon("heart")}</button></article>`;
  }
}
