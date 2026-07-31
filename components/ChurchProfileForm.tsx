"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { ChurchProfile } from "@/lib/institution-server";

function value(v: string | null | undefined) {
  return v ?? "";
}

// Perfil da Igreja: dados institucionais impressos no cabeçalho dos documentos
// (Solicitação de Compra aprovada e Ordem de Serviço). Só admin edita.
export function ChurchProfileForm({ profile }: { profile: ChurchProfile | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const res = await fetch("/api/church-profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Não foi possível salvar o perfil.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="grid" onSubmit={submit}>
      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert success">Perfil da igreja atualizado.</div>}

      <section className="panel">
        <h2>Identificação</h2>
        <div className="form-grid">
          <div className="field">
            <label>Nome de exibição *</label>
            <input name="name" defaultValue={value(profile?.name) || "Alive Church"} required maxLength={150} />
            <p className="field-hint">Aparece em destaque no cabeçalho dos documentos.</p>
          </div>
          <div className="field">
            <label>Razão social</label>
            <input name="legal_name" defaultValue={value(profile?.legal_name)} maxLength={200} />
          </div>
          <div className="field">
            <label>CNPJ</label>
            <input name="document" defaultValue={value(profile?.document)} maxLength={30} placeholder="00.000.000/0001-00" />
          </div>
          <div className="field">
            <label>Endereço</label>
            <input name="address" defaultValue={value(profile?.address)} maxLength={250} />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Contato</h2>
        <div className="form-grid">
          <div className="field">
            <label>Telefone</label>
            <input name="phone" defaultValue={value(profile?.phone)} maxLength={40} />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input name="email" type="email" defaultValue={value(profile?.email)} maxLength={150} />
          </div>
          <div className="field">
            <label>Site</label>
            <input name="website" defaultValue={value(profile?.website)} maxLength={150} />
          </div>
          <div className="field">
            <label>Logo (URL ou caminho)</label>
            <input name="logo_url" defaultValue={value(profile?.logo_url)} maxLength={300} placeholder="/logo.png" />
            <p className="field-hint">Em branco usa o logo padrão do sistema (/logo.png).</p>
          </div>
        </div>
      </section>

      <div className="actions">
        <button className="button" type="submit" disabled={loading}>
          <Save size={15} /> {loading ? "Salvando..." : "Salvar perfil"}
        </button>
        {profile?.updated_by_name && profile.updated_at && (
          <span className="muted">
            Última atualização por {profile.updated_by_name} em {new Date(profile.updated_at).toLocaleString("pt-BR")}
          </span>
        )}
      </div>
    </form>
  );
}
