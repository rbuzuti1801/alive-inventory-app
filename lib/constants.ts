export const conservationStatuses = ["novo", "bom", "regular", "danificado", "em_manutencao"] as const;
export const itemStatuses = ["ativo", "inativo", "descartado"] as const;
export const roles = ["admin", "responsavel", "visualizador"] as const;

export type ConservationStatus = (typeof conservationStatuses)[number];
export type ItemStatus = (typeof itemStatuses)[number];
export type Role = (typeof roles)[number];

export const conservationLabels: Record<ConservationStatus, string> = {
  novo: "Novo",
  bom: "Bom",
  regular: "Regular",
  danificado: "Danificado",
  em_manutencao: "Em manutenção",
};

export const statusLabels: Record<ItemStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  descartado: "Descartado",
};

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  responsavel: "Responsável",
  visualizador: "Visualizador",
};
