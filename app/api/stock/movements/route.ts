import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canAdjustStock, canMoveStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { stockMovementSchema } from "@/lib/validators";

// Registra uma movimentação de estoque via RPC atômica apply_stock_movement
// (única porta de escrita em stock_levels/stock_movements).
export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    const payload = stockMovementSchema.parse(await request.json());

    const allowed =
      payload.movement_type === "ajuste" ? canAdjustStock(user!) : canMoveStock(user!);
    if (!allowed) {
      return errorResponse(new Error("Sem permissão para esta movimentação."), 403);
    }

    const { data, error } = await supabaseAdmin.rpc("apply_stock_movement", {
      p_product_id: payload.product_id,
      p_movement_type: payload.movement_type,
      p_quantity: payload.quantity,
      p_from_location_id: payload.from_location_id ?? null,
      p_to_location_id: payload.to_location_id ?? null,
      p_reason: payload.reason ?? null,
      p_user_id: user!.id,
    });

    if (error) return errorResponse(error);
    return Response.json({ result: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
