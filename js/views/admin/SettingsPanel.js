import { SettingsService } from "../../services/SettingsService.js";
import { Toast } from "../../core/Toast.js";
import { esc } from "../../core/Dom.js";

export class SettingsPanel {
  constructor(host) { this.host = host; }
  async render() {
    const settings = await SettingsService.public();
    this.host.innerHTML = `<section class="box"><h2>Support contact</h2><p class="meta">These details appear in the customer Profile section. Leave a field blank to hide it.</p><form id="support-settings"><label for="support-email">Support email</label><input id="support-email" name="email" type="email" maxlength="120" autocomplete="email" value="${esc(settings.supportEmail)}"><label for="support-phone">Support phone</label><input id="support-phone" name="phone" type="tel" maxlength="20" autocomplete="tel" value="${esc(settings.supportPhone)}"><div class="btns"><button class="btn ac" type="submit">Save contact details</button></div></form></section>`;
    this.host.querySelector("#support-settings").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const form = event.currentTarget;
        await SettingsService.save({ email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim() });
        Toast.show("Support contact saved");
      } catch (error) { Toast.show(error.message); }
      finally { button.disabled = false; }
    });
  }
}
