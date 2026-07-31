"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

// Formulário público de Solicitação de Compra (sem login). Após o envio mostra
// apenas a confirmação com o número da solicitação — sem e-mail, sem consulta
// posterior (quem envia não tem acesso à triagem).
export function PurchaseRequestForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestNumber, setRequestNumber] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const res = await fetch("/api/purchase-requests/public", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Não foi possível enviar a solicitação.");
      return;
    }
    setRequestNumber(json.request_number ?? null);
  }

  if (requestNumber) {
    return (
      <div className="alert success" style={{ display: "grid", gap: 8, justifyItems: "center", textAlign: "center" }}>
        <CheckCircle2 size={28} />
        <strong>Solicitação enviada com sucesso.</strong>
        <span>
          Número da solicitação: <strong style={{ fontFamily: "monospace" }}>{requestNumber}</strong>
        </span>
        <span>Guarde este número. A equipe responsável fará a análise.</span>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            setRequestNumber(null);
            setError("");
          }}
        >
          Enviar outra solicitação
        </button>
      </div>
    );
  }

  return (
    <form className="grid" onSubmit={submit}>
      {error && <div className="alert error">{error}</div>}

      <div className="field">
        <label>Nome *</label>
        <input name="requester_name" required maxLength={120} placeholder="Seu nome completo" />
      </div>

      <div className="field">
        <label>Contato *</label>
        <input name="requester_contact" required maxLength={150} placeholder="Telefone ou e-mail" />
      </div>

      <div className="field">
        <label>Ministério / Departamento</label>
        <input name="department" maxLength={120} placeholder="Ex.: Kids, Louvor, Diaconia" />
      </div>

      <div className="field">
        <label>Item solicitado *</label>
        <input name="item_name" required maxLength={200} placeholder="Ex.: Cadeira de escritório" />
      </div>

      <div className="form-row">
        <div className="field">
          <label>Quantidade *</label>
          <input name="quantity" type="number" min="0.01" step="0.01" defaultValue={1} required />
        </div>
        <div className="field">
          <label>Valor estimado (R$)</label>
          <input name="estimated_value" type="number" min="0" step="0.01" placeholder="Opcional" />
        </div>
      </div>

      <div className="field">
        <label>Marca</label>
        <input name="brand" maxLength={120} placeholder="Opcional" />
      </div>

      <div className="field">
        <label>Link de referência</label>
        <input name="reference_link" type="url" maxLength={500} placeholder="https://..." />
      </div>

      <div className="field">
        <label>Data desejada</label>
        <input name="desired_date" type="date" />
      </div>

      <div className="field">
        <label>Justificativa *</label>
        <textarea name="justification" required rows={4} maxLength={2000} placeholder="Por que este item é necessário?" />
      </div>

      <div className="field">
        <label>Observações</label>
        <textarea name="observations" rows={3} maxLength={2000} placeholder="Opcional" />
      </div>

      <button className="button gold public-login-cta" type="submit" disabled={loading}>
        <Send size={16} /> {loading ? "Enviando..." : "Enviar solicitação"}
      </button>
      <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
        Campos com * são obrigatórios.
      </p>
    </form>
  );
}
