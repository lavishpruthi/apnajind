import { esc } from "../../core/Dom.js";
import { Toast } from "../../core/Toast.js";
import { BusinessService } from "../../services/BusinessService.js";

export class PasswordRequestsPanel {
  constructor(host) {
    this.host = host;
    this.host.onclick = (event) => this.handleAction(event);
  }

  async render(notice = "") {
    this.host.innerHTML = '<div class="empty">Loading password requests…</div>';
    const requests = await BusinessService.adminPasswordRequests();
    this.host.innerHTML = notice + (requests.length ? requests.map((r) => `<article class="box approval-card"><div class="approval-heading"><div><h2>${esc(r.name)}</h2><span class="st pending">Reset requested</span></div><p class="meta">${esc(r.phone)} · ${esc(r.email)} · ${esc(new Date(r.created).toLocaleDateString())}</p></div><p class="meta">Confirm it is really the customer before sharing the password.</p><div class="btns"><button class="btn ok" type="button" data-pwreset="${esc(r.id)}">Generate temporary password</button></div></article>`).join("") : '<div class="empty">No open password requests.</div>');
  }

  async handleAction(event) {
    const button = event.target.closest("[data-pwreset]");
    if (!button) return;
    button.disabled = true;
    try {
      const result = await BusinessService.adminGeneratePassword(button.dataset.pwreset);
      // Shown once only: the password is not stored in readable form.
      await this.render(`<div class="box network-notice" role="status"><p><strong>Temporary password for ${esc(result.name)} (${esc(result.phone)}):</strong></p><p style="font-size:1.4rem;letter-spacing:.1em"><code>${esc(result.password)}</code></p><p class="meta">Share it with the customer now. This will not be shown again. They must change it at first sign-in.</p></div>`);
    } catch (error) { Toast.show(error.message); button.disabled = false; }
  }
}
