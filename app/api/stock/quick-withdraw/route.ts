import { errorResponse } from "@/lib/api";
import { resolveWithdrawOrigin, type StockLevelInput } from "@/lib/stock";
import { supabaseAdmin } from "@/lib/supabase";
import { quickWithdrawSchema } from "@/lib/validators";

// Retirada rápida SEM login (voluntários). Rota pública liberada no middleware
// (`publicPaths`). Registra SOMENTE uma 'saida', com o nome do responsável e a
// marca `unauthenticated`. Nunca cria entrada/ajuste/transferência.
//
// A origem é resolvida no servidor: 1 localização com saldo é usada automatica-
// mente; havendo várias, o cliente precisa enviar `from_location_id`. A escrita
// em stock_levels + o histórico ocorrem na MESMA transação (RPC atômica
// apply_stock_movement), que também garante que o saldo nunca fica negativo.
export async function POST(request: Request) {
  try {
    const payload = quickWithdrawSchema.parse(await request.json());

    const { data: product, error: productError } = await supabaseAdmin
      .from("stock_products")
      .select("id,active,stock_levels(location_id,quantity,stock_locations(name))")
      .eq("id", payload.product_id)
      .maybeSingle();

    if (productError) return errorResponse(productError, 500);
    if (!product) return errorResponse(new Error("Produto não encontrado."), 404);
    if (!product.active) return errorResponse(new Error("Produto inativo não pode ser movimentado."), 409);

    const levels: StockLevelInput[] = (
      (product.stock_levels ?? []) as unknown as {
        location_id: string;
        quantity: number;
        stock_locations: { name: string } | null;
      }[]
    ).map((l) => ({
      location_id: l.location_id,
      quantity: Number(l.quantity),
      location_name: l.stock_locations?.name,
    }));

    const resolved = resolveWithdrawOrigin(levels, payload.quantity, payload.from_location_id);
    if (!resolved.ok) {
      // needs_selection -> 409 (o cliente reapresenta a escolha de origem);
      // insufficient/no_balance -> 409; invalid_quantity -> 400.
      const status = resolved.code === "invalid_quantity" ? 400 : 409;
      return Response.json(
        {
          error: resolved.message,
          code: resolved.code,
          // Ajuda o cliente a montar a escolha de origem sem uma segunda ida ao servidor.
          origins: levels
            .filter((l) => l.quantity > 0)
            .map((l) => ({ id: l.location_id, name: l.location_name ?? "-", quantity: l.quantity })),
        },
        { status },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("apply_stock_movement", {
      p_product_id: payload.product_id,
      p_movement_type: "saida",
      p_quantity: payload.quantity,
      p_from_location_id: resolved.origin.location_id,
      p_to_location_id: payload.to_location_id,
      p_reason: payload.reason ?? null,
      p_user_id: null,
      p_performed_by_name: payload.performed_by_name,
      p_unauthenticated: true,
    });

    if (error) return errorResponse(error);
    return Response.json({ result: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
