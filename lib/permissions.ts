import type { SessionUser } from "@/lib/auth";

export function canManageUsers(user: SessionUser) {
  return user.role === "admin";
}

export function canManageTaxonomy(user: SessionUser) {
  return user.role === "admin";
}

export function canCreateInventory(user: SessionUser, sectorId: string) {
  return user.role === "admin" || (user.role === "responsavel" && user.sector_id === sectorId);
}

export function canEditInventory(user: SessionUser, sectorId: string | null) {
  return user.role === "admin" || (user.role === "responsavel" && user.sector_id === sectorId);
}

export function canDeleteInventory(user: SessionUser) {
  return user.role === "admin";
}

// ── Estoque de consumíveis ────────────────────────────────────────────────
// Entrada/saída/transferência: qualquer usuário ativo (voluntários incluídos).
export function canMoveStock(user: SessionUser) {
  return Boolean(user);
}

// Ajuste de contagem corrige o saldo — restrito a quem gerencia.
export function canAdjustStock(user: SessionUser) {
  return user.role === "admin" || user.role === "responsavel";
}

// Catálogo de produtos e localizações físicas.
export function canManageStock(user: SessionUser) {
  return user.role === "admin";
}
