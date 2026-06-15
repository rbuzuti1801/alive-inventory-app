import Link from "next/link";
import { Boxes, FileText, LayoutDashboard, MapPinned, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">ALIVE INVENTÁRIO</div>
        <div style={{ marginBottom: 22 }}>
          <strong>{user.name}</strong>
          <div className="muted">{roleLabels[user.role]}</div>
        </div>
        <nav className="nav">
          <Link href="/dashboard"><LayoutDashboard size={18} /> Dashboard</Link>
          <Link href="/inventory"><Boxes size={18} /> Inventário</Link>
          <Link href="/reports"><FileText size={18} /> Relatórios</Link>
          {user.role === "admin" && <Link href="/sectors"><MapPinned size={18} /> Setores</Link>}
          {user.role === "admin" && <Link href="/users"><Users size={18} /> Usuários</Link>}
          <LogoutButton />
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
