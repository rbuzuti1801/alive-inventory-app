"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { conservationLabels, conservationStatuses, itemStatuses, statusLabels } from "@/lib/constants";

type Sector      = { id: string; name: string; code: string | null };
type Subcategory = { id: string; sector_id: string; name: string; code: string | null };
type Item        = Record<string, string | number | null>;

function skuPreview(sectors: Sector[], subcategories: Subcategory[], sectorId: string, subcategoryId: string) {
  const sector = sectors.find((s) => s.id === sectorId);
  if (!sector?.code) return "A-???-???-XXXXX";
  const sub = subcategories.find((s) => s.id === subcategoryId);
  return `A-${sector.code}-${sub?.code ?? "GER"}-XXXXX`;
}

export function InventoryForm({
  sectors, subcategories, item, userRole, userSectorId,
}: {
  sectors: Sector[];
  subcategories: Subcategory[];
  item?: Item;
  userRole: string;
  userSectorId: string | null;
}) {
  const router = useRouter();
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [sectorId, setSectorId]     = useState(String(item?.sector_id ?? userSectorId ?? ""));
  const [subcategoryId, setSubcategoryId] = useState(String(item?.subcategory_id ?? ""));

  const availableSectors = userRole === "responsavel"
    ? sectors.filter((s) => s.id === userSectorId)
    : sectors;

  const availableSubcategories = useMemo(
    () => subcategories.filter((s) => !sectorId || s.sector_id === sectorId),
    [subcategories, sectorId],
  );

  const isEditing  = Boolean(item?.id);
  const skuDisplay = isEditing
    ? String((item as Record<string, unknown>)?.sku ?? item?.item_code ?? "")
    : skuPreview(sectors, subcategories, sectorId, subcategoryId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const res  = await fetch(item?.id ? `/api/inventory/${item.id}` : "/api/inventory", {
      method:  item?.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Erro ao salvar item."); return; }
    router.push(`/inventory/${json.item.id}`);
    router.refresh();
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      {error && <div className="alert error full">{error}</div>}

      {/* SKU — read-only */}
      <div className="field full">
        <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Lock size={11} />
          SKU {!isEditing && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}>— gerado automaticamente ao salvar</span>}
        </label>
        <input
          value={skuDisplay}
          readOnly
          disabled
          style={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: ".04em" }}
        />
      </div>

      <div className="field"><label>Descrição</label><input name="description" defaultValue={String(item?.description ?? "")} required /></div>

      <div className="field">
        <label>Setor</label>
        <select name="sector_id" value={sectorId} onChange={(e) => { setSectorId(e.target.value); setSubcategoryId(""); }} required>
          <option value="">Selecione o setor</option>
          {availableSectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Subcategoria</label>
        <select name="subcategory_id" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
          <option value="">Sem subcategoria</option>
          {availableSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="field"><label>Marca</label><input name="brand" defaultValue={String(item?.brand ?? "")} /></div>
      <div className="field"><label>Modelo</label><input name="model" defaultValue={String(item?.model ?? "")} /></div>
      <div className="field"><label>Quantidade</label><input name="quantity" type="number" min="0" defaultValue={String(item?.quantity ?? 1)} required /></div>

      <div className="field">
        <label>Estado de conservação</label>
        <select name="conservation_status" defaultValue={String(item?.conservation_status ?? "bom")} required>
          {conservationStatuses.map((s) => <option key={s} value={s}>{conservationLabels[s]}</option>)}
        </select>
      </div>

      <div className="field"><label>Localização</label><input name="location" defaultValue={String(item?.location ?? "")} required /></div>
      <div className="field"><label>Data de aquisição</label><input name="acquisition_date" type="date" defaultValue={String(item?.acquisition_date ?? "")} /></div>
      <div className="field"><label>Valor de aquisição (R$)</label><input name="acquisition_value" type="number" min="0" step="0.01" defaultValue={String(item?.acquisition_value ?? "")} /></div>
      <div className="field"><label>Responsável</label><input name="responsible_name" defaultValue={String(item?.responsible_name ?? "")} /></div>

      <div className="field">
        <label>Status</label>
        <select name="status" defaultValue={String(item?.status ?? "ativo")}>
          {itemStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
      </div>

      <div className="field full"><label>Observações</label><textarea name="observations" rows={3} defaultValue={String(item?.observations ?? "")} /></div>

      <div className="full actions">
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Salvando…" : "Salvar item"}
        </button>
        <button className="button secondary" type="button" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  );
}
