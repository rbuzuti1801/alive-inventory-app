import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { stockProductSchema } from "@/lib/validators";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar o catálogo de estoque."), 403);
    }

    const payload = stockProductSchema.parse(await request.json());
    const { data, error } = await supabaseAdmin
      .from("stock_products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ product: data });
  } catch (error) {
    return errorResponse(error);
  }
}

// Desativa (soft delete): o histórico de movimentações permanece íntegro.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar o catálogo de estoque."), 403);
    }

    const { data, error } = await supabaseAdmin
      .from("stock_products")
      .update({ active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ product: data });
  } catch (error) {
    return errorResponse(error);
  }
}
