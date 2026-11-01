import { DiscoveryService } from "../../services/DiscoveryService.js";
import { esc } from "../../core/Dom.js";
import { Toast } from "../../core/Toast.js";

export class CommunityPanel {
  constructor(host) { this.host = host; }
  async render() {
    const [events, reviews] = await Promise.all([DiscoveryService.adminEvents(), DiscoveryService.adminReviews()]);
    this.host.innerHTML = `<div class="community-admin"><section class="box"><h2>Add a Jind event</h2><form id="event-form" class="event-admin-form"><label>Event name<input name="title" maxlength="100" required></label><label>Location<input name="location" maxlength="180" required></label><label>Starts<input name="startsAt" type="datetime-local" required></label><label>Ends<input name="endsAt" type="datetime-local" required></label><label class="event-admin-wide">Description<textarea name="description" maxlength="600" rows="3"></textarea></label><label class="event-admin-wide">More info URL <span class="label-hint">Optional, HTTPS only</span><input name="link" type="url" maxlength="300" placeholder="https://"></label><button class="btn ac" type="submit">Publish event</button></form></section><section class="box"><h2>Events</h2>${events.length ? `<div class="community-admin-list">${events.map((event) => `<article><div><strong>${esc(event.title)}</strong><p class="meta">${esc(event.location)} · ${esc(new Date(event.startsAt).toLocaleString("en-IN"))}</p></div><button class="btn ${event.active ? "ghost" : "ac"}" type="button" data-event-id="${esc(event.id)}" data-active="${!event.active}">${event.active ? "Hide" : "Publish"}</button></article>`).join("")}</div>` : '<p class="meta">No events have been added.</p>'}</section><section class="box"><h2>Review moderation</h2>${reviews.length ? `<div class="community-admin-list">${reviews.map((review) => `<article class="moderation-review"><div><strong>${esc(review.businessName)} · ${"★".repeat(Math.max(0, Math.min(5, review.rating)))}</strong><p>${esc(review.comment)}</p><small class="meta">${esc(review.status)} · ${esc(new Date(review.created).toLocaleDateString("en-IN"))}</small></div>${review.status === "pending" ? `<div class="btns"><button class="btn ok" type="button" data-review-id="${esc(review.id)}" data-review-status="approved">Approve</button><button class="btn ghost" type="button" data-review-id="${esc(review.id)}" data-review-status="rejected">Reject</button></div>` : ""}</article>`).join("")}</div>` : '<p class="meta">No customer reviews yet.</p>'}</section></div>`;
    this.host.querySelector("#event-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget, button = form.querySelector('[type="submit"]'); button.disabled = true;
      try {
        const value = (name) => form.elements[name].value;
        await DiscoveryService.saveEvent({ title: value("title").trim(), location: value("location").trim(), startsAt: new Date(value("startsAt")).toISOString(), endsAt: new Date(value("endsAt")).toISOString(), description: value("description").trim(), link: value("link").trim() });
        Toast.show("Event published"); await this.render();
      } catch (error) { Toast.show(error.message); button.disabled = false; }
    });
    this.host.querySelectorAll("[data-event-id]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try { await DiscoveryService.setEvent(button.dataset.eventId, button.dataset.active === "true"); Toast.show("Event updated"); await this.render(); }
      catch (error) { Toast.show(error.message); button.disabled = false; }
    }));
    this.host.querySelectorAll("[data-review-id]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try { await DiscoveryService.setReview(button.dataset.reviewId, button.dataset.reviewStatus); Toast.show("Review moderated"); await this.render(); }
      catch (error) { Toast.show(error.message); button.disabled = false; }
    }));
  }
}
