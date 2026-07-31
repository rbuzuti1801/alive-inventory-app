"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, FileText, Pencil, PlayCircle, Send } from "lucide-react";
import { serviceOrderStatusLabels, type ServiceOrderStatus } from "@/lib/constants";
import {
  buildDocument,
  fieldsBlock,
  formatCurrency,
  formatDate,
  formatDateTime,
  openPrintDocument,
  section,
  signaturesBlock,
} from "@/lib/print";
import { canEditServiceOrder, canPrintServiceOrder, serviceOrderActions } from "@/lib/service-orders";

export type ServiceOrderDetail = {
  id: string;
  order_number: string | null;
  status: ServiceOrderStatus;
  responsible_name: string;
  department: string | null;
  title: string;
  description: string;
  service_location: string | null;
  start_date: string | null;
  end_date: string | null;
  service_value: number | null;
  payment_method: string | null;
  materials_included: string | null;
  materials_excluded: string | null;
  warranty: string | null;
  observations: string | null;
  provider_name: string | null;
  provider_document: string | null;
  provider_phone: string | null;
  provider_email: string | null;
  provider_address: string | null;
  provider_contact: string | null;
  issued_at: string | null;
  issued_by_name: string | null;
  created_at: string;
};

// Documento de assinatura física. Campos do prestador vazios saem em branco no
// papel — é exatamente o caso de uso previsto (contratação fechada na hora).
function buildOrderDocument(order: ServiceOrderDetail, origin: string) {
  const body = [
    section(
      "Identificação",
      fieldsBlock([
        { label: "Responsável interno", value: order.responsible_name },
        { label: "Ministério / Departamento", value: order.department },
        { label: "Data de emissão", value: formatDateTime(order.issued_at) },
        { label: "Status", value: serviceOrderStatusLabels[order.status] },
      ]),
    ),
    section(
      "Serviço",
      fieldsBlock([
        { label: "Título", value: order.title, wide: true },
        { label: "Descrição", value: order.description, wide: true },
        { label: "Local", value: order.service_location },
        { label: "Valor", value: formatCurrency(order.service_value) },
        { label: "Início previsto", value: formatDate(order.start_date) },
        { label: "Conclusão prevista", value: formatDate(order.end_date) },
        { label: "Forma de pagamento", value: order.payment_method },
        { label: "Garantia", value: order.warranty },
        { label: "Materiais inclusos", value: order.materials_included, wide: true },
        { label: "Materiais não inclusos", value: order.materials_excluded, wide: true },
        { label: "Observações", value: order.observations, wide: true },
      ]),
    ),
    section(
      "Prestador",
      fieldsBlock([
        { label: "Nome", value: order.provider_name },
        { label: "CPF / CNPJ", value: order.provider_document },
        { label: "Telefone", value: order.provider_phone },
        { label: "E-mail", value: order.provider_email },
        { label: "Endereço", value: order.provider_address, wide: true },
        { label: "Responsável", value: order.provider_contact },
      ]),
    ),
    signaturesBlock([
      { role: "Responsável interno", name: order.responsible_name },
      { role: "Prestador de serviço", name: order.provider_name },
    ]),
  ].join("");

  return buildDocument({
    documentTitle: "Ordem de Serviço",
    headline: order.title,
    number: order.order_number ?? "SEM NÚMERO",
    meta: [
      order.issued_at ? `Emitida em ${formatDateTime(order.issued_at)}` : "Não emitida",
      order.issued_by_name ? `Emitida por ${order.issued_by_name}` : "",
      `Status: ${serviceOrderStatusLabels[order.status]}`,
    ].filter(Boolean),
    body,
    origin,
  });
}

const actionMeta: Record<string, { label: string; className: string; icon: typeof Send; confirm: string }> = {
  emitida: {
    label: "Emitir",
    className: "button",
    icon: Send,
    confirm: "Emitir esta ordem de serviço? O número passa a ser definitivo e o conteúdo não poderá mais ser editado.",
  },
  em_execucao: { label: "Marcar em execução", className: "button secondary", icon: PlayCircle, confirm: "Marcar como em execução?" },
  concluida: { label: "Marcar como concluída", className: "button success", icon: CheckCircle2, confirm: "Marcar como concluída?" },
  cancelada: { label: "Cancelar ordem", className: "button danger", icon: Ban, confirm: "Cancelar esta ordem de serviço?" },
};

export function ServiceOrderActions({ order }: { order: ServiceOrderDetail }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const available = serviceOrderActions(order.status);

  async function changeStatus(status: ServiceOrderStatus) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/service-orders/${order.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Não foi possível alterar o status.");
      return;
    }
    router.refresh();
  }

  function printDocument() {
    const message = openPrintDocument(buildOrderDocument(order, window.location.origin));
    if (message) setError(message);
  }

  return (
    <>
      {error && <div className="alert error">{error}</div>}

      <div className="actions">
        {canEditServiceOrder(order.status) && (
          <Link className="button secondary" href={`/service-orders/${order.id}/edit`}>
            <Pencil size={15} /> Editar
          </Link>
        )}

        {available.map((status) => {
          const meta = actionMeta[status];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <button
              key={status}
              className={meta.className}
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(meta.confirm)) changeStatus(status);
              }}
            >
              <Icon size={15} /> {meta.label}
            </button>
          );
        })}

        {canPrintServiceOrder(order.status) && (
          <button className="button gold" type="button" onClick={printDocument}>
            <FileText size={15} /> Gerar PDF
          </button>
        )}
      </div>
    </>
  );
}
