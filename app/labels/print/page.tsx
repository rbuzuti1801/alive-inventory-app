import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { labelTypes, type LabelType } from "@/lib/constants";
import { LabelSheet } from "@/components/LabelSheet";
import type { LabelItem } from "@/components/Label";

// Página dedicada de impressão (sem o shell do app) — gera o PDF/folha.
export default async function LabelPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; model?: string }>;
}) {
  await requireUser();
  const { ids, model: modelParam } = await searchParams;

  const model: LabelType = labelTypes.includes(modelParam as LabelType) ? (modelParam as LabelType) : "dk22205";
  const idList = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);

  let items: LabelItem[] = [];
  if (idList.length > 0) {
    const { data } = await supabaseAdmin
      .from("inventory_items")
      .select("id,public_code,sku,item_code,description,sectors(name),subcategories(name)")
      .in("id", idList);
    // Preserva a ordem de seleção.
    const byId = new Map((data ?? []).map((d) => [d.id, d]));
    items = idList.map((id) => byId.get(id)).filter(Boolean) as unknown as LabelItem[];
  }

  return <LabelSheet items={items} model={model} />;
}
