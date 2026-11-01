import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { DiscoveryService } from "../services/DiscoveryService.js";
import { icon } from "../core/Icons.js";

export class EventsView extends BaseView {
  static access = "public";
  async render() {
    let events = [];
    try { events = await DiscoveryService.events(); } catch { /* The event list is optional when offline. */ }
    this.html = `<section class="events-page"><p class="section-kicker">WHAT'S HAPPENING IN TOWN</p><h1>Jind events</h1><p class="intro">Fairs, community events and local happenings in one place.</p>${events.length ? `<div class="events-grid">${events.map((event) => this.card(event)).join("")}</div>` : '<div class="empty"><h2>No upcoming events posted yet</h2><p>Check back for fairs and events around Jind.</p><a class="btn ghost" href="#/">Back to local discoveries</a></div>'}</section>`;
  }
  card(event) {
    const start = new Date(event.startsAt), end = new Date(event.endsAt);
    const dateLabel = Number.isFinite(start.getTime()) ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(start) : "Date to be announced";
    const endLabel = Number.isFinite(end.getTime()) && start.toDateString() !== end.toDateString() ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(end) : "";
    const map = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${event.location}, Jind, Haryana`)}`;
    return `<article class="event-card"><div class="event-card-art" aria-hidden="true"><span>${icon("calendar")}</span><small>JIND</small></div><div class="event-card-copy"><span class="event-date">${esc(dateLabel)}${endLabel ? ` – ${esc(endLabel)}` : ""}</span><h2>${esc(event.title)}</h2><p>${esc(event.description || "A local event in Jind.")}</p><p class="event-location">${icon("pin")} ${esc(event.location)}</p><div class="event-card-actions"><a class="btn ghost" href="${map}" target="_blank" rel="noopener noreferrer">Directions ${icon("pin")}</a>${event.link ? `<a class="event-register-link" href="${esc(event.link)}" target="_blank" rel="noopener noreferrer">More info ↗</a>` : ""}</div></div></article>`;
  }
}
