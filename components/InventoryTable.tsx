"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { conservationLabels, conservationStatuses, itemStatuses, statusLabels } from "@/lib/constants";

type Sector = { id: string; name: string };
type Subcategory = { id: string; sector_id: string; name: string };
type Item = {
  id: string;
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

export function InventoryTable({
  items,
  sectors,
  subcategories,
  canCreate,
  canDelete,
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

  function updateFilter(form: HTMLFormElement) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (value) params.set(key, String(value));
    });
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
      <form className="toolbar" onSubmit={(event) => { event.preventDefault(); updateFilter(event.currentTarget); }}>
        <div className="field"><label>Busca</label><input name="search" defaultValue={searchParams.get("search") ?? ""} placeholder="Código, descrição, marca..." /></div>
        <div className="field"><label>Setor</label><select name="sector_id" defaultValue={searchParams.get("sector_id") ?? ""}><option value="">Todos</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>Subcategoria</label><select name="subcategory_id" defaultValue={searchParams.get("subcategory_id") ?? ""}><option value="">Todas</option>{subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>Estado</label><select name="conservation_status" defaultValue={searchParams.get("conservation_status") ?? ""}><option value="">Todos</option>{conservationStatuses.map((s) => <option key={s} value={s}>{conservationLabels[s]}</option>)}</select></div>
        <div className="field"><label>Status</label><select name="status" defaultValue={searchParams.get("status") ?? ""}><option value="">Todos</option>{itemStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
        <div className="field"><label>Responsável</label><input name="responsible_name" defaultValue={searchParams.get("responsible_name") ?? ""} /></div>
        <button className="button" type="submit">Filtrar</button>
        <Link className="button secondary" href="/inventory">Limpar</Link>
        {canCreate && <Link className="button" href="/inventory/new">Novo item</Link>}
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Descrição</th><th>Setor</th><th>Subcategoria</th><th>Marca</th><th>Modelo</th><th>Qtd.</th><th>Estado</th><th>Localização</th><th>Responsável</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.conservation_status === "danificado" || item.conservation_status === "em_manutencao" ? "highlight-row" : ""}>
                <td><strong>{item.item_code}</strong></td>
                <td>{item.description}</td>
                <td>{item.sectors?.name ?? "-"}</td>
                <td>{item.subcategories?.name ?? "-"}</td>
                <td>{item.brand ?? "-"}</td>
                <td>{item.model ?? "-"}</td>
                <td>{item.quantity}</td>
                <td><Badge kind="conservation" value={item.conservation_status} /></td>
                <td>{item.location}</td>
                <td>{item.responsible_name ?? "-"}</td>
                <td><Badge kind="status" value={item.status} /></td>
                <td className="actions">
                  <Link className="button secondary" href={`/inventory/${item.id}`}>Ver</Link>
                  <Link className="button secondary" href={`/inventory/${item.id}/edit`}>Editar</Link>
                  {canDelete && <button className="button danger" disabled={deleting === item.id} onClick={() => deleteItem(item.id)} type="button">Excluir</button>}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={12}>Nenhum item encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
