import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarNav } from "@/components/SidebarNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">
            <span className="alive">ALIVE</span>
            <span className="church">CHURCH</span>
          </div>
          <div className="sidebar-logo-sub">INVENTÁRIO</div>
        </div>

        {/* User info */}
        <div className="sidebar-user">
          <span className="sidebar-user-name">{user.name}</span>
          <span className="sidebar-user-role">{roleLabels[user.role]}</span>
        </div>

        {/* Nav items */}
        <SidebarNav role={user.role} />

        {/* Logout pinned to bottom */}
        <div className="sidebar-footer">
          <LogoutButton />
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
