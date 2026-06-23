import { z } from "zod";
import { conservationStatuses, itemStatuses, labelTypes, roles, scanContexts } from "@/lib/constants";

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
  responsible_name: nullableText,
  observations: nullableText,
  status: z.enum(itemStatuses),
});

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
