import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { resolveScannedItem } from "@/lib/scan-server";
import { supabaseAdmin } from "@/lib/supabase";
import { scanSchema } from "@/lib/validators";

// Registra a leitura de um QR Code: localiza o item, grava a última leitura
// (data, hora, usuário) e devolve os dados completos para consulta rápida.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    const payload = scanSchema.parse(await request.json());
    const item = await resolveScannedItem(payload);

    if (!item) {
      return Response.json({ error: "Item não encontrado para este QR Code." }, { status: 404 });
    }

    const now = new Date().toISOString();

    await Promise.all([
      supabaseAdmin
        .from("inventory_items")
        .update({ last_scan_at: now, last_scan_by: user!.id })
        .eq("id", item.id),
      supabaseAdmin.from("inventory_scans").insert({
        item_id: item.id,
        scanned_by: user!.id,
        context: payload.context,
        audit_id: payload.audit_id ?? null,
        scanned_at: now,
      }),
    ]);

    return Response.json({ item, scanned_at: now });
  } catch (error) {
    return errorResponse(error);
  }
}
