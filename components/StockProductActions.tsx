"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, CheckCircle2, History, Minus, Plus, Scale, X } from "lucide-react";
import { stockMovementLabels, type StockMovementType } from "@/lib/constants";

type Level = { location_id: string; location_name: string; quantity: number };
type Location = { id: string; name: string };

type Props = {
  productId: string;
  unitLabel: string;
  levels: Level[];
  locations: Location[];
  canAdjust: boolean;
};

const presets = [1, 5, 10];

// Ações de movimentação na página do produto (mobile-first, mínimo de toques):
// tap na ação → bottom-sheet com quantidade e localização → confirmar.
export function StockProductActions({ productId, unitLabel, levels, locations, canAdjust }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<StockMovementType | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const withBalance = useMemo(() => levels.filter((l) => l.quantity > 0), [levels]);
  // "Estoque" é o destino padrão de uma Entrada (onde o material é armazenado).
  const defaultStorage = useMemo(
    () => locations.find((l) => l.name.trim().toLowerCase() === "estoque")?.id ?? "",
    [locations],
  );

  function open(type: StockMovementType) {
    setAction(type);
    setError("");
    setSuccess("");
    setQuantity(type === "ajuste" ? "0" : "1");
    // Auto-seleção quando só existe uma opção (menos toques).
    const onlyBalance = withBalance.length === 1 ? withBalance[0].location_id : "";
    const onlyLocation = locations.length === 1 ? locations[0].id : "";
    // Origem: onde há saldo (saída/transferência).
    setFromLocation(type === "saida" || type === "transferencia" ? onlyBalance : "");
    // Destino: para onde o material vai. Entrada usa "Estoque" por padrão.
    setToLocation(
      type === "entrada" ? defaultStorage || onlyLocation : type === "ajuste" ? onlyBalance || onlyLocation : "",
    );
  }

  function bump(delta: number) {
    const value = Math.max(0, (Number(quantity) || 0) + delta);
    setQuantity(String(value));
  }

  async function submit() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock/movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          movement_type: action,
          quantity: Number(quantity),
          from_location_id: fromLocation || null,
          to_location_id: toLocation || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível registrar a movimentação.");
        return;
      }
      setSuccess(`${stockMovementLabels[action]} de ${quantity} ${unitLabel.toLowerCase()}(s) registrada!`);
      setAction(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const needsFrom = action === "saida" || action === "transferencia";
  const needsTo =
    action === "entrada" || action === "saida" || action === "ajuste" || action === "transferencia";

  return (
    <div className="stock-actions">
      {success && (
        <div className="alert success stock-success">
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      <div className="stock-actions-grid">
        <button className="stock-action-btn" onClick={() => open("entrada")}>
          <ArrowDownToLine size={22} /> Entrada
        </button>
        <button className="stock-action-btn" onClick={() => open("saida")}>
          <ArrowUpFromLine size={22} /> Saída
        </button>
        <button className="stock-action-btn" onClick={() => open("transferencia")}>
          <ArrowLeftRight size={22} /> Transferir
        </button>
        {canAdjust && (
          <button className="stock-action-btn" onClick={() => open("ajuste")}>
            <Scale size={22} /> Ajustar
          </button>
        )}
      </div>

      <Link className="stock-history-link" href={`/stock?tab=movimentacoes&product_id=${productId}`}>
        <History size={14} /> Ver histórico deste produto
      </Link>

      {action && (
        <div className="modal-overlay" onClick={() => !busy && setAction(null)}>
          <div className="stock-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{stockMovementLabels[action]}</h2>
              <button className="icon-button" onClick={() => setAction(null)} disabled={busy} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            {error && <div className="alert error">{error}</div>}

            {needsFrom && (
              <div className="field">
                <label>Origem {action === "transferencia" ? "(de onde sai)" : "(de onde retirar)"}</label>
                <select value={fromLocation} onChange={(e) => setFromLocation(e.target.value)}>
                  <option value="">Selecione a origem…</option>
                  {withBalance.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.location_name} ({l.quantity.toLocaleString("pt-BR")})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {action === "transferencia" && <div className="stock-flow-arrow" aria-hidden>↓</div>}

            {needsTo && (
              <div className="field">
                <label>
                  {action === "ajuste"
                    ? "Localização"
                    : action === "saida"
                      ? "Destino (para onde vai)"
                      : action === "transferencia"
                        ? "Destino (para onde vai)"
                        : "Destino (onde armazenar)"}
                </label>
                <select value={toLocation} onChange={(e) => setToLocation(e.target.value)}>
                  <option value="">Selecione o destino…</option>
                  {locations
                    .filter((l) => !(action === "transferencia" && l.id === fromLocation))
                    .map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
              </div>
            )}

            <div className="field">
              <label>{action === "ajuste" ? `Saldo contado (${unitLabel})` : `Quantidade (${unitLabel})`}</label>
              <div className="stock-stepper">
                <button className="stock-step-btn" onClick={() => bump(-1)} disabled={busy} aria-label="Diminuir">
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
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

            <button className="button gold stock-confirm" onClick={submit} disabled={busy}>
              {busy ? "Registrando…" : `Confirmar ${stockMovementLabels[action].toLowerCase()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
