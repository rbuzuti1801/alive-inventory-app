"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Sector = { id: string; name: string; description: string | null; active: boolean };
type Subcategory = { id: string; sector_id: string; name: string; description: string | null; active: boolean };

function EditableSectorRow({ sector, onSave }: { sector: Sector; onSave: (payload: Record<string, unknown>) => void }) {
  const [name, setName] = useState(sector.name);
  const [description, setDescription] = useState(sector.description ?? "");

  return (
    <tr key={sector.id}>
      <td><input value={name} onChange={(e) => setName(e.target.value)} /></td>
      <td><input value={description} onChange={(e) => setDescription(e.target.value)} /></td>
      <td>{sector.active ? "Ativo" : "Inativo"}</td>
      <td className="actions">
        <button className="button secondary" type="button" onClick={() => onSave({ id: sector.id, name, description: description || null, active: sector.active })}>Salvar</button>
        <button className="button secondary" type="button" onClick={() => onSave({ id: sector.id, name: sector.name, description: sector.description, active: !sector.active })}>{sector.active ? "Desativar" : "Ativar"}</button>
      </td>
    </tr>
  );
}

export function SectorsManager({ sectors, subcategories }: { sectors: Sector[]; subcategories: Subcategory[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function save(payload: Record<string, unknown>, method = "POST") {
    setError("");
    const res = await fetch("/api/sectors", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? "Erro ao salvar.");
    router.refresh();
  }

  return (
    <div className="grid">
      {error && <div className="alert error">{error}</div>}
      <section className="panel">
        <h2>Novo setor</h2>
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ name: f.get("name"), description: f.get("description"), active: true }); e.currentTarget.reset(); }}>
          <div className="field"><label>Nome</label><input name="name" required /></div>
          <div className="field"><label>Descrição</label><input name="description" /></div>
          <button className="button" type="submit">Criar</button>
        </form>
      </section>

      <section className="table-wrap">
        <table>
          <thead><tr><th>Setor</th><th>Descrição</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {sectors.map((sector) => (
              <EditableSectorRow key={sector.id} sector={sector} onSave={(payload) => save(payload, "PUT")} />
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Nova subcategoria</h2>
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ kind: "subcategory", sector_id: f.get("sector_id"), name: f.get("name"), description: f.get("description"), active: true }); e.currentTarget.reset(); }}>
          <div className="field"><label>Setor</label><select name="sector_id" required>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label>Nome</label><input name="name" required /></div>
          <div className="field"><label>Descrição</label><input name="description" /></div>
          <button className="button" type="submit">Criar</button>
        </form>
      </section>

      <section className="table-wrap">
        <table>
          <thead><tr><th>Subcategoria</th><th>Setor</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {subcategories.map((sub) => (
              <tr key={sub.id}>
                <td>{sub.name}</td>
                <td>{sectors.find((s) => s.id === sub.sector_id)?.name ?? "-"}</td>
                <td>{sub.active ? "Ativa" : "Inativa"}</td>
                <td><button className="button secondary" type="button" onClick={() => save({ kind: "subcategory", id: sub.id, sector_id: sub.sector_id, name: sub.name, description: sub.description, active: !sub.active }, "PUT")}>{sub.active ? "Desativar" : "Ativar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
