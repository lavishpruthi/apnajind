import { BaseView } from "./BaseView.js";
import { esc, safeImageSrc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { Toast } from "../core/Toast.js";
import { CodeService } from "../services/CodeService.js";
import { BusinessService } from "../services/BusinessService.js";
import { AuthService } from "../services/AuthService.js";
import { CustomerService } from "../services/CustomerService.js";
import { scheduleFields, readSchedule, formatHours } from "../core/Hours.js";
import { LocationService } from "../services/LocationService.js";
import { PinService } from "../services/PinService.js";
import { DiscoveryService } from "../services/DiscoveryService.js";
import { SessionStore } from "../services/SessionStore.js";
import { bindPinInputs } from "../core/PinInput.js";

const MERCHANT_TOKEN = "apnajind_merchant_token";
const ISSUED_PIN = "apnajind_merchant_issued_pin";

export class MerchantView extends BaseView {
  static nav = "merchant";
  constructor(host, mode) {
    super(host);
    this.mode = mode || "";
    this.photos = [];
    this.photoPending = 0;
  }

  async render() {
    if (this.mode === "new") {
      this.registration();
      void CodeService.load().then(() => this.refreshRegistrationOptions()).catch((error) => Toast.show(error.message));
      return;
    }
    if (SessionStore.read(MERCHANT_TOKEN)) return this.profile();
    return this.login();
  }

  login() {
    this.html = `<div class="merchant-auth-top"><a class="btn ghost auth-back" href="#/auth">${icon("arrow-left")} Back to sign in &amp; register</a></div><h1>Merchant sign in</h1><p class="intro">Manage your business listing on ApnaJind.</p>
      <div class="box"><form id="merchant-login">
        <label for="merchant-phone">Mobile number</label><input id="merchant-phone" inputmode="numeric" autocomplete="tel" maxlength="10" required>
        <label for="merchant-pin">6-digit PIN</label><div class="pin-input-wrap"><input id="merchant-pin" class="pin-code-input" type="password" inputmode="numeric" pattern="[0-9]{4,6}" autocomplete="current-password" maxlength="6" aria-label="Merchant PIN, 6 digits" required></div>
        <label class="remember-option"><input id="merchant-remember" type="checkbox"><span><strong>Stay signed in on this device</strong><small>Keep me signed in for up to 90 days</small></span></label>
        <div class="btns"><button class="btn" type="submit">Log in</button><a class="btn ac" href="#/merchant/new">Register a business</a></div>
      </form></div>`;
    bindPinInputs(this.host);
    this.on("#merchant-login", "submit", async (event) => {
      event.preventDefault();
      const button = this.$('button[type="submit"]');
      button.disabled = true;
      try {
        const rememberMe = this.$("#merchant-remember")?.checked || false;
        const result = await BusinessService.login(
          this.$("#merchant-phone").value.trim(),
          this.$("#merchant-pin").value.trim(),
          rememberMe,
        );
        AuthService.logout();
        CustomerService.logout(false);
        SessionStore.write(MERCHANT_TOKEN, result.token, rememberMe);
        window.dispatchEvent(new Event("apnajind:authchange"));
        location.hash = "#/merchant";
      } catch (error) {
        Toast.show(error.message);
        button.disabled = false;
      }
    });
  }

  async registration() {
    this.photos = [];
    this.renderForm(null, true);
  }

  refreshRegistrationOptions() {
    const category = this.$("#business-category");
    const area = this.$("#business-area");
    if (!category || !area) return;
    const fill = (select, records, label) => {
      const selected = select.value;
      select.innerHTML = `<option value="">${label}</option>${records.map((item) => `<option value="${esc(item.code)}">${esc(item.description)}</option>`).join("")}`;
      if (records.some((item) => item.code === selected)) select.value = selected;
    };
    fill(category, CodeService.list("CATEGORY"), "Choose category");
    fill(area, CodeService.list("AREA"), "Choose area");
    this.updateCompleteness();
  }

  async profile() {
    try {
      await CodeService.load();
      const business = await BusinessService.mine(
        SessionStore.read(MERCHANT_TOKEN),
      );
      let issued = null;
      try { issued = JSON.parse(sessionStorage.getItem(ISSUED_PIN) || "null"); } catch { /* Ignore invalid one-time display data. */ }
      if (business.pinChangeRequired) {
        this.renderPinChange(business, issued, true);
        return;
      }
      sessionStorage.removeItem(ISSUED_PIN);
      this.photos = [...(business.photos || [])];
      this.renderForm(business, false);
      await this.renderMerchantTools(business);
    } catch (error) {
      SessionStore.remove(MERCHANT_TOKEN);
      window.dispatchEvent(new Event("apnajind:authchange"));
      Toast.show(error.message);
      this.login();
    }
  }

  renderPinChange(business, issued, mandatory) {
    const expiresAt = issued?.expiresAt || business.pinExpiresAt;
    const whatsapp = issued
      ? PinService.whatsappUrl(issued.whatsapp || issued.phone, issued.pin, issued.businessName || business.name, expiresAt)
      : "";
    this.html = `<section class="merchant-pin-page"><div class="merchant-auth-top"><span class="st ${mandatory ? "pending" : "approved"}">${mandatory ? "One-time setup required" : "Account security"}</span></div><p class="hero-kicker">${mandatory ? "SECURE YOUR MERCHANT ACCOUNT" : "UPDATE YOUR SIGN-IN"}</p><h1>${mandatory ? "Set your personal PIN" : "Change your PIN"}</h1><p class="intro">${mandatory ? "Your temporary PIN is valid for 24 hours. Choose a personal 6-digit PIN before continuing to your dashboard." : "Enter your current PIN, then choose and confirm a new 6-digit PIN."}</p>${issued ? `<section class="temporary-pin-card"><div><span class="auth-eyebrow">Your temporary PIN</span><strong class="temporary-pin-value" aria-label="Temporary PIN ${esc(issued.pin)}">${esc(issued.pin)}</strong><p class="meta">Valid until ${esc(PinService.expiryLabel(expiresAt))}</p></div>${whatsapp ? `<a class="btn ok" href="${esc(whatsapp)}" target="_blank" rel="noopener noreferrer">${icon("phone")} Send to my WhatsApp</a>` : ""}</section>` : mandatory ? `<section class="network-notice" role="status">Enter the temporary PIN given to you by the administrator. It expires 24 hours after it was generated.</section>` : ""}<section class="box merchant-pin-form-card"><form id="merchant-pin-change"><label for="merchant-old-pin">${mandatory ? "Temporary PIN" : "Current PIN"}</label><input id="merchant-old-pin" class="pin-code-input" name="oldPin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="current-password" aria-label="${mandatory ? "Temporary" : "Current"} PIN, 6 digits" required><label for="merchant-new-pin">New 6-digit PIN</label><input id="merchant-new-pin" class="pin-code-input" name="newPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" aria-label="New PIN, 6 digits" required><label for="merchant-confirm-pin">Confirm new PIN</label><input id="merchant-confirm-pin" class="pin-code-input" name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" aria-label="Confirm new PIN, 6 digits" required><div class="btns"><button class="btn ac" type="submit">${mandatory ? "Set PIN & continue" : "Update PIN"}</button>${mandatory ? "" : '<button class="btn ghost" id="cancel-pin-change" type="button">Cancel</button>'}</div><p class="form-error" id="pin-change-error" role="alert"></p></form></section></section>`;
    bindPinInputs(this.host);
    this.on("#merchant-pin-change", "submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const errorMessage = this.$("#pin-change-error");
      if (form.elements.newPin.value !== form.elements.confirmPin.value) {
        errorMessage.textContent = "The new PIN entries do not match.";
        return;
      }
      button.disabled = true;
      errorMessage.textContent = "";
      try {
        const rememberMe = SessionStore.persistent(MERCHANT_TOKEN);
        const result = await PinService.change(SessionStore.read(MERCHANT_TOKEN), form.elements.oldPin.value, form.elements.newPin.value, form.elements.confirmPin.value, rememberMe);
        SessionStore.write(MERCHANT_TOKEN, result.token, rememberMe);
        sessionStorage.removeItem(ISSUED_PIN);
        Toast.show("Your merchant PIN was updated.");
        await this.profile();
      } catch (error) {
        errorMessage.textContent = error.message;
        button.disabled = false;
      }
    });
    if (!mandatory) this.on("#cancel-pin-change", "click", () => this.profile());
  }

  renderForm(business, isNew) {
    this.isRegistration = isNew;
    this.activeRegistrationStep = "business";
    const categories = CodeService.list("CATEGORY");
    const areas = CodeService.list("AREA");
    const value = business || {};
    const options = (records, selected, emptyLabel) =>
      `<option value="">${emptyLabel}</option>${records
        .map(
          (record) => `
      <option value="${esc(record.code)}" ${record.code === selected ? "selected" : ""}>${esc(record.description)}</option>`,
        )
        .join("")}`;
    this.html = `${isNew ? `<div class="merchant-auth-top"><a class="btn ghost auth-back" href="#/auth">${icon("arrow-left")} Back to sign in &amp; register</a></div>` : ""}<header class="merchant-heading"><p class="hero-kicker">${isNew ? "Join your local directory" : "Merchant dashboard"}</p><h1>${isNew ? "List your business" : esc(value.name)}</h1>
      ${isNew ? '<p class="intro">Create a useful listing for people looking for local businesses in Jind.</p>' : `<p><span class="st ${esc(value.status)}">${esc(this.statusLabel(value.status))}</span></p>`}</header>
      <div class="box merchant-form-card"><form id="business-form" novalidate>
        <div class="listing-progress"><div><strong>${isNew ? "Registration progress" : "Listing completeness"}</strong><span id="${isNew ? "registration-progress-label" : "completeness-label"}"></span></div><div class="progress-track" role="progressbar" aria-label="${isNew ? "Registration progress" : "Listing completeness"}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="${isNew ? "registration-progress-bar" : "completeness-bar"}"></span></div></div>
        <div class="merchant-tabs${isNew ? " merchant-registration-steps" : ""}" role="tablist" aria-label="${isNew ? "Business registration steps" : "Business details"}">
          <button class="merchant-tab active" type="button" role="tab" id="tab-business" aria-selected="true" aria-controls="panel-business" data-tab="business">${isNew ? '<span class="merchant-step-number">1</span><span class="merchant-step-copy"><small>STEP 1</small><strong>Business</strong></span>' : "Business details"}</button>
          <button class="merchant-tab" type="button" role="tab" id="tab-location" aria-selected="false" aria-controls="panel-location" data-tab="location">${isNew ? '<span class="merchant-step-number">2</span><span class="merchant-step-copy"><small>STEP 2</small><strong>Contact</strong></span>' : "Location & contact"}</button>
          <button class="merchant-tab" type="button" role="tab" id="tab-attachments" aria-selected="false" aria-controls="panel-attachments" data-tab="attachments">${isNew ? `<span class="merchant-step-number">3</span><span class="merchant-step-copy"><small>STEP 3</small><strong>Photos</strong></span>` : "Attachments"} <span class="tab-count">${this.photos.length}/10</span></button>
        </div>
        <section class="merchant-panel" role="tabpanel" id="panel-business" aria-labelledby="tab-business" data-panel="business">
          ${isNew ? '<div class="registration-panel-heading"><p class="auth-eyebrow">STEP 1 OF 3</p><h2>Tell us about your business</h2><p>Start with the details customers use to find you.</p></div>' : '<p class="panel-intro">Tell customers what makes your business useful to them.</p>'}
          <label for="business-name">Business name</label><input id="business-name" maxlength="80" required value="${esc(value.name)}" placeholder="e.g. Sharma Sweets">
          <label for="business-category">Category</label><select id="business-category" required>${options(categories, value.category, "Choose category")}</select>
          <label for="business-description">About your business</label><textarea id="business-description" rows="4" maxlength="600" placeholder="A short introduction customers will see on your listing">${esc(value.description)}</textarea>
          <label for="business-services">Services <span class="label-hint">Separate with commas</span></label><input id="business-services" maxlength="300" placeholder="Home delivery, catering" value="${esc((value.services || []).join(", "))}">
          <details class="hours-details" id="hours-details" ${isNew ? "" : "open"}><summary>${isNew ? "Add opening hours (optional)" : "Weekly opening hours"}</summary><div class="hours-heading"><div><h2>Weekly opening hours</h2><p class="meta">Set each day’s hours so customers know when you’re open.</p></div><button class="btn ghost" type="button" id="copy-monday-hours">Copy Monday to all</button></div>
            ${typeof value.hours === "string" && value.hours && !value.hours.trim().startsWith("{") ? `<p class="network-notice" role="status">Your existing hours are in an older format. Set your weekly schedule below to update them.</p>` : ""}
            <div class="hours-editor" id="hours-editor">${scheduleFields(value.hours)}</div>
            <div class="row merchant-info-row"><div><label for="business-availability">Availability</label><select id="business-availability"><option value="available" ${value.availability === "available" || !value.availability ? "selected" : ""}>Open for customers</option><option value="seasonal" ${value.availability === "seasonal" ? "selected" : ""}>Seasonal</option><option value="temporarily_closed" ${value.availability === "temporarily_closed" ? "selected" : ""}>Temporarily closed</option></select></div></div>
          </details>
        </section>
        <section class="merchant-panel" role="tabpanel" id="panel-location" aria-labelledby="tab-location" data-panel="location" hidden>
          ${isNew ? '<div class="registration-panel-heading"><p class="auth-eyebrow">STEP 2 OF 3</p><h2>Where can customers find you?</h2><p>Add your address and a mobile number so customers can reach you.</p></div>' : '<p class="panel-intro">Help customers find and contact your business.</p>'}
          <label for="business-address">Shop address</label><input id="business-address" maxlength="200" autocomplete="street-address" value="${esc(value.address)}" placeholder="Street, building or nearby landmark">
          <div class="row merchant-location-row">
            <div><label for="business-area">Area / mohalla</label><select id="business-area">${options(areas, value.area, "Select area")}</select></div>
            <div class="location-control"><label>&nbsp;</label><button class="btn ghost" type="button" id="use-location">⌖ Use my location</button></div>
          </div>
          <div class="place-search"><label for="place-query">Or search for a place</label><input id="place-query" list="place-suggestions" maxlength="120" placeholder="Start typing a landmark or area" autocomplete="off" aria-describedby="location-search-status"><datalist id="place-suggestions">${areas.map((area) => `<option value="${esc(area.description)}"></option>`).join("")}</datalist><p class="location-note" id="location-search-status" role="status" aria-live="polite">Suggestions use Jind areas. Choose a suggestion or enter a place, then leave this field to look it up.</p><p class="location-note">Your place name is sent to OpenStreetMap for lookup. Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>.</p></div>
          <p class="location-note">Use your device location or search a place to fill the address and coordinates. Review the details before saving.</p>
          <div class="row coordinate-row">
            <div><label for="business-lat">Latitude</label><input id="business-lat" inputmode="decimal" value="${esc(value.lat)}" placeholder="Filled from location"></div>
            <div><label for="business-lng">Longitude</label><input id="business-lng" inputmode="decimal" value="${esc(value.lng)}" placeholder="Filled from location"></div>
          </div>
          <div class="row">
            <div><label for="business-phone">Mobile number${isNew ? " (required)" : ""}</label><input id="business-phone" type="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" autocomplete="tel" required value="${esc(value.phone)}" ${isNew ? "" : "readonly"}></div>
            <div class="whatsapp-field"><label for="business-whatsapp">WhatsApp <span class="label-hint">Optional</span></label><input id="business-whatsapp" inputmode="numeric" maxlength="10" value="${esc(value.whatsapp)}"><label class="same-phone-option"><input id="whatsapp-same-phone" type="checkbox" ${value.phone && value.whatsapp === value.phone ? "checked" : ""}> Same as mobile number</label></div>
          </div>
          <label for="business-owner">Owner name <span class="label-hint">Optional</span></label><input id="business-owner" maxlength="60" autocomplete="name" value="${esc(value.owner)}">
        </section>
        <section class="merchant-panel" role="tabpanel" id="panel-attachments" aria-labelledby="tab-attachments" data-panel="attachments" hidden>
          ${isNew ? '<div class="registration-panel-heading"><p class="auth-eyebrow">STEP 3 OF 3</p><h2>Add business photos</h2><p>Add at least one clear picture of your shop, products or services. You can add up to 10 photos.</p></div>' : '<p class="panel-intro">Add clear photos of your storefront, products or services. Add up to 10 photos.</p>'}
          <label class="upload-drop ${this.photos.length >= 10 ? "at-limit" : ""}" for="business-photos" aria-disabled="${this.photos.length >= 10}"><span class="upload-icon" aria-hidden="true">${this.photos.length >= 10 ? "✓" : "＋"}</span><strong>${this.photos.length >= 10 ? "Photo limit reached" : isNew && !this.photos.length ? "Add at least one photo" : "Add photos"}</strong><span>Choose image files from your device</span><small aria-live="polite">JPEG, PNG, WebP or AVIF · ${this.photos.length} of 10 added</small><input id="business-photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple aria-describedby="${isNew ? "photo-help registration-photo-error" : "photo-help"}" ${isNew ? "required" : ""} ${this.photos.length >= 10 ? "disabled" : ""}></label>
          ${isNew ? '<p class="form-error registration-photo-error" id="registration-photo-error" role="alert" aria-live="polite"></p>' : ""}
          <span id="photo-help" class="sr">You can add up to 10 photos. Remove a photo to replace it.</span>
          <div class="photo-list merchant-photo-list" id="photo-list">${this.photoMarkup()}</div>
          ${isNew ? '<label class="remember-option registration-remember"><input id="merchant-remember" type="checkbox"><span><strong>Keep me signed in</strong><small>Stay signed in on this device for up to 90 days</small></span></label>' : ""}
        </section>
        ${!isNew ? '<div class="merchant-form-footer"><span class="meta">Changes may require admin approval.</span><div class="btns"><button class="btn ghost" id="preview-business" type="button">Preview listing</button><button class="btn ac" id="save-business" type="submit">Save changes</button></div></div>' : ""}
      </form></div>${isNew ? `<div class="merchant-registration-dock"><span class="registration-dock-label" id="registration-dock-label">Step 1 of 3 · Business</span><div class="registration-dock-actions"><button class="btn ghost" id="registration-back" type="button" disabled>Back</button><button class="btn ac" id="registration-next" type="button">Continue to location</button><button class="btn ghost" id="preview-business" type="button" hidden>Preview</button><button class="btn ac" id="save-business" type="submit" form="business-form" hidden>Register business</button><a class="registration-login-link" href="#/merchant">Already registered? Sign in</a></div></div>` : `<section class="box merchant-security-card"><div><p class="auth-eyebrow">Account security</p><h2>Merchant sign-in PIN</h2><p class="meta">Change your PIN whenever you need to. Your current PIN is required.</p></div><button class="btn ghost" id="change-merchant-pin" type="button">${icon("key")} Change PIN</button></section>`}<dialog class="listing-preview" id="listing-preview" aria-label="Business listing preview"></dialog>`;

    this.updateCompleteness();
    if (isNew) this.updateRegistrationProgress();
    this.on("#business-form", "input", () => this.updateCompleteness());
    this.on("#business-form", "change", () => this.updateCompleteness());
    this.on("#hours-editor", "change", (event) => {
      if (!event.target.matches('input[type="checkbox"][name$="-closed"]')) return;
      const fieldset = event.target.closest("fieldset");
      fieldset.querySelectorAll('input[type="time"]').forEach((input) => { input.disabled = event.target.checked; });
    });
    this.on("#copy-monday-hours", "click", () => {
      const mondayClosed = this.$('[name="hours-mon-closed"]');
      ["tue", "wed", "thu", "fri", "sat", "sun"].forEach((day) => {
        const closed = this.$(`[name="hours-${day}-closed"]`);
        const open = this.$(`[name="hours-${day}-open"]`);
        const close = this.$(`[name="hours-${day}-close"]`);
        closed.checked = mondayClosed.checked; open.value = this.$('[name="hours-mon-open"]').value; close.value = this.$('[name="hours-mon-close"]').value;
        open.disabled = close.disabled = mondayClosed.checked;
      });
      Toast.show("Monday’s hours copied to the other days.");
    });
    this.on("#preview-business", "click", () => this.previewListing());
    if (!isNew) this.on("#change-merchant-pin", "click", () => this.renderPinChange(value, null, false));

    this.host.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.tabIndex = tab.classList.contains("active") ? 0 : -1;
      tab.addEventListener("click", () => this.selectTab(tab.dataset.tab));
      tab.addEventListener("keydown", (event) => {
        const tabs = [...this.host.querySelectorAll("[data-tab]")];
        const index = tabs.indexOf(tab);
        const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
          : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
            : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (next >= 0) {
          event.preventDefault();
          this.selectTab(tabs[next].dataset.tab);
          tabs[next].focus();
        }
      });
    });
    this.on("#business-photos", "change", (event) => this.handlePhotos(event));
    this.on("#photo-list", "click", (event) => {
      const removeButton = event.target.closest("[data-remove-photo]");
      const index = Number(removeButton?.dataset.removePhoto);
      if (Number.isInteger(index) && index >= 0) {
        this.photos.splice(index, 1);
        this.refreshPhotoList();
      }
    });
    const drop = this.$(".upload-drop");
    ["dragenter", "dragover"].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add("dragging"); }));
    ["dragleave", "drop"].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.remove("dragging"); }));
    drop.addEventListener("drop", (event) => this.handlePhotos({ currentTarget: { files: event.dataTransfer.files, value: "" } }));
    this.on("#use-location", "click", () => this.setLocation());
    this.on("#place-query", "change", () => this.searchLocation());
    this.on("#place-query", "keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); this.searchLocation(); } });
    this.on("#whatsapp-same-phone", "change", (event) => {
      const whatsapp = this.$("#business-whatsapp");
      whatsapp.disabled = event.currentTarget.checked;
      if (event.currentTarget.checked) whatsapp.value = this.$("#business-phone").value;
    });
    this.on("#business-phone", "input", () => {
      this.$("#business-phone").setCustomValidity("");
      if (this.$("#whatsapp-same-phone").checked) this.$("#business-whatsapp").value = this.$("#business-phone").value;
    });
    if (isNew) {
      this.on("#registration-next", "click", () => this.advanceRegistration());
      this.on("#registration-back", "click", () => this.selectTab(this.previousRegistrationStep(), true));
      this.updateRegistrationDock();
    }
    if (value.phone && value.whatsapp === value.phone) this.$("#business-whatsapp").disabled = true;
    this.on("#business-form", "submit", (event) =>
      this.submitForm(event, isNew),
    );
  }

  async renderMerchantTools(business) {
    let content = { offers: [], posts: [] }, reviews = [], errorMessage = "";
    try { content = await DiscoveryService.merchantContent(); }
    catch (error) { errorMessage = error.message; }
      try { reviews = await DiscoveryService.reviews(business.id); } catch { /* Review tools are optional until deployed. */ }
    const offers = content.offers || [];
    const posts = content.posts || [];
    this.host.insertAdjacentHTML("beforeend", `<section class="box merchant-community-tools"><div class="merchant-community-heading"><div><p class="auth-eyebrow">KEEP CUSTOMERS IN THE LOOP</p><h2>Offers &amp; updates</h2><p class="meta">Publish a special offer or short update for people who follow your business.</p></div><a class="btn ghost" href="#/updates">View customer feed</a></div>${errorMessage ? `<p class="network-notice">${esc(errorMessage)}</p>` : `<div class="merchant-tools-grid"><form id="merchant-offer-form"><h3>Post an offer</h3><label for="merchant-offer-title">Offer title</label><input id="merchant-offer-title" name="title" maxlength="80" required><label for="merchant-offer-description">Details</label><textarea id="merchant-offer-description" name="description" maxlength="300" rows="2" required></textarea><label for="merchant-offer-code">Coupon code <span class="label-hint">Optional</span></label><input id="merchant-offer-code" name="promoCode" maxlength="30"><label for="merchant-offer-expiry">Expires</label><input id="merchant-offer-expiry" name="endsAt" type="date" required><button class="btn ac" type="submit">Publish offer</button></form><form id="merchant-post-form"><h3>Share a business update</h3><label for="merchant-post-message">What’s new?</label><textarea id="merchant-post-message" name="message" maxlength="500" minlength="8" rows="5" required placeholder="New service, holiday hours or something you'd like followers to know..."></textarea><button class="btn ghost" type="submit">Post update</button></form></div><div class="merchant-content-lists"><section><h3>Your offers</h3>${offers.length ? offers.map((offer) => `<article class="merchant-offer-row"><div><strong>${esc(offer.title)}</strong><p>${esc(offer.description)}</p><small>${offer.active ? "Published" : "Paused"} · Ends ${esc(new Date(offer.endsAt).toLocaleDateString("en-IN"))}${offer.promoCode ? ` · Code ${esc(offer.promoCode)}` : ""}</small></div><button type="button" class="btn ghost merchant-offer-delete" data-delete-offer="${esc(offer.id)}" aria-label="Delete offer ${esc(offer.title)}">${icon("trash")}<span>Delete</span></button></article>`).join("") : '<p class="meta">No offers yet.</p>'}</section><section><h3>Recent updates</h3>${posts.length ? posts.slice(0, 5).map((post) => `<article><p>${esc(post.message)}</p><small>${esc(new Date(post.created).toLocaleDateString("en-IN"))}</small></article>`).join("") : '<p class="meta">No updates yet.</p>'}</section></div><section class="merchant-review-replies"><h3>Reply to customer reviews</h3>${reviews.length ? reviews.map((review) => `<article><div><strong>${esc(review.customerName || "Jind customer")} · ${"★".repeat(review.rating)}</strong><p>${esc(review.comment)}</p>${review.ownerReply ? `<p class="owner-reply"><b>Your reply:</b> ${esc(review.ownerReply)}</p>` : ""}</div><form data-review-reply="${esc(review.id)}"><label class="sr-only" for="reply-${esc(review.id)}">Reply to review</label><input id="reply-${esc(review.id)}" name="reply" maxlength="500" placeholder="Write a helpful reply" value="${esc(review.ownerReply)}" required><button class="btn ghost" type="submit">${review.ownerReply ? "Update reply" : "Reply"}</button></form></article>`).join("") : '<p class="meta">Approved customer reviews will appear here.</p>'}</section>`}</section>`);
    this.host.querySelectorAll("[data-delete-offer]").forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Delete this offer? It will be removed from the customer directory.")) return;
      button.disabled = true;
      try { await DiscoveryService.deleteOffer(button.dataset.deleteOffer); Toast.show("Offer deleted"); await this.profile(); }
      catch (error) { Toast.show(error.message); button.disabled = false; }
    }));
    const offerForm = this.host.querySelector("#merchant-offer-form");
    offerForm?.addEventListener("submit", async (event) => {
      event.preventDefault(); const form = event.currentTarget, button = form.querySelector('[type="submit"]'); button.disabled = true;
      try {
        await DiscoveryService.saveOffer({ title: form.elements.title.value.trim(), description: form.elements.description.value.trim(), promoCode: form.elements.promoCode.value.trim(), endsAt: new Date(`${form.elements.endsAt.value}T23:59:59`).toISOString() });
        Toast.show("Offer published"); await this.profile();
      } catch (error) { Toast.show(error.message); button.disabled = false; }
    });
    this.host.querySelector("#merchant-post-form")?.addEventListener("submit", async (event) => {
      event.preventDefault(); const form = event.currentTarget, button = form.querySelector('[type="submit"]'); button.disabled = true;
      try { await DiscoveryService.savePost(form.elements.message.value.trim()); Toast.show("Update posted"); await this.profile(); }
      catch (error) { Toast.show(error.message); button.disabled = false; }
    });
    this.host.querySelectorAll("[data-review-reply]").forEach((form) => form.addEventListener("submit", async (event) => {
      event.preventDefault(); const button = form.querySelector('[type="submit"]'); button.disabled = true;
      try { await DiscoveryService.reply(form.dataset.reviewReply, form.elements.reply.value.trim()); Toast.show("Reply saved"); await this.profile(); }
      catch (error) { Toast.show(error.message); button.disabled = false; }
    }));
  }

  statusLabel(status) {
    return (
      {
        pending: "Waiting for approval",
        approved: "Live on ApnaJind",
        rejected: "Not approved",
      }[status] || status
    );
  }

  updateCompleteness() {
    if (this.isRegistration) {
      this.updateRegistrationProgress();
      return;
    }
    const fields = ["name", "category", "description", "address", "area", "phone"];
    const complete = fields.reduce((sum, field) => sum + (this.$(`#business-${field}`)?.value.trim() ? 1 : 0), 0) + (this.photos.length ? 1 : 0);
    const percent = Math.round((complete / (fields.length + 1)) * 100);
    const label = this.$("#completeness-label");
    const bar = this.$("#completeness-bar");
    if (label) label.textContent = `${percent}% complete`;
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.parentElement.setAttribute("aria-valuenow", String(percent));
    }
  }

  previewListing() {
    const value = (field) => this.$(`#business-${field}`)?.value.trim() || "";
    const categorySelect = this.$("#business-category");
    const areaSelect = this.$("#business-area");
    const category = categorySelect?.selectedOptions[0]?.textContent || "Business";
    const area = areaSelect?.selectedOptions[0]?.textContent || "Jind";
    const services = value("services").split(",").map((item) => item.trim()).filter(Boolean);
    const photo = safeImageSrc(this.photos[0]);
    const dialog = this.$("#listing-preview");
    let previewHours = "";
    try { previewHours = formatHours(readSchedule(this.$("#business-form"))); } catch { /* Incomplete schedule can still be previewed. */ }
    dialog.innerHTML = `<article class="preview-card">${photo ? `<img class="preview-photo" src="${esc(photo)}" alt="Listing photo preview">` : '<div class="preview-photo preview-placeholder">Business photo</div>'}<div class="preview-body"><div class="preview-toolbar"><span class="tag">Preview</span><button class="icon-btn preview-close" type="button" aria-label="Close preview">×</button></div><h2>${esc(value("name") || "Your business name")}</h2><p class="meta">${esc(category)} · ${esc(area)}</p><p class="preview-description">${esc(value("description") || "Your business description will appear here.")}</p><p class="preview-meta"><strong>Hours</strong><br>${esc(previewHours)}</p><p class="preview-meta"><strong>Status</strong> ${esc(this.$("#business-availability")?.selectedOptions[0]?.textContent || "Open for customers")}</p><div>${services.map((service) => `<span class="tag">${esc(service)}</span>`).join("")}</div><p class="preview-meta"><strong>Address</strong> ${esc(value("address") || "Add an address")}${value("area") ? `, ${esc(area)}` : ""}, Jind</p><p class="preview-meta"><strong>Contact</strong> ${esc(value("phone") || "Add a mobile number")}</p></div></article>`;
    dialog.showModal();
    this.on(".preview-close", "click", () => dialog.close());
    dialog.onclick = (event) => { if (event.target === dialog) dialog.close(); };
  }

  photoMarkup() {
    return this.photos
      .map(
        (
          photo,
          index,
        ) => `<button class="photo-remove" type="button" data-remove-photo="${index}" aria-label="Remove photo ${index + 1}">
      <img src="${esc(safeImageSrc(photo))}" alt="Photo ${index + 1}" referrerpolicy="no-referrer"><span aria-hidden="true">×</span>
    </button>`,
      )
      .join("");
  }

  selectTab(name) {
    this.host.querySelectorAll("[data-tab]").forEach((tab) => {
      const selected = tab.dataset.tab === name;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    this.host.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
    if (this.isRegistration) {
      this.activeRegistrationStep = name;
      this.updateRegistrationProgress();
      this.updateRegistrationDock();
      if (window.matchMedia("(max-width: 600px)").matches) {
        this.$(`#panel-${name} .registration-panel-heading`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }

  previousRegistrationStep() {
    return { location: "business", attachments: "location" }[this.activeRegistrationStep] || "business";
  }

  advanceRegistration() {
    if (this.activeRegistrationStep === "business") {
      for (const field of [this.$("#business-name"), this.$("#business-category")]) {
        if (!field.value.trim()) {
          field.reportValidity();
          return;
        }
      }
      this.selectTab("location");
    } else if (this.activeRegistrationStep === "location") {
      const phone = this.$("#business-phone");
      phone.setCustomValidity(/^[6-9]\d{9}$/.test(phone.value.trim()) ? "" : "Enter a valid 10-digit Indian mobile number.");
      if (!phone.reportValidity()) return;
      this.selectTab("attachments");
    }
  }

  updateRegistrationProgress() {
    if (!this.isRegistration) return;
    const steps = ["business", "location", "attachments"];
    const labels = ["Business details", "Location & contact", "Photos"];
    const index = steps.indexOf(this.activeRegistrationStep);
    const percent = Math.round(((index + 1) / steps.length) * 100);
    const label = this.$("#registration-progress-label");
    const bar = this.$("#registration-progress-bar");
    if (label) label.textContent = `Step ${index + 1} of ${steps.length}`;
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.parentElement.setAttribute("aria-valuenow", String(percent));
    }
    this.host.querySelectorAll(".merchant-registration-steps [data-tab]").forEach((tab, tabIndex) => {
      tab.setAttribute("aria-current", tabIndex === index ? "step" : "false");
    });
  }

  updateRegistrationDock() {
    if (!this.isRegistration) return;
    const steps = ["business", "location", "attachments"];
    const labels = ["Business", "Location & contact", "Photos"];
    const index = steps.indexOf(this.activeRegistrationStep);
    const back = this.$("#registration-back");
    const next = this.$("#registration-next");
    const preview = this.$("#preview-business");
    const submit = this.$("#save-business");
    const stepLabel = this.$("#registration-dock-label");
    if (back) back.disabled = index === 0;
    if (next) next.hidden = index === steps.length - 1;
    if (preview) preview.hidden = index !== steps.length - 1;
    if (submit) submit.hidden = index !== steps.length - 1;
    if (stepLabel) stepLabel.textContent = `Step ${index + 1} of ${steps.length} · ${labels[index]}`;
  }

  refreshPhotoList() {
    this.$("#photo-list").innerHTML = this.photoMarkup();
    const count = this.photos.length;
    this.$("#tab-attachments .tab-count").textContent = `${count}/10`;
    const drop = this.$(".upload-drop");
    drop.querySelector("strong").textContent = count >= 10 ? "Photo limit reached" : "Add photos";
    drop.querySelector("small").textContent = `${count} of 10 added`;
    drop.classList.toggle("at-limit", count >= 10);
    drop.setAttribute("aria-disabled", String(count >= 10));
    this.$("#business-photos").disabled = count >= 10;
    const photoError = this.$("#registration-photo-error");
    if (count && photoError) photoError.textContent = "";
    if (this.isRegistration) {
      const uploadLabel = drop.querySelector("strong");
      if (count < 10) uploadLabel.textContent = count ? "Add more photos" : "Add at least one photo";
    }
    this.updateCompleteness();
  }

  async handlePhotos(event) {
    const input = event.currentTarget;
    for (const file of input.files) {
      if (this.photos.length + this.photoPending >= 10) {
        Toast.show("You can add up to 10 photos.");
        break;
      }
      const supportedMime = ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type);
      const supportedExtension = /\.(?:jpe?g|png|webp|avif)$/i.test(file.name || "");
      if (!supportedMime && !supportedExtension && file.type) {
        Toast.show("Choose a JPEG, PNG, WebP or AVIF photo. HEIC photos need to be exported to JPEG first.");
        continue;
      }
      if (file.size > 12 * 1024 * 1024) {
        Toast.show("Each photo must be smaller than 12 MB.");
        continue;
      }
      this.photoPending += 1;
      try {
        this.photos.push(await this.compress(file));
      } catch (error) {
        Toast.show(error.message);
      } finally {
        this.photoPending -= 1;
      }
    }
    if ("value" in input) input.value = "";
    this.refreshPhotoList();
  }

  compress(file) {
    return new Promise((resolve, reject) => {
      const fail = () => reject(new Error("This image could not be opened on this device. Export it as JPEG, PNG or WebP and try again."));
      const draw = (source, width, height, cleanup = () => {}) => {
        try {
          if (!width || !height) throw new Error("The image has no readable dimensions.");
          let scale = Math.min(1, 1200 / Math.max(width, height));
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Photo processing is unavailable in this browser.");
          let quality = 0.76;
          let output = "";
          for (let attempt = 0; attempt < 8; attempt += 1) {
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            context.drawImage(source, 0, 0, canvas.width, canvas.height);
            output = canvas.toDataURL("image/jpeg", quality);
            if (output.length <= 650000) break;
            if (quality > 0.5) quality -= 0.1;
            else scale *= 0.82;
          }
          if (!output.startsWith("data:image/jpeg;base64,") || output.length < 100) throw new Error("The browser could not convert this image.");
          if (output.length > 680000) throw new Error("This photo is too detailed to upload. Try a smaller image or crop it first.");
          resolve(output);
        } catch (error) { reject(new Error(error.message || "Unable to process this photo. Try a smaller image.")); }
        finally { cleanup(); }
      };
      if ("createImageBitmap" in window) {
        createImageBitmap(file).then((bitmap) => draw(bitmap, bitmap.width, bitmap.height, () => bitmap.close?.())).catch(() => loadWithImage());
      } else loadWithImage();
      function loadWithImage() {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => draw(image, image.naturalWidth, image.naturalHeight, () => URL.revokeObjectURL(url));
        image.onerror = () => { URL.revokeObjectURL(url); fail(); };
        image.src = url;
      }
    });
  }

  setLocation() {
    if (!navigator.geolocation) {
      Toast.show("Location is not supported on this device.");
      return;
    }
    const button = this.$("#use-location");
    button.disabled = true;
    button.textContent = "Getting location…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.applyLocation({ lat: latitude.toFixed(6), lng: longitude.toFixed(6) }, false);
        button.textContent = "Finding address…";
        LocationService.reverse(latitude, longitude).then((result) => {
          this.applyLocation(result, true);
          Toast.show("Location found. Review the address and area before saving.");
        }).catch(() => Toast.show("Coordinates added. Add the address and area manually if they’re missing.")).finally(() => { button.disabled = false; button.textContent = "⌖ Use my location"; });
      },
      (error) => {
        button.disabled = false;
        button.textContent = "⌖ Use my location";
        Toast.show(error.code === error.PERMISSION_DENIED ? "Allow location access to use this feature." : "Could not get your location. Try again or enter it manually.");
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 },
    );
  }

  async searchLocation() {
    const input = this.$("#place-query");
    const status = this.$("#location-search-status");
    const query = input.value.trim();
    if (!query || this.locationSearchPending) return;
    const matchedArea = CodeService.list("AREA").find((area) => area.description.toLocaleLowerCase() === query.toLocaleLowerCase());
    if (matchedArea) {
      this.$("#business-area").value = matchedArea.code;
      if (!this.$("#business-address").value.trim()) this.$("#business-address").value = `${matchedArea.description}, Jind, Haryana`;
      this.updateCompleteness();
    }
    this.locationSearchPending = true;
    input.readOnly = true;
    input.setAttribute("aria-busy", "true");
    status.textContent = "Looking up this place…";
    try {
      const result = await LocationService.search(query);
      this.applyLocation(result, true);
      status.textContent = "Place found. Review the address and area before saving.";
    } catch (error) {
      status.textContent = matchedArea
        ? `${matchedArea.description} selected. Precise coordinates could not be fetched; use “Use my location” or enter coordinates manually.`
        : `${error.message || "Could not find that place."} Try a nearby area suggestion or use “Use my location”.`;
    } finally { this.locationSearchPending = false; input.readOnly = false; input.removeAttribute("aria-busy"); }
  }

  applyLocation(result, updateAddress) {
    this.$("#business-lat").value = result.lat;
    this.$("#business-lng").value = result.lng;
    if (updateAddress && result.address) this.$("#business-address").value = result.address;
    const address = `${result.address || ""} ${Object.values(result.parts || {}).join(" ")}`.toLocaleLowerCase();
    const area = CodeService.list("AREA").find((item) => address.includes(String(item.description).toLocaleLowerCase()));
    if (area) this.$("#business-area").value = area.code;
    this.updateCompleteness();
  }

  async submitForm(event, isNew) {
    event.preventDefault();
    const get = (id) => this.$(`#business-${id}`).value.trim();
    const phone = get("phone");
    let hours;
    try { hours = readSchedule(this.$("#business-form")); }
    catch (error) {
      this.selectTab("business");
      this.$("#hours-details").open = true;
      return Toast.show(error.message);
    }
    if (!get("name")) return Toast.show("Enter your business name.");
    if (!get("category")) {
      this.selectTab("business");
      return Toast.show("Choose a business category.");
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      this.selectTab("location");
      return Toast.show("Enter a valid 10-digit mobile number.");
    }
    if (isNew && !this.photos.length) {
      this.selectTab("attachments");
      this.$("#registration-photo-error").textContent = "Add at least one photo before registering your business.";
      this.$("#registration-photo-error").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const data = {
      name: get("name"),
      category: get("category"),
      description: get("description"),
      services: get("services"),
      hours,
      availability: get("availability"),
      address: get("address"),
      area: get("area"),
      lat: get("lat"),
      lng: get("lng"),
      phone,
      whatsapp: this.$("#whatsapp-same-phone").checked ? phone : get("whatsapp"),
      owner: get("owner"),
      photos: this.photos,
      rememberMe: isNew && Boolean(this.$("#merchant-remember")?.checked),
    };
    const button = this.$("#save-business");
    button.disabled = true;
    button.textContent = isNew ? "Sending your listing…" : "Saving changes…";
    try {
      if (isNew) {
        const result = await BusinessService.register(data);
        sessionStorage.setItem(ISSUED_PIN, JSON.stringify({
          pin: result.pin,
          expiresAt: result.expiresAt,
          phone: result.phone,
          whatsapp: result.whatsapp,
          businessName: result.businessName,
        }));
        SessionStore.write(MERCHANT_TOKEN, result.token, data.rememberMe);
        window.dispatchEvent(new Event("apnajind:authchange"));
      } else {
        await BusinessService.save(
          data,
          SessionStore.read(MERCHANT_TOKEN),
        );
      }
      if (isNew) {
        Toast.show("Business registered. Your temporary PIN is ready.");
        location.hash = "#/merchant";
        return;
      }
      Toast.show("Saved. Sent for re-approval.");
      await this.profile();
    } catch (error) {
      Toast.show(error.message);
      button.disabled = false;
      button.textContent = isNew ? "Register business" : "Save changes";
    }
  }
}
