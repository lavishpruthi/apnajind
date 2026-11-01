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
import { DiscoveryService } from "../services/DiscoveryService.js";

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
    const [offers, posts, reviews, follows, myReview] = await Promise.all([
      DiscoveryService.offers(business.id).catch(() => []),
      DiscoveryService.posts(business.id).catch(() => []),
      DiscoveryService.reviews(business.id).catch(() => []),
      DiscoveryService.follows().catch(() => []),
      CustomerService.loggedIn ? DiscoveryService.myReview(business.id).catch(() => null) : Promise.resolve(null),
    ]);
    const following = follows.some((item) => String(item.id) === String(business.id));
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
    const offersMarkup = offers.length ? `<section class="box detail-panel detail-deals"><div class="detail-panel-heading"><span class="detail-panel-icon">${icon("tag")}</span><div><p class="section-kicker">A LITTLE SOMETHING EXTRA</p><h2>Current offers</h2></div></div><div class="detail-offer-list">${offers.map((offer) => `<article class="detail-offer"><div><span class="deal-shop">LOCAL OFFER</span><h3>${esc(offer.title)}</h3><p>${esc(offer.description)}</p>${offer.promoCode ? `<button type="button" class="deal-code" data-copy-offer="${esc(offer.promoCode)}"><span>SHOW THIS CODE</span><strong>${esc(offer.promoCode)}</strong><small>Tap to copy</small></button>` : ""}</div><small class="meta">Until ${esc(this.formatDate(offer.endsAt))}</small></article>`).join("")}</div></section>` : "";
    const postsMarkup = posts.length ? `<section class="box detail-panel detail-posts"><div class="detail-panel-heading"><span class="detail-panel-icon">${icon("store")}</span><div><p class="section-kicker">FROM THE BUSINESS</p><h2>Latest updates</h2></div></div>${posts.slice(0, 5).map((post) => `<article class="detail-post"><p>${esc(post.message)}</p><small>${esc(this.formatDate(post.created))}</small></article>`).join("")}</section>` : "";
    const selectedRating = Number(myReview?.rating || 0);
    const ratingStars = `<div class="review-star-picker" role="radiogroup" aria-label="Choose a rating from one to five stars">${[1, 2, 3, 4, 5].map((rating) => `<button type="button" role="radio" class="review-star-button ${rating <= selectedRating ? "selected" : ""}" data-review-star="${rating}" aria-label="${rating} ${rating === 1 ? "star" : "stars"}" aria-checked="${rating === selectedRating}" tabindex="${rating === (selectedRating || 1) ? "0" : "-1"}">${rating <= selectedRating ? "★" : "☆"}</button>`).join("")}</div>`;
    const reviewState = myReview?.status === "pending" ? '<p class="review-status-note">Your review is waiting for moderation. You can edit it below.</p>' : myReview?.status === "rejected" ? '<p class="review-status-note">Your previous review was not approved. You can edit and resubmit it below.</p>' : "";
    const reviewsMarkup = `<section class="box detail-panel detail-reviews"><div class="detail-panel-heading"><span class="detail-panel-icon">${icon("heart")}</span><div><p class="section-kicker">LOCAL EXPERIENCES</p><h2>Customer reviews${reviews.length ? ` <span class="review-average">${(reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1)} ★ · ${reviews.length}</span>` : ""}</h2></div></div>${reviews.length ? reviews.map((review) => `<article class="customer-review"><div class="review-card-heading"><strong class="review-customer-name">${esc(review.customerName || "Jind customer")}</strong><div class="review-stars" aria-label="${review.rating} out of 5 stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div></div><p>${esc(review.comment)}</p>${review.ownerReply ? `<div class="owner-reply"><strong>Reply from ${esc(business.name)}</strong><p>${esc(review.ownerReply)}</p></div>` : ""}<small>${esc(this.formatDate(review.created))}</small></article>`).join("") : '<p class="meta">No reviews yet. Share a helpful local experience.</p>'}<form id="customer-review-form" class="customer-review-form"><h3>${myReview ? "Edit your review" : "Leave a review"}</h3>${reviewState}<label>Your rating</label>${ratingStars}<input id="review-rating" type="hidden" value="${selectedRating || ""}"><label for="review-comment">Your experience</label><textarea id="review-comment" rows="3" maxlength="600" minlength="10" placeholder="What should other Jind customers know?" required>${esc(myReview?.comment || "")}</textarea><button class="btn ghost" type="submit">${myReview ? "Update review" : "Submit for review"}</button><p class="meta">Reviews appear after a quick community review.</p></form></section>`;
    this.html = `<div class="business-detail-page"><div class="detail-toolbar"><a class="btn ghost detail-back" href="${esc(this.returnHash || "#/")}">${icon("arrow-left")}<span>${Locale.t("back")}</span></a><div class="detail-tools"><button class="btn ghost detail-follow ${following ? "is-following" : ""}" type="button" data-act="follow" aria-pressed="${following}">${icon(following ? "check" : "plus")}<span>${following ? "Following" : "Follow"}</span></button><button class="icon-btn detail-save ${saved ? "is-saved" : ""}" type="button" data-act="save" aria-label="${saved ? "Remove" : "Save"} ${esc(business.name)} ${saved ? "from" : "to"} saved businesses" aria-pressed="${saved}" title="${saved ? "Remove saved listing" : "Save listing"}">${icon("heart")}</button><button class="icon-btn detail-share" type="button" data-act="share" aria-label="Share ${esc(business.name)}" title="Share listing">${icon("share")}</button></div></div>
      <section class="detail-gallery-shell" aria-label="Business photos">
        <div class="gallery" id="business-gallery" role="region" aria-label="Photos of ${esc(business.name)}" tabindex="0">${pictures}</div>
        ${photoCount > 1 ? `<button class="gallery-control gallery-prev" type="button" data-gallery="prev" aria-label="Previous photo">${icon("chevron-left")}</button><button class="gallery-control gallery-next" type="button" data-gallery="next" aria-label="Next photo">${icon("chevron-right")}</button><div class="gallery-footer"><div class="gallery-dots" role="group" aria-label="Choose a photo">${photos.map((_, index) => `<button class="gallery-dot ${index === 0 ? "on" : ""}" type="button" data-slide-to="${index}" aria-label="Show photo ${index + 1}" aria-pressed="${index === 0}"></button>`).join("")}</div><span class="gallery-count" id="gallery-count">1 / ${photoCount}</span></div>` : ""}
      </section><header class="detail-overview"><div class="detail-category-pill">${icon("list")} ${esc(category?.description || business.category)}</div><h1 class="detail-title">${esc(business.name)} ${business.verified ? '<span class="verified-badge">✓ ApnaJind verified</span>' : ""}</h1>
      <p class="detail-submeta">${icon("pin")} ${esc(business.area || "Jind")}${updatedDate ? `<span class="detail-updated">Updated ${esc(updatedDate)}</span>` : ""}</p>
      ${business.availability === "temporarily_closed" ? `<p class="availability-badge closed">${Locale.t("closed")}</p>` : business.availability === "seasonal" ? `<p class="availability-badge seasonal">${Locale.t("seasonal")}</p>` : business.availability === "available" ? `<p class="availability-badge">${Locale.t("available")}</p>` : ""}
      <p class="detail-description">${esc(business.description || "Discover this local business in Jind.")}</p></header>
      <div class="btns detail-actions">
        <a class="btn ok" href="tel:+91${esc(business.phone)}">${icon("phone")} ${Locale.t("call")}</a>
        ${business.whatsapp ? `<a class="btn ac" target="_blank" rel="noopener noreferrer" href="https://wa.me/91${esc(business.whatsapp)}">WhatsApp</a>` : ""}
        <a class="btn ghost" target="_blank" rel="noopener noreferrer" href="${map}">${icon("pin")} ${Locale.t("directions")}</a>
      </div>
      ${offersMarkup}${postsMarkup}${reviewsMarkup}<div class="detail-content-grid"><div class="detail-main-column">
        <section class="box detail-panel"><div class="detail-panel-heading"><span class="detail-panel-icon">${icon("utensils")}</span><div><p class="section-kicker">WHAT YOU CAN FIND</p><h2>${Locale.t("services")}</h2></div></div><div class="detail-service-list">${(business.services || []).map((service) => `<span class="tag">${esc(service)}</span>`).join("") || '<span class="meta">Not listed</span>'}</div></section>
        <section class="box detail-panel"><div class="detail-panel-heading"><span class="detail-panel-icon">${icon("home")}</span><div><p class="section-kicker">PLAN YOUR VISIT</p><h2>${Locale.t("hours")}</h2></div></div>${hoursMarkup(business.hours, Locale.language)}</section>
      </div><aside class="detail-side-column">
        <section class="box detail-panel detail-location-card"><div class="detail-panel-heading"><span class="detail-panel-icon">${icon("pin")}</span><div><p class="section-kicker">COME ON OVER</p><h2>${Locale.t("location")}</h2></div></div><p id="business-address">${esc(business.address)}${business.area ? `, ${esc(business.area)}` : ""}, Jind</p><div class="btns detail-location-actions"><a class="btn ok" target="_blank" rel="noopener noreferrer" href="${map}">${icon("pin")} Get directions</a><button class="btn ghost address-copy" type="button" data-act="copy-address">${icon("copy")} Copy</button></div></section>
        <section class="box detail-panel detail-contact-card"><div class="detail-panel-heading"><span class="detail-panel-icon">${icon("phone")}</span><div><p class="section-kicker">SAY HELLO</p><h2>${Locale.t("contact")}</h2></div></div><p class="detail-owner">${esc(business.owner || "Business owner")}</p><a class="detail-phone" href="tel:+91${esc(business.phone)}">+91 ${esc(business.phone)}</a><details class="listing-report"><summary>Report incorrect details</summary><form id="listing-report"><label for="report-reason">What needs correcting?</label><select id="report-reason" required><option value="">Choose a reason</option><option value="wrong_contact">Contact details are wrong</option><option value="wrong_address">Address or area is wrong</option><option value="closed">Business appears closed</option><option value="other">Other issue</option></select><label for="report-details">Details <span class="label-hint">Optional</span></label><textarea id="report-details" rows="3" maxlength="500" placeholder="Help us understand what is out of date"></textarea><button class="btn ghost" type="submit">Send report</button></form></details></section>
      </aside></div></div>`;
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
      follow: async (_event, button) => {
        button.disabled = true;
        try {
          const result = await DiscoveryService.toggleFollow(business.id);
          button.classList.toggle("is-following", result.following);
          button.setAttribute("aria-pressed", String(result.following));
          button.innerHTML = `${icon(result.following ? "check" : "plus")}<span>${result.following ? "Following" : "Follow"}</span>`;
          Toast.show(result.following ? "You’ll see this business’s updates in your feed." : "Business unfollowed.");
        } catch (error) { Toast.show(error.message); }
        finally { button.disabled = false; }
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
    this.on("#customer-review-form", "submit", (event) => this.submitReview(event, business.id));
    this.host.querySelectorAll("[data-review-star]").forEach((button) => {
      button.addEventListener("click", () => this.selectReviewRating(Number(button.dataset.reviewStar)));
      button.addEventListener("keydown", (event) => {
        const value = Number(button.dataset.reviewStar);
        const next = event.key === "ArrowRight" || event.key === "ArrowUp" ? Math.min(5, value + 1) : event.key === "ArrowLeft" || event.key === "ArrowDown" ? Math.max(1, value - 1) : 0;
        if (next) { event.preventDefault(); this.selectReviewRating(next); this.$(`[data-review-star="${next}"]`).focus(); }
      });
    });
    this.host.querySelectorAll("[data-copy-offer]").forEach((button) => button.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(button.dataset.copyOffer); Toast.show("Offer code copied."); }
      catch { Toast.show(`Use offer code ${button.dataset.copyOffer} at the business.`); }
    }));
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

  async submitReview(event, businessId) {
    event.preventDefault();
    const form = event.currentTarget, button = form.querySelector('[type="submit"]');
    const rating = Number(this.$("#review-rating").value);
    if (!rating) { Toast.show("Tap a star to choose your rating."); return; }
    button.disabled = true;
    try {
      const result = await DiscoveryService.submitReview({ businessId, rating, comment: this.$("#review-comment").value.trim() });
      Toast.show(result.updated ? "Your review was updated and sent for moderation." : "Thanks. Your review was sent for moderation.");
      await this.render();
    } catch (error) { Toast.show(error.message); }
    finally { button.disabled = false; }
  }

  selectReviewRating(value) {
    const input = this.$("#review-rating");
    if (!input || value < 1 || value > 5) return;
    input.value = String(value);
    this.host.querySelectorAll("[data-review-star]").forEach((star) => {
      const rating = Number(star.dataset.reviewStar);
      const selected = rating === value;
      star.textContent = rating <= value ? "★" : "☆";
      star.classList.toggle("selected", rating <= value);
      star.setAttribute("aria-checked", String(selected));
      star.tabIndex = selected ? 0 : -1;
    });
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
