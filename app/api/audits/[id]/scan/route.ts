import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { resolveScannedItem } from "@/lib/scan-server";
import { supabaseAdmin } from "@/lib/supabase";
import { auditScanSchema } from "@/lib/validators";

// Marca um item como encontrado dentro de uma auditoria.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id: auditId } = await params;

  try {
    const { data: audit } = await supabaseAdmin
      .from("inventory_audits")
      .select("id,status,sector_id")
      .eq("id", auditId)
      .maybeSingle();
    if (!audit) return errorResponse(new Error("Auditoria não encontrada."), 404);
    if (audit.status === "finalizado") return errorResponse(new Error("Auditoria já finalizada."), 409);

    const payload = auditScanSchema.parse(await request.json());
    const item = await resolveScannedItem(payload);
    if (!item) return Response.json({ error: "Item não encontrado para este QR Code." }, { status: 404 });

    const outOfScope = Boolean(audit.sector_id && item.sector_id !== audit.sector_id);
    const now = new Date().toISOString();

    // Já estava registrado nesta auditoria?
    const { data: existing } = await supabaseAdmin
      .from("audit_items")
      .select("id")
      .eq("audit_id", auditId)
      .eq("item_id", item.id)
      .maybeSingle();

    const alreadyCounted = Boolean(existing);

    await Promise.all([
      supabaseAdmin
        .from("audit_items")
        .upsert(
          { audit_id: auditId, item_id: item.id, found: true, scanned_by: user!.id, scanned_at: now },
          { onConflict: "audit_id,item_id" },
        ),
      supabaseAdmin.from("inventory_items").update({ last_scan_at: now, last_scan_by: user!.id }).eq("id", item.id),
      supabaseAdmin
        .from("inventory_scans")
        .insert({ item_id: item.id, scanned_by: user!.id, context: "auditoria", audit_id: auditId, scanned_at: now }),
    ]);

    // Atualiza o contador de encontrados.
    const { count } = await supabaseAdmin
      .from("audit_items")
      .select("id", { count: "exact", head: true })
      .eq("audit_id", auditId);
    await supabaseAdmin.from("inventory_audits").update({ total_found: count ?? 0 }).eq("id", auditId);

    return Response.json({ item, alreadyCounted, outOfScope, totalFound: count ?? 0 });
  } catch (error) {
    return errorResponse(error);
  }
}
