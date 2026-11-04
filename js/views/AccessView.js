import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { Toast } from "../core/Toast.js";
import { icon } from "../core/Icons.js";
import { AuthService } from "../services/AuthService.js";
import { CustomerService } from "../services/CustomerService.js";
import { BusinessService } from "../services/BusinessService.js";
import { CodeService } from "../services/CodeService.js";
import { SessionStore } from "../services/SessionStore.js";
import { bindPinInputs } from "../core/PinInput.js";

const MERCHANT_TOKEN = "apnajind_merchant_token";

export class AccessView extends BaseView {
  static nav = "auth";
  static access = "guest";

  constructor(host, mode) {
    super(host);
    this.mode = mode || "home";
  }

  render() {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const path = location.hash.split("?")[0];
    this.role = params.get("role") || (this.mode === "admin" ? "staff" : path === "#/merchant/login" ? "merchant" : "customer");
    if (!["customer", "merchant", "staff"].includes(this.role)) this.role = "customer";
    this.authMode = params.get("mode") || (this.mode === "register" ? "register" : "login");
    if (this.authMode !== "register") this.authMode = "login";
    if (this.role === "staff") this.authMode = "login";
    this.renderUnified();
  }

  renderUnified() {
    const roleNames = { customer: "Customer", merchant: "Merchant", staff: "Staff" };
    const roleCopy = { customer: "Discover and save local businesses.", merchant: "Manage your listing and reach more customers.", staff: "Review listings and manage ApnaJind." };
    let areaRecords = CodeService.list("AREA");
    if (!areaRecords.length) {
      try { areaRecords = JSON.parse(localStorage.getItem(CodeService.cacheKey) || "null")?.codes?.AREA || []; }
      catch { areaRecords = []; }
    }
    if (!Array.isArray(areaRecords)) areaRecords = [];
    const localAreas = areaRecords.filter((area) => area.active !== false).slice(0, 3).map((area) => area.description);
    if (!localAreas.length) localAreas.push("Hansi Road", "Rani Talab", "Patiala Chowk");
    let panel = "";
    if (this.role === "customer" && this.authMode === "register") {
      panel = `<section class="auth-form-panel"><p class="auth-eyebrow">New to ApnaJind?</p><h2>Create your customer account</h2><form id="customer-register"><label for="customer-name">Your name</label><input id="customer-name" name="name" autocomplete="name" maxlength="60" required><label for="customer-phone">Mobile number</label><input id="customer-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" pattern="[6-9][0-9]{9}" required><label for="customer-email">Email address</label><input id="customer-email" name="email" type="email" autocomplete="email" maxlength="120" required><label for="customer-password">Create a password</label><input id="customer-password" name="password" type="password" autocomplete="new-password" minlength="8" required><label class="remember-option"><input id="customer-remember" type="checkbox"><span><strong>Stay signed in on this device</strong><small>Keep me signed in for up to 90 days</small></span></label><div class="btns"><button class="btn ac" type="submit">Create account</button></div></form></section>`;
    } else if (this.role === "merchant" && this.authMode === "register") {
      panel = `<section class="auth-form-panel merchant-register-panel"><p class="auth-eyebrow">For Jind businesses</p><h2>Register your business</h2><p class="meta">A simple 3-step setup: business details, contact information and at least one business photo. Your listing is reviewed before it goes live.</p><a class="btn ac" href="#/merchant/new">Start registration</a><p class="meta">Already listed? Switch to merchant sign in.</p></section>`;
    } else if (this.role === "merchant") {
      panel = `<section class="auth-form-panel"><p class="auth-eyebrow">Merchant access</p><h2>Sign in to your business</h2><form id="merchant-login"><label for="merchant-phone">Mobile number</label><input id="merchant-phone" type="tel" inputmode="numeric" autocomplete="username" maxlength="10" required><label for="merchant-pin">6-digit PIN</label><div class="pin-input-wrap"><input id="merchant-pin" class="pin-code-input" type="password" inputmode="numeric" pattern="[0-9]{4,6}" autocomplete="current-password" maxlength="6" aria-label="Merchant PIN, 6 digits" required></div><label class="remember-option"><input id="merchant-remember" type="checkbox"><span><strong>Stay signed in on this device</strong><small>Keep me signed in for up to 90 days</small></span></label><div class="btns"><button class="btn ac" type="submit">Sign in as merchant</button></div></form></section>`;
    } else if (this.role === "staff") {
      panel = `<section class="auth-form-panel"><p class="auth-eyebrow">Staff access</p><h2>Sign in to the admin workspace</h2><form id="admin-login"><label for="admin-identity">Phone, email or username</label><input id="admin-identity" autocomplete="username" autocapitalize="none" required><label for="admin-password">Password</label><input id="admin-password" type="password" autocomplete="current-password" required><div class="btns"><button class="btn ac" type="submit">Sign in as staff</button></div></form><p class="auth-note">Staff accounts are created by an administrator.</p></section>`;
    } else {
      panel = `<section class="auth-form-panel"><p class="auth-eyebrow">Welcome back</p><h2>Sign in to your customer account</h2><form id="customer-login"><label for="customer-identity">Mobile number or email</label><input id="customer-identity" autocomplete="username" autocapitalize="none" required><label for="customer-password">Password</label><input id="customer-password" type="password" autocomplete="current-password" required><label class="remember-option"><input id="customer-remember" type="checkbox"><span><strong>Stay signed in on this device</strong><small>Keep me signed in for up to 90 days</small></span></label><div class="btns"><button class="btn ac" type="submit">Sign in as customer</button></div></form></section>`;
    }
    this.html = `<section class="auth-home auth-unified"><div class="auth-stage"><aside class="auth-local-showcase"><span class="auth-town-stamp">JIND <i>•</i> HARYANA</span><div class="auth-local-art" aria-hidden="true"><span class="auth-art-orbit auth-art-orbit-a"></span><span class="auth-art-orbit auth-art-orbit-b"></span><span class="auth-art-sun"></span><span class="auth-art-building auth-building-one"></span><span class="auth-art-building auth-building-two"></span><span class="auth-art-building auth-building-three"></span><span class="auth-art-road"></span><span class="auth-art-pin">${icon("pin")}</span><span class="auth-floating-tile auth-tile-food">${icon("utensils")}</span><span class="auth-floating-tile auth-tile-shop">${icon("store")}</span><span class="auth-floating-tile auth-tile-heart">${icon("heart")}</span></div><div class="auth-local-copy"><p class="auth-local-script">अपना शहर</p><p class="auth-local-title">Apna Jind.<br><em>Apna guide.</em></p><p class="auth-local-description">From ${esc(localAreas[0])} to ${esc(localAreas[1] || "Jind" )}, find the places that make everyday Jind feel like home.</p><div class="auth-area-tags">${localAreas.map((area) => `<span>${esc(area)}</span>`).join("")}</div></div><div class="auth-local-footer"><span class="auth-local-spark">✳</span><span>Made for the people of Jind</span><span class="auth-footer-line"></span></div></aside><div class="auth-main"><header class="auth-home-heading"><p class="hero-kicker">WELCOME TO APNAJIND</p><h1>Your Jind, all in one place.</h1><p class="intro">Choose how you want to continue.</p></header><div class="auth-role-tabs" role="tablist" aria-label="Choose account type">${["customer", "merchant", "staff"].map((role) => `<button type="button" role="tab" id="auth-tab-${role}" aria-selected="${this.role === role}" aria-controls="auth-panel" tabindex="${this.role === role ? "0" : "-1"}" data-auth-role="${role}"><span>${roleNames[role]}</span><small>${roleCopy[role]}</small></button>`).join("")}</div><section class="auth-access-card" id="auth-panel" role="tabpanel" aria-labelledby="auth-tab-${this.role}"><div class="auth-mode-tabs" role="tablist" aria-label="Sign in or register"><button type="button" role="tab" aria-selected="${this.authMode === "login"}" tabindex="${this.authMode === "login" ? "0" : "-1"}" data-auth-mode="login">Sign in</button><button type="button" role="tab" aria-selected="${this.authMode === "register"}" tabindex="${this.authMode === "register" ? "0" : "-1"}" data-auth-mode="register" ${this.role === "staff" ? "disabled title=\"Staff accounts are created by an administrator\"" : ""}>Register</button></div>${panel}</section><p class="auth-footer-note">Local finds, familiar streets, all in one place.</p></div></div></section>`;
    bindPinInputs(this.host);
    this.host.querySelectorAll("[data-auth-role]").forEach((button) => {
      button.addEventListener("click", () => this.setSelection(button.dataset.authRole, this.role === "staff" ? "login" : this.authMode));
      button.addEventListener("keydown", (event) => this.handleTabKey(event, "[data-auth-role]"));
    });
    this.host.querySelectorAll("[data-auth-mode]:not(:disabled)").forEach((button) => button.addEventListener("click", () => this.setSelection(this.role, button.dataset.authMode)));
    if (this.$("#customer-login")) this.on("#customer-login", "submit", (event) => this.submitCustomerLogin(event));
    if (this.$("#customer-register")) this.on("#customer-register", "submit", (event) => this.submitCustomerRegister(event));
    if (this.$("#admin-login")) this.on("#admin-login", "submit", (event) => this.submitAdminLogin(event));
    if (this.$("#merchant-login")) this.on("#merchant-login", "submit", (event) => this.submitMerchantLogin(event));
  }

  setSelection(role, mode) {
    this.role = role;
    this.authMode = role === "staff" ? "login" : mode;
    const hash = `#/auth?role=${encodeURIComponent(this.role)}&mode=${encodeURIComponent(this.authMode)}`;
    history.replaceState(null, "", hash);
    this.renderUnified();
  }

  handleTabKey(event, selector) {
    const tabs = [...this.host.querySelectorAll(selector)];
    const current = tabs.indexOf(event.currentTarget);
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const next = tabs[(current + direction + tabs.length) % tabs.length];
    next.focus();
    next.click();
  }

  async submitMerchantLogin(event) {
    event.preventDefault();
    const button = this.$('button[type="submit"]');
    button.disabled = true;
    try {
      const rememberMe = this.$("#merchant-remember").checked;
      const result = await BusinessService.login(this.$("#merchant-phone").value.trim(), this.$("#merchant-pin").value.trim(), rememberMe);
      AuthService.logout();
      CustomerService.logout(false);
      SessionStore.write(MERCHANT_TOKEN, result.token, rememberMe);
      window.dispatchEvent(new Event("apnajind:authchange"));
      location.hash = "#/merchant";
    } catch (error) { Toast.show(error.message); button.disabled = false; }
  }

  customerRegister() {
    this.html = `<section class="access-panel">
      <p class="hero-kicker">ApnaJind</p>
      <h1>Find your place in Jind</h1>
      <p class="intro">Create an account to explore local businesses and manage your profile.</p>
      <div class="box"><form id="customer-register">
        <label for="customer-name">Your name</label><input id="customer-name" name="name" autocomplete="name" maxlength="60" required>
        <label for="customer-phone">Mobile number</label><input id="customer-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" pattern="[6-9][0-9]{9}" required>
        <label for="customer-email">Email address</label><input id="customer-email" name="email" type="email" autocomplete="email" maxlength="120" required>
        <label for="customer-password">Create a password</label><input id="customer-password" name="password" type="password" autocomplete="new-password" minlength="8" required>
        <div class="btns"><button class="btn ac" type="submit">Create account</button></div>
      </form></div>
      <p class="access-switch"><a class="btn ghost auth-back" href="#/auth">${icon("arrow-left")} Back to sign in &amp; register</a></p>
    </section>`;
    this.on("#customer-register", "submit", (event) =>
      this.submitCustomerRegister(event),
    );
  }

  customerLogin() {
    this.html = `<section class="access-panel">
      <p class="hero-kicker">Welcome back</p>
      <h1>Log in to ApnaJind</h1>
      <p class="intro">Use the mobile number or email address linked to your account.</p>
      <div class="box"><form id="customer-login">
        <label for="customer-identity">Mobile number or email</label><input id="customer-identity" autocomplete="username" autocapitalize="none" required>
        <label for="customer-password">Password</label><input id="customer-password" type="password" autocomplete="current-password" required>
        <div class="btns"><button class="btn ac" type="submit">Log in</button></div>
      </form></div>
      <p class="access-switch"><a class="btn ghost auth-back" href="#/auth">${icon("arrow-left")} Back to sign in &amp; register</a></p>
    </section>`;
    this.on("#customer-login", "submit", (event) =>
      this.submitCustomerLogin(event),
    );
  }

  async submitCustomerRegister(event) {
    event.preventDefault();
    const button = this.$('button[type="submit"]');
    button.disabled = true;
    try {
      const form = this.$("#customer-register");
      await CustomerService.register({
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
        rememberMe: this.$("#customer-remember").checked,
      });
      location.hash = "#/";
    } catch (error) {
      Toast.show(error.message);
      button.disabled = false;
    }
  }

  async submitCustomerLogin(event) {
    event.preventDefault();
    const button = this.$('button[type="submit"]');
    button.disabled = true;
    try {
      await CustomerService.login(
        this.$("#customer-identity").value.trim(),
        this.$("#customer-password").value,
        this.$("#customer-remember").checked,
      );
      location.hash = "#/";
    } catch (error) {
      Toast.show(error.message);
      button.disabled = false;
    }
  }

  async submitAdminLogin(event) {
    event.preventDefault();
    const button = this.$('button[type="submit"]');
    button.disabled = true;
    try {
      await AuthService.login(
        this.$("#admin-identity").value.trim(),
        this.$("#admin-password").value,
      );
      location.hash = "#/admin";
    } catch (error) {
      Toast.show(error.message);
      button.disabled = false;
    }
  }
}
