import { supabaseAdmin } from "@/lib/supabase";
import { parseScan, parseScanTarget, type ScanTarget } from "@/lib/qr";

const ITEM_SELECT =
  "*,sectors(name),subcategories(name)";

/**
 * Resolve um item do inventário a partir de uma leitura de QR Code.
 * Aceita o JSON oficial { id, sku, name }, um UUID cru ou um SKU/item_code.
 * Retorna o item (com setor/subcategoria) ou null se não encontrado.
 */
export async function resolveScannedItem(input: { raw?: string; id?: string; sku?: string; code?: string }) {
  let id = input.id;
  let sku = input.sku;
  let code = input.code;

  if (!id && !sku && !code && input.raw) {
    // Reconhece a URL pública patrimonial (/p/B-…) antes do JSON legado.
    const target = parseScanTarget(input.raw);
    if (target?.kind === "inventory_item") {
      id = target.id;
      sku = target.sku;
      code = target.code;
    } else {
      const parsed = parseScan(input.raw);
      id = parsed?.id;
      sku = parsed?.sku;
    }
  }

  if (code) {
    const { data } = await supabaseAdmin
      .from("inventory_items")
      .select(ITEM_SELECT)
      .eq("public_code", code)
      .maybeSingle();
    if (data) return data;
  }

  if (id) {
    const { data } = await supabaseAdmin.from("inventory_items").select(ITEM_SELECT).eq("id", id).maybeSingle();
    if (data) return data;
  }

  if (sku) {
    // Sanitiza para evitar injeção na sintaxe de filtro do PostgREST.
    const safe = sku.replace(/[^A-Za-z0-9-]/g, "");
    if (safe) {
      const { data } = await supabaseAdmin
        .from("inventory_items")
        .select(ITEM_SELECT)
        .or(`sku.eq.${safe},item_code.eq.${safe}`)
        .limit(1)
        .maybeSingle();
      if (data) return data;
    }
  }

  return null;
}

/** Resolve um produto de estoque a partir do public_code (prefixo E-). */
export async function resolveStockProductByCode(code: string) {
  const { data } = await supabaseAdmin
    .from("stock_products")
    .select("id,public_code,name,unit,active")
    .eq("public_code", code)
    .maybeSingle();
  return data;
}

/**
 * Resolução genérica de leitura: identifica o módulo pelo conteúdo lido e
 * devolve o alvo tipado. Extensível a novos módulos sem tocar nos existentes.
 */
export async function resolveScanTarget(raw: string): Promise<
  | { kind: "stock_product"; product: NonNullable<Awaited<ReturnType<typeof resolveStockProductByCode>>> }
  | { kind: "inventory_item"; item: NonNullable<Awaited<ReturnType<typeof resolveScannedItem>>> }
  | null
> {
  const target: ScanTarget | null = parseScanTarget(raw);
  if (!target) return null;

  if (target.kind === "stock_product") {
    const product = await resolveStockProductByCode(target.code);
    return product ? { kind: "stock_product", product } : null;
  }

  const item = await resolveScannedItem({ id: target.id, sku: target.sku, code: target.code });
  return item ? { kind: "inventory_item", item } : null;
}
