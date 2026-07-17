"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Printer, Tag } from "lucide-react";
import { itemStatuses, labelLabels, labelTypes, statusLabels, type LabelType } from "@/lib/constants";

type Sector = { id: string; name: string };
type Subcategory = { id: string; sector_id: string; name: string };
type Item = {
  id: string;
  sku: string | null;
  item_code: string;
  description: string;
  location: string | null;
  responsible_name: string | null;
  status: string;
  label_type: string;
  label_printed: boolean;
  label_printed_at: string | null;
  sectors: { name?: string } | null;
  subcategories: { name?: string } | null;
};

export function LabelsManager({
  items,
  sectors,
  subcategories,
}: {
  items: Item[];
  sectors: Sector[];
  subcategories: Subcategory[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [model, setModel] = useState<LabelType>("dk22205");
  const [marking, setMarking] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("brother-label-model") as LabelType | null;
    if (saved && labelTypes.includes(saved)) setModel(saved);
  }, []);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  function applyFilter(form: HTMLFormElement) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (value) params.set(key, String(value));
    });
    router.push(`/labels?${params.toString()}`);
  }

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function printSelected() {
    if (selectedIds.length === 0) return;
    window.localStorage.setItem("brother-label-model", model);
    window.open(`/labels/print?model=${model}&ids=${selectedIds.join(",")}`, "_blank", "noopener");
  }

  async function markPrinted() {
    if (selectedIds.length === 0) return;
    setMarking(true);
    await fetch("/api/labels/print", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label_type: model, item_ids: selectedIds }),
    });
    setMarking(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); applyFilter(e.currentTarget); }}>
        <div className="field"><label>Busca</label><input name="search" defaultValue={searchParams.get("search") ?? ""} placeholder="SKU, descrição…" style={{ minWidth: 180 }} /></div>
        <div className="field"><label>Setor</label><select name="sector_id" defaultValue={searchParams.get("sector_id") ?? ""}><option value="">Todos</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>Subcategoria</label><select name="subcategory_id" defaultValue={searchParams.get("subcategory_id") ?? ""}><option value="">Todas</option>{subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>Localização</label><input name="location" defaultValue={searchParams.get("location") ?? ""} /></div>
        <div className="field"><label>Responsável</label><input name="responsible_name" defaultValue={searchParams.get("responsible_name") ?? ""} /></div>
        <div className="field"><label>Status</label><select name="status" defaultValue={searchParams.get("status") ?? ""}><option value="">Todos</option>{itemStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
        <div className="field"><label>Etiqueta</label><select name="printed" defaultValue={searchParams.get("printed") ?? ""}><option value="">Todas</option><option value="false">Pendentes</option><option value="true">Impressas</option></select></div>
        <button className="button" type="submit">Filtrar</button>
        <Link className="button secondary" href="/labels">Limpar</Link>
      </form>

      <div className="bulk-bar">
        <div className="bulk-info">
          <strong>{selected.size}</strong> selecionada(s)
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label>Modelo</label>
          <select value={model} onChange={(e) => { const next = e.target.value as LabelType; setModel(next); window.localStorage.setItem("brother-label-model", next); }}>
            {labelTypes.map((t) => <option key={t} value={t}>{labelLabels[t]}</option>)}
          </select>
        </div>
        <button className="button gold" type="button" disabled={selected.size === 0} onClick={printSelected}>
          <Printer size={15} /> Imprimir Etiquetas
        </button>
        <button className="button secondary" type="button" disabled={selected.size === 0 || marking} onClick={markPrinted}>
          <Tag size={15} /> {marking ? "…" : "Marcar como impresso"}
        </button>
      </div>

      <div className="table-wrap table-cards">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Selecionar todos" /></th>
              <th>SKU</th>
              <th>Descrição</th>
              <th>Setor</th>
              <th>Localização</th>
              <th>Responsável</th>
              <th>Etiqueta</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={selected.has(item.id) ? "row-selected" : ""}>
                <td data-label="Selecionar"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Selecionar ${item.sku}`} /></td>
                <td data-label="SKU"><span className="sku-badge">{item.sku ?? item.item_code}</span></td>
                <td data-label="Descrição" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</td>
                <td data-label="Setor">{item.sectors?.name ?? "-"}</td>
                <td data-label="Localização">{item.location ?? "-"}</td>
                <td data-label="Responsável">{item.responsible_name ?? "-"}</td>
                <td data-label="Etiqueta">
                  {item.label_printed ? (
                    <span className="badge novo">Impressa · {labelLabels[item.label_type as LabelType] ?? item.label_type}</span>
                  ) : (
                    <span className="badge regular">Pendente</span>
                  )}
                </td>
                <td className="actions" data-label="Ações">
                  <a className="button secondary" href={`/labels/print?model=${labelTypes.includes(item.label_type as LabelType) ? item.label_type : "dk22205"}&ids=${item.id}`} target="_blank" rel="noopener">
                    <Printer size={14} /> Imprimir
                  </a>
                  <Link className="button secondary" href={`/inventory/${item.id}`}>Ver</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>Nenhum item encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
