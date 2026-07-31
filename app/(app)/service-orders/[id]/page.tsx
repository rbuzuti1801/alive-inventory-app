import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canManageServiceOrders } from "@/lib/permissions";
import { loadInstitution } from "@/lib/institution-server";
import { supabaseAdmin } from "@/lib/supabase";
import { serviceOrderStatusLabels, type ServiceOrderStatus } from "@/lib/constants";
import { ServiceOrderActions, type ServiceOrderDetail } from "@/components/ServiceOrderActions";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  if (value == null || value === "") return "-";
  return String(value);
}

function currency(value: number | null) {
  return value == null ? "-" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function date(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

type OrderEvent = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  user_name: string;
  created_at: string;
};

const eventLabels: Record<string, string> = {
  criacao: "Rascunho criado",
  edicao: "Rascunho editado",
  status: "Mudança de status",
};

export default async function ServiceOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageServiceOrders(user)) {
    return <div className="alert error">Apenas administradores e gestores acessam esta área.</div>;
  }

  const { id } = await params;
  const [{ data }, { data: events }, institution] = await Promise.all([
    supabaseAdmin.from("service_orders").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("service_order_events")
      .select("id,event_type,from_status,to_status,notes,user_name,created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    loadInstitution(),
  ]);

  if (!data) return <div className="alert error">Ordem de serviço não encontrada.</div>;

  const order = data as ServiceOrderDetail;
  const status = order.status as ServiceOrderStatus;

  const identification: Array<[string, string]> = [
    ["Número", order.order_number ?? "Rascunho (número definido na emissão)"],
    ["Status", serviceOrderStatusLabels[status]],
    ["Data de emissão", order.issued_at ? new Date(order.issued_at).toLocaleString("pt-BR") : "-"],
    ["Emitida por", text(order.issued_by_name)],
    ["Responsável interno", order.responsible_name],
    ["Ministério / Departamento", text(order.department)],
  ];

  const service: Array<[string, string]> = [
    ["Título", order.title],
    ["Local", text(order.service_location)],
    ["Início previsto", date(order.start_date)],
    ["Conclusão prevista", date(order.end_date)],
    ["Valor", currency(order.service_value)],
    ["Forma de pagamento", text(order.payment_method)],
    ["Garantia", text(order.warranty)],
    ["Descrição", order.description],
    ["Materiais inclusos", text(order.materials_included)],
    ["Materiais não inclusos", text(order.materials_excluded)],
    ["Observações", text(order.observations)],
  ];

  const provider: Array<[string, string]> = [
    ["Nome", text(order.provider_name)],
    ["CPF / CNPJ", text(order.provider_document)],
    ["Telefone", text(order.provider_phone)],
    ["E-mail", text(order.provider_email)],
    ["Endereço", text(order.provider_address)],
    ["Responsável", text(order.provider_contact)],
  ];

  return (
    <div className="grid">
      <div className="topbar">
        <div>
          <Link href="/service-orders" className="back-link">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <h1 style={{ fontFamily: "monospace", letterSpacing: "0.04em", marginTop: 6 }}>
            {order.order_number ?? "Rascunho"}
          </h1>
          <p className="muted">{order.title}</p>
        </div>
        <div className="actions">
          <span className={`badge so-${status}`}>{serviceOrderStatusLabels[status]}</span>
        </div>
      </div>

      <ServiceOrderActions order={order} institution={institution} />

      <section className="panel">
        <h2>Identificação</h2>
        <div className="detail-list">
          {identification.map(([label, value]) => (
            <div className="detail-item" key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Serviço</h2>
        <div className="detail-list">
          {service.map(([label, value]) => (
            <div className="detail-item" key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Prestador</h2>
        <p className="field-hint" style={{ marginTop: 0 }}>
          Campos em branco são impressos como espaço para preenchimento manual no PDF.
        </p>
        <div className="detail-list">
          {provider.map(([label, value]) => (
            <div className="detail-item" key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Histórico</h2>
        {(events ?? []).length === 0 && <p className="muted">Sem eventos registrados.</p>}
        {((events ?? []) as OrderEvent[]).map((event) => (
          <div className="activity-item" key={event.id}>
            <span>
              <strong>{eventLabels[event.event_type] ?? event.event_type}</strong>
              {event.to_status && event.event_type === "status" && (
                <>
                  {" "}
                  {event.from_status ? `${serviceOrderStatusLabels[event.from_status as ServiceOrderStatus]} → ` : ""}
                  {serviceOrderStatusLabels[event.to_status as ServiceOrderStatus]}
                </>
              )}
              {event.notes ? ` · ${event.notes}` : ""}
            </span>
            <span className="muted">
              {event.user_name} · {new Date(event.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
