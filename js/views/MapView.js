import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { BusinessService } from "../services/BusinessService.js";
import { icon } from "../core/Icons.js";

export class MapView extends BaseView {
  static access = "public";
  async render() {
    const businesses = (await BusinessService.list()).filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)) && item.lat !== "" && item.lng !== "");
    const destination = (item) => {
      const lat = Number(item.lat), lng = Number(item.lng), pad = .006;
      const bounds = [lng - pad, lat - pad, lng + pad, lat + pad].join(",");
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik&marker=${lat},${lng}`;
    };
    this.html = `<section class="map-page"><div class="map-heading"><p class="section-kicker">EXPLORE AROUND YOU</p><h1>Jind on the map</h1><p class="intro">Browse local businesses with a saved map location. Select a place to focus the map.</p></div>${businesses.length ? `<div class="interactive-map-layout"><div class="interactive-map-frame"><iframe id="local-map-frame" title="OpenStreetMap showing local businesses" src="${esc(destination(businesses[0]))}" loading="lazy" referrerpolicy="no-referrer"></iframe><p>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></p></div><div class="map-place-list" role="list" aria-label="Businesses with map locations">${businesses.map((business, index) => `<button class="map-place ${index === 0 ? "on" : ""}" type="button" data-map-place="${index}" aria-pressed="${index === 0}"><span class="map-place-pin">${icon("pin")}</span><span><strong>${esc(business.name)}</strong><small>${esc(business.area || "Jind")} · ${esc(business.address || "Location on map")}</small></span><span class="map-place-arrow" aria-hidden="true">↗</span></button>`).join("")}</div></div>` : `<div class="empty map-empty"><span class="map-empty-icon">${icon("pin")}</span><h2>Map locations are on the way</h2><p>Businesses appear here after they add a map location to their listing.</p><a class="btn ghost" href="#/">Browse all Jind businesses</a></div>`}</section>`;
    this.host.querySelectorAll("[data-map-place]").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.mapPlace);
      this.$("#local-map-frame").src = destination(businesses[index]);
      this.host.querySelectorAll("[data-map-place]").forEach((item, i) => { item.classList.toggle("on", i === index); item.setAttribute("aria-pressed", String(i === index)); });
    }));
  }
}
