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

// ── Etiquetas patrimoniais ───────────────────────────────────────────────
// Modelos oficiais Brother QL-810W. Nas fitas contínuas a altura é o corte
// recomendado pelo sistema; a largura (62 mm) é a largura física da bobina.
export const labelTypes = ["dk22205", "dk2205", "dk11209", "dk11221"] as const;
export type LabelType = (typeof labelTypes)[number];

export const labelLabels: Record<LabelType, string> = {
  dk22205: "Brother DK-22205 · 62 mm contínua",
  dk2205: "Brother DK-2205 · 62 mm contínua grande",
  dk11209: "Brother DK-11209 · 29 × 62 mm",
  dk11221: "Brother DK-11221 · 23 × 23 mm",
};

// Dimensões físicas de cada modelo (mm) usadas na impressão.
export const labelDimensions: Record<LabelType, { width: number; height: number }> = {
  dk22205: { width: 62, height: 40 },
  dk2205: { width: 62, height: 60 },
  dk11209: { width: 29, height: 62 },
  dk11221: { width: 23, height: 23 },
};

export const labelDescriptions: Record<LabelType, string> = {
  dk22205: "62 × 40 mm (corte recomendado) — patrimônio.",
  dk2205: "62 × 60 mm (corte recomendado) — patrimônio e itens maiores.",
  dk11209: "29 × 62 mm — etiquetas pequenas.",
  dk11221: "23 × 23 mm — QR Code e nome abreviado.",
};

export const scanContexts = ["consulta", "inventario", "auditoria"] as const;
export type ScanContext = (typeof scanContexts)[number];

// ── Estoque de consumíveis ───────────────────────────────────────────────
export const stockMovementTypes = ["entrada", "saida", "ajuste", "transferencia"] as const;
export type StockMovementType = (typeof stockMovementTypes)[number];

export const stockMovementLabels: Record<StockMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  transferencia: "Transferência",
};

export const stockUnits = ["un", "cx", "pct", "fardo", "rolo", "lt", "kg", "gl", "par"] as const;
export type StockUnit = (typeof stockUnits)[number];

export const stockUnitLabels: Record<StockUnit, string> = {
  un: "Unidade",
  cx: "Caixa",
  pct: "Pacote",
  fardo: "Fardo",
  rolo: "Rolo",
  lt: "Litro",
  kg: "Quilo",
  gl: "Galão",
  par: "Par",
};

export const stockCategories = [
  "alimentos_bebidas",
  "descartaveis",
  "limpeza",
  "higiene",
  "escritorio",
  "kids",
  "manutencao",
  "outros",
] as const;
export type StockCategory = (typeof stockCategories)[number];

export const stockCategoryLabels: Record<StockCategory, string> = {
  alimentos_bebidas: "Alimentos e bebidas",
  descartaveis: "Descartáveis",
  limpeza: "Limpeza",
  higiene: "Higiene",
  escritorio: "Escritório",
  kids: "Kids",
  manutencao: "Manutenção",
  outros: "Outros",
};

// Status visual do saldo total vs. estoque mínimo.
export type StockStatus = "normal" | "atencao" | "baixo";

export function stockStatus(total: number, min: number): StockStatus {
  if (min <= 0) return "normal";
  if (total <= min) return "baixo";
  if (total <= min * 1.5) return "atencao";
  return "normal";
}

export const stockStatusLabels: Record<StockStatus, string> = {
  normal: "Normal",
  atencao: "Atenção",
  baixo: "Baixo",
};

// ── Lista de Compras (reposição) ─────────────────────────────────────────
export const shoppingListSources = ["sistema", "manual"] as const;
export type ShoppingListSource = (typeof shoppingListSources)[number];

export const shoppingListStatuses = ["pendente", "comprado"] as const;
export type ShoppingListStatus = (typeof shoppingListStatuses)[number];
