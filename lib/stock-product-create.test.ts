import assert from "node:assert/strict";
import test from "node:test";
import { stockProductCreateSchema } from "./validators";

// Contrato do cadastro de produto com estoque inicial. A regra central é:
// localização só é obrigatória quando há quantidade inicial a alocar.

const base = { name: "Água mineral 500ml", category: "alimentos_bebidas", unit: "un", min_quantity: 0 };
const LOC = "b372cbf4-e1ec-4c4d-bfd7-f211b78ce549";

test("quantidade inicial ausente assume 0 e dispensa localização", () => {
  const parsed = stockProductCreateSchema.parse({ ...base });
  assert.equal(parsed.initial_quantity, 0);
  // Omitido vira undefined (campo optional); a rota normaliza com `?? null`.
  assert.equal(parsed.initial_location_id ?? null, null);
});

test("localização como string vazia é normalizada para null", () => {
  const parsed = stockProductCreateSchema.parse({ ...base, initial_location_id: "" });
  assert.equal(parsed.initial_location_id, null);
});

test("quantidade inicial 0 não exige localização", () => {
  const parsed = stockProductCreateSchema.parse({ ...base, initial_quantity: 0 });
  assert.equal(parsed.initial_quantity, 0);
});

test("quantidade inicial > 0 exige localização", () => {
  const result = stockProductCreateSchema.safeParse({ ...base, initial_quantity: 5 });
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error?.issues), /localização inicial/i);
});

test("quantidade inicial > 0 com localização é aceita", () => {
  const parsed = stockProductCreateSchema.parse({ ...base, initial_quantity: 5, initial_location_id: LOC });
  assert.equal(parsed.initial_quantity, 5);
  assert.equal(parsed.initial_location_id, LOC);
});

test("quantidade inicial negativa é rejeitada", () => {
  const result = stockProductCreateSchema.safeParse({ ...base, initial_quantity: -1, initial_location_id: LOC });
  assert.equal(result.success, false);
});

test("estoque mínimo negativo é rejeitado", () => {
  const result = stockProductCreateSchema.safeParse({ ...base, min_quantity: -1 });
  assert.equal(result.success, false);
});

test("nome vazio é rejeitado", () => {
  const result = stockProductCreateSchema.safeParse({ ...base, name: "   " });
  assert.equal(result.success, false);
});

test("categoria e unidade inválidas são rejeitadas", () => {
  assert.equal(stockProductCreateSchema.safeParse({ ...base, category: "nao_existe" }).success, false);
  assert.equal(stockProductCreateSchema.safeParse({ ...base, unit: "nao_existe" }).success, false);
});

// O formulário envia strings; z.coerce precisa convertê-las.
test("quantidades chegam como string do formulário e são convertidas", () => {
  const parsed = stockProductCreateSchema.parse({
    ...base, min_quantity: "3", initial_quantity: "12", initial_location_id: LOC,
  });
  assert.equal(parsed.min_quantity, 3);
  assert.equal(parsed.initial_quantity, 12);
});
