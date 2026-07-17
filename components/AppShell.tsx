"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { roleLabels, type Role } from "@/lib/constants";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarNav } from "@/components/SidebarNav";

// Casca da aplicação. No desktop mantém a sidebar fixa (comportamento original);
// no mobile a sidebar vira um drawer recolhível acionado pelo botão hambúrguer,
// com backdrop e trava de rolagem. Fecha sozinho ao trocar de rota.
export function AppShell({
  userName,
  userRole,
  children,
}: {
  userName: string;
  userRole: Role;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha ao navegar (o clique num item do menu já muda a rota).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Trava a rolagem do body enquanto o drawer está aberto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc fecha o drawer.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="app-shell">
      {/* Barra superior — só aparece no mobile */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="hamburger"
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="app-sidebar"
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </button>
        <div className="mobile-brand">
          <span className="alive">ALIVE</span>
          <span className="church">CHURCH</span>
        </div>
      </header>

      {/* Backdrop do drawer */}
      <div
        className={`sidebar-backdrop${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside id="app-sidebar" className={`sidebar${open ? " is-open" : ""}`}>
        <div className="sidebar-logo">
          <button
            type="button"
            className="sidebar-close"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
          <div className="sidebar-logo-text">
            <span className="alive">ALIVE</span>
            <span className="church">CHURCH</span>
          </div>
          <div className="sidebar-logo-sub">INVENTÁRIO</div>
        </div>

        <div className="sidebar-user">
          <span className="sidebar-user-name">{userName}</span>
          <span className="sidebar-user-role">{roleLabels[userRole]}</span>
        </div>

        <SidebarNav role={userRole} />

        <div className="sidebar-footer">
          <LogoutButton />
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
