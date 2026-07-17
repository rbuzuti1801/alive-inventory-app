"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LocationRow = {
  id: string;
  name: string;
  description: string | null;
  sector_id: string | null;
  active: boolean;
  sector_name: string | null;
  total: number;
};

type Sector = { id: string; name: string };

export function StockLocationsManager({
  locations,
  sectors,
  canManage,
}: {
  locations: LocationRow[];
  sectors: Sector[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function save(path: string, method: string, payload?: Record<string, unknown>) {
    setError("");
    const res = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? "Erro ao salvar.");
    router.refresh();
  }

  return (
    <div className="grid">
      {error && <div className="alert error">{error}</div>}

      {canManage && (
        <section className="panel">
          <h2>Nova localização</h2>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save("/api/stock/locations", "POST", {
                name: f.get("name"),
                description: f.get("description"),
                sector_id: f.get("sector_id") || null,
              });
              e.currentTarget.reset();
            }}
          >
            <div className="field"><label>Nome</label><input name="name" required placeholder="Armário Cozinha 1" /></div>
            <div className="field">
              <label>Setor</label>
              <select name="sector_id" defaultValue="">
                <option value="">Sem setor</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Descrição</label><input name="description" placeholder="Prateleira superior" /></div>
            <button className="button" type="submit">Criar</button>
          </form>
        </section>
      )}

      <section className="table-wrap table-cards">
        <table>
          <thead>
            <tr>
              <th>Localização</th>
              <th>Setor</th>
              <th>Descrição</th>
              <th>Itens em estoque</th>
              <th>Status</th>
              {canManage && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} className="muted">Nenhuma localização cadastrada.</td></tr>
            )}
            {locations.map((l) => (
              <tr key={l.id} className={l.active ? "" : "muted"}>
                <td data-label="Localização"><strong>{l.name}</strong></td>
                <td data-label="Setor">{l.sector_name ?? "—"}</td>
                <td data-label="Descrição">{l.description ?? "—"}</td>
                <td data-label="Itens em estoque">{l.total.toLocaleString("pt-BR")}</td>
                <td data-label="Status">{l.active ? "Ativa" : "Inativa"}</td>
                {canManage && (
                  <td className="actions" data-label="Ações">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() =>
                        save(`/api/stock/locations/${l.id}`, "PUT", {
                          name: l.name,
                          description: l.description,
                          sector_id: l.sector_id,
                          active: !l.active,
                        })
                      }
                    >
                      {l.active ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
