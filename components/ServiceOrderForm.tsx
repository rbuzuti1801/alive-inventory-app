"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { serviceOrderStatusLabels, type ServiceOrderStatus } from "@/lib/constants";

export type ServiceOrderFormValues = {
  id?: string;
  order_number?: string | null;
  status?: ServiceOrderStatus;
  responsible_name?: string | null;
  department?: string | null;
  title?: string | null;
  description?: string | null;
  service_location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  service_value?: number | null;
  payment_method?: string | null;
  materials_included?: string | null;
  materials_excluded?: string | null;
  warranty?: string | null;
  observations?: string | null;
  provider_name?: string | null;
  provider_document?: string | null;
  provider_phone?: string | null;
  provider_email?: string | null;
  provider_address?: string | null;
  provider_contact?: string | null;
};

function value(v: string | number | null | undefined) {
  return v == null ? "" : String(v);
}

// Criação e edição da Ordem de Serviço. A edição só é oferecida em rascunho —
// a rota de API recusa qualquer outro status.
export function ServiceOrderForm({
  order,
  defaultResponsible,
}: {
  order?: ServiceOrderFormValues;
  defaultResponsible: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(order?.id);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const res = await fetch(isEditing ? `/api/service-orders/${order!.id}` : "/api/service-orders", {
      method: isEditing ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Não foi possível salvar a ordem de serviço.");
      return;
    }
    router.push(`/service-orders/${json.order?.id ?? order!.id}`);
    router.refresh();
  }

  return (
    <form className="grid" onSubmit={submit}>
      {error && <div className="alert error">{error}</div>}

      <section className="panel">
        <h2>Identificação</h2>
        <div className="form-grid">
          <div className="field">
            <label>Número</label>
            <input
              value={order?.order_number ?? "Definido na emissão"}
              readOnly
              disabled
              style={{ fontFamily: "monospace", fontWeight: 600 }}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <input value={serviceOrderStatusLabels[order?.status ?? "rascunho"]} readOnly disabled />
          </div>
          <div className="field">
            <label>Responsável interno *</label>
            <input
              name="responsible_name"
              defaultValue={value(order?.responsible_name) || defaultResponsible}
              required
              maxLength={120}
            />
          </div>
          <div className="field">
            <label>Ministério / Departamento</label>
            <input name="department" defaultValue={value(order?.department)} maxLength={120} />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Serviço</h2>
        <div className="form-grid">
          <div className="field full">
            <label>Título *</label>
            <input name="title" defaultValue={value(order?.title)} required maxLength={200} placeholder="Ex.: Manutenção do ar-condicionado do templo" />
          </div>
          <div className="field full">
            <label>Descrição *</label>
            <textarea name="description" defaultValue={value(order?.description)} rows={5} required maxLength={4000} />
          </div>
          <div className="field">
            <label>Local</label>
            <input name="service_location" defaultValue={value(order?.service_location)} maxLength={200} />
          </div>
          <div className="field">
            <label>Forma de pagamento</label>
            <input name="payment_method" defaultValue={value(order?.payment_method)} maxLength={120} placeholder="Ex.: PIX em 2x" />
          </div>
          <div className="field">
            <label>Início previsto</label>
            <input name="start_date" type="date" defaultValue={value(order?.start_date).slice(0, 10)} />
          </div>
          <div className="field">
            <label>Conclusão prevista</label>
            <input name="end_date" type="date" defaultValue={value(order?.end_date).slice(0, 10)} />
          </div>
          <div className="field">
            <label>Valor (R$)</label>
            <input name="service_value" type="number" min="0" step="0.01" defaultValue={value(order?.service_value)} />
          </div>
          <div className="field">
            <label>Garantia</label>
            <input name="warranty" defaultValue={value(order?.warranty)} maxLength={200} placeholder="Ex.: 90 dias" />
          </div>
          <div className="field">
            <label>Materiais inclusos</label>
            <textarea name="materials_included" defaultValue={value(order?.materials_included)} rows={3} maxLength={2000} />
          </div>
          <div className="field">
            <label>Materiais não inclusos</label>
            <textarea name="materials_excluded" defaultValue={value(order?.materials_excluded)} rows={3} maxLength={2000} />
          </div>
          <div className="field full">
            <label>Observações</label>
            <textarea name="observations" defaultValue={value(order?.observations)} rows={3} maxLength={2000} />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Prestador</h2>
        <p className="field-hint" style={{ marginTop: 0 }}>
          Todos os campos são opcionais. O que ficar em branco será impresso como espaço para preenchimento manual no
          PDF.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>Nome</label>
            <input name="provider_name" defaultValue={value(order?.provider_name)} maxLength={150} />
          </div>
          <div className="field">
            <label>CPF / CNPJ</label>
            <input name="provider_document" defaultValue={value(order?.provider_document)} maxLength={30} />
          </div>
          <div className="field">
            <label>Telefone</label>
            <input name="provider_phone" defaultValue={value(order?.provider_phone)} maxLength={40} />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input name="provider_email" type="email" defaultValue={value(order?.provider_email)} maxLength={150} />
          </div>
          <div className="field full">
            <label>Endereço</label>
            <input name="provider_address" defaultValue={value(order?.provider_address)} maxLength={250} />
          </div>
          <div className="field">
            <label>Responsável</label>
            <input name="provider_contact" defaultValue={value(order?.provider_contact)} maxLength={120} />
          </div>
        </div>
      </section>

      <div className="actions">
        <button className="button" type="submit" disabled={loading}>
          <Save size={15} /> {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar rascunho"}
        </button>
        <button className="button secondary" type="button" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
