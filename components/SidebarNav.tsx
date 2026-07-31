"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building2, ChevronRight, ClipboardList, FileSignature, FileText, LayoutDashboard, MapPinned, Package, QrCode, ScanLine, ShoppingCart, Users } from "lucide-react";

// `managerOnly`: admin e gestor (responsavel). `adminOnly`: somente admin.
const navItems = [
  { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/inventory", label: "Inventário", icon: Boxes },
  { href: "/stock",     label: "Estoque",    icon: Package },
  { href: "/scan",      label: "Leitura QR", icon: ScanLine },
  { href: "/labels",    label: "Etiquetas",  icon: QrCode },
  { href: "/audit",     label: "Inventário rápido", icon: ClipboardList },
  { href: "/purchase-requests", label: "Solicitações de Compra", icon: ShoppingCart,   managerOnly: true },
  { href: "/service-orders",    label: "Ordens de Serviço",      icon: FileSignature, managerOnly: true },
  { href: "/reports",   label: "Relatórios", icon: FileText },
  { href: "/sectors",   label: "Setores",    icon: MapPinned, adminOnly: true },
  { href: "/users",     label: "Usuários",   icon: Users,     adminOnly: true },
  { href: "/church-profile", label: "Perfil da Igreja", icon: Building2, adminOnly: true },
];

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navItems.filter(
    (item) =>
      (!item.adminOnly || role === "admin") &&
      (!item.managerOnly || role === "admin" || role === "responsavel"),
  );

  return (
    <nav className="sidebar-nav">
      {items.map(({ href, label, icon: Icon, adminOnly: _, managerOnly: __ }) => {
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
