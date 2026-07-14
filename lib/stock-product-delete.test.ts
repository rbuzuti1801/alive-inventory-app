import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteStockProduct } from "./permissions";

// Regra: produto ativo precisa ser desativado antes; desativado pode ser
// excluído, e só por quem gerencia o estoque (admin). A imposição real está na
// RPC delete_stock_product; aqui garantimos que a interface não ofereça a ação
// em casos que o servidor recusaria.

test("produto desativado pode ser excluído pelo admin", () => {
  assert.equal(canDeleteStockProduct(true, { active: false }), true);
});

test("produto ativo não pode ser excluído nem pelo admin", () => {
  assert.equal(canDeleteStockProduct(true, { active: true }), false);
});

test("quem não gerencia estoque não exclui, mesmo produto desativado", () => {
  assert.equal(canDeleteStockProduct(false, { active: false }), false);
});

test("quem não gerencia estoque não exclui produto ativo", () => {
  assert.equal(canDeleteStockProduct(false, { active: true }), false);
});
