import { BaseView } from "./BaseView.js";
import { esc, metaValue, safeImageSrc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { CodeService } from "../services/CodeService.js";
import { BusinessService } from "../services/BusinessService.js";
import { SavedService } from "../services/SavedService.js";
import { Toast } from "../core/Toast.js";
import { isOpenNow, formatHours } from "../core/Hours.js";
import { Locale } from "../core/Locale.js";
import { DiscoveryService } from "../services/DiscoveryService.js";
import { SessionStore } from "../services/SessionStore.js";

let sessionSearchLocation = null;

const JIND_SPOTS = [
  { name: "Rani Talab", subtitle: "Bhuteshwar Temple & the historic tank", icon: "home", map: "Rani Talab, Jind, Haryana", tone: "rani" },
  { name: "Jind Bus Stand", subtitle: "Gohana Road, Jind", icon: "car", map: "Jind Bus Stand, Gohana Road, Jind, Haryana", tone: "bus" },
  { name: "Jind Junction", subtitle: "Jind Railway Station", icon: "building", map: "Jind Junction Railway Station, Jind, Haryana", tone: "rail" },
  { name: "Pandu Pindara", subtitle: "About 6.5 km via Jind–Gohana Road", icon: "pin", map: "Pandu Pindara, Jind, Haryana", tone: "pindara" },
];

const CATEGORY_ICONS = {
  MANDI: "mandi",
  HOME: "sofa",
  GROCERY: "basket",
  HARDWARE: "hammer",
  "PRO-SERV": "briefcase",
  EVENTS: "party",
  FITNESS: "dumbbell",
};

export class HomeView extends BaseView {
  static nav = "home";
  static access = "public";

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
    const [offers, events] = await Promise.all([
      DiscoveryService.offers().catch(() => []),
      DiscoveryService.events().catch(() => []),
    ]);

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
        : (left, right) => Number(right.featured) - Number(left.featured) || Number(right.verified) - Number(left.verified));
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
    const categoryCards = !selectedCategory && !term
      ? `<section class="category-section"><div class="section-heading"><div><p class="section-kicker">Explore Jind</p><h2>Find your kind of place</h2></div><p>Tap a category to see its businesses.</p></div><div class="cats category-stories">${categories
          .map((category) => `<a class="cat" href="#/c/${encodeURIComponent(category.code)}" aria-label="Browse ${esc(category.description)} businesses"><span class="cat-story-ring"><span class="cat-icon">${icon(metaValue(category.meta, "icon") || CATEGORY_ICONS[category.code] || "list")}</span></span><span class="cat-label">${esc(category.description)}</span></a>`)
          .join("")}</div></section>`
      : "";
    const jindNeighborhoods = !selectedCategory && !term
      ? `<section class="jind-neighborhoods"><div class="section-heading"><div><p class="section-kicker">YOUR SIDE OF JIND</p><h2>Explore by neighbourhood</h2></div><p>Find a good spot close to your route.</p></div><div class="neighborhood-rail">${areas.slice(0, 8).map((area, index) => {
          const count = businesses.filter((business) => business.area === area.code).length;
          return `<a class="neighborhood-card neighborhood-tone-${index % 4}" href="#/?area=${encodeURIComponent(area.code)}"><span class="neighborhood-index">0${index + 1}</span><strong>${esc(area.description)}</strong><span>${count} ${count === 1 ? "place" : "places"} <b aria-hidden="true">↗</b></span></a>`;
        }).join("")}</div></section>`
      : "";
    const jindSpots = !selectedCategory && !term
      ? `<section class="jind-spots-section"><div class="section-heading"><div><p class="section-kicker">YOUR CITY, YOUR WAY</p><h2>Jind spots &amp; directions</h2></div><p>Tap a place to open directions in Maps.</p></div><div class="jind-spots-rail">${JIND_SPOTS.map((spot, index) => `<article class="jind-spot-card jind-spot-${spot.tone}"><div class="jind-spot-art" aria-hidden="true"><span class="jind-spot-orbit"></span><span class="jind-spot-landmark">${icon(spot.icon)}</span><span class="jind-spot-number">0${index + 1}</span></div><div class="jind-spot-copy"><span class="jind-spot-label">JIND LOCAL SPOT</span><h3>${esc(spot.name)}</h3><p>${esc(spot.subtitle)}</p><a href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent(spot.map)}" target="_blank" rel="noopener noreferrer" aria-label="Get directions to ${esc(spot.name)}">Get directions <span aria-hidden="true">↗</span></a></div></article>`).join("")}</div></section><section class="about-jind-card"><div class="about-jind-mark" aria-hidden="true"><span>जींद</span><b>JIND</b><i>HARYANA</i></div><div class="about-jind-copy"><p class="section-kicker">A LITTLE ABOUT OUR CITY</p><h2>Jind, apna sa.</h2><p>Jind is the district headquarters in central Haryana. From the Bhuteshwar Temple beside Rani Talab to the everyday bustle around its neighbourhoods, this directory is made to help locals discover their own city.</p><a href="https://jind.gov.in/about-district/" target="_blank" rel="noopener noreferrer">Discover Jind from the district site <span aria-hidden="true">↗</span></a></div></section>`
      : "";
    const dealRail = !selectedCategory && !term && offers.length
      ? `<section class="deal-section"><div class="section-heading"><div><p class="section-kicker">GOOD THINGS HAPPEN LOCALLY</p><h2>Offers around Jind</h2></div><span class="deal-count">${offers.length} current</span></div><div class="deal-rail">${offers.slice(0, 8).map((offer) => `<article class="deal-card"><p class="deal-shop">${icon("store")} ${esc(offer.businessName)}</p><h3>${esc(offer.title)}</h3><p>${esc(offer.description)}</p>${offer.promoCode ? `<button type="button" class="deal-code" data-copy-offer="${esc(offer.promoCode)}" aria-label="Copy offer code ${esc(offer.promoCode)}"><span>CODE</span><strong>${esc(offer.promoCode)}</strong><small>Tap to copy</small></button>` : ""}<a href="#/b/${encodeURIComponent(offer.businessId)}">View offer <span aria-hidden="true">→</span></a></article>`).join("")}</div></section>`
      : "";
    const eventRail = !selectedCategory && !term && events.length
      ? `<section class="jind-events-section"><div class="section-heading"><div><p class="section-kicker">MARK YOUR CALENDAR</p><h2>What's on in Jind</h2></div><a class="rail-link" href="#/events">All events <span aria-hidden="true">→</span></a></div><div class="jind-event-rail">${events.slice(0, 5).map((event) => `<a class="jind-event-card" href="#/events"><span class="jind-event-date">${esc(new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(event.startsAt)))}</span><span class="jind-event-info"><strong>${esc(event.title)}</strong><small>${esc(event.location)} · Jind</small></span><span class="jind-event-arrow" aria-hidden="true">↗</span></a>`).join("")}</div></section>`
      : "";
    const categoryBanners = !selectedCategory && !term
      ? `<section class="spotlight-section" aria-label="Explore local categories"><div class="section-heading"><div><p class="section-kicker">A LITTLE INSPIRATION</p><h2>Make a day of it</h2></div><p>Good finds, just around the corner.</p></div><div class="spotlight-rail">${categories.slice(0, 4).map((category, index) => {
          const match = businesses.find((business) => business.category === category.code && business.photos?.some((photo) => safeImageSrc(photo)));
          const photo = match ? safeImageSrc(match.photos.find((item) => safeImageSrc(item))) : "";
          const count = businesses.filter((business) => business.category === category.code).length;
          return `<a class="spotlight-banner spotlight-tone-${index % 4}" href="#/c/${encodeURIComponent(category.code)}" aria-label="Explore ${esc(category.description)} businesses">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="spotlight-art" aria-hidden="true">${icon(metaValue(category.meta, "icon") || "list")}</span>`}<span class="spotlight-shade"></span><span class="spotlight-copy"><span class="spotlight-kicker">${count} ${count === 1 ? "LOCAL FIND" : "LOCAL FINDS"}</span><strong>${esc(category.description)}</strong><span class="spotlight-cta">Explore category <b aria-hidden="true">↗</b></span></span></a>`;
        }).join("")}</div></section>`
      : "";
    const localPicks = !selectedCategory && !term && businesses.length
      ? `<section class="local-picks"><div class="section-heading"><div><p class="section-kicker">FEATURED &amp; VERIFIED IN JIND</p><h2>Businesses worth knowing</h2></div><a class="rail-link" href="#listing-start">See all <span aria-hidden="true">→</span></a></div><div class="business-rail">${businesses.slice(0, 8).map((business) => this.card(business, geo)).join("")}</div></section>`
      : "";
    const promotionCta = !selectedCategory && !term && SessionStore.read("apnajind_merchant_token")
      ? `<section class="home-promotion-cta"><span class="promotion-cta-icon">${icon("store")}</span><div><p class="section-kicker">FOR JIND BUSINESSES</p><h2>Ready to reach more local customers?</h2><p>Ask about featured listings, category spotlights and sponsored banners.</p></div><a class="btn ac" href="#/promote">Promote your business <span aria-hidden="true">→</span></a></section>`
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
    const slide = (tone, href, kicker, heading, sub, cta, photo, art) =>
      `<a class="banner-slide banner-tone-${tone}" href="${href}">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="banner-art" aria-hidden="true">${icon(art)}</span>`}<span class="banner-shade"></span><span class="banner-copy"><span class="banner-kicker">${kicker}</span><strong>${heading}</strong>${sub ? `<span class="banner-sub">${sub}</span>` : ""}<span class="banner-cta">${cta} <b aria-hidden="true">→</b></span></span></a>`;
    const extraSlides = [];
    if (offers.length) extraSlides.push(slide(1, `#/b/${encodeURIComponent(offers[0].businessId)}`, "OFFER AROUND JIND", esc(offers[0].title), esc(offers[0].businessName), "View offer", "", "tag"));
    if (events.length) extraSlides.push(slide(2, "#/events", "COMING UP", esc(events[0].title), `${esc(new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(events[0].startsAt)))} · ${esc(events[0].location)}`, "See all events", "", "calendar"));
    categories.slice(0, 3).forEach((category, index) => {
      const match = businesses.find((business) => business.category === category.code && business.photos?.some((photo) => safeImageSrc(photo)));
      const photo = match ? safeImageSrc(match.photos.find((item) => safeImageSrc(item))) : "";
      extraSlides.push(slide(index % 3, `#/c/${encodeURIComponent(category.code)}`, "EXPLORE", esc(category.description), "", "Browse places", photo, metaValue(category.meta, "icon") || "list"));
    });
    extraSlides.push(slide(2, "#/promote", "FOR JIND BUSINESSES", "Reach more local customers", "Featured listings and sponsored banners", "Promote your business", "", "store"));
    this.html = `${savedCopyNotice}${!selectedCategory && !term
      ? `<section class="banner-slider" aria-roledescription="carousel" aria-label="Highlights"><div class="banner-track"><section class="home-hero banner-slide ${featuredPhoto ? "has-feature-photo" : ""}"><div class="hero-copy"><p class="hero-kicker"><span class="hero-live-dot"></span> YOUR TOWN, YOUR FINDS</p><h1>Good places.<br><em>Closer to home.</em></h1><p class="intro">Discover the people and places that make Jind feel like yours.</p><div class="hero-actions"><button class="hero-explore" type="button" data-scroll-target="listing-start">Explore local <span aria-hidden="true">↓</span></button><a class="hero-map-link" href="#/map">Find on map ${icon("pin")}</a><a class="hero-map-link" href="#/events">Jind events ${icon("calendar")}</a></div></div>${featuredBusiness ? `<a class="hero-feature" href="#/b/${encodeURIComponent(featuredBusiness.id)}" aria-label="Discover ${esc(featuredBusiness.name)}"><span class="hero-feature-photo">${featuredPhoto ? `<img src="${esc(featuredPhoto)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">` : ""}</span><span class="hero-feature-label"><span class="hero-feature-kicker">A local favourite</span><strong>${esc(featuredBusiness.name)}</strong><span>${esc(featuredBusiness.area || "Jind")} <span aria-hidden="true">↗</span></span></span></a>` : `<div class="hero-art" aria-hidden="true"><span class="hero-art-orbit orbit-one"></span><span class="hero-art-orbit orbit-two"></span><span class="hero-art-sun"></span><span class="hero-art-word">अपना<br>JIND</span></div>`}</section>${extraSlides.join("")}</div><div class="banner-dots" role="tablist" aria-label="Choose slide"></div></section>`
      : `<h1>${title}</h1><p class="intro">Shops, food, doctors, tutors and services near you</p>`}
      ${categoryCards}${jindSpots}${dealRail}${eventRail}${jindNeighborhoods}${categoryBanners}${localPicks}${promotionCta}${filters}<section class="listing-section" id="listing-start"><div class="section-heading"><div><p class="section-kicker">${selectedCategory || term || hasActiveFilter ? "YOUR SEARCH" : "MADE FOR JIND"}</p><h2>${selectedCategory || term || hasActiveFilter ? "Businesses" : "Worth a visit"}</h2></div>${!selectedCategory && !term && !hasActiveFilter ? '<p>Good people. Great places. Right here.</p>' : ''}</div>
      ${visible.length ? visible.map((business) => this.card(business, geo)).join("") : `<div class="empty"><h2>${Locale.t("noResults")}</h2><p>${Locale.t("suggestions")}</p><a class="btn ghost" href="${term ? `#/s/${encodeURIComponent(this.routeValue)}` : "#/"}">${Locale.t("clear")}</a><div class="empty-suggestions"><strong>Browse categories</strong><div>${categories.slice(0, 6).map((item) => `<a class="tag" href="#/c/${encodeURIComponent(item.code)}">${esc(item.description)}</a>`).join("")}</div><strong>Explore areas</strong><div>${areas.slice(0, 6).map((item) => `<a class="tag" href="#/?area=${encodeURIComponent(item.code)}">${esc(item.description)}</a>`).join("")}</div></div></div>`}`;
    this.host.innerHTML += '</section>';
    this.initBanners();
    this.$("[data-scroll-target]")?.addEventListener("click", () => this.$(`#${this.$("[data-scroll-target]").dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    this.host.querySelectorAll("[data-copy-offer]").forEach((button) => button.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(button.dataset.copyOffer); Toast.show("Offer code copied."); }
      catch { Toast.show(`Use offer code ${button.dataset.copyOffer} at the business.`); }
    }));
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

  /** Dots, swipe tracking and auto-advance for the home banner slider. */
  initBanners() {
    const track = this.$(".banner-track");
    const dots = this.$(".banner-dots");
    if (!track || !dots) return;
    const slides = [...track.children];
    if (slides.length < 2) { dots.hidden = true; return; }
    const go = (i) => track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: "smooth" });
    dots.innerHTML = slides.map((_, i) => `<button type="button" role="tab" aria-label="Slide ${i + 1}"></button>`).join("");
    const buttons = [...dots.children];
    let current = 0;
    const mark = () => {
      current = Math.round(track.scrollLeft / track.clientWidth);
      buttons.forEach((b, i) => b.setAttribute("aria-selected", String(i === current)));
    };
    buttons.forEach((b, i) => b.addEventListener("click", () => go(i)));
    track.addEventListener("scroll", mark, { passive: true });
    mark();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let paused = false;
    const pause = (on) => () => { paused = on; };
    ["pointerenter", "focusin", "touchstart"].forEach((e) => track.addEventListener(e, pause(true), { passive: true }));
    ["pointerleave", "focusout", "touchend"].forEach((e) => track.addEventListener(e, pause(false), { passive: true }));
    const timer = setInterval(() => {
      if (!track.isConnected) return clearInterval(timer);
      if (!paused && !document.hidden) go((current + 1) % slides.length);
    }, 5000);
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
