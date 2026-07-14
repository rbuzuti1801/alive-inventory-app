import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveWithdrawOrigin } from "./stock";

// Fluxo público de Retirada Rápida: resolução da localização de origem.

test("saldo em uma única localização é usado automaticamente", () => {
  const r = resolveWithdrawOrigin([{ location_id: "estoque", quantity: 70 }], 3);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.origin.location_id, "estoque");
});

test("quantidade acima do saldo é bloqueada (nunca fica negativo)", () => {
  const r = resolveWithdrawOrigin([{ location_id: "estoque", quantity: 2 }], 5);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.code, "insufficient");
    assert.equal(r.available, 2);
  }
});

test("quantidade inválida (zero/negativa) é rejeitada", () => {
  assert.equal(resolveWithdrawOrigin([{ location_id: "a", quantity: 10 }], 0).ok, false);
  assert.equal(resolveWithdrawOrigin([{ location_id: "a", quantity: 10 }], -1).ok, false);
});

test("produto sem saldo em nenhuma localização", () => {
  const r = resolveWithdrawOrigin([{ location_id: "a", quantity: 0 }], 1);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "no_balance");
});

test("múltiplas localizações com saldo exigem escolha da origem", () => {
  const r = resolveWithdrawOrigin(
    [
      { location_id: "estoque", quantity: 10 },
      { location_id: "cozinha", quantity: 5 },
    ],
    3,
  );
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.code, "needs_selection");
    assert.equal(r.available, 15);
  }
});

test("origem escolhida válida é aceita", () => {
  const r = resolveWithdrawOrigin(
    [
      { location_id: "estoque", quantity: 10 },
      { location_id: "cozinha", quantity: 5 },
    ],
    4,
    "cozinha",
  );
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.origin.location_id, "cozinha");
});

test("origem escolhida sem saldo suficiente é bloqueada pelo saldo dela", () => {
  const r = resolveWithdrawOrigin(
    [
      { location_id: "estoque", quantity: 10 },
      { location_id: "cozinha", quantity: 5 },
    ],
    8,
    "cozinha",
  );
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.code, "insufficient");
    assert.equal(r.available, 5);
  }
});

test("origem escolhida inexistente/sem saldo é rejeitada", () => {
  const r = resolveWithdrawOrigin([{ location_id: "estoque", quantity: 10 }], 1, "inexistente");
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "no_balance");
});
