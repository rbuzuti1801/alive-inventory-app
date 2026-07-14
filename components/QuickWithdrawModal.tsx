"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogIn, Minus, Plus, PackageMinus, X } from "lucide-react";

type Location = { id: string; name: string };
type Origin = { id: string; name: string; quantity: number };

type Props = {
  productId: string;
  unitLabel: string;
  locations: Location[];
  origins: Origin[];
  loginHref: string;
};

const presets = [1, 2, 5];

// Retirada rápida SEM login (voluntários). Registra uma saída informando o
// responsável e o destino (setor real). O saldo nunca fica negativo — a
// validação final é feita pelo servidor. Quando o produto existe em mais de
// uma localização, o usuário escolhe a origem (com o saldo disponível de cada).
export function QuickWithdrawModal({ productId, unitLabel, locations, origins, loginHref }: Props) {
  const router = useRouter();
  const multiOrigin = origins.length > 1;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState(origins.length === 1 ? origins[0].id : "");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const selectedOrigin = origins.find((o) => o.id === origin) ?? null;
  const qtyNum = Number(quantity);
  // Saldo máximo retirável: o da origem escolhida (ou o total quando há só uma).
  const maxAvailable = selectedOrigin?.quantity ?? (origins.length === 1 ? origins[0].quantity : undefined);
  const overBalance = maxAvailable !== undefined && qtyNum > maxAvailable;

  function reset() {
    setName("");
    setDestination("");
    setOrigin(origins.length === 1 ? origins[0].id : "");
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
        // Não seguir redirects: se o middleware (ou auth) redirecionar, tratamos
        // como falha em vez de exibir sucesso enganoso.
        redirect: "manual",
        body: JSON.stringify({
          product_id: productId,
          performed_by_name: name,
          to_location_id: destination,
          from_location_id: origin || null,
          quantity: Number(quantity),
          reason: notes || null,
        }),
      });

      // `type === "opaqueredirect"` (com redirect:manual) ou status fora de 2xx:
      // a operação NÃO foi concluída pelo banco. Nunca mostrar sucesso.
      if (res.type === "opaqueredirect" || res.status === 0) {
        setError("Não foi possível registrar a retirada (sessão/redirecionamento). Tente novamente.");
        return;
      }

      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        setError((json.error as string) ?? "Não foi possível registrar a retirada.");
        return;
      }

      setSuccess(`Retirada de ${quantity} ${unitLabel.toLowerCase()}(s) registrada. Obrigado, ${name}!`);
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Falha de conexão. Verifique a internet e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const confirmDisabled =
    busy ||
    !name.trim() ||
    !destination ||
    (multiOrigin && !origin) ||
    qtyNum < 1 ||
    overBalance;

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

            {multiOrigin && (
              <div className="field">
                <label>Retirar de * (origem)</label>
                <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
                  <option value="">Selecione a origem…</option>
                  {origins.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} — {o.quantity.toLocaleString("pt-BR")} disponível
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              {maxAvailable !== undefined && (
                <p className={`muted${overBalance ? " stock-over-balance" : ""}`} style={{ fontSize: 12, margin: "4px 0 0" }}>
                  {overBalance
                    ? `Saldo insuficiente: disponível ${maxAvailable.toLocaleString("pt-BR")}.`
                    : `Disponível: ${maxAvailable.toLocaleString("pt-BR")}.`}
                </p>
              )}
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
              disabled={confirmDisabled}
            >
              {busy ? "Registrando…" : "Confirmar retirada"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
