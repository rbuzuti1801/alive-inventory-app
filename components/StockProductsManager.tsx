"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Power, Printer, QrCode, Trash2 } from "lucide-react";
import {
  stockCategories,
  stockCategoryLabels,
  stockStatus,
  stockStatusLabels,
  stockUnitLabels,
  stockUnits,
  type StockCategory,
  type StockUnit,
} from "@/lib/constants";

type Product = {
  id: string;
  public_code: string;
  name: string;
  category: string;
  unit: string;
  min_quantity: number;
  label_printed: boolean;
  active: boolean;
  total: number;
};

type Props = { products: Product[]; canManage: boolean; search: string; category: string };

export function StockProductsManager({ products, canManage, search, category }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save(path: string, method: string, payload?: Record<string, unknown>) {
    setError("");
    const res = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? "Erro ao salvar.");
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Excluir "${name}" definitivamente? Esta ação não pode ser desfeita.`)) return;
    setError("");
    const res = await fetch(`/api/stock/products/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    // Produto com histórico: back-end recusa e sugere desativar.
    if (!res.ok) setError(json.error ?? "Não foi possível excluir o produto.");
    router.refresh();
  }

  function applyFilters(form: FormData) {
    const params = new URLSearchParams({ tab: "produtos" });
    const s = String(form.get("search") ?? "").trim();
    const c = String(form.get("category") ?? "");
    if (s) params.set("search", s);
    if (c) params.set("category", c);
    router.push(`/stock?${params.toString()}`);
  }

  function printSelected() {
    if (selected.size === 0) return;
    window.open(`/labels/print-stock?ids=${Array.from(selected).join(",")}`, "_blank");
  }

  return (
    <div className="grid">
      {error && <div className="alert error">{error}</div>}

      {canManage && (
        <section className="panel">
          <h2>Novo produto</h2>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save("/api/stock/products", "POST", {
                name: f.get("name"),
                category: f.get("category"),
                unit: f.get("unit"),
                min_quantity: Number(f.get("min_quantity") ?? 0),
              });
              e.currentTarget.reset();
            }}
          >
            <div className="field"><label>Nome</label><input name="name" required placeholder="Água mineral 500ml" /></div>
            <div className="field">
              <label>Categoria</label>
              <select name="category" defaultValue="outros">
                {stockCategories.map((c) => <option key={c} value={c}>{stockCategoryLabels[c]}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Unidade</label>
              <select name="unit" defaultValue="un">
                {stockUnits.map((u) => <option key={u} value={u}>{stockUnitLabels[u]}</option>)}
              </select>
            </div>
            <div className="field"><label>Estoque mínimo</label><input name="min_quantity" type="number" min={0} defaultValue={0} /></div>
            <button className="button" type="submit">Criar</button>
          </form>
        </section>
      )}

      <section className="panel">
        <form
          className="toolbar"
          onSubmit={(e) => { e.preventDefault(); applyFilters(new FormData(e.currentTarget)); }}
        >
          <div className="field"><label>Buscar</label><input name="search" defaultValue={search} placeholder="Nome do produto" /></div>
          <div className="field">
            <label>Categoria</label>
            <select name="category" defaultValue={category}>
              <option value="">Todas</option>
              {stockCategories.map((c) => <option key={c} value={c}>{stockCategoryLabels[c]}</option>)}
            </select>
          </div>
          <button className="button secondary" type="submit">Filtrar</button>
          {selected.size > 0 && (
            <button className="button gold" type="button" onClick={printSelected}>
              <Printer size={15} /> Imprimir {selected.size} etiqueta(s)
            </button>
          )}
        </form>
      </section>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Saldo</th>
              <th>Mínimo</th>
              <th>Status</th>
              <th>Etiqueta</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={8} className="muted">Nenhum produto cadastrado.</td></tr>
            )}
            {products.map((p) => {
              const status = stockStatus(p.total, Number(p.min_quantity));
              const unitLabel = stockUnitLabels[p.unit as StockUnit] ?? p.unit;
              return (
                <tr key={p.id} className={p.active ? "" : "muted"}>
                  <td>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Selecionar ${p.name}`} />
                  </td>
                  <td>
                    <Link href={`/stock/${p.id}`}>
                      <strong>{p.name}</strong>
                    </Link>
                    <div className="muted" style={{ fontSize: 11 }}>
                      <QrCode size={11} style={{ verticalAlign: "-1px" }} /> {p.public_code}
                    </div>
                  </td>
                  <td>{stockCategoryLabels[p.category as StockCategory] ?? p.category}</td>
                  <td><strong>{p.total.toLocaleString("pt-BR")}</strong> {unitLabel}</td>
                  <td>{Number(p.min_quantity).toLocaleString("pt-BR")}</td>
                  <td><span className={`badge stock-status-${status}`}>{stockStatusLabels[status]}</span></td>
                  <td>{p.label_printed ? "Impressa" : "—"}</td>
                  <td className="actions stock-row-actions">
                    <Link className="button secondary" href={`/stock/${p.id}`} title="Ver">
                      <Eye size={15} /> Ver
                    </Link>
                    {canManage && (
                      <>
                        <Link className="button secondary" href={`/stock/${p.id}/edit`} title="Editar">
                          <Pencil size={15} /> Editar
                        </Link>
                        <button
                          className="button secondary"
                          type="button"
                          title={p.active ? "Desativar" : "Ativar"}
                          onClick={() => save(`/api/stock/products/${p.id}`, "PATCH", { active: !p.active })}
                        >
                          <Power size={15} /> {p.active ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          className="button danger"
                          type="button"
                          title="Excluir"
                          onClick={() => remove(p.id, p.name)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
