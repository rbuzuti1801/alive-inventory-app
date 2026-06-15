import Link from "next/link";
import { Badge } from "@/components/Badge";
import { requireUser } from "@/lib/auth";
import { canEditInventory } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { conservationLabels, statusLabels } from "@/lib/constants";

function valueText(value: unknown) {
  if (value == null || value === "") return "-";
  return String(value);
}

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { data: item } = await supabaseAdmin
    .from("inventory_items")
    .select("*,sectors(name),subcategories(name),creator:users_internal!inventory_items_created_by_fkey(name),updater:users_internal!inventory_items_updated_by_fkey(name)")
    .eq("id", id)
    .single();

  if (!item) return <div className="alert error">Item não encontrado.</div>;

  const sku = item.sku ?? item.item_code;

  const fields = [
    ["SKU", sku],
    ["Descrição", item.description],
    ["Setor", (item.sectors as { name?: string } | null)?.name],
    ["Subcategoria", (item.subcategories as { name?: string } | null)?.name],
    ["Marca", item.brand],
    ["Modelo", item.model],
    ["Quantidade", item.quantity],
    ["Estado", conservationLabels[item.conservation_status as keyof typeof conservationLabels]],
    ["Localização", item.location],
    ["Data de aquisição", item.acquisition_date],
    ["Valor de aquisição", item.acquisition_value ? Number(item.acquisition_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null],
    ["Responsável", item.responsible_name],
    ["Status", statusLabels[item.status as keyof typeof statusLabels]],
    ["Criado por", (item.creator as { name?: string } | null)?.name],
    ["Atualizado por", (item.updater as { name?: string } | null)?.name],
    ["Observações", item.observations],
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ fontFamily: "monospace", letterSpacing: "0.04em" }}>{sku}</h1>
          <p className="muted">{item.description}</p>
        </div>
        <div className="actions">
          <Badge kind="conservation" value={item.conservation_status} />
          <Badge kind="status" value={item.status} />
          {canEditInventory(user, item.sector_id) && <Link className="button" href={`/inventory/${item.id}/edit`}>Editar</Link>}
        </div>
      </div>
      <section className="panel detail-list">
        {fields.map(([label, value]) => (
          <div className="detail-item" key={label}>
            <strong>{label}</strong>
            <span style={label === "SKU" ? { fontFamily: "monospace", fontWeight: 600 } : undefined}>
              {valueText(value)}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
