import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { stockProductSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar o catálogo de estoque."), 403);
    }

    const payload = stockProductSchema.parse(await request.json());
    const { data, error } = await supabaseAdmin
      .from("stock_products")
      .insert({ ...payload, created_by: user!.id })
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ product: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
