import type { ServiceOrderStatus } from "@/lib/constants";

// Ciclo de vida da Ordem de Serviço. A verdade é a RPC
// `set_service_order_status` (0013), que valida a transição dentro da
// transação; estas funções puras espelham a mesma tabela para a interface só
// oferecer o que o servidor aceitaria.

const allowed: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  rascunho: ["emitida", "cancelada"],
  emitida: ["em_execucao", "concluida", "cancelada"],
  em_execucao: ["concluida", "cancelada"],
  concluida: [],
  cancelada: [],
};

export function canTransitionServiceOrder(from: ServiceOrderStatus, to: ServiceOrderStatus) {
  return (allowed[from] ?? []).includes(to);
}

export function serviceOrderActions(status: ServiceOrderStatus) {
  return allowed[status] ?? [];
}

/** Conteúdo da ordem só muda enquanto é rascunho — depois da emissão o
 *  documento assinado precisa continuar valendo o que foi impresso. */
export function canEditServiceOrder(status: ServiceOrderStatus) {
  return status === "rascunho";
}

/** O PDF é o documento de assinatura: só faz sentido depois de emitido. */
export function canPrintServiceOrder(status: ServiceOrderStatus) {
  return status !== "rascunho";
}
