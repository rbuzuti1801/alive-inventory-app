import { z } from "zod";
import {
  acquisitionOrigins,
  conservationStatuses,
  itemStatuses,
  labelTypes,
  roles,
  scanContexts,
  serviceOrderStatuses,
  stockCategories,
  stockMovementTypes,
  stockUnits,
} from "@/lib/constants";

const nullableText = z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional());
const nullableUuid = z.preprocess((value) => (value === "" ? null : value), z.string().uuid().nullable().optional());

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuário.").max(64),
  password: z.string().min(1, "Informe a senha.").max(128),
});

export const inventorySchema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória.").max(500),
  sector_id: z.string().uuid("Setor obrigatório."),
  subcategory_id: nullableUuid,
  brand: nullableText,
  model: nullableText,
  quantity: z.coerce.number().int().min(0, "Quantidade deve ser maior ou igual a zero.").max(999999),
  conservation_status: z.enum(conservationStatuses, { required_error: "Estado obrigatório." }),
  location: z.string().trim().min(1, "Localização obrigatória.").max(200),
  acquisition_date: z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional()),
  acquisition_value: z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().min(0).max(99999999).nullable().optional(),
  ),
  acquisition_origin: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.enum(acquisitionOrigins).nullable().optional(),
  ),
  acquisition_origin_detail: nullableText,
  responsible_name: nullableText,
  observations: nullableText,
  status: z.enum(itemStatuses),
})
  // O detalhe só faz sentido em "outros": em compra/doação ele é descartado
  // para não deixar texto órfão de uma escolha anterior.
  .transform((v) => ({
    ...v,
    acquisition_origin_detail: v.acquisition_origin === "outros" ? v.acquisition_origin_detail ?? null : null,
  }));

export const sectorSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório.").max(100),
  description: nullableText,
  active: z.boolean().optional(),
});

export const subcategorySchema = z.object({
  sector_id: z.string().uuid(),
  name: z.string().trim().min(1, "Nome obrigatório.").max(100),
  description: nullableText,
  active: z.boolean().optional(),
});

export const userSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório.").max(100),
  username: z.string().trim().min(3, "Usuário deve ter ao menos 3 caracteres.").max(64),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres.").max(128).optional().or(z.literal("")),
  role: z.enum(roles),
  sector_id: nullableUuid,
  active: z.boolean().optional(),
});

// ── QR Code / etiquetas / auditoria ──────────────────────────────────────
export const scanSchema = z
  .object({
    raw: z.string().trim().max(2000).optional(),
    id: z.string().uuid().optional(),
    sku: z.string().trim().max(64).optional(),
    context: z.enum(scanContexts).optional().default("consulta"),
    audit_id: nullableUuid,
  })
  .refine((v) => v.raw || v.id || v.sku, { message: "Informe o conteúdo lido (raw, id ou sku)." });

export const printLabelSchema = z.object({
  label_type: z.enum(labelTypes),
  item_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um item.").max(500),
});

export const auditSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório.").max(120),
  sector_id: nullableUuid,
});

export const auditScanSchema = z
  .object({
    raw: z.string().trim().max(2000).optional(),
    id: z.string().uuid().optional(),
    sku: z.string().trim().max(64).optional(),
  })
  .refine((v) => v.raw || v.id || v.sku, { message: "Informe o conteúdo lido." });

// ── Estoque de consumíveis ────────────────────────────────────────────────
export const stockProductSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório.").max(150),
  category: z.enum(stockCategories),
  unit: z.enum(stockUnits),
  min_quantity: z.coerce.number().min(0, "Mínimo não pode ser negativo.").max(999999),
  barcode: nullableText,
  notes: nullableText,
  active: z.boolean().optional(),
});

// Criação de produto: além do cadastro, aceita um saldo inicial opcional que o
// back-end converte em movimentação de entrada ("Estoque inicial").
export const stockProductCreateSchema = stockProductSchema
  .extend({
    initial_quantity: z.coerce.number().min(0, "Quantidade inicial não pode ser negativa.").max(99999999).default(0),
    initial_location_id: nullableUuid,
  })
  .superRefine((v, ctx) => {
    if (v.initial_quantity > 0 && !v.initial_location_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["initial_location_id"],
        message: "Informe a localização inicial quando houver quantidade inicial.",
      });
    }
  });

export const stockLocationSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório.").max(120),
  description: nullableText,
  sector_id: nullableUuid,
  active: z.boolean().optional(),
});

export const stockMovementSchema = z
  .object({
    product_id: z.string().uuid("Produto obrigatório."),
    movement_type: z.enum(stockMovementTypes),
    quantity: z.coerce.number().min(0).max(99999999),
    from_location_id: nullableUuid,
    to_location_id: nullableUuid,
    reason: nullableText,
  })
  .superRefine((v, ctx) => {
    if (v.movement_type !== "ajuste" && v.quantity <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantidade deve ser maior que zero." });
    }
    if ((v.movement_type === "entrada" || v.movement_type === "ajuste") && !v.to_location_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a localização." });
    }
    if (v.movement_type === "saida") {
      if (!v.from_location_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a localização de origem." });
      }
      if (!v.to_location_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o destino do material." });
      }
    }
    if (v.movement_type === "transferencia") {
      if (!v.from_location_id || !v.to_location_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe origem e destino." });
      } else if (v.from_location_id === v.to_location_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Origem e destino devem ser diferentes." });
      }
    }
  });

// Retirada rápida pública (voluntário sem login): apenas saída. Origem é
// resolvida no servidor a partir do saldo; o destino é um setor real.
export const quickWithdrawSchema = z.object({
  product_id: z.string().uuid("Produto obrigatório."),
  performed_by_name: z.string().trim().min(1, "Informe o responsável pela retirada.").max(120),
  to_location_id: z.string().uuid("Informe o destino do material."),
  // Origem escolhida pelo usuário quando o produto está em mais de uma
  // localização. Opcional: com saldo em uma única localização, o servidor a
  // resolve automaticamente.
  from_location_id: nullableUuid,
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero.").max(99999999),
  reason: nullableText,
});

export const printStockLabelSchema = z.object({
  product_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um produto.").max(500),
});

// ── Lista de Compras (reposição) ──────────────────────────────────────────
// Inserção manual: "Quem inseriu" NÃO vem do cliente — é sempre o nome do
// usuário logado, definido no servidor.
export const shoppingListManualSchema = z.object({
  item_name: z.string().trim().min(1, "Informe o item.").max(150),
  quantity_to_buy: z.coerce.number().min(0, "Quantidade não pode ser negativa.").max(999999),
});

export const shoppingListUpdateSchema = z
  .object({
    quantity_to_buy: z.coerce.number().min(0, "Quantidade não pode ser negativa.").max(999999).optional(),
    status: z.enum(["pendente", "comprado"]).optional(),
  })
  .refine((v) => v.quantity_to_buy !== undefined || v.status !== undefined, {
    message: "Nada para atualizar.",
  });

// ── Solicitação de Compra ─────────────────────────────────────────────────
// Enviada pelo formulário PÚBLICO: nada aqui define status, número ou dados de
// aprovação — esses vêm do banco/servidor.
const nullableNumber = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().min(0, "Valor não pode ser negativo.").max(99999999).nullable().optional(),
);

export const purchaseRequestSchema = z.object({
  requester_name: z.string().trim().min(1, "Informe seu nome.").max(120),
  requester_contact: z.string().trim().min(1, "Informe um contato (telefone ou e-mail).").max(150),
  item_name: z.string().trim().min(1, "Informe o item solicitado.").max(200),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero.").max(99999999),
  justification: z.string().trim().min(1, "Informe a justificativa.").max(2000),
  department: nullableText,
  estimated_value: nullableNumber,
  brand: nullableText,
  reference_link: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().url("Link de referência inválido.").max(500).nullable().optional(),
  ),
  desired_date: z.preprocess((value) => (value === "" || value == null ? null : value), z.string().nullable().optional()),
  observations: nullableText,
});

// Decisão da triagem interna. Os campos "aprovada*" só são aceitos na aprovação
// (o servidor descarta o resto); responsável e data/hora vêm da sessão.
export const purchaseRequestDecisionSchema = z
  .object({
    status: z.enum(["aprovada", "rejeitada", "cancelada"]),
    approved_quantity: nullableNumber,
    approved_value: nullableNumber,
    approved_brand: nullableText,
    decision_notes: nullableText,
  })
  .superRefine((v, ctx) => {
    if (v.status === "aprovada" && (v.approved_quantity == null || v.approved_quantity <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approved_quantity"],
        message: "Informe a quantidade aprovada.",
      });
    }
  });

// ── Ordem de Serviço ──────────────────────────────────────────────────────
// Documento interno. Todos os campos do prestador são opcionais: quando vazios,
// o PDF imprime o espaço em branco para preenchimento manual.
export const serviceOrderSchema = z
  .object({
    responsible_name: z.string().trim().min(1, "Informe o responsável interno.").max(120),
    department: nullableText,
    title: z.string().trim().min(1, "Informe o título do serviço.").max(200),
    description: z.string().trim().min(1, "Descreva o serviço.").max(4000),
    service_location: nullableText,
    start_date: z.preprocess((value) => (value === "" || value == null ? null : value), z.string().nullable().optional()),
    end_date: z.preprocess((value) => (value === "" || value == null ? null : value), z.string().nullable().optional()),
    service_value: nullableNumber,
    payment_method: nullableText,
    materials_included: nullableText,
    materials_excluded: nullableText,
    warranty: nullableText,
    observations: nullableText,
    provider_name: nullableText,
    provider_document: nullableText,
    provider_phone: nullableText,
    provider_email: nullableText,
    provider_address: nullableText,
    provider_contact: nullableText,
  })
  .superRefine((v, ctx) => {
    if (v.start_date && v.end_date && v.end_date < v.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "A conclusão prevista não pode ser anterior ao início.",
      });
    }
  });

export const serviceOrderStatusSchema = z.object({
  status: z.enum(serviceOrderStatuses),
  notes: nullableText,
});

// ── Perfil da Igreja (dados institucionais dos documentos) ────────────────
export const churchProfileSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da igreja.").max(150),
  legal_name: nullableText,
  document: nullableText,
  address: nullableText,
  phone: nullableText,
  email: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().email("E-mail inválido.").max(150).nullable().optional(),
  ),
  website: nullableText,
  logo_url: nullableText,
});
