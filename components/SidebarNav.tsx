"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChevronRight, ClipboardList, FileText, LayoutDashboard, MapPinned, QrCode, ScanLine, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/inventory", label: "Inventário", icon: Boxes },
  { href: "/scan",      label: "Leitura QR", icon: ScanLine },
  { href: "/labels",    label: "Etiquetas",  icon: QrCode },
  { href: "/audit",     label: "Inventário rápido", icon: ClipboardList },
  { href: "/reports",   label: "Relatórios", icon: FileText },
  { href: "/sectors",   label: "Setores",    icon: MapPinned, adminOnly: true },
  { href: "/users",     label: "Usuários",   icon: Users,     adminOnly: true },
];

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav className="sidebar-nav">
      {items.map(({ href, label, icon: Icon, adminOnly: _ }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link key={href} href={href} className={`nav-item${active ? " nav-item-active" : ""}`}>
            <Icon size={17} className="nav-icon" />
            <span>{label}</span>
            {active && <ChevronRight size={13} className="nav-arrow" />}
          </Link>
        );
      })}
    </nav>
  );
}
