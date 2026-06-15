import { requireApiUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const { response } = await requireApiUser();
  if (response) return response;

  const url = new URL(request.url);
  let query = supabaseAdmin.from("inventory_items").select("*,sectors(name),subcategories(name)").order("item_code");
  for (const key of ["sector_id", "subcategory_id", "conservation_status", "status", "responsible_name", "location"]) {
    const value = url.searchParams.get(key);
    if (value) query = query.eq(key, value);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const headers = [
    "sku",
    "descricao",
    "setor",
    "subcategoria",
    "marca",
    "modelo",
    "quantidade",
    "estado",
    "localizacao",
    "valor_aquisicao",
    "responsavel",
    "status",
  ];

  const rows = data.map((item) => [
    (item as Record<string, unknown>).sku ?? item.item_code,
    item.description,
    (item.sectors as { name?: string } | null)?.name,
    (item.subcategories as { name?: string } | null)?.name,
    item.brand,
    item.model,
    item.quantity,
    item.conservation_status,
    item.location,
    item.acquisition_value,
    item.responsible_name,
    item.status,
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="inventario-alive.csv"',
    },
  });
}
