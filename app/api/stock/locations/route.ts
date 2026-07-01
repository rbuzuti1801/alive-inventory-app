import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { stockLocationSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar localizações."), 403);
    }

    const payload = stockLocationSchema.parse(await request.json());
    const { data, error } = await supabaseAdmin
      .from("stock_locations")
      .insert(payload)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ location: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
