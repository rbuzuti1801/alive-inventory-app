import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import type { ServiceOrderStatus } from "@/lib/constants";
import { canManageServiceOrders } from "@/lib/permissions";
import { canEditServiceOrder, canTransitionServiceOrder } from "@/lib/service-orders";
import { supabaseAdmin } from "@/lib/supabase";
import { serviceOrderSchema, serviceOrderStatusSchema } from "@/lib/validators";

async function loadOrder(id: string) {
  return supabaseAdmin.from("service_orders").select("id,status").eq("id", id).maybeSingle();
}

// PUT — edição do conteúdo. Só enquanto rascunho: depois da emissão o papel
// assinado precisa continuar valendo o que foi impresso.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManageServiceOrders(user!)) {
      return errorResponse(new Error("Sem permissão para editar ordens de serviço."), 403);
    }

    const { id } = await params;
    const { data: current, error: readError } = await loadOrder(id);
    if (readError) return errorResponse(readError);
    if (!current) return errorResponse(new Error("Ordem de serviço não encontrada."), 404);

    if (!canEditServiceOrder(current.status as ServiceOrderStatus)) {
      return errorResponse(new Error("Somente rascunhos podem ser editados."), 409);
    }

    const payload = serviceOrderSchema.parse(await request.json());
    const { data, error } = await supabaseAdmin
      .from("service_orders")
      .update(payload)
      .eq("id", id)
      .select("id")
      .single();

    if (error) return errorResponse(error);

    await supabaseAdmin.from("service_order_events").insert({
      order_id: id,
      event_type: "edicao",
      from_status: current.status,
      to_status: current.status,
      user_id: user!.id,
      user_name: user!.name,
    });

    return Response.json({ order: data });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH — mudança de status (emitir, em execução, concluir, cancelar).
// A escrita é atômica na RPC: status + número definitivo + histórico.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManageServiceOrders(user!)) {
      return errorResponse(new Error("Sem permissão para alterar ordens de serviço."), 403);
    }

    const { id } = await params;
    const payload = serviceOrderStatusSchema.parse(await request.json());

    const { data: current, error: readError } = await loadOrder(id);
    if (readError) return errorResponse(readError);
    if (!current) return errorResponse(new Error("Ordem de serviço não encontrada."), 404);

    // Espelha a regra da RPC para devolver a mensagem antes de ir ao banco.
    if (!canTransitionServiceOrder(current.status as ServiceOrderStatus, payload.status)) {
      return errorResponse(new Error("Transição de status não permitida."), 409);
    }

    const { data, error } = await supabaseAdmin.rpc("set_service_order_status", {
      p_order_id: id,
      p_status: payload.status,
      p_user_id: user!.id,
      p_user_name: user!.name,
      p_notes: payload.notes ?? null,
    });

    if (error) return errorResponse(error);
    return Response.json({ order: data });
  } catch (error) {
    return errorResponse(error);
  }
}
