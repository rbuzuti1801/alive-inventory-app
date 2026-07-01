import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { printStockLabelSchema } from "@/lib/validators";

// Marca produtos de estoque como "etiqueta impressa" (em lote).
export async function POST(request: Request) {
  const { response } = await requireApiUser();
  if (response) return response;

  try {
    const payload = printStockLabelSchema.parse(await request.json());

    const { data, error } = await supabaseAdmin
      .from("stock_products")
      .update({ label_printed: true, label_printed_at: new Date().toISOString() })
      .in("id", payload.product_ids)
      .select("id");

    if (error) return errorResponse(error);
    return Response.json({ updated: data?.length ?? 0 });
  } catch (error) {
    return errorResponse(error);
  }
}
