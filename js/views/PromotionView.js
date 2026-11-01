import { BaseView } from "./BaseView.js";
import { icon } from "../core/Icons.js";
import { SettingsService } from "../services/SettingsService.js";
import { esc } from "../core/Dom.js";

export class PromotionView extends BaseView {
  static access = "public";

  async render() {
    let support = { supportEmail: "", supportPhone: "" };
    try { support = { ...support, ...await SettingsService.public() }; } catch { /* Enquiry options are optional while offline. */ }
    const email = String(support.supportEmail || "").trim();
    const emailAddress = encodeURIComponent(email).replace(/%40/gi, "@");
    const digits = String(support.supportPhone || "").replace(/\D/g, "");
    const whatsappNumber = digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith("91") ? digits : "";
    const enquiryText = "Hello, I would like to know about advertising on ApnaJind.";
    const enquiryHref = email
      ? `mailto:${emailAddress}?subject=${encodeURIComponent("ApnaJind advertising enquiry")}&body=${encodeURIComponent(enquiryText)}`
      : whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(enquiryText)}`
        : support.supportPhone
          ? `tel:${digits}`
          : "#/merchant/new";
    const enquiryLabel = email || whatsappNumber || support.supportPhone ? "Enquire about promotion" : "List your business";
    this.html = `<div class="promotion-page"><a class="btn ghost promotion-back" href="#/">${icon("arrow-left")} Back to ApnaJind</a><section class="promotion-hero"><p class="hero-kicker"><span class="hero-live-dot"></span> MADE FOR LOCAL BUSINESS</p><h1>Put your business<br><em>in the neighbourhood spotlight.</em></h1><p class="intro">Reach people who are already looking for places, food and services around Jind.</p><a class="btn ac" href="${esc(enquiryHref)}" ${enquiryHref.startsWith("https://") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${icon("store")} ${enquiryLabel}</a><span class="promotion-trust">Clear sponsored labels. Local audience. No hidden placement.</span></section>
      <section class="promotion-plans"><div class="section-heading"><div><p class="section-kicker">WAYS TO GET NOTICED</p><h2>Choose your spotlight</h2></div><p>Ask us about current availability and rates.</p></div><div class="promotion-plan-grid">
        <article class="promotion-plan"><span class="promotion-plan-icon">${icon("tag")}</span><p class="section-kicker">STAND OUT IN SEARCH</p><h3>Featured listing</h3><p>Give your business stronger visibility in local discovery and category results.</p><a href="${esc(enquiryHref)}" ${enquiryHref.startsWith("https://") ? 'target="_blank" rel="noopener noreferrer"' : ""}>Ask about featured placement <span aria-hidden="true">→</span></a></article>
        <article class="promotion-plan"><span class="promotion-plan-icon">${icon("list")}</span><p class="section-kicker">OWN YOUR CATEGORY</p><h3>Category spotlight</h3><p>Promote a seasonal offer or service to people browsing your kind of business.</p><a href="${esc(enquiryHref)}" ${enquiryHref.startsWith("https://") ? 'target="_blank" rel="noopener noreferrer"' : ""}>Ask about a category feature <span aria-hidden="true">→</span></a></article>
        <article class="promotion-plan"><span class="promotion-plan-icon">${icon("store")}</span><p class="section-kicker">BE SEEN ON HOME</p><h3>Sponsored banner</h3><p>Reserve a clearly labelled banner spot on the ApnaJind home page.</p><a href="${esc(enquiryHref)}" ${enquiryHref.startsWith("https://") ? 'target="_blank" rel="noopener noreferrer"' : ""}>Ask about banner sponsorship <span aria-hidden="true">→</span></a></article>
      </div></section><section class="promotion-how"><div><p class="section-kicker">SIMPLE TO START</p><h2>From Jind business to local favourite.</h2></div><ol><li><b>1</b><span>List your business on ApnaJind.</span></li><li><b>2</b><span>Choose the kind of promotion that fits.</span></li><li><b>3</b><span>Confirm dates, creative and rates with our team.</span></li></ol><a class="btn ghost" href="#/merchant/new">Register your business <span aria-hidden="true">↗</span></a><p class="promotion-note">Promotion rates and availability are confirmed before any campaign begins. Sponsored placements will be labelled for customers.</p></section></div>`;
  }
}
