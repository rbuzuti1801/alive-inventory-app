import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canEditServiceOrder,
  canPrintServiceOrder,
  canTransitionServiceOrder,
  serviceOrderActions,
} from "./service-orders";
import { isPublicPath } from "./access";

test("rascunho só emite ou cancela", () => {
  assert.deepEqual(serviceOrderActions("rascunho"), ["emitida", "cancelada"]);
});

test("ordem emitida segue para execução, conclusão ou cancelamento", () => {
  assert.equal(canTransitionServiceOrder("emitida", "em_execucao"), true);
  assert.equal(canTransitionServiceOrder("emitida", "concluida"), true);
  assert.equal(canTransitionServiceOrder("emitida", "cancelada"), true);
  // Não volta a rascunho: o número já é definitivo.
  assert.equal(canTransitionServiceOrder("emitida", "rascunho"), false);
});

test("estados finais não transicionam", () => {
  assert.deepEqual(serviceOrderActions("concluida"), []);
  assert.deepEqual(serviceOrderActions("cancelada"), []);
});

test("edição só em rascunho; PDF só depois de emitida", () => {
  assert.equal(canEditServiceOrder("rascunho"), true);
  assert.equal(canEditServiceOrder("emitida"), false);
  assert.equal(canPrintServiceOrder("rascunho"), false);
  assert.equal(canPrintServiceOrder("emitida"), true);
  assert.equal(canPrintServiceOrder("concluida"), true);
});

test("módulo é interno: nenhuma rota de ordem de serviço é pública", () => {
  assert.equal(isPublicPath("/service-orders"), false);
  assert.equal(isPublicPath("/api/service-orders"), false);
});
