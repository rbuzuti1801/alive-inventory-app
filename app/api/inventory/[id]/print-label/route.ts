import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { labelTypes } from "@/lib/constants";
import { z } from "zod";

const schema = z.object({ label_type: z.enum(labelTypes) });

// Marca um item como impresso e registra o modelo de etiqueta escolhido.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    const { label_type } = schema.parse(await request.json());
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .update({ label_type, label_printed: true, label_printed_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,sku,label_type,label_printed,label_printed_at")
      .single();

    if (error) return errorResponse(error);
    return Response.json({ item: data });
  } catch (error) {
    return errorResponse(error);
  }
}
