import type { PurchaseRequestStatus } from "@/lib/constants";

// Regras de triagem da Solicitação de Compra. Ficam aqui (puras) para valerem
// igual na interface — que só mostra a ação possível — e na rota de API, que é
// quem de fato decide.

const allowed: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  // Pendente é o único estado que aceita decisão.
  pendente: ["aprovada", "rejeitada", "cancelada"],
  // Uma solicitação já aprovada ainda pode ser cancelada (a compra não saiu).
  aprovada: ["cancelada"],
  rejeitada: [],
  cancelada: [],
};

export function canTransitionPurchaseRequest(from: PurchaseRequestStatus, to: PurchaseRequestStatus) {
  return (allowed[from] ?? []).includes(to);
}

export function purchaseRequestActions(status: PurchaseRequestStatus) {
  return allowed[status] ?? [];
}

/** O PDF oficial só existe para a solicitação aprovada. */
export function canPrintPurchaseRequest(status: PurchaseRequestStatus) {
  return status === "aprovada";
}
