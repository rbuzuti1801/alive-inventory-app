import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { response } = await requireApiUser();
  if (response) return response;

  const [activeRes, allRes, latestRes] = await Promise.all([
    // Aggregates for active items only — counted in the DB, not in JS
    supabaseAdmin
      .from("inventory_items")
      .select("quantity,acquisition_value,conservation_status,sectors(name)")
      .eq("status", "ativo"),

    // Count of damaged + maintenance items
    supabaseAdmin
      .from("inventory_items")
      .select("id,conservation_status")
      .eq("status", "ativo")
      .in("conservation_status", ["danificado", "em_manutencao"]),

    // 8 most recently updated items for the activity feed
    supabaseAdmin
      .from("inventory_items")
      .select("id,item_code,description,quantity,acquisition_value,conservation_status,status,updated_at,sectors(name)")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (activeRes.error) return Response.json({ error: activeRes.error.message }, { status: 400 });
  if (allRes.error) return Response.json({ error: allRes.error.message }, { status: 400 });
  if (latestRes.error) return Response.json({ error: latestRes.error.message }, { status: 400 });

  const active = activeRes.data;

  const bySector = active.reduce<Record<string, number>>((acc, item) => {
    const sector = (item.sectors as { name?: string } | null)?.name ?? "Sem setor";
    acc[sector] = (acc[sector] ?? 0) + Number(item.quantity ?? 0);
    return acc;
  }, {});

  return Response.json({
    totalActiveItems: active.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    totalValue: active.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.acquisition_value ?? 0), 0),
    damagedItems: allRes.data.filter((i) => i.conservation_status === "danificado").length,
    maintenanceItems: allRes.data.filter((i) => i.conservation_status === "em_manutencao").length,
    bySector,
    latest: latestRes.data,
  });
}
