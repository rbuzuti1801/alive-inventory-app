"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MapPin, Package, XCircle } from "lucide-react";
import { ScannerInput } from "@/components/ScannerInput";
import { Badge } from "@/components/Badge";

type ScannedItem = {
  id: string;
  sku: string | null;
  item_code: string;
  description: string;
  location: string | null;
  conservation_status: string;
  status: string;
  sectors?: { name?: string } | null;
  subcategories?: { name?: string } | null;
};

type Result = { ok: boolean; item?: ScannedItem; message: string; at: string };

export function QuickScan() {
  const [current, setCurrent] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);

  const handleScan = useCallback(async (raw: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw, context: "consulta" }),
      });
      const json = await res.json();
      const time = new Date().toLocaleTimeString("pt-BR");
      const result: Result = res.ok
        ? { ok: true, item: json.item, message: "Item localizado", at: time }
        : { ok: false, message: json.error ?? "Item não encontrado", at: time };
      setCurrent(result);
      setHistory((h) => [result, ...h].slice(0, 15));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="scan-layout">
      <div className="panel">
        <ScannerInput onScan={handleScan} busy={busy} />

        {current && (
          <div className={`scan-result ${current.ok ? "ok" : "fail"}`}>
            {current.ok && current.item ? (
              <>
                <div className="scan-result-head">
                  <CheckCircle2 size={20} color="var(--success)" />
                  <span className="sku-badge">{current.item.sku ?? current.item.item_code}</span>
                  <Badge kind="conservation" value={current.item.conservation_status} />
                  <Badge kind="status" value={current.item.status} />
                </div>
                <h2 style={{ margin: "8px 0 4px" }}>{current.item.description}</h2>
                <div className="scan-result-meta">
                  <span><Package size={14} /> {current.item.sectors?.name ?? "-"}{current.item.subcategories?.name ? ` / ${current.item.subcategories.name}` : ""}</span>
                  <span><MapPin size={14} /> {current.item.location ?? "-"}</span>
                </div>
                <Link className="button gold" href={`/inventory/${current.item.id}`} style={{ marginTop: 12 }}>
                  Abrir detalhes do item
                </Link>
              </>
            ) : (
              <div className="scan-result-head">
                <XCircle size={20} color="var(--danger)" />
                <span>{current.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Leituras recentes</h2>
        {history.length === 0 ? (
          <p className="muted">Nenhuma leitura ainda. Escaneie um QR Code para começar.</p>
        ) : (
          <ul className="scan-history">
            {history.map((h, idx) => (
              <li key={idx} className={h.ok ? "" : "fail"}>
                <span className="scan-history-time">{h.at}</span>
                {h.ok && h.item ? (
                  <Link href={`/inventory/${h.item.id}`}>
                    <span className="sku-badge">{h.item.sku ?? h.item.item_code}</span> {h.item.description}
                  </Link>
                ) : (
                  <span className="muted">{h.message}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
