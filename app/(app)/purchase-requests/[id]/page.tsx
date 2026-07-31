import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canManagePurchaseRequests } from "@/lib/permissions";
import { loadInstitution } from "@/lib/institution-server";
import { supabaseAdmin } from "@/lib/supabase";
import { purchaseRequestStatusLabels, type PurchaseRequestStatus } from "@/lib/constants";
import { PurchaseRequestActions, type PurchaseRequestDetail } from "@/components/PurchaseRequestActions";

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

export default async function PurchaseRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManagePurchaseRequests(user)) {
    return <div className="alert error">Apenas administradores e gestores acessam esta área.</div>;
  }

  const { id } = await params;
  const [{ data }, institution] = await Promise.all([
    supabaseAdmin.from("purchase_requests").select("*").eq("id", id).maybeSingle(),
    loadInstitution(),
  ]);
  if (!data) return <div className="alert error">Solicitação não encontrada.</div>;

  const request = data as PurchaseRequestDetail;
  const status = request.status as PurchaseRequestStatus;

  const requestFields: Array<[string, string]> = [
    ["Número", request.request_number],
    ["Recebida em", new Date(request.created_at).toLocaleString("pt-BR")],
    ["Solicitante", request.requester_name],
    ["Contato", request.requester_contact],
    ["Ministério / Departamento", text(request.department)],
    ["Item solicitado", request.item_name],
    ["Quantidade", Number(request.quantity).toLocaleString("pt-BR")],
    ["Valor estimado", currency(request.estimated_value)],
    ["Marca", text(request.brand)],
    ["Link de referência", text(request.reference_link)],
    ["Data desejada", date(request.desired_date)],
    ["Justificativa", request.justification],
    ["Observações", text(request.observations)],
  ];

  const decisionFields: Array<[string, string]> = [
    ["Quantidade aprovada", request.approved_quantity == null ? "-" : Number(request.approved_quantity).toLocaleString("pt-BR")],
    ["Valor aprovado", currency(request.approved_value)],
    ["Marca aprovada", text(request.approved_brand)],
    ["Responsável pela decisão", text(request.decided_by_name)],
    ["Data e hora", request.decided_at ? new Date(request.decided_at).toLocaleString("pt-BR") : "-"],
    ["Observações da decisão", text(request.decision_notes)],
  ];

  return (
    <div className="grid">
      <div className="topbar">
        <div>
          <Link href="/purchase-requests" className="back-link">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <h1 style={{ fontFamily: "monospace", letterSpacing: "0.04em", marginTop: 6 }}>{request.request_number}</h1>
          <p className="muted">{request.item_name}</p>
        </div>
        <div className="actions">
          <span className={`badge pr-${status}`}>{purchaseRequestStatusLabels[status]}</span>
        </div>
      </div>

      <PurchaseRequestActions request={request} institution={institution} />

      <section className="panel detail-list">
        {requestFields.map(([label, value]) => (
          <div className="detail-item" key={label}>
            <strong>{label}</strong>
            <span>{value}</span>
          </div>
        ))}
      </section>

      {request.decided_at && (
        <section className="panel">
          <h2>Decisão</h2>
          <div className="detail-list">
            {decisionFields.map(([label, value]) => (
              <div className="detail-item" key={label}>
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
