import { esc } from "../../core/Dom.js";
import { Toast } from "../../core/Toast.js";
import { BusinessService } from "../../services/BusinessService.js";

const LABELS = {
  wrong_contact: "Contact details are wrong",
  wrong_address: "Address or area is wrong",
  closed: "Business appears closed",
  other: "Other listing issue",
};

export class ReportsPanel {
  constructor(host) {
    this.host = host;
    this.host.onclick = (event) => this.handleAction(event);
  }

  async render() {
    this.host.innerHTML = '<div class="empty">Loading customer reports…</div>';
    const reports = await BusinessService.adminReports();
    this.host.innerHTML = reports.length ? reports.map((report) => `<article class="box approval-card report-card"><div class="approval-heading"><div><h2>${esc(report.businessName)}</h2><span class="st pending">Needs review</span></div><p class="meta">${esc(LABELS[report.reason] || report.reason)} · ${esc(new Date(report.created).toLocaleDateString())}</p></div><p>${esc(report.details || "No additional details provided.")}</p><div class="btns"><button class="btn ok" type="button" data-report="${esc(report.id)}" data-status="resolved">Mark resolved</button><button class="btn ghost" type="button" data-report="${esc(report.id)}" data-status="dismissed">Dismiss</button></div></article>`).join("") : '<div class="empty">No open customer reports.</div>';
  }

  async handleAction(event) {
    const button = event.target.closest("[data-report]");
    if (!button) return;
    button.disabled = true;
    try {
      await BusinessService.adminSetReport({ id: button.dataset.report, status: button.dataset.status });
      Toast.show(button.dataset.status === "resolved" ? "Report marked resolved." : "Report dismissed.");
      await this.render();
    } catch (error) { Toast.show(error.message); button.disabled = false; }
  }
}
