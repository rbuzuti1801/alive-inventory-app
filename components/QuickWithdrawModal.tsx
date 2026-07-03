"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogIn, Minus, Plus, PackageMinus, X } from "lucide-react";

type Location = { id: string; name: string };

type Props = {
  productId: string;
  unitLabel: string;
  locations: Location[];
  loginHref: string;
};

const presets = [1, 2, 5];

// Retirada rápida SEM login (voluntários). Registra uma saída informando o
// responsável e o destino (setor real). O saldo nunca fica negativo — a
// validação final é feita pelo servidor.
export function QuickWithdrawModal({ productId, unitLabel, locations, loginHref }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  function reset() {
    setName("");
    setDestination("");
    setQuantity("1");
    setNotes("");
    setError("");
  }

  function bump(delta: number) {
    setQuantity(String(Math.max(1, (Number(quantity) || 0) + delta)));
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock/quick-withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          performed_by_name: name,
          to_location_id: destination,
          quantity: Number(quantity),
          reason: notes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Não foi possível registrar a retirada.");
        return;
      }
      setSuccess(`Retirada de ${quantity} ${unitLabel.toLowerCase()}(s) registrada. Obrigado, ${name}!`);
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {success && (
        <div className="alert success stock-success">
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      <button className="button gold public-login-cta" type="button" onClick={() => { setSuccess(""); setOpen(true); }}>
        <PackageMinus size={17} /> Retirar material
      </button>
      <a className="button secondary public-login-cta" href={loginHref}>
        <LogIn size={16} /> Entrar para gerenciar estoque
      </a>

      {open && (
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="stock-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Retirar material</h2>
              <button className="icon-button" onClick={() => setOpen(false)} disabled={busy} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Preencha para registrar a retirada. Não é necessário login.
            </p>

            {error && <div className="alert error">{error}</div>}

            <div className="field">
              <label>Responsável pela retirada *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" maxLength={120} />
            </div>

            <div className="field">
              <label>Destino * (para onde vai)</label>
              <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="">Selecione o destino…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Quantidade * ({unitLabel})</label>
              <div className="stock-stepper">
                <button className="stock-step-btn" onClick={() => bump(-1)} disabled={busy} aria-label="Diminuir">
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <button className="stock-step-btn" onClick={() => bump(1)} disabled={busy} aria-label="Aumentar">
                  <Plus size={18} />
                </button>
              </div>
              <div className="stock-presets">
                {presets.map((p) => (
                  <button key={p} className="stock-preset-btn" onClick={() => setQuantity(String(p))} disabled={busy}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Observação (opcional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: culto de domingo" maxLength={500} />
            </div>

            <button
              className="button gold stock-confirm"
              onClick={submit}
              disabled={busy || !name.trim() || !destination || Number(quantity) < 1}
            >
              {busy ? "Registrando…" : "Confirmar retirada"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
