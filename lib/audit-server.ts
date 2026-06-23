import { supabaseAdmin } from "@/lib/supabase";

export type AuditItemRef = {
  id: string;
  sku: string | null;
  item_code: string;
  description: string;
  location: string | null;
  sectors: { name?: string } | null;
};

/**
 * Carrega o progresso de uma auditoria: itens esperados (ativos no escopo),
 * encontrados (escaneados) e pendentes.
 */
export async function loadAuditProgress(auditId: string) {
  const { data: audit } = await supabaseAdmin
    .from("inventory_audits")
    .select("*,sectors(name)")
    .eq("id", auditId)
    .maybeSingle();

  if (!audit) return null;

  let expectedQuery = supabaseAdmin
    .from("inventory_items")
    .select("id,sku,item_code,description,location,sectors(name)")
    .eq("status", "ativo")
    .order("sku");
  if (audit.sector_id) expectedQuery = expectedQuery.eq("sector_id", audit.sector_id);

  const [{ data: expected }, { data: scanned }] = await Promise.all([
    expectedQuery,
    supabaseAdmin.from("audit_items").select("item_id,scanned_at").eq("audit_id", auditId),
  ]);

  const expectedItems = (expected ?? []) as unknown as AuditItemRef[];
  const foundIds = new Set((scanned ?? []).map((s) => s.item_id));

  const found = expectedItems.filter((i) => foundIds.has(i.id));
  const pending = expectedItems.filter((i) => !foundIds.has(i.id));

  // Itens escaneados que não pertencem ao escopo esperado (ex.: setor errado).
  const extra = foundIds.size - found.length;

  return {
    audit,
    totalExpected: expectedItems.length,
    found,
    pending,
    foundCount: found.length,
    pendingCount: pending.length,
    extraCount: extra > 0 ? extra : 0,
  };
}
