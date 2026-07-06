import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { shoppingListUpdateSchema } from "@/lib/validators";

// Editar quantidade a comprar e/ou marcar como comprado. Qualquer usuário
// autenticado pode manter a lista (é uma lista prática de reposição da equipe).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    const payload = shoppingListUpdateSchema.parse(await request.json());

    const update: Record<string, unknown> = {};
    if (payload.quantity_to_buy !== undefined) update.quantity_to_buy = payload.quantity_to_buy;
    if (payload.status !== undefined) {
      update.status = payload.status;
      update.resolved_at = payload.status === "comprado" ? new Date().toISOString() : null;
    }

    const { data, error } = await supabaseAdmin
      .from("stock_shopping_list")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ item: data });
  } catch (error) {
    return errorResponse(error);
  }
}

// Remover item da lista.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    const { error } = await supabaseAdmin.from("stock_shopping_list").delete().eq("id", id);
    if (error) return errorResponse(error);
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
