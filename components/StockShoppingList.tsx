"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Cpu, Plus, Trash2, User } from "lucide-react";
import { stockUnitLabels, type StockUnit } from "@/lib/constants";

export type ShoppingItem = {
  id: string;
  item_name: string;
  quantity_to_buy: number;
  added_by_name: string;
  source: "sistema" | "manual";
  unit: string | null;
};

type SortKey = "item_name" | "quantity_to_buy" | "added_by_name";
type SortDir = "asc" | "desc";

export function StockShoppingList({ items }: { items: ShoppingItem[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("item_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");

  async function call(path: string, method: string, payload?: Record<string, unknown>) {
    setError("");
    setBusy(true);
    const res = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Erro ao salvar.");
      return false;
    }
    router.refresh();
    return true;
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? items.filter(
          (i) =>
            i.item_name.toLowerCase().includes(term) ||
            i.added_by_name.toLowerCase().includes(term),
        )
      : items;

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "quantity_to_buy") {
        return (Number(a.quantity_to_buy) - Number(b.quantity_to_buy)) * factor;
      }
      return a[sortKey].localeCompare(b[sortKey], "pt-BR", { sensitivity: "base" }) * factor;
    });
  }, [items, search, sortKey, sortDir]);

  function sortIcon(key: SortKey) {
    if (key !== sortKey) return null;
    return sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  }

  async function addManual(form: HTMLFormElement) {
    const f = new FormData(form);
    const ok = await call("/api/stock/shopping-list", "POST", {
      item_name: f.get("item_name"),
      quantity_to_buy: Number(f.get("quantity_to_buy") ?? 0),
    });
    if (ok) form.reset();
  }

  async function saveQty(id: string) {
    const ok = await call(`/api/stock/shopping-list/${id}`, "PATCH", {
      quantity_to_buy: Number(editQty || 0),
    });
    if (ok) setEditingId(null);
  }

  return (
    <div className="grid">
      {error && <div className="alert error">{error}</div>}

      <section className="panel">
        <h2>Adicionar item</h2>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            addManual(e.currentTarget);
          }}
        >
          <div className="field" style={{ flex: 2 }}>
            <label>Item</label>
            <input name="item_name" required placeholder="Ex.: Copos descartáveis 200ml" />
          </div>
          <div className="field">
            <label>Quantidade a comprar</label>
            <input name="quantity_to_buy" type="number" min={0} step="0.01" defaultValue={1} required />
          </div>
          <button className="button" type="submit" disabled={busy}>
            <Plus size={15} /> Adicionar
          </button>
        </form>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          &quot;Quem inseriu&quot; será preenchido com o seu nome automaticamente.
        </p>
      </section>

      <section className="panel">
        <div className="field">
          <label>Pesquisar</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por item ou quem inseriu"
          />
        </div>
      </section>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <button type="button" className="sort-th" onClick={() => toggleSort("item_name")}>
                  Item {sortIcon("item_name")}
                </button>
              </th>
              <th>
                <button type="button" className="sort-th" onClick={() => toggleSort("quantity_to_buy")}>
                  Quantidade a comprar {sortIcon("quantity_to_buy")}
                </button>
              </th>
              <th>
                <button type="button" className="sort-th" onClick={() => toggleSort("added_by_name")}>
                  Quem inseriu {sortIcon("added_by_name")}
                </button>
              </th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  {items.length === 0
                    ? "Nenhum item na lista. Produtos abaixo do mínimo entram automaticamente."
                    : "Nenhum item corresponde à pesquisa."}
                </td>
              </tr>
            )}
            {rows.map((it) => {
              const unit = it.unit ? stockUnitLabels[it.unit as StockUnit] ?? it.unit : null;
              const isEditing = editingId === it.id;
              return (
                <tr key={it.id}>
                  <td>
                    <strong>{it.item_name}</strong>
                  </td>
                  <td>
                    {isEditing ? (
                      <span className="actions">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          style={{ width: 100 }}
                          autoFocus
                        />
                        <button className="button" type="button" disabled={busy} onClick={() => saveQty(it.id)}>
                          Salvar
                        </button>
                        <button className="button secondary" type="button" onClick={() => setEditingId(null)}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="sort-th"
                        title="Editar quantidade"
                        onClick={() => {
                          setEditingId(it.id);
                          setEditQty(String(it.quantity_to_buy));
                        }}
                      >
                        <strong>{Number(it.quantity_to_buy).toLocaleString("pt-BR")}</strong>
                        {unit ? ` ${unit}` : ""}
                      </button>
                    )}
                  </td>
                  <td>
                    <span className="actions" style={{ gap: 6 }}>
                      {it.source === "sistema" ? <Cpu size={13} /> : <User size={13} />}
                      {it.added_by_name}
                    </span>
                  </td>
                  <td className="actions stock-row-actions">
                    <button
                      className="button secondary"
                      type="button"
                      title="Marcar como comprado"
                      disabled={busy}
                      onClick={() => call(`/api/stock/shopping-list/${it.id}`, "PATCH", { status: "comprado" })}
                    >
                      <Check size={15} /> Comprado
                    </button>
                    <button
                      className="button danger"
                      type="button"
                      title="Remover"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Remover "${it.item_name}" da lista?`)) {
                          call(`/api/stock/shopping-list/${it.id}`, "DELETE");
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
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
