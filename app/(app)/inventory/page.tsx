import { InventoryTable } from "@/components/InventoryTable";
import { requireUser } from "@/lib/auth";
import { canDeleteInventory } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;

  let query = supabaseAdmin
    .from("inventory_items")
    .select("*,sectors(name),subcategories(name)")
    .order("updated_at", { ascending: false });

  if (params.search) {
    const s = params.search.replace(/[().,]/g, " ").trim().slice(0, 100);
    if (s) query = query.or(`sku.ilike.%${s}%,item_code.ilike.%${s}%,description.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%,location.ilike.%${s}%`);
  }
  for (const key of ["sector_id", "subcategory_id", "conservation_status", "status", "responsible_name"] as const) {
    if (params[key]) query = query.eq(key, params[key]);
  }

  const [itemsResult, sectorsResult, subcategoriesResult] = await Promise.all([
    query,
    supabaseAdmin.from("sectors").select("id,name").eq("active", true).order("name"),    // code não é necessário na listagem
    supabaseAdmin.from("subcategories").select("id,sector_id,name").eq("active", true).order("name"),
  ]);
  const items = itemsResult.data ?? [];
  const sectors = sectorsResult.data ?? [];
  const subcategories = subcategoriesResult.data ?? [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Inventário</h1>
          <p className="muted">Consulte, filtre e mantenha os bens da igreja.</p>
        </div>
      </div>
      <InventoryTable
        items={items}
        sectors={sectors}
        subcategories={subcategories}
        canCreate={user.role !== "visualizador"}
        canDelete={canDeleteInventory(user)}
      />
    </>
  );
}
