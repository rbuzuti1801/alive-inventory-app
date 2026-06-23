import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { LabelsManager } from "@/components/LabelsManager";

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const params = await searchParams;

  let query = supabaseAdmin
    .from("inventory_items")
    .select("*,sectors(name),subcategories(name)")
    .order("sku", { ascending: true });

  if (params.search) {
    const s = params.search.replace(/[().,]/g, " ").trim().slice(0, 100);
    if (s) query = query.or(`sku.ilike.%${s}%,item_code.ilike.%${s}%,description.ilike.%${s}%,location.ilike.%${s}%`);
  }
  for (const key of ["sector_id", "subcategory_id", "status", "responsible_name"] as const) {
    if (params[key]) query = query.eq(key, params[key]);
  }
  if (params.location) query = query.ilike("location", `%${params.location.replace(/[%]/g, "")}%`);
  if (params.printed === "true") query = query.eq("label_printed", true);
  if (params.printed === "false") query = query.eq("label_printed", false);

  const [itemsRes, sectorsRes, subsRes] = await Promise.all([
    query,
    supabaseAdmin.from("sectors").select("id,name").eq("active", true).order("name"),
    supabaseAdmin.from("subcategories").select("id,sector_id,name").eq("active", true).order("name"),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Etiquetas</h1>
          <p className="muted">Gere, imprima em lote e controle as etiquetas patrimoniais.</p>
        </div>
      </div>
      <LabelsManager
        items={itemsRes.data ?? []}
        sectors={sectorsRes.data ?? []}
        subcategories={subsRes.data ?? []}
      />
    </>
  );
}
