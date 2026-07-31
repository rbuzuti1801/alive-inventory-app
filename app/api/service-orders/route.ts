import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageServiceOrders } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { serviceOrderSchema } from "@/lib/validators";

// Criação da Ordem de Serviço. Nasce SEMPRE como rascunho e sem número — o
// número definitivo só é atribuído na emissão (RPC set_service_order_status).
export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManageServiceOrders(user!)) {
      return errorResponse(new Error("Sem permissão para criar ordens de serviço."), 403);
    }

    const payload = serviceOrderSchema.parse(await request.json());

    const { data, error } = await supabaseAdmin
      .from("service_orders")
      .insert({
        ...payload,
        status: "rascunho",
        created_by: user!.id,
        created_by_name: user!.name,
      })
      .select("id")
      .single();

    if (error) return errorResponse(error);

    await supabaseAdmin.from("service_order_events").insert({
      order_id: data.id,
      event_type: "criacao",
      to_status: "rascunho",
      user_id: user!.id,
      user_name: user!.name,
    });

    return Response.json({ order: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
