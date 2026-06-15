import { InventoryForm } from "@/components/InventoryForm";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export default async function NewInventoryPage() {
  const user = await requireUser();
  const [sectorsResult, subcategoriesResult] = await Promise.all([
    supabaseAdmin.from("sectors").select("id,name,code").eq("active", true).order("name"),
    supabaseAdmin.from("subcategories").select("id,sector_id,name,code").eq("active", true).order("name"),
  ]);
  const sectors = sectorsResult.data ?? [];
  const subcategories = subcategoriesResult.data ?? [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Novo item</h1>
          <p className="muted">Cadastre um bem no inventário.</p>
        </div>
      </div>
      {user.role === "visualizador" ? (
        <div className="alert error">Visualizadores não podem criar itens.</div>
      ) : (
        <InventoryForm sectors={sectors} subcategories={subcategories} userRole={user.role} userSectorId={user.sector_id} />
      )}
    </>
  );
}
