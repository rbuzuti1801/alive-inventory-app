import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { loadAuditProgress } from "@/lib/audit-server";

// Detalhe + progresso de uma auditoria (encontrados x pendentes).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  const progress = await loadAuditProgress(id);
  if (!progress) return errorResponse(new Error("Auditoria não encontrada."), 404);
  return Response.json(progress);
}
