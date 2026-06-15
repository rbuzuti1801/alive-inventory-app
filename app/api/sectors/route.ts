import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageTaxonomy } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { sectorSchema, subcategorySchema } from "@/lib/validators";

export async function GET() {
  const { response } = await requireApiUser();
  if (response) return response;

  const [sectors, subcategories] = await Promise.all([
    supabaseAdmin.from("sectors").select("*").order("name"),
    supabaseAdmin.from("subcategories").select("*").order("name"),
  ]);

  if (sectors.error) return errorResponse(sectors.error);
  if (subcategories.error) return errorResponse(subcategories.error);
  return Response.json({ sectors: sectors.data, subcategories: subcategories.data });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (!canManageTaxonomy(user!)) return errorResponse(new Error("Apenas admin pode gerenciar setores."), 403);

  const body = await request.json();
  const kind = body.kind;
  const schema = kind === "subcategory" ? subcategorySchema : sectorSchema;
  const payload = schema.parse(body);
  const table = kind === "subcategory" ? "subcategories" : "sectors";
  const { data, error } = await supabaseAdmin.from(table).insert(payload).select().single();

  if (error) return errorResponse(error);
  return Response.json({ data }, { status: 201 });
}

export async function PUT(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (!canManageTaxonomy(user!)) return errorResponse(new Error("Apenas admin pode gerenciar setores."), 403);

  const body = await request.json();
  const { id, kind } = body;
  if (!id) return errorResponse(new Error("ID obrigatório."));

  const schema = kind === "subcategory" ? subcategorySchema : sectorSchema;
  const payload = schema.parse(body);
  const table = kind === "subcategory" ? "subcategories" : "sectors";
  const { data, error } = await supabaseAdmin.from(table).update(payload).eq("id", id).select().single();

  if (error) return errorResponse(error);
  return Response.json({ data });
}
