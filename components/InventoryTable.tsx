"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { MobileSort, SortableTh, TableFooter, useTableSort, usePagination, type SortAccessors } from "@/components/table-controls";
import { conservationLabels, conservationStatuses, itemStatuses, statusLabels } from "@/lib/constants";

type Sector      = { id: string; name: string };
type Subcategory = { id: string; sector_id: string; name: string };
type Item = {
  id: string;
  sku: string | null;
  item_code: string;
  description: string;
  brand: string | null;
  model: string | null;
  quantity: number;
  conservation_status: string;
  location: string;
  responsible_name: string | null;
  status: string;
  sector_id: string | null;
  sectors: { name?: string } | null;
  subcategories: { name?: string } | null;
};

type SortKey =
  | "sku" | "description" | "sector" | "subcategory" | "brand_model"
  | "quantity" | "conservation_status" | "location" | "responsible_name" | "status";

const columns: { key: SortKey; label: string }[] = [
  { key: "sku", label: "SKU" },
  { key: "description", label: "Descrição" },
  { key: "sector", label: "Setor" },
  { key: "subcategory", label: "Subcategoria" },
  { key: "brand_model", label: "Marca / Modelo" },
  { key: "quantity", label: "Qtd." },
  { key: "conservation_status", label: "Estado" },
  { key: "location", label: "Localização" },
  { key: "responsible_name", label: "Responsável" },
  { key: "status", label: "Status" },
];

const accessors: SortAccessors<Item, SortKey> = {
  sku: (i) => i.sku ?? i.item_code,
  description: (i) => i.description,
  sector: (i) => i.sectors?.name ?? "",
  subcategory: (i) => i.subcategories?.name ?? "",
  brand_model: (i) => [i.brand, i.model].filter(Boolean).join(" / "),
  quantity: (i) => i.quantity,
  conservation_status: (i) => (conservationLabels as Record<string, string>)[i.conservation_status] ?? i.conservation_status,
  location: (i) => i.location,
  responsible_name: (i) => i.responsible_name ?? "",
  status: (i) => (statusLabels as Record<string, string>)[i.status] ?? i.status,
};

export function InventoryTable({
  items, sectors, subcategories, canCreate, canDelete,
}: {
  items: Item[];
  sectors: Sector[];
  subcategories: Subcategory[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleting, setDeleting] = useState("");

  const { sorted, sort, toggleSort } = useTableSort(items, accessors);
  // Qualquer mudança de filtro/busca reabre a listagem na primeira página.
  const { visible, total, start, page, totalPages, pageSize, setPageSize, setPage } = usePagination(sorted, searchParams.toString());

  function sortBy(key: SortKey) {
    toggleSort(key);
    setPage(1);
  }

  function updateFilter(form: HTMLFormElement) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => { if (value) params.set(key, String(value)); });
    router.push(`/inventory?${params.toString()}`);
  }

  async function deleteItem(id: string) {
    if (!confirm("Excluir este item do inventário?")) return;
    setDeleting(id);
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    setDeleting("");
    router.refresh();
  }

  return (
    <>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); updateFilter(e.currentTarget); }}>
        <div className="field"><label>Busca</label><input name="search" defaultValue={searchParams.get("search") ?? ""} placeholder="SKU, descrição, marca…" style={{ minWidth: 200 }} /></div>
        <div className="field"><label>Setor</label><select name="sector_id" defaultValue={searchParams.get("sector_id") ?? ""}><option value="">Todos</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>Subcategoria</label><select name="subcategory_id" defaultValue={searchParams.get("subcategory_id") ?? ""}><option value="">Todas</option>{subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>Estado</label><select name="conservation_status" defaultValue={searchParams.get("conservation_status") ?? ""}><option value="">Todos</option>{conservationStatuses.map((s) => <option key={s} value={s}>{conservationLabels[s]}</option>)}</select></div>
        <div className="field"><label>Status</label><select name="status" defaultValue={searchParams.get("status") ?? ""}><option value="">Todos</option>{itemStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
        <div className="field"><label>Responsável</label><input name="responsible_name" defaultValue={searchParams.get("responsible_name") ?? ""} /></div>
        <button className="button" type="submit">Filtrar</button>
        <Link className="button secondary" href="/inventory">Limpar</Link>
        {canCreate && <Link className="button gold" href="/inventory/new">+ Novo item</Link>}
      </form>

      <MobileSort columns={columns} sort={sort} onSort={sortBy} />

      <div className="table-wrap table-cards">
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
            {visible.map((item) => (
              <tr key={item.id} className={item.conservation_status === "danificado" || item.conservation_status === "em_manutencao" ? "highlight-row" : ""}>
                <td data-label="SKU"><span className="sku-badge">{item.sku ?? item.item_code}</span></td>
                <td data-label="Descrição" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</td>
                <td data-label="Setor">{item.sectors?.name ?? "-"}</td>
                <td data-label="Subcategoria">{item.subcategories?.name ?? "-"}</td>
                <td data-label="Marca / Modelo" style={{ color: "var(--muted)", fontSize: 13 }}>{[item.brand, item.model].filter(Boolean).join(" / ") || "-"}</td>
                <td data-label="Qtd." style={{ fontWeight: 600 }}>{item.quantity}</td>
                <td data-label="Estado"><Badge kind="conservation" value={item.conservation_status} /></td>
                <td data-label="Localização">{item.location}</td>
                <td data-label="Responsável">{item.responsible_name ?? "-"}</td>
                <td data-label="Status"><Badge kind="status" value={item.status} /></td>
                <td className="actions" data-label="Ações">
                  <Link className="button secondary" href={`/inventory/${item.id}`}>Ver</Link>
                  <Link className="button secondary" href={`/inventory/${item.id}/edit`}>Editar</Link>
                  {canDelete && (
                    <button className="button danger" disabled={deleting === item.id} onClick={() => deleteItem(item.id)} type="button">
                      {deleting === item.id ? "…" : "Excluir"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {total === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: "48px", color: "var(--muted)" }}>
                  Nenhum item encontrado com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TableFooter
        total={total} start={start} shown={visible.length}
        page={page} totalPages={totalPages}
        pageSize={pageSize} onPageSize={setPageSize} onPage={setPage}
      />
    </>
  );
}
