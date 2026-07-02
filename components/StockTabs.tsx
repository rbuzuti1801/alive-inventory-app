"use client";

import Link from "next/link";
import { ArrowLeftRight, Package, Warehouse } from "lucide-react";

export type StockTab = "produtos" | "localizacoes" | "movimentacoes";

const tabs: { key: StockTab; label: string; icon: React.ReactNode }[] = [
  { key: "produtos", label: "Produtos", icon: <Package size={15} /> },
  { key: "localizacoes", label: "Localizações", icon: <Warehouse size={15} /> },
  { key: "movimentacoes", label: "Movimentações", icon: <ArrowLeftRight size={15} /> },
];

export function StockTabs({ active }: { active: StockTab }) {
  return (
    <nav className="stock-tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/stock?tab=${tab.key}`}
          className={`stock-tab ${active === tab.key ? "stock-tab-active" : ""}`}
        >
          {tab.icon} {tab.label}
        </Link>
      ))}
    </nav>
  );
}
