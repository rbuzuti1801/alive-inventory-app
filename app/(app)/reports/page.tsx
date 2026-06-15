import { ReportsFilters } from "@/components/ReportsFilters";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export default async function ReportsPage() {
  await requireUser();
  const [sectorsResult, subcategoriesResult] = await Promise.all([
    supabaseAdmin.from("sectors").select("id,name").eq("active", true).order("name"),
    supabaseAdmin.from("subcategories").select("id,sector_id,name").eq("active", true).order("name"),
  ]);
  const sectors = sectorsResult.data ?? [];
  const subcategories = subcategoriesResult.data ?? [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Relatórios</h1>
          <p className="muted">Filtre dados do inventário e exporte para CSV.</p>
        </div>
      </div>
      <ReportsFilters sectors={sectors} subcategories={subcategories} />
    </>
  );
}
