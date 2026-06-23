import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { auditSchema } from "@/lib/validators";

// Lista as sessões de inventário/auditoria por escaneamento.
export async function GET() {
  const { response } = await requireApiUser();
  if (response) return response;

  const { data, error } = await supabaseAdmin
    .from("inventory_audits")
    .select("*,sectors(name),starter:users_internal!inventory_audits_started_by_fkey(name)")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) return errorResponse(error);
  return Response.json({ audits: data });
}

// Inicia uma nova sessão. total_expected = itens ativos no escopo (setor opcional).
export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    const payload = auditSchema.parse(await request.json());

    let countQuery = supabaseAdmin
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo");
    if (payload.sector_id) countQuery = countQuery.eq("sector_id", payload.sector_id);
    const { count } = await countQuery;

    const { data, error } = await supabaseAdmin
      .from("inventory_audits")
      .insert({
        name: payload.name,
        sector_id: payload.sector_id ?? null,
        started_by: user!.id,
        total_expected: count ?? 0,
      })
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ audit: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
