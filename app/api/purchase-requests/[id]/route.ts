import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import type { PurchaseRequestStatus } from "@/lib/constants";
import { canManagePurchaseRequests } from "@/lib/permissions";
import { canTransitionPurchaseRequest } from "@/lib/purchase-requests";
import { supabaseAdmin } from "@/lib/supabase";
import { purchaseRequestDecisionSchema } from "@/lib/validators";

// Triagem da solicitação: aprovar, rejeitar ou cancelar. Responsável e
// data/hora da decisão vêm SEMPRE da sessão — nunca do corpo da requisição.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManagePurchaseRequests(user!)) {
      return errorResponse(new Error("Sem permissão para decidir solicitações de compra."), 403);
    }

    const { id } = await params;
    const payload = purchaseRequestDecisionSchema.parse(await request.json());

    const { data: current, error: readError } = await supabaseAdmin
      .from("purchase_requests")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();

    if (readError) return errorResponse(readError);
    if (!current) return errorResponse(new Error("Solicitação não encontrada."), 404);

    if (!canTransitionPurchaseRequest(current.status as PurchaseRequestStatus, payload.status)) {
      return errorResponse(new Error("Esta solicitação não aceita mais essa decisão."), 409);
    }

    const isApproval = payload.status === "aprovada";
    const { data, error } = await supabaseAdmin
      .from("purchase_requests")
      .update({
        status: payload.status,
        // Quantidade/valor/marca aprovados só existem na aprovação.
        approved_quantity: isApproval ? payload.approved_quantity ?? null : null,
        approved_value: isApproval ? payload.approved_value ?? null : null,
        approved_brand: isApproval ? payload.approved_brand ?? null : null,
        decision_notes: payload.decision_notes ?? null,
        decided_by: user!.id,
        decided_by_name: user!.name,
        decided_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ request: data });
  } catch (error) {
    return errorResponse(error);
  }
}
