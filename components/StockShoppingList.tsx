"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Cpu, FileText, Plus, Printer, Trash2, User } from "lucide-react";
import { MobileSort, SortableTh, TableFooter, useTableSort, usePagination, type SortAccessors } from "@/components/table-controls";
import {
  stockCategoryLabels,
  stockUnitLabels,
  type StockCategory,
  type StockUnit,
} from "@/lib/constants";

export type ShoppingItem = {
  id: string;
  item_name: string;
  quantity_to_buy: number;
  added_by_name: string;
  source: "sistema" | "manual";
  unit: string | null;
  category: string | null;
  notes: string | null;
};

function categoryLabel(category: string | null) {
  if (!category) return "—";
  return stockCategoryLabels[category as StockCategory] ?? category;
}

function unitLabel(unit: string | null) {
  if (!unit) return "—";
  return stockUnitLabels[unit as StockUnit] ?? unit;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Documento de impressão autocontido (A4). Recebe as linhas JÁ filtradas e
// ordenadas exatamente como aparecem na tela; sem menus/botões do sistema.
function buildPrintDocument(rows: ShoppingItem[]) {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const body = rows
    .map(
      (it) => `<tr>
        <td>${escapeHtml(it.item_name)}</td>
        <td>${escapeHtml(categoryLabel(it.category))}</td>
        <td class="num">${Number(it.quantity_to_buy).toLocaleString("pt-BR")}</td>
        <td>${escapeHtml(unitLabel(it.unit))}</td>
        <td>${it.notes ? escapeHtml(it.notes) : ""}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Lista de Compras — Alive Church</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #555; margin-bottom: 14px; }
  .meta strong { color: #111; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; }
  /* Repete o cabeçalho da tabela em cada página impressa. */
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tfoot td { border: none; padding-top: 10px; font-size: 10px; color: #777; }
  @media screen { body { padding: 24px; max-width: 900px; margin: 0 auto; } }
</style>
</head>
<body onload="window.focus();window.print();">
  <h1>Lista de Compras — Alive Church</h1>
  <div class="meta">
    Gerado em <strong>${generatedAt}</strong> · Total de itens: <strong>${rows.length}</strong>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Categoria</th>
        <th class="num">Qtd. a comprar</th>
        <th>Unidade</th>
        <th>Observação</th>
      </tr>
    </thead>
    <tbody>
      ${body || `<tr><td colspan="5">Nenhum item na lista.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;
}

type SortKey = "item_name" | "quantity_to_buy" | "unit" | "added_by_name";

const columns: { key: SortKey; label: string }[] = [
  { key: "item_name", label: "Item" },
  { key: "quantity_to_buy", label: "Quantidade a comprar" },
  { key: "unit", label: "Unidade" },
  { key: "added_by_name", label: "Quem inseriu" },
];

const accessors: SortAccessors<ShoppingItem, SortKey> = {
  item_name: (i) => i.item_name,
  quantity_to_buy: (i) => Number(i.quantity_to_buy),
  unit: (i) => unitLabel(i.unit),
  added_by_name: (i) => i.added_by_name,
};

export function StockShoppingList({ items }: { items: ShoppingItem[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  // Itens recém-marcados como comprados — dá o feedback visual (verde + check)
  // imediato antes do refresh remover a linha da lista.
  const [purchased, setPurchased] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) => i.item_name.toLowerCase().includes(term) || i.added_by_name.toLowerCase().includes(term),
    );
  }, [items, search]);

  const { sorted: rows, sort, toggleSort } = useTableSort<ShoppingItem, SortKey>(filtered, accessors, { key: "item_name", dir: "asc" });
  // A busca é local (estado), por isso ela mesma serve de chave de reset.
  const { visible, total, start, page, totalPages, pageSize, setPageSize, setPage } = usePagination(rows, search);

  function sortBy(key: SortKey) {
    toggleSort(key);
    setPage(1);
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

  // Abre um documento de impressão com exatamente as linhas visíveis (pesquisa +
  // ordenação atuais). A mesma janela serve para "Imprimir" e "Gerar PDF"
  // (destino "Salvar como PDF" no diálogo de impressão).
  function printList() {
    if (rows.length === 0) {
      setError("A lista está vazia — nada para imprimir.");
      return;
    }
    setError("");
    const win = window.open("", "_blank");
    if (!win) {
      setError("Permita pop-ups para imprimir ou gerar o PDF.");
      return;
    }
    win.document.write(buildPrintDocument(rows));
    win.document.close();
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
        <div className="toolbar" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Pesquisar</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por item ou quem inseriu"
            />
          </div>
          <button className="button secondary" type="button" onClick={printList} disabled={rows.length === 0}>
            <Printer size={15} /> Imprimir Lista
          </button>
          <button className="button gold" type="button" onClick={printList} disabled={rows.length === 0}>
            <FileText size={15} /> Gerar PDF
          </button>
        </div>
      </section>

      <MobileSort columns={columns} sort={sort} onSort={sortBy} />

      <section className="table-wrap table-cards">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <SortableTh key={col.key} column={col.key} label={col.label} sort={sort} onSort={sortBy} />
              ))}
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {total === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  {items.length === 0
                    ? "Nenhum item na lista. Produtos abaixo do mínimo entram automaticamente."
                    : "Nenhum item corresponde à pesquisa."}
                </td>
              </tr>
            )}
            {visible.map((it) => {
              const isEditing = editingId === it.id;
              return (
                <tr key={it.id}>
                  <td data-label="Item">
                    <strong>{it.item_name}</strong>
                  </td>
                  <td data-label="Qtd. a comprar">
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
                        className="th-sort"
                        title="Editar quantidade"
                        onClick={() => {
                          setEditingId(it.id);
                          setEditQty(String(it.quantity_to_buy));
                        }}
                      >
                        <strong>{Number(it.quantity_to_buy).toLocaleString("pt-BR")}</strong>
                      </button>
                    )}
                  </td>
                  <td data-label="Unidade">{unitLabel(it.unit)}</td>
                  <td data-label="Quem inseriu">
                    <span className="actions" style={{ gap: 6 }}>
                      {it.source === "sistema" ? <Cpu size={13} /> : <User size={13} />}
                      {it.added_by_name}
                    </span>
                  </td>
                  <td className="actions stock-row-actions" data-label="Ações">
                    {(() => {
                      const isPurchased = purchased.has(it.id);
                      return (
                        <button
                          className={`button ${isPurchased ? "success" : "secondary"}`}
                          type="button"
                          title={isPurchased ? "Comprado" : "Marcar como comprado"}
                          disabled={busy || isPurchased}
                          onClick={() => {
                            setPurchased((prev) => new Set(prev).add(it.id));
                            call(`/api/stock/shopping-list/${it.id}`, "PATCH", { status: "comprado" });
                          }}
                        >
                          {isPurchased ? (
                            <>
                              <Check size={15} /> Comprado
                            </>
                          ) : (
                            "Marcar como comprado"
                          )}
                        </button>
                      );
                    })()}
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

      <TableFooter
        total={total} start={start} shown={visible.length}
        page={page} totalPages={totalPages}
        pageSize={pageSize} onPageSize={setPageSize} onPage={setPage}
      />
    </div>
  );
}
