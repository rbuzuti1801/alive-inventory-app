import { requireUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { StockTabs, type StockTab } from "@/components/StockTabs";
import { StockProductsManager } from "@/components/StockProductsManager";
import { StockLocationsManager } from "@/components/StockLocationsManager";
import { StockMovementsList } from "@/components/StockMovementsList";
import { StockShoppingList, type ShoppingItem } from "@/components/StockShoppingList";

export const dynamic = "force-dynamic";

const tabs: StockTab[] = ["produtos", "localizacoes", "movimentacoes", "compras"];

type SearchParams = {
  tab?: string;
  search?: string;
  category?: string;
  product_id?: string;
  movement_type?: string;
};

// Hub do estoque: um único item no menu, navegação interna por abas.
export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab: StockTab = tabs.includes(params.tab as StockTab) ? (params.tab as StockTab) : "produtos";
  const canManage = canManageStock(user);

  return (
    <div className="grid">
      <div>
        <h1>Estoque</h1>
        <p className="muted">Materiais de consumo — produtos, localizações, movimentações e lista de compras.</p>
      </div>

      <StockTabs active={tab} />

      {tab === "produtos" && <ProductsTab params={params} canManage={canManage} />}
      {tab === "localizacoes" && <LocationsTab canManage={canManage} />}
      {tab === "movimentacoes" && <MovementsTab params={params} />}
      {tab === "compras" && <ShoppingListTab />}
    </div>
  );
}

async function ProductsTab({ params, canManage }: { params: SearchParams; canManage: boolean }) {
  let query = supabaseAdmin
    .from("stock_products")
    .select("id,public_code,name,category,unit,min_quantity,label_printed,active,stock_levels(quantity)")
    .order("name");

  if (params.search) {
    const search = params.search.replace(/[().,]/g, " ").trim().slice(0, 100);
    if (search) query = query.ilike("name", `%${search}%`);
  }
  if (params.category) query = query.eq("category", params.category);

  const { data } = await query;
  const products = (data ?? []).map((p) => ({
    ...p,
    total: ((p.stock_levels ?? []) as { quantity: number }[]).reduce((sum, l) => sum + Number(l.quantity), 0),
  }));

  return <StockProductsManager products={products} canManage={canManage} search={params.search ?? ""} category={params.category ?? ""} />;
}

async function LocationsTab({ canManage }: { canManage: boolean }) {
  const [{ data: locations }, { data: sectors }] = await Promise.all([
    supabaseAdmin
      .from("stock_locations")
      .select("id,name,description,sector_id,active,sectors(name),stock_levels(quantity)")
      .order("name"),
    supabaseAdmin.from("sectors").select("id,name").eq("active", true).order("name"),
  ]);

  const rows = (locations ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    sector_id: l.sector_id,
    active: l.active,
    sector_name: (l.sectors as { name?: string } | null)?.name ?? null,
    total: ((l.stock_levels ?? []) as { quantity: number }[]).reduce((sum, x) => sum + Number(x.quantity), 0),
  }));

  return <StockLocationsManager locations={rows} sectors={sectors ?? []} canManage={canManage} />;
}

async function MovementsTab({ params }: { params: SearchParams }) {
  let query = supabaseAdmin
    .from("stock_movements")
    .select(
      "id,movement_type,quantity,previous_quantity,reason,moved_at,stock_products(name,unit),from_loc:stock_locations!stock_movements_from_location_id_fkey(name),to_loc:stock_locations!stock_movements_to_location_id_fkey(name),mover:users_internal!stock_movements_moved_by_fkey(name)",
    )
    .order("moved_at", { ascending: false })
    .limit(100);

  if (params.product_id) query = query.eq("product_id", params.product_id);
  if (params.movement_type) query = query.eq("movement_type", params.movement_type);

  const [{ data: movements }, { data: products }] = await Promise.all([
    query,
    supabaseAdmin.from("stock_products").select("id,name").order("name"),
  ]);

  return (
    <StockMovementsList
      movements={(movements ?? []) as never[]}
      products={products ?? []}
      productId={params.product_id ?? ""}
      movementType={params.movement_type ?? ""}
    />
  );
}

// Lista de Compras: apenas itens pendentes (comprados saem da lista).
async function ShoppingListTab() {
  const { data } = await supabaseAdmin
    .from("stock_shopping_list")
    .select("id,item_name,quantity_to_buy,added_by_name,source,stock_products(unit)")
    .eq("status", "pendente")
    .order("created_at", { ascending: false });

  const items: ShoppingItem[] = (data ?? []).map((i) => ({
    id: i.id,
    item_name: i.item_name,
    quantity_to_buy: Number(i.quantity_to_buy),
    added_by_name: i.added_by_name,
    source: i.source as "sistema" | "manual",
    unit: (i.stock_products as { unit?: string } | null)?.unit ?? null,
  }));

  return <StockShoppingList items={items} />;
}
