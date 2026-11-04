import { esc, safeImageSrc } from "../../core/Dom.js";
import { icon } from "../../core/Icons.js";
import { Toast } from "../../core/Toast.js";
import { BusinessService } from "../../services/BusinessService.js";
import { CodeService } from "../../services/CodeService.js";
import { PinService } from "../../services/PinService.js";

export class ApprovalPanel {
  constructor(host, onPendingCount) {
    this.host = host;
    this.onPendingCount = onPendingCount;
    this.host.onclick = (event) => this.handleAction(event);
  }

  async render() {
    this.host.innerHTML = '<div class="empty">Loading business approvals…</div>';
    const businesses = await BusinessService.adminList();
    const accessTools = (business) => {
      const expired = business.pinChangeRequired && business.pinExpiresAt && new Date(business.pinExpiresAt).getTime() <= Date.now();
      const state = expired ? "Temporary PIN expired" : business.pinChangeRequired ? "Temporary PIN active" : "PIN set";
      return `<section class="admin-pin-tools"><div><strong>Merchant access</strong><p class="meta">${state}${business.pinExpiresAt ? ` · Expires ${esc(PinService.expiryLabel(business.pinExpiresAt))}` : ""}</p></div><button class="btn ghost" type="button" data-generate-pin="${esc(business.id)}">${icon("key")} Generate new PIN</button><div class="admin-pin-result" data-pin-result="${esc(business.id)}" aria-live="polite"></div></section>`;
    };
    const pending = businesses.filter((business) => business.status === "pending");
    this.onPendingCount?.(businesses, true);
    const approved = businesses.filter((business) => business.status === "approved");
    const pendingCards = pending.map((business) => {
      const category = CodeService.byCode("CATEGORY", business.category);
      return `<article class="box approval-card">
        <div class="approval-heading"><div><h2>${esc(business.name)}</h2><span class="st pending">Pending</span></div>
          <p class="meta">${esc(category?.description || business.category)} · ${esc(business.area)} · ${esc(business.owner)}</p>
        </div>
        <p>${esc(business.description)}</p><p class="meta">${esc(business.address)} · ${esc(business.phone)}</p>
          <div class="photo-list">${(business.photos || []).map(safeImageSrc).filter(Boolean).map((photo) => `<img src="${esc(photo)}" alt="Photo of ${esc(business.name)}" referrerpolicy="no-referrer">`).join("")}</div>
        <div class="btns">
          <button class="btn ok" type="button" data-id="${esc(business.id)}" data-status="approved">${icon("check")} Approve &amp; verify</button>
          <button class="btn no" type="button" data-id="${esc(business.id)}" data-status="rejected">${icon("x")} Reject</button>
        </div>
        ${accessTools(business)}
      </article>`;
    }).join("");
    const approvedCards = approved.map((business) => `<article class="box approval-card verification-card">
      <div class="approval-heading"><div><h2>${esc(business.name)}</h2><span class="st ${business.verified ? "approved" : "pending"}">${business.verified ? "Verified" : "Not verified"}</span></div><p class="meta">${esc(business.area)} · ${esc(business.phone)}</p></div>
      <p>${esc(business.address)}</p>
      <div class="btns"><button class="btn ${business.verified ? "no" : "ok"}" type="button" data-id="${esc(business.id)}" data-verified="${!business.verified}">${icon(business.verified ? "x" : "check")} ${business.verified ? "Unverify listing" : "Verify listing"}</button></div>
      ${accessTools(business)}
    </article>`).join("");
    const rejected = businesses.filter((business) => business.status === "rejected");
    const rejectedCards = rejected.map((business) => `<article class="box approval-card"><div class="approval-heading"><div><h2>${esc(business.name)}</h2><span class="st rejected">Rejected</span></div><p class="meta">${esc(business.area)} · ${esc(business.phone)}</p></div><p>${esc(business.address)}</p>${accessTools(business)}</article>`).join("");
    this.host.innerHTML = `${pending.length ? `<h2>Waiting for approval</h2>${pendingCards}` : ""}${approved.length ? `<h2>Approved listings · verification</h2><p class="meta approval-help">Use the tick to verify a listing or the cross to remove its verified status.</p>${approvedCards}` : ""}${rejected.length ? `<h2>Rejected listings · merchant access</h2>${rejectedCards}` : ""}${pending.length || approved.length || rejected.length ? "" : '<div class="empty">No listings need review.</div>'}`;
  }

  async handleAction(event) {
    const generate = event.target.closest("[data-generate-pin]");
    if (generate) {
      generate.disabled = true;
      try {
        const issued = await PinService.generateForMerchant(generate.dataset.generatePin);
        const result = generate.closest(".approval-card")?.querySelector("[data-pin-result]");
        if (result) {
          const link = PinService.whatsappUrl(issued.whatsapp || issued.phone, issued.pin, issued.businessName, issued.expiresAt);
          result.innerHTML = `<div class="admin-pin-issued"><div><span class="auth-eyebrow">New temporary PIN</span><strong>${esc(issued.pin)}</strong><p class="meta">Valid until ${esc(PinService.expiryLabel(issued.expiresAt))}</p></div>${link ? `<a class="btn ok" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${icon("phone")} Send to WhatsApp</a>` : '<span class="meta">No valid WhatsApp number is available.</span>'}</div>`;
        }
        Toast.show("New merchant PIN generated. It expires in 24 hours.");
      } catch (error) {
        Toast.show(error.message);
      } finally {
        generate.disabled = false;
      }
      return;
    }
    const button = event.target.closest("[data-status], [data-verified]");
    if (!button) return;
    button.disabled = true;
    try {
      const isVerification = button.hasAttribute("data-verified");
      const value = button.dataset.verified === "true";
      await BusinessService.adminSet(isVerification
        ? { id: button.dataset.id, verified: value }
        : { id: button.dataset.id, status: button.dataset.status });
      Toast.show(isVerification
        ? value ? "Listing verified." : "Listing verification removed."
        : button.dataset.status === "approved" ? "Business approved and verified." : "Business rejected.");
      await this.render();
    } catch (error) {
      Toast.show(error.message);
      button.disabled = false;
    }
  }
}
