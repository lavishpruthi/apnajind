import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { DiscoveryService } from "../services/DiscoveryService.js";
import { icon } from "../core/Icons.js";
import { CustomerService } from "../services/CustomerService.js";

export class ActivityView extends BaseView {
  static access = "customer";
  static nav = "updates";
  async render() {
    let [follows, activity] = [[], []];
    try { [follows, activity] = await Promise.all([DiscoveryService.follows(), DiscoveryService.activity()]); }
    catch { /* Keep the screen useful if activity cannot be refreshed. */ }
    const seenKey = `apnajind_activity_seen_${CustomerService.profile?.id || "customer"}`;
    let lastSeen = 0;
    try { lastSeen = new Date(localStorage.getItem(seenKey) || 0).getTime(); } catch { /* Read tracking is optional. */ }
    const followedCards = follows.length ? follows.map((business) => `<a class="followed-business" href="#/b/${encodeURIComponent(business.id)}"><span class="followed-avatar">${icon("store")}</span><span><strong>${esc(business.name)}</strong><small>${esc(business.area || "Jind")}</small></span><span aria-hidden="true">→</span></a>`).join("") : '<p class="meta">Follow a business to see its updates here.</p>';
    const activityCards = activity.length ? activity.map((item) => {
      const isNew = Number.isFinite(new Date(item.created).getTime()) && new Date(item.created).getTime() > lastSeen;
      const label = item.type === "offer" ? "NEW OFFER" : item.type === "hours" ? "HOURS CHANGED" : "BUSINESS UPDATE";
      const glyph = item.type === "offer" ? "tag" : item.type === "hours" ? "calendar" : "store";
      return `<article class="activity-card ${isNew ? "is-new" : ""}"><span class="activity-type ${item.type === "offer" ? "offer" : item.type === "hours" ? "hours" : "update"}">${icon(glyph)}</span><div><p class="activity-kicker">${isNew ? '<b>NEW</b> · ' : ""}${label} · ${esc(item.businessName)}</p><h3>${esc(item.title)}</h3><p>${esc(item.message)}</p><a href="#/b/${encodeURIComponent(item.businessId)}">View business <span aria-hidden="true">→</span></a></div></article>`;
    }).join("") : '<div class="empty"><h2>Your local feed starts here</h2><p>Follow businesses from their detail pages to get their offers and updates in this feed.</p><a class="btn ghost" href="#/">Discover businesses</a></div>';
    this.html = `<section class="activity-page"><p class="section-kicker">A LITTLE MORE LOCAL</p><h1>Following &amp; updates</h1><p class="intro">Offers and news from the Jind businesses you follow.</p><div class="activity-layout"><section class="activity-feed"><h2>Latest updates</h2>${activityCards}</section><aside class="followed-panel"><h2>Businesses you follow</h2>${followedCards}</aside></div></section>`;
    try { localStorage.setItem(seenKey, new Date().toISOString()); } catch { /* Read tracking is optional. */ }
    window.dispatchEvent(new Event("apnajind:activityseen"));
  }
}
