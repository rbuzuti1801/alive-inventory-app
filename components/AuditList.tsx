"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Play } from "lucide-react";

type Sector = { id: string; name: string };
type Audit = {
  id: string;
  name: string;
  status: string;
  total_expected: number;
  total_found: number;
  started_at: string;
  finished_at: string | null;
  sectors: { name?: string } | null;
};

export function AuditList({ audits, sectors }: { audits: Audit[]; sectors: Sector[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, sector_id: sectorId || null }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Erro ao iniciar auditoria.");
      return;
    }
    router.push(`/audit/${json.audit.id}`);
  }

  return (
    <div className="audit-layout">
      <form className="panel" onSubmit={start}>
        <h2>Iniciar nova auditoria</h2>
        {error && <div className="alert error">{error}</div>}
        <div className="field"><label>Nome da auditoria</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Inventário geral 2026" required /></div>
        <div className="field">
          <label>Setor (opcional)</label>
          <select value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
            <option value="">Todos os setores</option>
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className="button gold" type="submit" disabled={loading}>
          <Play size={16} /> {loading ? "Iniciando…" : "Iniciar inventário"}
        </button>
      </form>

      <div className="panel">
        <h2>Auditorias</h2>
        {audits.length === 0 ? (
          <div className="empty-state"><ClipboardList size={36} color="#302F2F" /><p>Nenhuma auditoria registrada.</p></div>
        ) : (
          <ul className="audit-list">
            {audits.map((a) => {
              const pct = a.total_expected > 0 ? Math.round((a.total_found / a.total_expected) * 100) : 0;
              return (
                <li key={a.id}>
                  <Link href={`/audit/${a.id}`} className="audit-list-item">
                    <div>
                      <strong>{a.name}</strong>
                      <span className="muted">{a.sectors?.name ?? "Todos os setores"} · {new Date(a.started_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="audit-list-meta">
                      <span className={`badge ${a.status === "finalizado" ? "novo" : "regular"}`}>
                        {a.status === "finalizado" ? "Finalizada" : "Em andamento"}
                      </span>
                      <span className="muted">{a.total_found}/{a.total_expected} ({pct}%)</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
