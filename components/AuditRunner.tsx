"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CheckCircle2, Flag, Printer, XCircle } from "lucide-react";
import { ScannerInput } from "@/components/ScannerInput";

type ItemRef = {
  id: string;
  sku: string | null;
  item_code: string;
  description: string;
  location: string | null;
  sectors: { name?: string } | null;
};

type Progress = {
  audit: { id: string; name: string; status: string; finished_at: string | null; sectors: { name?: string } | null };
  totalExpected: number;
  found: ItemRef[];
  pending: ItemRef[];
  foundCount: number;
  pendingCount: number;
  extraCount: number;
};

type Feedback = { ok: boolean; message: string; at: string };

export function AuditRunner({ auditId, initial }: { auditId: string; initial: Progress }) {
  const [progress, setProgress] = useState<Progress>(initial);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const finished = progress.audit.status === "finalizado";

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/audits/${auditId}`);
    if (res.ok) setProgress(await res.json());
  }, [auditId]);

  const handleScan = useCallback(
    async (raw: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/audits/${auditId}/scan`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ raw }),
        });
        const json = await res.json();
        const at = new Date().toLocaleTimeString("pt-BR");
        if (!res.ok) {
          setFeedback({ ok: false, message: json.error ?? "Item não encontrado", at });
        } else {
          const sku = json.item?.sku ?? json.item?.item_code ?? "";
          const extra = json.outOfScope ? " (fora do setor)" : "";
          const dup = json.alreadyCounted ? " — já contabilizado" : "";
          setFeedback({ ok: true, message: `${sku} confirmado${extra}${dup}`, at });
          await refresh();
        }
      } finally {
        setBusy(false);
      }
    },
    [auditId, refresh],
  );

  async function finish() {
    if (!confirm("Finalizar esta auditoria? Não será possível registrar novas leituras.")) return;
    setBusy(true);
    const res = await fetch(`/api/audits/${auditId}/finish`, { method: "POST" });
    if (res.ok) setProgress(await res.json());
    setBusy(false);
  }

  const pct = progress.totalExpected > 0 ? Math.round((progress.foundCount / progress.totalExpected) * 100) : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{progress.audit.name}</h1>
          <p className="muted">{progress.audit.sectors?.name ?? "Todos os setores"} · {finished ? "Finalizada" : "Em andamento"}</p>
        </div>
        <div className="actions no-print">
          <Link className="button secondary" href="/audit">Voltar</Link>
          <button className="button secondary" type="button" onClick={() => window.print()}>
            <Printer size={15} /> Relatório
          </button>
          {!finished && (
            <button className="button gold" type="button" onClick={finish} disabled={busy}>
              <Flag size={15} /> Finalizar
            </button>
          )}
        </div>
      </div>

      {/* Progresso */}
      <div className="grid cards" style={{ marginBottom: 20 }}>
        <div className="kpi-card"><div><p className="kpi-label">Cadastrados</p><p className="kpi-value">{progress.totalExpected}</p></div></div>
        <div className="kpi-card"><div><p className="kpi-label">Encontrados</p><p className="kpi-value" style={{ color: "var(--success)" }}>{progress.foundCount}</p></div></div>
        <div className="kpi-card"><div><p className="kpi-label">Pendentes</p><p className="kpi-value" style={{ color: progress.pendingCount > 0 ? "var(--danger)" : "var(--success)" }}>{progress.pendingCount}</p></div></div>
        <div className="kpi-card"><div><p className="kpi-label">Progresso</p><p className="kpi-value">{pct}%</p></div></div>
      </div>

      <div className="audit-progress-bar no-print"><div className="audit-progress-fill" style={{ width: `${pct}%` }} /></div>

      {!finished && (
        <div className="panel no-print" style={{ marginTop: 16 }}>
          <ScannerInput onScan={handleScan} busy={busy} placeholder="Escaneie os itens encontrados…" />
          {feedback && (
            <div className={`scan-result ${feedback.ok ? "ok" : "fail"}`} style={{ marginTop: 12 }}>
              <div className="scan-result-head">
                {feedback.ok ? <CheckCircle2 size={18} color="var(--success)" /> : <XCircle size={18} color="var(--danger)" />}
                <span>{feedback.message}</span>
                <span className="muted" style={{ marginLeft: "auto" }}>{feedback.at}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <div className="panel">
          <h2>Pendentes ({progress.pendingCount})</h2>
          {progress.pending.length === 0 ? (
            <p className="muted">Todos os itens foram encontrados. 🎉</p>
          ) : (
            <ul className="audit-items">
              {progress.pending.map((i) => (
                <li key={i.id}><span className="sku-badge">{i.sku ?? i.item_code}</span> {i.description} <span className="muted">· {i.location ?? "-"}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h2>Encontrados ({progress.foundCount})</h2>
          {progress.found.length === 0 ? (
            <p className="muted">Nenhum item escaneado ainda.</p>
          ) : (
            <ul className="audit-items">
              {progress.found.map((i) => (
                <li key={i.id}><span className="sku-badge">{i.sku ?? i.item_code}</span> {i.description}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
