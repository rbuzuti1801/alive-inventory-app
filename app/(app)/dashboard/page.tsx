import Link from "next/link";
import { AlertTriangle, Boxes, Plus, TrendingUp, Wrench } from "lucide-react";
import { Badge } from "@/components/Badge";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export default async function DashboardPage() {
  await requireUser();

  const [activeRes, latestRes] = await Promise.all([
    supabaseAdmin
      .from("inventory_items")
      .select("id,quantity,acquisition_value,conservation_status,sectors(name)")
      .eq("status", "ativo"),
    supabaseAdmin
      .from("inventory_items")
      .select("id,sku,item_code,description,conservation_status,status,updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const active = activeRes.data ?? [];
  const latest = latestRes.data ?? [];

  const totalActiveItems = active.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
  const totalValue       = active.reduce((s, i) => s + Number(i.quantity ?? 0) * Number(i.acquisition_value ?? 0), 0);
  const damagedItems     = active.filter((i) => i.conservation_status === "danificado").length;
  const maintenanceItems = active.filter((i) => i.conservation_status === "em_manutencao").length;

  const bySector = active.reduce<Record<string, number>>((acc, item) => {
    const sector = (item.sectors as { name?: string } | null)?.name ?? "Sem setor";
    acc[sector] = (acc[sector] ?? 0) + Number(item.quantity ?? 0);
    return acc;
  }, {});

  const maxCount = Math.max(...Object.values(bySector), 1);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Visão geral do inventário ativo da Alive Church.</p>
        </div>
        <Link className="button gold" href="/inventory/new">
          <Plus size={16} /> Novo item
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid cards" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#EEF1F8" }}>
            <Boxes size={20} color="#202F56" />
          </div>
          <div>
            <p className="kpi-label">Itens Ativos</p>
            <p className="kpi-value">{totalActiveItems.toLocaleString("pt-BR")}</p>
            <p className="kpi-sub">unidades em estoque</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#FEF9EC" }}>
            <TrendingUp size={20} color="#FAB72E" />
          </div>
          <div>
            <p className="kpi-label">Valor Estimado</p>
            <p className="kpi-value" style={{ fontSize: 18 }}>
              {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="kpi-sub">patrimônio ativo</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#FEF2F2" }}>
            <AlertTriangle size={20} color="#B42318" />
          </div>
          <div>
            <p className="kpi-label">Danificados</p>
            <p className="kpi-value" style={{ color: damagedItems > 0 ? "#B42318" : "#202F56" }}>
              {damagedItems}
            </p>
            <p className="kpi-sub">precisam de atenção</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#FFFAEB" }}>
            <Wrench size={20} color="#9A6700" />
          </div>
          <div>
            <p className="kpi-label">Em Manutenção</p>
            <p className="kpi-value" style={{ color: maintenanceItems > 0 ? "#9A6700" : "#202F56" }}>
              {maintenanceItems}
            </p>
            <p className="kpi-sub">em reparo</p>
          </div>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Items by sector */}
        <div className="panel">
          <h2>Itens por setor</h2>
          {Object.keys(bySector).length === 0 ? (
            <div className="empty-state">
              <Boxes size={36} color="#302F2F" />
              <p>Nenhum item ativo cadastrado.</p>
            </div>
          ) : (
            Object.entries(bySector)
              .sort(([, a], [, b]) => b - a)
              .map(([sector, count]) => (
                <div key={sector} className="sector-bar-row">
                  <span className="sector-bar-label">{sector}</span>
                  <div className="sector-bar-track">
                    <div className="sector-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="sector-bar-count">{count}</span>
                </div>
              ))
          )}
        </div>

        {/* Recent activity */}
        <div className="panel">
          <h2>Últimas atualizações</h2>
          {latest.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            latest.map((item) => (
              <div key={item.id} className="activity-item">
                <span className="sku-badge">{(item as Record<string, unknown>).sku as string ?? item.item_code}</span>
                <Link href={`/inventory/${item.id}`}>{item.description}</Link>
                <Badge kind="conservation" value={item.conservation_status} />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
