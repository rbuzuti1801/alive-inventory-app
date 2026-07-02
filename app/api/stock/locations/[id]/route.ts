import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { stockLocationSchema } from "@/lib/validators";

async function hasBalance(locationId: string) {
  const { data } = await supabaseAdmin
    .from("stock_levels")
    .select("quantity")
    .eq("location_id", locationId)
    .gt("quantity", 0)
    .limit(1);
  return Boolean(data?.length);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar localizações."), 403);
    }

    const payload = stockLocationSchema.parse(await request.json());
    if (payload.active === false && (await hasBalance(id))) {
      return errorResponse(new Error("Localização com saldo não pode ser desativada. Transfira o estoque antes."), 409);
    }

    const { data, error } = await supabaseAdmin
      .from("stock_locations")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ location: data });
  } catch (error) {
    return errorResponse(error);
  }
}

// Desativa (soft delete). Bloqueia se ainda houver saldo na localização.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar localizações."), 403);
    }

    if (await hasBalance(id)) {
      return errorResponse(new Error("Localização com saldo não pode ser desativada. Transfira o estoque antes."), 409);
    }

    const { data, error } = await supabaseAdmin
      .from("stock_locations")
      .update({ active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ location: data });
  } catch (error) {
    return errorResponse(error);
  }
}
