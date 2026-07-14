"use client";

import { useRouter } from "next/navigation";
import { SortableTh, TableFooter, useTableSort, usePagination, type SortAccessors } from "@/components/table-controls";
import {
  stockMovementLabels,
  stockMovementTypes,
  stockUnitLabels,
  type StockMovementType,
  type StockUnit,
} from "@/lib/constants";

type Movement = {
  id: string;
  movement_type: StockMovementType;
  quantity: number;
  previous_quantity: number | null;
  reason: string | null;
  moved_at: string;
  stock_products: { name?: string; unit?: string } | null;
  from_loc: { name?: string } | null;
  to_loc: { name?: string } | null;
  mover: { name?: string } | null;
};

type Props = {
  movements: Movement[];
  products: { id: string; name: string }[];
  productId: string;
  movementType: string;
};

const typeBadge: Record<StockMovementType, string> = {
  entrada: "stock-status-normal",
  saida: "stock-status-baixo",
  ajuste: "stock-status-atencao",
  transferencia: "neutral",
};

type SortKey = "moved_at" | "product" | "movement_type" | "quantity" | "from_loc" | "to_loc" | "mover";

const columns: { key: SortKey; label: string }[] = [
  { key: "moved_at", label: "Data" },
  { key: "movement_type", label: "Tipo" },
  { key: "product", label: "Produto" },
  { key: "quantity", label: "Quantidade" },
  { key: "from_loc", label: "Origem" },
  { key: "to_loc", label: "Destino" },
  { key: "mover", label: "Por" },
];

const accessors: SortAccessors<Movement, SortKey> = {
  // Data ordena pelo timestamp, não pelo texto pt-BR já formatado.
  moved_at: (m) => new Date(m.moved_at).getTime(),
  product: (m) => m.stock_products?.name ?? "",
  movement_type: (m) => stockMovementLabels[m.movement_type],
  quantity: (m) => Number(m.quantity),
  from_loc: (m) => m.from_loc?.name ?? "",
  to_loc: (m) => m.to_loc?.name ?? "",
  mover: (m) => m.mover?.name ?? "",
};

export function StockMovementsList({ movements, products, productId, movementType }: Props) {
  const router = useRouter();

  // Mantém a ordem padrão da consulta (mais recentes primeiro) até a pessoa ordenar.
  const { sorted, sort, toggleSort } = useTableSort(movements, accessors);
  const { visible, total, start, page, totalPages, pageSize, setPageSize, setPage } = usePagination(sorted, `${productId}|${movementType}`);

  function sortBy(key: SortKey) {
    toggleSort(key);
    setPage(1);
  }

  function applyFilters(form: FormData) {
    const params = new URLSearchParams({ tab: "movimentacoes" });
    const p = String(form.get("product_id") ?? "");
    const t = String(form.get("movement_type") ?? "");
    if (p) params.set("product_id", p);
    if (t) params.set("movement_type", t);
    router.push(`/stock?${params.toString()}`);
  }

  return (
    <div className="grid">
      <section className="panel">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); applyFilters(new FormData(e.currentTarget)); }}>
          <div className="field">
            <label>Produto</label>
            <select name="product_id" defaultValue={productId}>
              <option value="">Todos</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select name="movement_type" defaultValue={movementType}>
              <option value="">Todos</option>
              {stockMovementTypes.map((t) => <option key={t} value={t}>{stockMovementLabels[t]}</option>)}
            </select>
          </div>
          <button className="button secondary" type="submit">Filtrar</button>
        </form>
      </section>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <SortableTh key={col.key} column={col.key} label={col.label} sort={sort} onSort={sortBy} />
              ))}
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {total === 0 && (
              <tr><td colSpan={8} className="muted">Nenhuma movimentação registrada.</td></tr>
            )}
            {visible.map((m) => {
              const unit = stockUnitLabels[(m.stock_products?.unit ?? "un") as StockUnit] ?? m.stock_products?.unit;
              return (
                <tr key={m.id}>
                  <td>{new Date(m.moved_at).toLocaleString("pt-BR")}</td>
                  <td><span className={`badge ${typeBadge[m.movement_type]}`}>{stockMovementLabels[m.movement_type]}</span></td>
                  <td>{m.stock_products?.name ?? "—"}</td>
                  <td>
                    <strong>{Number(m.quantity).toLocaleString("pt-BR")}</strong> {unit}
                    {m.movement_type === "ajuste" && m.previous_quantity != null && (
                      <span className="muted" style={{ fontSize: 11 }}> (antes: {Number(m.previous_quantity).toLocaleString("pt-BR")})</span>
                    )}
                  </td>
                  <td>{m.from_loc?.name ?? "—"}</td>
                  <td>{m.to_loc?.name ?? "—"}</td>
                  <td>{m.mover?.name ?? "—"}</td>
                  <td className="muted">{m.reason ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <TableFooter
        total={total} start={start} shown={visible.length}
        page={page} totalPages={totalPages}
        pageSize={pageSize} onPageSize={setPageSize} onPage={setPage}
        noun="movimentações" nounSingular="movimentação"
      />
    </div>
  );
}
