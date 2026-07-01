import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { StockLabelSheet } from "@/components/StockLabelSheet";

export const dynamic = "force-dynamic";

// Página standalone (sem sidebar) para impressão de etiquetas de estoque.
// /labels/print-stock?ids=uuid1,uuid2,...
export default async function PrintStockLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  await requireUser();
  const { ids } = await searchParams;

  const idList = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);

  const { data } = idList.length
    ? await supabaseAdmin
        .from("stock_products")
        .select("id,public_code,name,unit")
        .in("id", idList)
    : { data: [] };

  // Preserva a ordem de seleção.
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  const products = idList.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return <StockLabelSheet products={products} />;
}
