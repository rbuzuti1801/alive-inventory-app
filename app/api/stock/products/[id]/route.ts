import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { stockProductSchema } from "@/lib/validators";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar o catálogo de estoque."), 403);
    }

    const payload = stockProductSchema.parse(await request.json());
    const { data, error } = await supabaseAdmin
      .from("stock_products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ product: data });
  } catch (error) {
    return errorResponse(error);
  }
}

// Atualização parcial (ex.: ativar/desativar sem reenviar o produto inteiro).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Sem permissão para gerenciar o catálogo de estoque."), 403);
    }

    const body = await request.json();
    if (typeof body.active !== "boolean") {
      return errorResponse(new Error("Nada para atualizar."));
    }

    const { data, error } = await supabaseAdmin
      .from("stock_products")
      .update({ active: body.active })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ product: data });
  } catch (error) {
    return errorResponse(error);
  }
}

// Exclusão — apenas admin e apenas com o produto já desativado. A RPC decide
// entre exclusão física (sem histórico) e lógica (com histórico, preservando as
// movimentações para auditoria) e limpa saldos/lista de compras na mesma
// transação. Ver migration 0008.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Apenas administradores podem excluir produtos."), 403);
    }

    const { data, error } = await supabaseAdmin.rpc("delete_stock_product", {
      p_product_id: id,
      p_user_id: user!.id,
    });
    if (error) return errorResponse(error);

    const result = data as { mode: "permanente" | "arquivado"; movements: number };
    return Response.json({ deleted: true, mode: result?.mode, movements: result?.movements });
  } catch (error) {
    return errorResponse(error);
  }
}
