import Link from "next/link";
import { ArrowLeft, History, QrCode } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canAdjustStock, canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import {
  stockCategoryLabels,
  stockMovementLabels,
  stockStatus,
  stockStatusLabels,
  stockUnitLabels,
  type StockCategory,
  type StockMovementType,
  type StockUnit,
} from "@/lib/constants";
import { StockProductActions } from "@/components/StockProductActions";
import { StockProductManageBar } from "@/components/StockProductManageBar";

export const dynamic = "force-dynamic";

type LevelRow = {
  quantity: number;
  location_id: string;
  stock_locations: { name: string } | null;
};

const typeBadge: Record<StockMovementType, string> = {
  entrada: "stock-status-normal",
  saida: "stock-status-baixo",
  ajuste: "stock-status-atencao",
  transferencia: "neutral",
};

// Tela completa do produto (usuário autenticado). O QR Code e a lista abrem
// aqui quando há sessão; sem sessão, abre /p/{code} (consulta pública).
export default async function StockProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [{ data: product }, { data: locations }] = await Promise.all([
    supabaseAdmin
      .from("stock_products")
      .select(
        "id,public_code,name,category,unit,min_quantity,notes,active,stock_levels(quantity,location_id,stock_locations(name))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin.from("stock_locations").select("id,name").eq("active", true).order("name"),
  ]);

  if (!product) return <div className="alert error">Produto não encontrado.</div>;

  const levels = ((product.stock_levels ?? []) as unknown as LevelRow[])
    .map((l) => ({
      location_id: l.location_id,
      location_name: l.stock_locations?.name ?? "-",
      quantity: Number(l.quantity),
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const total = levels.reduce((sum, l) => sum + l.quantity, 0);
  const status = stockStatus(total, Number(product.min_quantity));
  const unitLabel = stockUnitLabels[product.unit as StockUnit] ?? product.unit;

  const { data: movements } = await supabaseAdmin
    .from("stock_movements")
    .select(
      "id,movement_type,quantity,previous_quantity,reason,moved_at,performed_by_name,unauthenticated,from_loc:stock_locations!stock_movements_from_location_id_fkey(name),to_loc:stock_locations!stock_movements_to_location_id_fkey(name),mover:users_internal!stock_movements_moved_by_fkey(name)",
    )
    .eq("product_id", id)
    .order("moved_at", { ascending: false })
    .limit(10);

  const canManage = canManageStock(user);

  return (
    <>
      <div className="topbar">
        <div>
          <Link href="/stock?tab=produtos" className="back-link">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <h1 style={{ marginTop: 6 }}>{product.name}</h1>
          <p className="muted">
            <QrCode size={12} style={{ verticalAlign: "-2px" }} /> {product.public_code}
            {" · "}
            {stockCategoryLabels[product.category as StockCategory] ?? product.category}
            {!product.active && " · Inativo"}
          </p>
        </div>
        <div className="actions">
          <span className={`badge stock-status-${status}`}>{stockStatusLabels[status]}</span>
        </div>
      </div>

      <StockProductManageBar productId={product.id} active={product.active} canManage={canManage} />

      <div className="detail-grid">
        <section className="grid">
          <div className="panel">
            <div className="public-balance" style={{ marginBottom: 12 }}>
              <span className="public-balance-value">{total.toLocaleString("pt-BR")}</span>
              <span className="public-balance-unit">
                {unitLabel}
                {total === 1 ? "" : "(s)"} em estoque · mínimo {Number(product.min_quantity).toLocaleString("pt-BR")}
              </span>
            </div>

            <h2 style={{ fontSize: 15 }}>Localizações</h2>
            <div className="public-locations" style={{ marginTop: 8 }}>
              {levels.length === 0 ? (
                <p className="muted">Sem saldo registrado em nenhuma localização.</p>
              ) : (
                levels.map((l) => (
                  <div key={l.location_id} className="public-loc-row">
                    <span>{l.location_name}</span>
                    <strong>{l.quantity.toLocaleString("pt-BR")}</strong>
                  </div>
                ))
              )}
            </div>

            {product.notes && (
              <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>{product.notes}</p>
            )}
          </div>

          <div className="panel">
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Histórico recente</h2>
            {(!movements || movements.length === 0) ? (
              <p className="muted">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="stock-history">
                {movements.map((m) => {
                  const from = (m.from_loc as { name?: string } | null)?.name;
                  const to = (m.to_loc as { name?: string } | null)?.name;
                  const by =
                    (m.mover as { name?: string } | null)?.name ??
                    (m.performed_by_name ? `${m.performed_by_name} (sem login)` : "—");
                  return (
                    <div key={m.id} className="stock-history-row">
                      <span className={`badge ${typeBadge[m.movement_type as StockMovementType]}`}>
                        {stockMovementLabels[m.movement_type as StockMovementType]}
                      </span>
                      <div className="stock-history-body">
                        <strong>{Number(m.quantity).toLocaleString("pt-BR")}</strong> {unitLabel}
                        {(from || to) && (
                          <span className="muted"> · {from ?? "—"} → {to ?? "—"}</span>
                        )}
                        <div className="muted" style={{ fontSize: 11 }}>
                          {new Date(m.moved_at).toLocaleString("pt-BR")} · {by}
                          {m.reason ? ` · ${m.reason}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link className="stock-history-link" href={`/stock?tab=movimentacoes&product_id=${product.id}`}>
              <History size={14} /> Ver histórico completo
            </Link>
          </div>
        </section>

        <aside className="panel">
          <h2 style={{ fontSize: 15, marginBottom: 12 }}>Movimentar</h2>
          {product.active ? (
            <StockProductActions
              productId={product.id}
              unitLabel={unitLabel}
              levels={levels}
              locations={locations ?? []}
              canAdjust={canAdjustStock(user)}
            />
          ) : (
            <p className="muted">Produto inativo. Reative-o para movimentar.</p>
          )}
        </aside>
      </div>
    </>
  );
}
