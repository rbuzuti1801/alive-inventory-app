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

// Exclusão física — apenas admin e apenas quando NÃO há histórico de
// movimentações. Com histórico, o produto deve ser desativado (PUT active:false)
// para preservar a integridade do histórico.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { id } = await params;

  try {
    if (!canManageStock(user!)) {
      return errorResponse(new Error("Apenas administradores podem excluir produtos."), 403);
    }

    const { count, error: countError } = await supabaseAdmin
      .from("stock_movements")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id);
    if (countError) return errorResponse(countError);

    if ((count ?? 0) > 0) {
      return errorResponse(
        new Error("Este produto possui movimentações e não pode ser excluído. Desative-o para preservar o histórico."),
        409,
      );
    }

    // stock_levels tem ON DELETE CASCADE; sem movimentações, exclusão é segura.
    const { error } = await supabaseAdmin.from("stock_products").delete().eq("id", id);
    if (error) return errorResponse(error);
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
