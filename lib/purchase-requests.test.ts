import assert from "node:assert/strict";
import { test } from "node:test";

import { canPrintPurchaseRequest, canTransitionPurchaseRequest, purchaseRequestActions } from "./purchase-requests";
import { isPublicPath } from "./access";

test("solicitação pendente aceita as três decisões", () => {
  assert.deepEqual(purchaseRequestActions("pendente"), ["aprovada", "rejeitada", "cancelada"]);
});

test("estados finais não aceitam nova decisão", () => {
  assert.equal(canTransitionPurchaseRequest("rejeitada", "aprovada"), false);
  assert.equal(canTransitionPurchaseRequest("cancelada", "aprovada"), false);
  assert.equal(canTransitionPurchaseRequest("aprovada", "rejeitada"), false);
});

test("solicitação aprovada ainda pode ser cancelada", () => {
  assert.equal(canTransitionPurchaseRequest("aprovada", "cancelada"), true);
});

test("PDF só existe para a solicitação aprovada", () => {
  assert.equal(canPrintPurchaseRequest("aprovada"), true);
  assert.equal(canPrintPurchaseRequest("pendente"), false);
});

// O formulário é público, mas a triagem NÃO: só o caminho-folha de envio é
// liberado no middleware.
test("envio público é liberado e a triagem continua protegida", () => {
  assert.equal(isPublicPath("/solicitacao-compra"), true);
  assert.equal(isPublicPath("/api/purchase-requests/public"), true);
  assert.equal(isPublicPath("/api/purchase-requests"), false);
  assert.equal(isPublicPath("/api/purchase-requests/8f0d2d4e-1f4a-4c9e-9d3a-2f7c1b6e5a11"), false);
  assert.equal(isPublicPath("/purchase-requests"), false);
});
