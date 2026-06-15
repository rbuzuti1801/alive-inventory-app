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
