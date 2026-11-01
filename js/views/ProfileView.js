import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { CustomerService } from "../services/CustomerService.js";

export class ProfileView extends BaseView {
  static nav = "profile";
  static access = "customer";

  render() {
    const profile = CustomerService.profile;
    this.html = `<h1>Your profile</h1>
      <section class="box profile-card">
        <div class="profile-avatar" aria-hidden="true">${esc((profile.name || "?").trim().charAt(0).toUpperCase())}</div>
        <div><h2>${esc(profile.name)}</h2><p class="meta">ApnaJind customer</p></div>
        <dl class="profile-details">
          <div><dt>Mobile number</dt><dd>${esc(profile.phone)}</dd></div>
          <div><dt>Email address</dt><dd>${esc(profile.email)}</dd></div>
        </dl>
      </section>`;
  }
}
