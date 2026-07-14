import assert from "node:assert/strict";
import { test } from "node:test";

import { isPublicPath } from "./access";

// Garante que a retirada rápida pública NÃO é bloqueada pelo middleware de auth
// (a causa raiz do bug: o POST era redirecionado 307 -> /login).

test("rota de retirada rápida é pública", () => {
  assert.equal(isPublicPath("/api/stock/quick-withdraw"), true);
});

test("página pública de QR e login são públicas", () => {
  assert.equal(isPublicPath("/p"), true);
  assert.equal(isPublicPath("/p/E-2ad1b11b63"), true);
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/api/auth/login"), true);
});

test("demais rotas de escrita de estoque continuam protegidas", () => {
  assert.equal(isPublicPath("/api/stock/movements"), false);
  assert.equal(isPublicPath("/api/stock/products"), false);
  assert.equal(isPublicPath("/api/stock/quick-withdraw-x"), false); // não casa por prefixo indevido
  assert.equal(isPublicPath("/dashboard"), false);
});
