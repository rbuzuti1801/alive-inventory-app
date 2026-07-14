// Resolução da localização de ORIGEM de uma Retirada Rápida (saída pública).
// Regras (espelham a validação final feita pela RPC apply_stock_movement):
//  - Nunca retira de uma localização aleatória.
//  - 1 localização com saldo  -> usa automaticamente.
//  - >1 localização com saldo -> exige que o usuário escolha a origem
//    (needs_selection); a página mostra a quantidade disponível por localização.
//  - Origem escolhida precisa existir, ter saldo e cobrir a quantidade pedida.
//  - Nunca permite saldo negativo (quantidade > saldo é bloqueada).

export type StockLevelInput = {
  location_id: string;
  quantity: number;
  location_name?: string;
};

export type WithdrawOrigin = {
  location_id: string;
  quantity: number;
  location_name?: string;
};

export type ResolveOriginResult =
  | { ok: true; origin: WithdrawOrigin }
  | { ok: false; code: "invalid_quantity" | "no_balance" | "needs_selection" | "insufficient"; message: string; available: number };

const fmt = (n: number) => n.toLocaleString("pt-BR");

/**
 * Decide de qual localização o saldo será debitado numa retirada pública.
 *
 * @param levels     saldos por localização do produto (qualquer sinal).
 * @param quantity   quantidade solicitada.
 * @param requestedFromLocationId origem escolhida pelo usuário (opcional).
 */
export function resolveWithdrawOrigin(
  levels: StockLevelInput[],
  quantity: number,
  requestedFromLocationId?: string | null,
): ResolveOriginResult {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, code: "invalid_quantity", message: "Quantidade deve ser maior que zero.", available: 0 };
  }

  const withBalance = levels
    .map((l) => ({ location_id: l.location_id, quantity: Number(l.quantity), location_name: l.location_name }))
    .filter((l) => l.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);

  const total = withBalance.reduce((sum, l) => sum + l.quantity, 0);

  if (withBalance.length === 0) {
    return { ok: false, code: "no_balance", message: "Produto sem saldo disponível para retirada.", available: 0 };
  }

  // Origem explicitamente escolhida pelo usuário.
  if (requestedFromLocationId) {
    const chosen = withBalance.find((l) => l.location_id === requestedFromLocationId);
    if (!chosen) {
      return {
        ok: false,
        code: "no_balance",
        message: "A localização de origem selecionada não possui saldo.",
        available: 0,
      };
    }
    if (chosen.quantity < quantity) {
      return {
        ok: false,
        code: "insufficient",
        message: `Saldo insuficiente nesta localização: disponível ${fmt(chosen.quantity)}.`,
        available: chosen.quantity,
      };
    }
    return { ok: true, origin: chosen };
  }

  // Uma única localização com saldo: usa automaticamente.
  if (withBalance.length === 1) {
    const only = withBalance[0];
    if (only.quantity < quantity) {
      return {
        ok: false,
        code: "insufficient",
        message: `Saldo insuficiente para retirada: disponível ${fmt(only.quantity)}.`,
        available: only.quantity,
      };
    }
    return { ok: true, origin: only };
  }

  // Mais de uma localização com saldo e o usuário não escolheu: pedir escolha.
  return {
    ok: false,
    code: "needs_selection",
    message: "Este produto existe em mais de uma localização. Escolha de onde retirar.",
    available: total,
  };
}
