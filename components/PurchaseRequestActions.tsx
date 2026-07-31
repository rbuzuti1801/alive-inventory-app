"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, FileText, X } from "lucide-react";
import { purchaseRequestStatusLabels, type PurchaseRequestStatus } from "@/lib/constants";
import { buildDocument, fieldsBlock, formatCurrency, formatDate, formatDateTime, section, signaturesBlock, openPrintDocument } from "@/lib/print";
import { canPrintPurchaseRequest, purchaseRequestActions } from "@/lib/purchase-requests";

export type PurchaseRequestDetail = {
  id: string;
  request_number: string;
  requester_name: string;
  requester_contact: string;
  department: string | null;
  item_name: string;
  quantity: number;
  justification: string;
  estimated_value: number | null;
  brand: string | null;
  reference_link: string | null;
  desired_date: string | null;
  observations: string | null;
  status: PurchaseRequestStatus;
  approved_quantity: number | null;
  approved_value: number | null;
  approved_brand: string | null;
  decision_notes: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  created_at: string;
};

// Documento oficial da solicitação aprovada (A4, com espaço para assinatura
// física). Mesmo motor de impressão dos demais documentos (lib/print.ts).
function buildRequestDocument(request: PurchaseRequestDetail, origin: string) {
  const body = [
    section(
      "Solicitante",
      fieldsBlock([
        { label: "Nome", value: request.requester_name },
        { label: "Contato", value: request.requester_contact },
        { label: "Ministério / Departamento", value: request.department },
        { label: "Data desejada", value: formatDate(request.desired_date) },
      ]),
    ),
    section(
      "Item solicitado",
      fieldsBlock([
        { label: "Item", value: request.item_name, wide: true },
        { label: "Quantidade", value: Number(request.quantity).toLocaleString("pt-BR") },
        { label: "Valor estimado informado", value: formatCurrency(request.estimated_value) },
        { label: "Marca informada", value: request.brand },
        { label: "Link de referência", value: request.reference_link },
        { label: "Justificativa", value: request.justification, wide: true },
        { label: "Observações", value: request.observations, wide: true },
      ]),
    ),
    section(
      "Aprovação",
      fieldsBlock([
        { label: "Status", value: purchaseRequestStatusLabels[request.status] },
        { label: "Aprovado por", value: request.decided_by_name },
        { label: "Data e hora da aprovação", value: formatDateTime(request.decided_at) },
        { label: "Quantidade aprovada", value: request.approved_quantity == null ? "" : Number(request.approved_quantity).toLocaleString("pt-BR") },
        { label: "Valor aprovado", value: formatCurrency(request.approved_value) },
        { label: "Marca aprovada", value: request.approved_brand },
        { label: "Observações da aprovação", value: request.decision_notes, wide: true },
      ]),
    ),
    signaturesBlock([
      { role: "Responsável pela aprovação", name: request.decided_by_name },
      { role: "Solicitante", name: request.requester_name },
    ]),
  ].join("");

  return buildDocument({
    documentTitle: "Solicitação de Compra",
    headline: request.item_name,
    number: request.request_number,
    meta: [
      `Recebida em ${formatDateTime(request.created_at)}`,
      `Status: ${purchaseRequestStatusLabels[request.status]}`,
    ],
    body,
    origin,
  });
}

export function PurchaseRequestActions({ request }: { request: PurchaseRequestDetail }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);

  const available = purchaseRequestActions(request.status);

  async function decide(status: PurchaseRequestStatus, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/purchase-requests/${request.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Não foi possível registrar a decisão.");
      return;
    }
    setApproving(false);
    router.refresh();
  }

  function approve(form: HTMLFormElement) {
    const f = new FormData(form);
    decide("aprovada", {
      approved_quantity: f.get("approved_quantity"),
      approved_value: f.get("approved_value"),
      approved_brand: f.get("approved_brand"),
      decision_notes: f.get("decision_notes"),
    });
  }

  function printDocument() {
    const message = openPrintDocument(buildRequestDocument(request, window.location.origin));
    if (message) setError(message);
  }

  return (
    <>
      {error && <div className="alert error">{error}</div>}

      <div className="actions">
        {available.includes("aprovada") && (
          <button className="button" type="button" disabled={busy} onClick={() => setApproving(true)}>
            <Check size={15} /> Aprovar
          </button>
        )}
        {available.includes("rejeitada") && (
          <button
            className="button danger"
            type="button"
            disabled={busy}
            onClick={() => {
              const notes = window.prompt("Motivo da rejeição (opcional):") ?? "";
              if (window.confirm("Rejeitar esta solicitação?")) decide("rejeitada", { decision_notes: notes });
            }}
          >
            <X size={15} /> Rejeitar
          </button>
        )}
        {available.includes("cancelada") && (
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Cancelar esta solicitação?")) decide("cancelada");
            }}
          >
            <Ban size={15} /> Cancelar
          </button>
        )}
        {canPrintPurchaseRequest(request.status) && (
          <button className="button gold" type="button" onClick={printDocument}>
            <FileText size={15} /> Gerar PDF
          </button>
        )}
      </div>

      {approving && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h2>Aprovar solicitação {request.request_number}</h2>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setApproving(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              className="grid"
              onSubmit={(e) => {
                e.preventDefault();
                approve(e.currentTarget);
              }}
            >
              <div className="form-row">
                <div className="field">
                  <label>Quantidade aprovada *</label>
                  <input
                    name="approved_quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={String(request.quantity)}
                    required
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Valor aprovado (R$)</label>
                  <input
                    name="approved_value"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={request.estimated_value == null ? "" : String(request.estimated_value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>Marca aprovada</label>
                <input name="approved_brand" defaultValue={request.brand ?? ""} maxLength={120} />
              </div>

              <div className="field">
                <label>Observações</label>
                <textarea name="decision_notes" rows={3} maxLength={2000} />
              </div>

              <p className="field-hint">
                Seu nome e a data/hora da aprovação são registrados automaticamente.
              </p>

              <div className="modal-actions">
                <button className="button secondary" type="button" onClick={() => setApproving(false)}>
                  Cancelar
                </button>
                <button className="button" type="submit" disabled={busy}>
                  <Check size={15} /> Confirmar aprovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
