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

// Exclusão de produto: admin E produto já desativado. A regra é imposta de fato
// pela RPC delete_stock_product (0008); esta função existe para a interface não
// oferecer uma ação que o servidor recusaria. Recebe o resultado de
// canManageStock para poder rodar também no cliente, que não tem o SessionUser.
export function canDeleteStockProduct(userManagesStock: boolean, product: { active: boolean }) {
  return userManagesStock && !product.active;
}

// ── Solicitação de Compra ─────────────────────────────────────────────────
// O envio é público (sem login). A triagem — aprovar, rejeitar, cancelar e ver
// a listagem — é de administradores e gestores (papel "responsavel").
export function canManagePurchaseRequests(user: SessionUser) {
  return user.role === "admin" || user.role === "responsavel";
}

// ── Ordem de Serviço ──────────────────────────────────────────────────────
// Documento interno: apenas administradores e gestores criam, emitem e
// acompanham. Voluntários (visualizador) não têm acesso ao módulo.
export function canManageServiceOrders(user: SessionUser) {
  return user.role === "admin" || user.role === "responsavel";
}

// ── Perfil da Igreja ──────────────────────────────────────────────────────
// Dados institucionais impressos nos documentos: estruturais, só admin edita.
export function canManageChurchProfile(user: SessionUser) {
  return user.role === "admin";
}
