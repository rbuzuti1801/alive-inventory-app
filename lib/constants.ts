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
export const labelTypes = ["compacta", "media", "completa"] as const;
export type LabelType = (typeof labelTypes)[number];

export const labelLabels: Record<LabelType, string> = {
  compacta: "Compacta",
  media: "Média",
  completa: "Completa",
};

// Dimensões físicas de cada modelo (mm) usadas na impressão.
export const labelDimensions: Record<LabelType, { width: number; height: number }> = {
  compacta: { width: 20, height: 20 },
  media: { width: 30, height: 30 },
  completa: { width: 50, height: 30 },
};

export const labelDescriptions: Record<LabelType, string> = {
  compacta: "20×20mm — microfones, fontes, adaptadores, ferramentas, controles.",
  media: "30×30mm — mesas, cadeiras, monitores, áudio, instrumentos.",
  completa: "50×30mm — computadores, TVs, câmeras, ativos de alto valor.",
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
