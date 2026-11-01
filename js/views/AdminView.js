import { BaseView } from "./BaseView.js";
import { esc } from "../core/Dom.js";
import { icon } from "../core/Icons.js";
import { AuthService } from "../services/AuthService.js";
import { ApprovalPanel } from "./admin/ApprovalPanel.js";
import { CodeMasterPanel } from "./admin/CodeMasterPanel.js";
import { RolePanel } from "./admin/RolePanel.js";
import { UserPanel } from "./admin/UserPanel.js";
import { ReportsPanel } from "./admin/ReportsPanel.js";
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
];
export class AdminView extends BaseView {
  static nav = "admin";
  static access = "admin";
  constructor(host, tab) {
    super(host);
    this.tab = tab;
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
    this.html = `<h1>Admin</h1><div class="meta">${esc(me.name)} · ${esc(me.role.name)}</div><div class="chips">${tabs.map((t) => `<a class="chip ${t === cur ? "on" : ""}" href="#/admin/${t.id}">${icon(t.icon)}&nbsp;${t.label}</a>`).join("")}</div><div id="panel"></div>`;
    await new cur.Panel(this.$("#panel")).render();
  }
}
