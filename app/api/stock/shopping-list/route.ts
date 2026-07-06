import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { shoppingListManualSchema } from "@/lib/validators";

// Inserção manual na Lista de Compras. Qualquer usuário autenticado pode
// adicionar; "Quem inseriu" é sempre o nome do usuário logado (nunca vem do
// cliente).
export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    const payload = shoppingListManualSchema.parse(await request.json());

    const { data, error } = await supabaseAdmin
      .from("stock_shopping_list")
      .insert({
        item_name: payload.item_name,
        quantity_to_buy: payload.quantity_to_buy,
        source: "manual",
        status: "pendente",
        added_by: user!.id,
        added_by_name: user!.name,
      })
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ item: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
