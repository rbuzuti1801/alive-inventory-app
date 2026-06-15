import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canDeleteInventory, canEditInventory } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { inventorySchema } from "@/lib/validators";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("inventory_items")
    .select("*,sectors(name),subcategories(name),creator:users_internal!inventory_items_created_by_fkey(name),updater:users_internal!inventory_items_updated_by_fkey(name)")
    .eq("id", id)
    .single();

  if (error) return errorResponse(error, 404);
  return Response.json({ item: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    const current = await supabaseAdmin.from("inventory_items").select("sector_id").eq("id", id).single();
    if (current.error) return errorResponse(current.error, 404);
    if (!canEditInventory(user!, current.data.sector_id)) {
      return errorResponse(new Error("Sem permissão para editar este item."), 403);
    }

    const payload = inventorySchema.parse(await request.json());
    if (!canEditInventory(user!, payload.sector_id)) {
      return errorResponse(new Error("Sem permissão para mover item para este setor."), 403);
    }

    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .update({ ...payload, updated_by: user!.id })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ item: data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  if (!canDeleteInventory(user!)) return errorResponse(new Error("Sem permissão para excluir itens."), 403);

  const { error } = await supabaseAdmin.from("inventory_items").delete().eq("id", id);
  if (error) return errorResponse(error);
  return Response.json({ ok: true });
}
