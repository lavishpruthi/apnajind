import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { CustomerService } from "../services/CustomerService.js";
import { SettingsService } from "../services/SettingsService.js";
import { Toast } from "../core/Toast.js";
import { AuthService } from "../services/AuthService.js";
import { BusinessService } from "../services/BusinessService.js";

export class ProfileView extends BaseView {
  static nav = "profile";
  static access = "public";

  async render() {
    if (AuthService.loggedIn) return this.renderStaffProfile();
    if (sessionStorage.getItem("apnajind_merchant_token")) return this.renderMerchantProfile();
    if (!CustomerService.loggedIn) {
      this.html = `<section class="box profile-section"><h1>Your ApnaJind profile</h1><p class="meta">Sign in to save businesses, follow updates and manage your account.</p><div class="btns"><a class="btn ac" href="#/auth">Sign in</a><a class="btn ghost" href="#/auth/register">Create account</a></div></section>`;
      return;
    }
    const profile = CustomerService.profile;
    let settings = { supportEmail: "", supportPhone: "" };
    try { settings = { ...settings, ...await SettingsService.public() }; }
    catch { /* Contact details are optional when the API is offline. */ }
    const email = settings.supportEmail;
    const phone = settings.supportPhone;
    const phoneHref = String(phone || "").replace(/[^+\d]/g, "");
    this.html = `<h1>Your profile</h1>
      <section class="box profile-card" aria-labelledby="account-info-heading">
        <div class="profile-avatar" aria-hidden="true">${esc((profile.name || "?").trim().charAt(0).toUpperCase())}</div>
        <div><h2 id="account-info-heading">Account information</h2><p class="meta">ApnaJind customer account</p></div>
        <dl class="profile-details">
          <div><dt>Name</dt><dd>${esc(profile.name)}</dd></div>
          <div><dt>Mobile number</dt><dd>${esc(profile.phone)}</dd></div>
          <div><dt>Email address</dt><dd>${esc(profile.email)}</dd></div>
        </dl>
      </section>
      <section class="box profile-section"><h2>Contact ApnaJind</h2>${email || phone ? `<div class="profile-contact">${email ? `<p>Email: <a href="mailto:${esc(email)}">${esc(email)}</a></p>` : ""}${phone ? `<p>Phone: <a href="tel:${esc(phoneHref)}">${esc(phone)}</a></p>` : ""}</div>` : '<p class="meta">Support contact details have not been added yet.</p>'}</section>
      <details class="box profile-section"><summary><h2>Terms and conditions</h2></summary><div class="profile-terms">
        <p><strong>Last updated: 1 November 2026</strong></p>
        <p>ApnaJind provides a directory to help people discover businesses and services in Jind. By using the directory or creating an account, you agree to these terms.</p>
        <h3>Directory information</h3><p>Business details are supplied by the businesses or other sources and may change. ApnaJind works to keep listings useful but does not guarantee that every listing, price, service, opening hour, address, or contact detail is complete or current. Please confirm details directly with the business.</p>
        <h3>Independent businesses</h3><p>Listed businesses are independent third parties. ApnaJind does not provide their goods or services, act as their agent, or guarantee their quality, availability, safety, or conduct. Any purchase, appointment, or arrangement is between you and that business. Resolve order, payment, refund, and service issues with the business, without limiting any rights you have under applicable law.</p>
        <h3>Your account</h3><p>Provide accurate account information, keep your sign-in details secure, and use the service lawfully. Do not misuse the directory, submit false reports, interfere with the service, or upload content you do not have the right to use. You can request account deletion from this Profile page. Deletion removes your customer account and reports submitted from it.</p>
        <h3>Availability and changes</h3><p>We may update, suspend, or discontinue features and may restrict accounts that misuse the service. These terms may be updated when the service or applicable requirements change. Continued use after an update means the updated terms apply, to the extent permitted by law.</p>
        <h3>Contact and complaints</h3><p>For questions, listing concerns, or complaints about ApnaJind, use the support contact details shown above. We will review and respond as reasonably practicable.</p>
        <p>These terms are subject to the laws of India. Nothing here excludes consumer or other rights that cannot legally be excluded.</p>
      </div></details>
      <details class="box profile-section profile-delete"><summary><h2>Delete my account</h2></summary><div><p>This permanently deletes your ApnaJind customer account. Enter your password and type <strong>DELETE</strong> to confirm.</p><form id="delete-account-form"><label for="delete-password">Account password</label><input id="delete-password" name="password" type="password" autocomplete="current-password" required><label for="delete-confirmation">Type DELETE to confirm</label><input id="delete-confirmation" name="confirmation" autocomplete="off" pattern="DELETE" required><div class="btns"><button class="btn no" type="submit">Delete my account</button></div></form></div></details>`;
    this.on("#delete-account-form", "submit", (event) => this.deleteAccount(event));
  }

  async renderStaffProfile() {
    const profile = AuthService.profile || {};
    this.html = `<h1>Admin profile</h1><section class="box profile-card"><div class="profile-avatar" aria-hidden="true">${esc((profile.name || profile.username || "A").trim().charAt(0).toUpperCase())}</div><div><h2>${esc(profile.name || profile.username || "Administrator")}</h2><p class="meta">ApnaJind staff account</p></div><dl class="profile-details"><div><dt>Account</dt><dd>${esc(profile.username || profile.email || "Administrator")}</dd></div><div><dt>Access</dt><dd>Administrator</dd></div></dl></section><section class="box profile-section"><h2>Administration</h2><p class="meta">Manage directory listings, events, reviews and app settings.</p><a class="btn ac" href="#/admin">Open admin area</a></section><section class="box profile-section"><h2>Explore ApnaJind</h2><p class="meta">Use the same local discovery experience as customers.</p><a class="btn ghost" href="#/">Browse Jind</a></section>`;
  }

  async renderMerchantProfile() {
    let business = null;
    try { business = await BusinessService.mine(sessionStorage.getItem("apnajind_merchant_token")); }
    catch { /* The dashboard shows the actionable session error if needed. */ }
    this.html = `<h1>Merchant profile</h1><section class="box profile-card"><div class="profile-avatar" aria-hidden="true">${esc((business?.name || "M").trim().charAt(0).toUpperCase())}</div><div><h2>${esc(business?.name || "Merchant account")}</h2><p class="meta">ApnaJind merchant account</p></div><dl class="profile-details"><div><dt>Business</dt><dd>${esc(business?.name || "Business listing")}</dd></div><div><dt>Listing status</dt><dd>${esc(business?.status || "Unavailable")}</dd></div><div><dt>Mobile number</dt><dd>${esc(business?.phone || "")}</dd></div></dl></section><section class="box profile-section"><h2>Manage your business</h2><p class="meta">Update your listing, offers and customer replies.</p><a class="btn ac" href="#/merchant">Open merchant dashboard</a></section><section class="box profile-section"><h2>Explore ApnaJind</h2><p class="meta">Discover local businesses, food and events around Jind.</p><a class="btn ghost" href="#/">Browse Jind</a></section>`;
  }

  async deleteAccount(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    if (form.elements.confirmation.value !== "DELETE") return Toast.show("Type DELETE to confirm account deletion.");
    button.disabled = true;
    try {
      await CustomerService.deleteAccount(form.elements.password.value);
      try {
        localStorage.removeItem("apnajind_saved_businesses");
        localStorage.removeItem("apnajind_recent_businesses_v1");
        localStorage.removeItem("apnajind_recent_searches_v1");
      } catch { /* Account deletion is complete even if browser storage is unavailable. */ }
      window.dispatchEvent(new Event("apnajind:authchange"));
      location.hash = "#/";
      Toast.show("Your account has been deleted.");
    } catch (error) { Toast.show(error.message); button.disabled = false; }
  }
}
