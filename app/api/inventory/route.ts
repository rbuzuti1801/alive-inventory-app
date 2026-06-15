import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canCreateInventory } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { inventorySchema } from "@/lib/validators";

function applyFilters(url: URL) {
  let query = supabaseAdmin
    .from("inventory_items")
    .select("*,sectors(name),subcategories(name)")
    .order("updated_at", { ascending: false });

  const rawSearch = url.searchParams.get("search");
  if (rawSearch) {
    // Remove chars that are PostgREST filter syntax to prevent filter injection
    const search = rawSearch.replace(/[().,]/g, " ").trim().slice(0, 100);
    if (search) {
      query = query.or(
        `item_code.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%,location.ilike.%${search}%`,
      );
    }
  }

  for (const key of ["sector_id", "subcategory_id", "conservation_status", "status", "responsible_name"]) {
    const value = url.searchParams.get(key);
    if (value) query = query.eq(key, value);
  }

  return query;
}

export async function GET(request: Request) {
  const { response } = await requireApiUser();
  if (response) return response;

  const { data, error } = await applyFilters(new URL(request.url));
  if (error) return errorResponse(error);
  return Response.json({ items: data });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    const payload = inventorySchema.parse(await request.json());
    if (!canCreateInventory(user!, payload.sector_id)) {
      return errorResponse(new Error("Sem permissão para criar item neste setor."), 403);
    }

    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .insert({ ...payload, created_by: user!.id, updated_by: user!.id })
      .select()
      .single();

    if (error) return errorResponse(error);
    return Response.json({ item: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
