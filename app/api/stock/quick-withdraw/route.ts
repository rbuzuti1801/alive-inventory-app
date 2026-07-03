import { errorResponse } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";
import { quickWithdrawSchema } from "@/lib/validators";

// Retirada rápida SEM login (voluntários). Registra uma 'saida' com o nome do
// responsável informado e a marca `unauthenticated`. A origem é resolvida
// automaticamente pela localização com maior saldo — a RPC garante que o saldo
// nunca fica negativo.
export async function POST(request: Request) {
  try {
    const payload = quickWithdrawSchema.parse(await request.json());

    const { data: product } = await supabaseAdmin
      .from("stock_products")
      .select("id,active,stock_levels(location_id,quantity)")
      .eq("id", payload.product_id)
      .maybeSingle();

    if (!product || !product.active) {
      return errorResponse(new Error("Produto não encontrado ou desativado."), 404);
    }

    // Origem = localização com maior saldo que cobre a quantidade pedida.
    const levels = ((product.stock_levels ?? []) as { location_id: string; quantity: number }[])
      .map((l) => ({ location_id: l.location_id, quantity: Number(l.quantity) }))
      .filter((l) => l.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);

    const origin = levels.find((l) => l.quantity >= payload.quantity);
    if (!origin) {
      const total = levels.reduce((s, l) => s + l.quantity, 0);
      return errorResponse(
        new Error(`Saldo insuficiente para retirada: disponível ${total.toLocaleString("pt-BR")}.`),
        409,
      );
    }

    const { data, error } = await supabaseAdmin.rpc("apply_stock_movement", {
      p_product_id: payload.product_id,
      p_movement_type: "saida",
      p_quantity: payload.quantity,
      p_from_location_id: origin.location_id,
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
