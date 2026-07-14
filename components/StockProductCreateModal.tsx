"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  stockCategories,
  stockCategoryLabels,
  stockUnitLabels,
  stockUnits,
} from "@/lib/constants";

type Location = { id: string; name: string };

export type CreatedProduct = { id: string; name: string };

type Props = {
  locations: Location[];
  onCreated: (product: CreatedProduct) => void;
};

const emptyForm = {
  name: "",
  category: "outros",
  unit: "un",
  min_quantity: "0",
  initial_quantity: "0",
  initial_location_id: "",
  notes: "",
  active: true,
};

// Cadastro completo de produto. A quantidade inicial NÃO é gravada como saldo
// direto: o back-end a converte numa entrada "Estoque inicial" (RPC atômica),
// então o histórico do produto já nasce coerente com o saldo.
export function StockProductCreateModal({ locations, onCreated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setForm(emptyForm);
    setError("");
  }

  const initialQty = Number(form.initial_quantity);
  const minQty = Number(form.min_quantity);
  // Localização só é exigida quando há saldo inicial a alocar.
  const needsLocation = initialQty > 0;
  const invalid =
    !form.name.trim() ||
    !Number.isFinite(initialQty) || initialQty < 0 ||
    !Number.isFinite(minQty) || minQty < 0 ||
    (needsLocation && !form.initial_location_id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || invalid) return; // trava reentrada além do disabled do botão
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          min_quantity: minQty,
          notes: form.notes.trim() || null,
          active: form.active,
          initial_quantity: initialQty,
          initial_location_id: needsLocation ? form.initial_location_id : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Não foi possível criar o produto.");
        return;
      }
      onCreated({ id: json.product.id, name: json.product.name });
      setOpen(false);
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("Falha de conexão. Verifique a internet e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="button gold" type="button" onClick={() => setOpen(true)}>
        <Plus size={15} /> Novo produto
      </button>

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal modal-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Novo produto</h2>
              <button className="icon-button" type="button" onClick={close} disabled={busy} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            {error && <div className="alert error">{error}</div>}

            <form className="grid" onSubmit={submit}>
              <div className="field">
                <label>Nome do produto *</label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex.: Água mineral 500ml"
                  maxLength={150}
                  autoFocus
                  required
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Categoria *</label>
                  <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {stockCategories.map((c) => <option key={c} value={c}>{stockCategoryLabels[c]}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Unidade *</label>
                  <select value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                    {stockUnits.map((u) => <option key={u} value={u}>{stockUnitLabels[u]}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Estoque mínimo</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.min_quantity}
                  onChange={(e) => set("min_quantity", e.target.value)}
                />
                <p className="field-hint">Abaixo desse saldo o produto entra na Lista de Compras automaticamente.</p>
              </div>

              <div className="field">
                <label>Quantidade inicial</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.initial_quantity}
                  onChange={(e) => set("initial_quantity", e.target.value)}
                />
                <p className="field-hint">
                  Informe o saldo que já existe no estoque. Deixe 0 caso o produto ainda não tenha sido recebido.
                </p>
              </div>

              <div className="field">
                <label>Localização inicial{needsLocation ? " *" : ""}</label>
                <select
                  value={form.initial_location_id}
                  onChange={(e) => set("initial_location_id", e.target.value)}
                  disabled={!needsLocation}
                >
                  <option value="">{needsLocation ? "Selecione a localização…" : "— não necessária com quantidade 0 —"}</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <p className="field-hint">Onde essa quantidade está armazenada?</p>
              </div>

              <div className="field">
                <label>Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Opcional"
                />
              </div>

              <label className="checkbox-field">
                <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
                Produto ativo
              </label>

              <div className="modal-actions">
                <button className="button secondary" type="button" onClick={close} disabled={busy}>
                  Cancelar
                </button>
                <button className="button gold" type="submit" disabled={busy || invalid}>
                  {busy ? "Criando…" : "Criar produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
