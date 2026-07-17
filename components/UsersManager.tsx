"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { roleLabels, roles } from "@/lib/constants";

type Sector = { id: string; name: string };
type RelatedName = { name?: string } | { name?: string }[] | null | undefined;
type User = { id: string; name: string; username: string; role: string; sector_id: string | null; active: boolean; sectors?: RelatedName };

function relatedName(value: RelatedName) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export function UsersManager({ users, sectors }: { users: User[]; sectors: Sector[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = { ...data, id: editing?.id, active: data.active === "on" };
    const res = await fetch("/api/users", {
      method: editing ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Erro ao salvar usuário.");
      return;
    }
    setEditing(null);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="grid">
      {error && <div className="alert error">{error}</div>}
      <form key={editing?.id ?? "new"} className="panel form-grid" onSubmit={submit}>
        <h2 className="full">{editing ? "Editar usuário" : "Criar usuário"}</h2>
        <div className="field"><label>Nome</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
        <div className="field"><label>Username</label><input name="username" defaultValue={editing?.username ?? ""} required /></div>
        <div className="field"><label>Senha {editing && "(preencha apenas para alterar)"}</label><input name="password" type="password" required={!editing} /></div>
        <div className="field"><label>Role</label><select name="role" defaultValue={editing?.role ?? "visualizador"}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></div>
        <div className="field"><label>Setor vinculado</label><select name="sector_id" defaultValue={editing?.sector_id ?? ""}><option value="">Sem setor</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <label className="field"><span>Ativo</span><input name="active" type="checkbox" defaultChecked={editing?.active ?? true} /></label>
        <div className="full actions">
          <button className="button" type="submit">Salvar usuário</button>
          {editing && <button className="button secondary" type="button" onClick={() => setEditing(null)}>Cancelar edição</button>}
        </div>
      </form>
      <section className="table-wrap table-cards">
        <table>
          <thead><tr><th>Nome</th><th>Usuário</th><th>Role</th><th>Setor</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td data-label="Nome">{user.name}</td><td data-label="Usuário">{user.username}</td><td data-label="Role">{roleLabels[user.role as keyof typeof roleLabels]}</td><td data-label="Setor">{relatedName(user.sectors) ?? "-"}</td><td data-label="Status">{user.active ? "Ativo" : "Inativo"}</td>
                <td data-label="Ações"><button className="button secondary" type="button" onClick={() => setEditing(user)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
