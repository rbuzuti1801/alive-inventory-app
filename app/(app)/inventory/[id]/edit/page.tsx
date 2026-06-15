import { InventoryForm } from "@/components/InventoryForm";
import { requireUser } from "@/lib/auth";
import { canEditInventory } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";

export default async function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [itemResult, sectorsResult, subcategoriesResult] = await Promise.all([
    supabaseAdmin.from("inventory_items").select("*").eq("id", id).single(),
    supabaseAdmin.from("sectors").select("id,name,code").eq("active", true).order("name"),
    supabaseAdmin.from("subcategories").select("id,sector_id,name,code").eq("active", true).order("name"),
  ]);
  const item = itemResult.data;
  const sectors = sectorsResult.data ?? [];
  const subcategories = subcategoriesResult.data ?? [];

  if (!item) return <div className="alert error">Item não encontrado.</div>;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Editar item</h1>
          <p className="muted">{item.item_code} - {item.description}</p>
        </div>
      </div>
      {!canEditInventory(user, item.sector_id) ? (
        <div className="alert error">Você não tem permissão para editar este item.</div>
      ) : (
        <InventoryForm sectors={sectors} subcategories={subcategories} item={item} userRole={user.role} userSectorId={user.sector_id} />
      )}
    </>
  );
}
