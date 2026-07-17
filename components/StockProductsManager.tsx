"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Power, Printer, QrCode, Trash2 } from "lucide-react";
import { MobileSort, SortableTh, TableFooter, useTableSort, usePagination, type SortAccessors } from "@/components/table-controls";
import { StockProductCreateModal, type CreatedProduct } from "@/components/StockProductCreateModal";
import { canDeleteStockProduct } from "@/lib/permissions";
import {
  stockCategories,
  stockCategoryLabels,
  stockStatus,
  stockStatusLabels,
  stockUnitLabels,
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

type Props = {
  products: Product[];
  locations: { id: string; name: string }[];
  canManage: boolean;
  search: string;
  category: string;
  status: string;
};

type SortKey = "name" | "category" | "total" | "min_quantity" | "status";

const columns: { key: SortKey; label: string }[] = [
  { key: "name", label: "Produto" },
  { key: "category", label: "Categoria" },
  { key: "total", label: "Saldo" },
  { key: "min_quantity", label: "Mínimo" },
  { key: "status", label: "Status" },
];

const accessors: SortAccessors<Product, SortKey> = {
  name: (p) => p.name,
  category: (p) => stockCategoryLabels[p.category as StockCategory] ?? p.category,
  total: (p) => p.total,
  min_quantity: (p) => Number(p.min_quantity),
  status: (p) => stockStatusLabels[stockStatus(p.total, Number(p.min_quantity))],
};

export function StockProductsManager({ products, locations, canManage, search, category, status }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedProduct | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { sorted, sort, toggleSort } = useTableSort(products, accessors);
  // Busca/categoria/status vêm da URL: mudou o filtro, volta para a primeira página.
  const { visible, total, start, page, totalPages, pageSize, setPageSize, setPage } =
    usePagination(sorted, `${search}|${category}|${status}`);

  // Depois de criar, o produto pode estar fora da página/filtro atual. Só
  // avisamos quando ele realmente não está visível na tela.
  const createdVisible = created ? visible.some((p) => p.id === created.id) : true;

  function sortBy(key: SortKey) {
    toggleSort(key);
    setPage(1);
  }

  // Sucesso do modal: volta para a primeira página para que o produto novo
  // apareça sem que a pessoa precise navegar.
  function handleCreated(product: CreatedProduct) {
    setCreated(product);
    setPage(1);
  }

  function clearFilters() {
    setCreated(null);
    router.push("/stock?tab=produtos");
  }

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
      redirect: "manual",
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.type === "opaqueredirect" || res.status === 0) {
      setError("Sessão expirada. Entre novamente para salvar.");
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Erro ao salvar.");
      return;
    }
    router.refresh();
  }

  // Só habilitada para produto já desativado (o servidor também exige isso).
  // Produto com histórico é excluído logicamente para preservar a auditoria.
  async function remove(id: string, name: string) {
    if (!window.confirm(`Esta ação excluirá permanentemente o produto "${name}" e não poderá ser desfeita. Deseja continuar?`)) return;
    setError("");
    setCreated(null);
    const res = await fetch(`/api/stock/products/${id}`, { method: "DELETE", redirect: "manual" });
    if (res.type === "opaqueredirect" || res.status === 0) {
      setError("Sessão expirada. Entre novamente para excluir o produto.");
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Não foi possível excluir o produto.");
      return;
    }
    router.refresh();
  }

  function applyFilters(form: FormData) {
    const params = new URLSearchParams({ tab: "produtos" });
    const s = String(form.get("search") ?? "").trim();
    const c = String(form.get("category") ?? "");
    const st = String(form.get("status") ?? "");
    if (s) params.set("search", s);
    if (c) params.set("category", c);
    if (st) params.set("status", st);
    setCreated(null);
    router.push(`/stock?${params.toString()}`);
  }

  function printSelected() {
    if (selected.size === 0) return;
    window.open(`/labels/print-stock?ids=${Array.from(selected).join(",")}`, "_blank");
  }

  return (
    <div className="grid">
      {error && <div className="alert error">{error}</div>}

      {created && (
        <div className="alert success">
          Produto <strong>{created.name}</strong> criado com sucesso.{" "}
          <Link href={`/stock/${created.id}`}>Ver produto</Link>
          {!createdVisible && (
            <>
              {" — "}ele não aparece na tabela por causa dos filtros atuais.{" "}
              <button className="link-button" type="button" onClick={clearFilters}>
                Limpar filtros
              </button>
            </>
          )}
        </div>
      )}

      <section className="panel">
        {/* O cadastro abre um <form> próprio dentro do modal, por isso ele fica
            FORA deste form de filtros. Em <form> aninhado o evento submit não
            sobe até a raiz do React (onde o submit é delegado): o onSubmit do
            modal nunca rodava, não havia preventDefault e o navegador fazia o
            GET nativo — a página recarregava e o produto jamais era criado. */}
        <div className="toolbar">
          <form
            className="toolbar-filters"
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
            <div className="field">
              <label>Situação</label>
              <select name="status" defaultValue={status}>
                <option value="">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </div>
            <button className="button secondary" type="submit">Filtrar</button>
          </form>
          {selected.size > 0 && (
            <button className="button secondary" type="button" onClick={printSelected}>
              <Printer size={15} /> Imprimir {selected.size} etiqueta(s)
            </button>
          )}
          {canManage && (
            <span style={{ marginLeft: "auto" }}>
              <StockProductCreateModal locations={locations} onCreated={handleCreated} />
            </span>
          )}
        </div>
      </section>

      <MobileSort columns={columns} sort={sort} onSort={sortBy} />

      <section className="table-wrap table-cards">
        <table>
          <thead>
            <tr>
              <th></th>
              {columns.map((col) => (
                <SortableTh key={col.key} column={col.key} label={col.label} sort={sort} onSort={sortBy} />
              ))}
              <th>Etiqueta</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {total === 0 && (
              <tr><td colSpan={8} className="muted">Nenhum produto cadastrado.</td></tr>
            )}
            {visible.map((p) => {
              // `stockState` e não `status`: `status` é a prop de filtro do componente.
              const stockState = stockStatus(p.total, Number(p.min_quantity));
              const unitLabel = stockUnitLabels[p.unit as StockUnit] ?? p.unit;
              return (
                <tr key={p.id} className={p.active ? "" : "muted"}>
                  <td>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Selecionar ${p.name}`} />
                  </td>
                  <td data-label="Produto">
                    <Link href={`/stock/${p.id}`}>
                      <strong>{p.name}</strong>
                    </Link>
                    <div className="muted" style={{ fontSize: 11 }}>
                      <QrCode size={11} style={{ verticalAlign: "-1px" }} /> {p.public_code}
                    </div>
                  </td>
                  <td data-label="Categoria">{stockCategoryLabels[p.category as StockCategory] ?? p.category}</td>
                  <td data-label="Saldo"><strong>{p.total.toLocaleString("pt-BR")}</strong> {unitLabel}</td>
                  <td data-label="Mínimo">{Number(p.min_quantity).toLocaleString("pt-BR")}</td>
                  <td data-label="Status">
                    <span className={`badge stock-status-${stockState}`}>{stockStatusLabels[stockState]}</span>
                    {!p.active && <span className="badge neutral" style={{ marginLeft: 6 }}>Inativo</span>}
                  </td>
                  <td data-label="Etiqueta">{p.label_printed ? "Impressa" : "—"}</td>
                  <td className="actions stock-row-actions" data-label="Ações">
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
                        {/* Exclusão só depois de desativar — o servidor impõe a
                            mesma regra; aqui é só para não oferecer o que falharia. */}
                        {canDeleteStockProduct(canManage, p) && (
                          <button
                            className="button danger"
                            type="button"
                            title="Excluir permanentemente"
                            onClick={() => remove(p.id, p.name)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    )}
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
        noun="produtos" nounSingular="produto"
      />
    </div>
  );
}
