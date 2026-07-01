import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, Boxes, Package, Plus, QrCode, ScanLine, TrendingUp, Wrench } from "lucide-react";
import { Badge } from "@/components/Badge";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  stockMovementLabels,
  stockStatus,
  stockUnitLabels,
  type StockMovementType,
  type StockUnit,
} from "@/lib/constants";

export default async function DashboardPage() {
  await requireUser();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [activeRes, latestRes, totalRes, noLabelRes, neverScannedRes, scannedRes, stockRes, consumedRes, stockMovsRes] = await Promise.all([
    supabaseAdmin
      .from("inventory_items")
      .select("id,quantity,acquisition_value,conservation_status,sectors(name)")
      .eq("status", "ativo"),
    supabaseAdmin
      .from("inventory_items")
      .select("id,sku,item_code,description,conservation_status,status,updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabaseAdmin.from("inventory_items").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("inventory_items").select("id", { count: "exact", head: true }).eq("label_printed", false),
    supabaseAdmin.from("inventory_items").select("id", { count: "exact", head: true }).is("last_scan_at", null),
    supabaseAdmin
      .from("inventory_items")
      .select("id,sku,item_code,description,last_scan_at")
      .not("last_scan_at", "is", null)
      .order("last_scan_at", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("stock_products")
      .select("id,public_code,name,unit,min_quantity,stock_levels(quantity)")
      .eq("active", true),
    supabaseAdmin
      .from("stock_movements")
      .select("product_id,quantity,stock_products(name,unit)")
      .eq("movement_type", "saida")
      .gte("moved_at", thirtyDaysAgo),
    supabaseAdmin
      .from("stock_movements")
      .select("id,movement_type,quantity,moved_at,stock_products(name,unit)")
      .order("moved_at", { ascending: false })
      .limit(5),
  ]);

  const active = activeRes.data ?? [];
  const latest = latestRes.data ?? [];
  const totalItems = totalRes.count ?? 0;
  const itemsWithoutLabel = noLabelRes.count ?? 0;
  const neverScanned = neverScannedRes.count ?? 0;
  const recentlyScanned = scannedRes.data ?? [];

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

  // ── Estoque de consumíveis ────────────────────────────────────────────
  const stockProducts = (stockRes.data ?? []).map((p) => ({
    ...p,
    total: ((p.stock_levels ?? []) as { quantity: number }[]).reduce((s, l) => s + Number(l.quantity), 0),
  }));
  const belowMin = stockProducts
    .filter((p) => Number(p.min_quantity) > 0 && stockStatus(p.total, Number(p.min_quantity)) !== "normal")
    .sort((a, b) => a.total / Number(a.min_quantity) - b.total / Number(b.min_quantity))
    .slice(0, 6);

  const consumedByProduct = (consumedRes.data ?? []).reduce<Record<string, { name: string; unit: string; total: number }>>(
    (acc, m) => {
      const product = m.stock_products as { name?: string; unit?: string } | null;
      const key = m.product_id;
      if (!acc[key]) acc[key] = { name: product?.name ?? "—", unit: product?.unit ?? "un", total: 0 };
      acc[key].total += Number(m.quantity);
      return acc;
    },
    {},
  );
  const mostConsumed = Object.values(consumedByProduct).sort((a, b) => b.total - a.total).slice(0, 6);
  const maxConsumed = Math.max(...mostConsumed.map((c) => c.total), 1);

  const stockMovements = stockMovsRes.data ?? [];

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

      {/* Patrimonial / QR indicators */}
      <div className="grid cards" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#EEF1F8" }}><Package size={20} color="#202F56" /></div>
          <div>
            <p className="kpi-label">Itens Cadastrados</p>
            <p className="kpi-value">{totalItems.toLocaleString("pt-BR")}</p>
            <p className="kpi-sub">total no patrimônio</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#FEF9EC" }}><QrCode size={20} color="#FAB72E" /></div>
          <div>
            <p className="kpi-label">Sem Etiqueta</p>
            <p className="kpi-value" style={{ color: itemsWithoutLabel > 0 ? "#9A6700" : "#202F56" }}>{itemsWithoutLabel}</p>
            <p className="kpi-sub"><Link href="/labels?printed=false">imprimir etiquetas</Link></p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#F0FDF4" }}><ScanLine size={20} color="#087443" /></div>
          <div>
            <p className="kpi-label">Nunca Escaneados</p>
            <p className="kpi-value" style={{ color: neverScanned > 0 ? "#175CD3" : "#202F56" }}>{neverScanned}</p>
            <p className="kpi-sub">sem leitura registrada</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "#FEF9EC" }}><TrendingUp size={20} color="#FAB72E" /></div>
          <div>
            <p className="kpi-label">Valor Patrimonial</p>
            <p className="kpi-value" style={{ fontSize: 18 }}>{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            <p className="kpi-sub">patrimônio ativo</p>
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

      {/* Estoque de consumíveis */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 24 }}>
        <div className="panel">
          <h2>Alertas de reposição</h2>
          {belowMin.length === 0 ? (
            <div className="empty-state">
              <Package size={36} color="#302F2F" />
              <p>Nenhum produto abaixo do mínimo.</p>
            </div>
          ) : (
            belowMin.map((p) => {
              const status = stockStatus(p.total, Number(p.min_quantity));
              return (
                <div key={p.id} className="activity-item">
                  <AlertTriangle size={14} color={status === "baixo" ? "#B42318" : "#9A6700"} />
                  <Link href={`/p/${p.public_code}`}>{p.name}</Link>
                  <span className="muted" style={{ marginLeft: "auto", fontSize: 13 }}>
                    {p.total.toLocaleString("pt-BR")} / mín. {Number(p.min_quantity).toLocaleString("pt-BR")}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="panel">
          <h2>Mais consumidos (30 dias)</h2>
          {mostConsumed.length === 0 ? (
            <div className="empty-state">
              <TrendingUp size={36} color="#302F2F" />
              <p>Nenhuma saída registrada no período.</p>
            </div>
          ) : (
            mostConsumed.map((c) => (
              <div key={c.name} className="sector-bar-row">
                <span className="sector-bar-label">{c.name}</span>
                <div className="sector-bar-track">
                  <div className="sector-bar-fill" style={{ width: `${(c.total / maxConsumed) * 100}%` }} />
                </div>
                <span className="sector-bar-count">
                  {c.total.toLocaleString("pt-BR")} {stockUnitLabels[c.unit as StockUnit] ?? c.unit}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <h2>Últimas movimentações</h2>
          {stockMovements.length === 0 ? (
            <div className="empty-state">
              <ArrowLeftRight size={36} color="#302F2F" />
              <p>Nenhuma movimentação de estoque ainda.</p>
            </div>
          ) : (
            <>
              {stockMovements.map((m) => {
                const product = m.stock_products as { name?: string; unit?: string } | null;
                return (
                  <div key={m.id} className="activity-item">
                    <span className="sku-badge">{stockMovementLabels[m.movement_type as StockMovementType]}</span>
                    <span>{product?.name ?? "—"}</span>
                    <span className="muted" style={{ marginLeft: "auto", fontSize: 13 }}>
                      {Number(m.quantity).toLocaleString("pt-BR")} · {new Date(m.moved_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                );
              })}
              <Link href="/stock?tab=movimentacoes" className="muted" style={{ fontSize: 13, display: "inline-block", marginTop: 8 }}>
                Ver todas as movimentações →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recently scanned */}
      <div className="panel" style={{ marginTop: 24 }}>
        <h2>Últimos itens escaneados</h2>
        {recentlyScanned.length === 0 ? (
          <div className="empty-state">
            <ScanLine size={36} color="#302F2F" />
            <p>Nenhuma leitura de QR Code registrada ainda.</p>
          </div>
        ) : (
          recentlyScanned.map((item) => (
            <div key={item.id} className="activity-item">
              <span className="sku-badge">{(item as Record<string, unknown>).sku as string ?? item.item_code}</span>
              <Link href={`/inventory/${item.id}`}>{item.description}</Link>
              <span className="muted" style={{ marginLeft: "auto", fontSize: 13 }}>
                {item.last_scan_at ? new Date(item.last_scan_at as string).toLocaleString("pt-BR") : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
