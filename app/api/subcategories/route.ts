import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const { response } = await requireApiUser();
  if (response) return response;

  const sectorId = new URL(request.url).searchParams.get("sector_id");
  let query = supabaseAdmin.from("subcategories").select("*").eq("active", true).order("name");
  if (sectorId) query = query.eq("sector_id", sectorId);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ subcategories: data });
}
