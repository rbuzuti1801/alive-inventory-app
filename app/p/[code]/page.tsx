import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, MapPin, PackageSearch } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { normalizePublicCode } from "@/lib/qr";
import { supabaseAdmin } from "@/lib/supabase";
import {
  conservationLabels,
  statusLabels,
  stockStatus,
  stockStatusLabels,
  stockUnitLabels,
  type ConservationStatus,
  type ItemStatus,
  type StockUnit,
} from "@/lib/constants";
import { QuickWithdrawModal } from "@/components/QuickWithdrawModal";

export const dynamic = "force-dynamic";

// Resolvedor público universal dos QR Codes (/p/{public_code}).
// O prefixo identifica o módulo: E- = produto de estoque (implementado);
// B- (patrimônio) e L- (localização) reservados para o futuro.
// Página consultiva: sem login mostra somente leitura; logado libera ações.

const codeRe = /^[A-Za-z]-[0-9a-f]{6,32}$/i;

type LevelRow = {
  quantity: number;
  location_id: string;
  stock_locations: { name: string } | null;
};

function NotRecognized({ message }: { message: string }) {
  return (
    <main className="public-page">
      <div className="public-card">
        <div className="empty-state">
          <PackageSearch size={40} />
          <h1 style={{ fontSize: 18, margin: "12px 0 4px" }}>Código não reconhecido</h1>
          <p className="muted">{message}</p>
        </div>
        <Link className="button" href="/login" style={{ width: "100%", textAlign: "center" }}>
          Ir para o sistema
        </Link>
      </div>
    </main>
  );
}

export default async function PublicCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;

  if (!codeRe.test(rawCode)) {
    return <NotRecognized message="Este QR Code não pertence ao sistema de inventário." />;
  }

  const code = normalizePublicCode(rawCode);

  // Bem patrimonial (Inventário): página apenas consultiva sem login.
  if (code.startsWith("B-")) {
    return <PatrimonyView code={code} />;
  }

  if (!code.startsWith("E-")) {
    return <NotRecognized message="Este código ainda não possui um módulo associado." />;
  }

  const { data: product } = await supabaseAdmin
    .from("stock_products")
    .select("id,public_code,name,unit,min_quantity,active,stock_levels(quantity,location_id,stock_locations(name))")
    .eq("public_code", code)
    .maybeSingle();

  if (!product || !product.active) {
    return <NotRecognized message="Produto não encontrado ou desativado." />;
  }

  const user = await getSessionUser();
  // Usuário autenticado: abre a tela completa do produto (não a consulta pública).
  if (user) {
    redirect(`/stock/${product.id}`);
  }

  const levels = ((product.stock_levels ?? []) as unknown as LevelRow[])
    .map((l) => ({
      location_id: l.location_id,
      location_name: l.stock_locations?.name ?? "-",
      quantity: Number(l.quantity),
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const total = levels.reduce((sum, l) => sum + l.quantity, 0);
  const status = stockStatus(total, Number(product.min_quantity));
  const unitLabel = stockUnitLabels[product.unit as StockUnit] ?? product.unit;
  const currentLocation = levels[0]?.location_name ?? "Estoque";

  // Setores reais (destinos possíveis) para a retirada rápida sem login.
  const { data: locations } = await supabaseAdmin
    .from("stock_locations")
    .select("id,name")
    .eq("active", true)
    .order("name");

  return (
    <main className="public-page">
      <div className="public-card">
        <div className="public-brand">
          <span className="alive">ALIVE</span> <span className="church">CHURCH</span>
          <span className="system">Estoque</span>
        </div>

        <span className={`badge stock-status-${status}`}>
          {status !== "normal" && <AlertTriangle size={12} />}
          {stockStatusLabels[status]}
        </span>
        <h1 className="public-product-name">{product.name}</h1>
        <p className="muted" style={{ margin: 0 }}>{product.public_code}</p>

        <div className="public-balance">
          <span className="public-balance-value">{total.toLocaleString("pt-BR")}</span>
          <span className="public-balance-unit">{unitLabel}{total === 1 ? "" : "(s)"} em estoque</span>
        </div>

        <div className="public-loc-row">
          <span><MapPin size={13} style={{ verticalAlign: "-2px" }} /> Localização atual</span>
          <strong>{currentLocation}</strong>
        </div>

        {levels.length > 1 && (
          <div className="public-locations">
            {levels.map((l) => (
              <div key={l.location_id} className="public-loc-row">
                <span>{l.location_name}</span>
                <strong>{l.quantity.toLocaleString("pt-BR")}</strong>
              </div>
            ))}
          </div>
        )}

        <QuickWithdrawModal
          productId={product.id}
          unitLabel={unitLabel}
          locations={locations ?? []}
          origins={levels
            .filter((l) => l.quantity > 0)
            .map((l) => ({ id: l.location_id, name: l.location_name, quantity: l.quantity }))}
          loginHref={`/login?next=/p/${product.public_code}`}
        />
      </div>
    </main>
  );
}

// ── Consulta patrimonial (/p/B-…) ──────────────────────────────────────────
// Sem login: somente leitura, sem NENHUMA ação de movimentação (o patrimônio,
// diferente do Estoque, não permite retirada/entrada/saída sem autenticação).
// Logado: redireciona para a tela completa do item (ações por permissão).
async function PatrimonyView({ code }: { code: string }) {
  const { data: item } = await supabaseAdmin
    .from("inventory_items")
    .select(
      "id,public_code,sku,item_code,description,brand,model,conservation_status,location,responsible_name,status,sectors(name),subcategories(name)",
    )
    .eq("public_code", code)
    .maybeSingle();

  if (!item) {
    return <NotRecognized message="Bem patrimonial não encontrado para este QR Code." />;
  }

  const user = await getSessionUser();
  if (user) {
    // Usuário autenticado abre a tela completa (Editar, Etiqueta, Voltar…).
    redirect(`/inventory/${item.id}`);
  }

  const sku = item.sku ?? item.item_code;
  const sector = (item.sectors as { name?: string } | null)?.name;
  const subcategory = (item.subcategories as { name?: string } | null)?.name;
  const conservation = conservationLabels[item.conservation_status as ConservationStatus];
  const status = statusLabels[item.status as ItemStatus];

  const fields: Array<[string, string | null | undefined]> = [
    ["Setor", sector],
    ["Subcategoria", subcategory],
    ["Marca", item.brand],
    ["Modelo", item.model],
    ["Estado de conservação", conservation],
    ["Localização", item.location],
    ["Responsável", item.responsible_name],
    ["Status", status],
  ];

  return (
    <main className="public-page">
      <div className="public-card">
        <div className="public-brand">
          <span className="alive">ALIVE</span> <span className="church">CHURCH</span>
          <span className="system">Patrimônio</span>
        </div>

        <h1 className="public-product-name">{item.description}</h1>
        <p className="muted" style={{ margin: 0, fontFamily: "monospace" }}>{sku}</p>

        <div className="public-locations">
          {fields
            .filter(([, value]) => value != null && value !== "")
            .map(([label, value]) => (
              <div key={label} className="public-loc-row">
                <span>{label}</span>
                <strong style={{ textAlign: "right" }}>{value}</strong>
              </div>
            ))}
        </div>

        <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>
          Consulta pública do patrimônio · somente leitura
        </p>

        <Link
          className="button secondary public-login-cta"
          href={`/login?next=/p/${item.public_code}`}
        >
          Entrar no sistema
        </Link>
      </div>
    </main>
  );
}
