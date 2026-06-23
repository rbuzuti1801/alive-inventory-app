import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { printLabelSchema } from "@/lib/validators";

// Impressão em lote: marca múltiplos itens como impressos com o modelo escolhido.
export async function POST(request: Request) {
  const { response } = await requireApiUser();
  if (response) return response;

  try {
    const { label_type, item_ids } = printLabelSchema.parse(await request.json());
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .update({ label_type, label_printed: true, label_printed_at: new Date().toISOString() })
      .in("id", item_ids)
      .select("id");

    if (error) return errorResponse(error);
    return Response.json({ updated: data?.length ?? 0 });
  } catch (error) {
    return errorResponse(error);
  }
}
