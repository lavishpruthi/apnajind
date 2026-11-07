import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { AuthService } from "../services/AuthService.js";
import { ApprovalPanel } from "./admin/ApprovalPanel.js";
import { CodeMasterPanel } from "./admin/CodeMasterPanel.js";
import { RolePanel } from "./admin/RolePanel.js";
import { UserPanel } from "./admin/UserPanel.js";
import { ReportsPanel } from "./admin/ReportsPanel.js";
import { PasswordRequestsPanel } from "./admin/PasswordRequestsPanel.js";
import { SettingsPanel } from "./admin/SettingsPanel.js";
import { CommunityPanel } from "./admin/CommunityPanel.js";
import { BusinessService } from "../services/BusinessService.js";
import { Toast } from "../core/Toast.js";
/** Panel registry: add a line to expose a new admin screen. Visibility follows the logged-in user's role permissions. */
const TABS = [
  {
    id: "approvals",
    label: "Approvals",
    icon: "check",
    perm: "business.approve",
    Panel: ApprovalPanel,
  },
  { id: "reports", label: "Reports", icon: "flag", perm: "business.approve", Panel: ReportsPanel },
  { id: "passwords", label: "Password requests", icon: "key", perm: "user.manage", Panel: PasswordRequestsPanel },
  {
    id: "codes",
    label: "Code master",
    icon: "list",
    perm: "code.manage",
    Panel: CodeMasterPanel,
  },
  {
    id: "roles",
    label: "Roles",
    icon: "key",
    perm: "role.manage",
    Panel: RolePanel,
  },
  {
    id: "users",
    label: "Users",
    icon: "users",
    perm: "user.manage",
    Panel: UserPanel,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "key",
    perm: "settings.manage",
    Panel: SettingsPanel,
  },
  { id: "community", label: "Events & reviews", icon: "calendar", perm: "events.manage", Panel: CommunityPanel },
];
export class AdminView extends BaseView {
  static nav = "admin";
  static access = "admin";
  static pendingBusinessIds = null;
  constructor(host, tab) {
    super(host);
    this.tab = tab;
    this.pendingBusinessIds = AdminView.pendingBusinessIds;
    this.pendingCheck = null;
    this.pendingPoll = 0;
    this.pendingFrame = 0;
    this.lastPendingCheckAt = 0;
    this.handleAdminFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - this.lastPendingCheckAt >= 15000)
        void this.checkPendingApprovals();
    };
  }
  async render() {
    return this.panel();
  }
  async panel() {
    const tabs = TABS.filter((t) => AuthService.can(t.perm)),
      cur = tabs.find((t) => t.id === this.tab) || tabs[0],
      me = AuthService.profile;
    if (!cur) {
      AuthService.logout();
      this.html =
        '<div class="empty">Your role has no admin permissions.</div>';
      return;
    }
    this.activeTab = cur.id;
    this.html = `<h1>Admin</h1><div class="meta">${esc(me.name)} · ${esc(me.role.name)}</div><div class="chips">${tabs.map((t) => `<a class="chip ${t === cur ? "on" : ""}" href="#/admin/${t.id}">${icon(t.icon)}&nbsp;${t.label}${t.id === "approvals" ? '<span id="pending-approval-count" class="admin-count-badge" hidden></span>' : ""}</a>`).join("")}</div><p id="admin-pending-notice" class="admin-pending-notice" role="status" aria-live="polite" hidden></p><p id="admin-pending-error" class="admin-pending-error" role="status" hidden></p><div id="panel"></div>`;
    const reportPending = (businesses, notify = true) => this.updatePendingApprovals(businesses, notify);
    await new cur.Panel(this.$("#panel"), reportPending).render();
    if (AuthService.can("business.approve")) {
      this.pendingFrame = requestAnimationFrame(() => {
        this.pendingFrame = 0;
        if (!this.host.isConnected) return;
        this.pendingPoll = window.setInterval(() => void this.checkPendingApprovals(), 60000);
        window.addEventListener("focus", this.handleAdminFocus);
        document.addEventListener("visibilitychange", this.handleAdminFocus);
        if (cur.id !== "approvals") void this.checkPendingApprovals(false);
      });
    }
  }

  async checkPendingApprovals(notify = true) {
    if (this.pendingCheck || !AuthService.can("business.approve")) return;
    this.lastPendingCheckAt = Date.now();
    this.pendingCheck = BusinessService.adminList()
      .then((businesses) => this.updatePendingApprovals(businesses, this.pendingBusinessIds === null ? false : notify))
      .catch((error) => {
        const status = this.$("#admin-pending-error");
        if (status) {
          status.hidden = false;
          status.textContent = `Could not check for new submissions. ${error.message} We’ll retry shortly.`;
        }
      })
      .finally(() => { this.pendingCheck = null; });
    return this.pendingCheck;
  }

  updatePendingApprovals(businesses, notify) {
    const pending = businesses.filter((business) => business.status === "pending");
    const nextIds = pending.map((business) => String(business.id));
    const newBusinesses = this.pendingBusinessIds === null
      ? []
      : pending.filter((business) => !this.pendingBusinessIds.includes(String(business.id)));
    this.pendingBusinessIds = nextIds;
    AdminView.pendingBusinessIds = nextIds;
    const badge = this.$("#pending-approval-count");
    if (badge) {
      badge.hidden = pending.length === 0;
      badge.textContent = pending.length > 99 ? "99+" : String(pending.length);
      badge.setAttribute("aria-label", `${pending.length} pending ${pending.length === 1 ? "business" : "businesses"}`);
    }
    const error = this.$("#admin-pending-error");
    if (error) error.hidden = true;
    if (!notify || !newBusinesses.length) return;
    const message = newBusinesses.length === 1
      ? `${newBusinesses[0].name} is waiting for approval.`
      : `${newBusinesses.length} new businesses are waiting for approval.`;
    if (this.activeTab !== "approvals") {
      const notice = this.$("#admin-pending-notice");
      if (notice) {
        notice.hidden = false;
        notice.innerHTML = `${esc(message)} <a href="#/admin/approvals">Review now ${icon("chevron-right")}</a>`;
      }
    }
    Toast.show(message);
  }

  destroy() {
    window.clearInterval(this.pendingPoll);
    this.pendingPoll = 0;
    cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = 0;
    window.removeEventListener("focus", this.handleAdminFocus);
    document.removeEventListener("visibilitychange", this.handleAdminFocus);
  }
}
