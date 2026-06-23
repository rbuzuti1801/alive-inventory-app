import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { loadAuditProgress } from "@/lib/audit-server";
import { supabaseAdmin } from "@/lib/supabase";

// Finaliza a auditoria e devolve o relatório de auditoria patrimonial.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    const progress = await loadAuditProgress(id);
    if (!progress) return errorResponse(new Error("Auditoria não encontrada."), 404);

    const { error } = await supabaseAdmin
      .from("inventory_audits")
      .update({
        status: "finalizado",
        finished_at: new Date().toISOString(),
        total_found: progress.foundCount,
        total_expected: progress.totalExpected,
      })
      .eq("id", id);
    if (error) return errorResponse(error);

    const report = await loadAuditProgress(id);
    return Response.json(report);
  } catch (error) {
    return errorResponse(error);
  }
}
