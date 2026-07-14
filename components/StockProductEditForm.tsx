"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  stockCategories,
  stockCategoryLabels,
  stockUnits,
  stockUnitLabels,
} from "@/lib/constants";

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  min_quantity: number;
  notes: string | null;
  active: boolean;
};

// Edição do produto (campos mínimos do escopo: nome, categoria, unidade,
// estoque mínimo, status, observações). Reutiliza PUT /api/stock/products/[id].
export function StockProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/stock/products/${product.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          category: f.get("category"),
          unit: f.get("unit"),
          min_quantity: Number(f.get("min_quantity") ?? 0),
          notes: f.get("notes"),
          active: f.get("active") === "on",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Não foi possível salvar as alterações.");
        return;
      }
      router.push(`/stock/${product.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel grid" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
      {error && <div className="alert error">{error}</div>}

      <div className="field">
        <label>Nome</label>
        <input name="name" required defaultValue={product.name} maxLength={150} />
      </div>

      <div className="field">
        <label>Categoria</label>
        <select name="category" defaultValue={product.category}>
          {stockCategories.map((c) => (
            <option key={c} value={c}>{stockCategoryLabels[c]}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Unidade</label>
        <select name="unit" defaultValue={product.unit}>
          {stockUnits.map((u) => (
            <option key={u} value={u}>{stockUnitLabels[u]}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Estoque mínimo</label>
        <input name="min_quantity" type="number" min={0} defaultValue={Number(product.min_quantity)} />
      </div>

      <div className="field">
        <label>Observações</label>
        <textarea name="notes" defaultValue={product.notes ?? ""} rows={3} maxLength={500} />
      </div>

      <label className="checkbox-row">
        <input type="checkbox" name="active" defaultChecked={product.active} /> Produto ativo
      </label>

      <div className="actions">
        <button className="button gold" type="submit" disabled={busy}>
          {busy ? "Salvando…" : "Salvar alterações"}
        </button>
        <button className="button secondary" type="button" onClick={() => router.push(`/stock/${product.id}`)} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
