import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { stockProductCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar o catálogo de estoque."), 403);
    }

    const payload = stockProductCreateSchema.parse(await request.json());

    // RPC atômica: cria o produto e, havendo quantidade inicial, registra a
    // entrada "Estoque inicial" via apply_stock_movement na MESMA transação.
    // Se a movimentação falhar, o produto não é criado.
    const { data, error } = await supabaseAdmin.rpc("create_stock_product_with_initial_stock", {
      p_name: payload.name,
      p_category: payload.category,
      p_unit: payload.unit,
      p_min_quantity: payload.min_quantity,
      p_barcode: payload.barcode ?? null,
      p_notes: payload.notes ?? null,
      p_active: payload.active ?? true,
      p_initial_quantity: payload.initial_quantity,
      p_initial_location_id: payload.initial_location_id ?? null,
      p_user_id: user!.id,
    });

    if (error) return errorResponse(error);
    return Response.json({ product: (data as { product: unknown })?.product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
