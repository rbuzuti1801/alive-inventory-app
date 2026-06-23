import { supabaseAdmin } from "@/lib/supabase";
import { parseScan } from "@/lib/qr";

const ITEM_SELECT =
  "*,sectors(name),subcategories(name)";

/**
 * Resolve um item do inventário a partir de uma leitura de QR Code.
 * Aceita o JSON oficial { id, sku, name }, um UUID cru ou um SKU/item_code.
 * Retorna o item (com setor/subcategoria) ou null se não encontrado.
 */
export async function resolveScannedItem(input: { raw?: string; id?: string; sku?: string }) {
  let id = input.id;
  let sku = input.sku;

  if (!id && !sku && input.raw) {
    const parsed = parseScan(input.raw);
    id = parsed?.id;
    sku = parsed?.sku;
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
