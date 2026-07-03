import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, MapPin, PackageSearch } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { normalizePublicCode } from "@/lib/qr";
import { supabaseAdmin } from "@/lib/supabase";
import {
  stockStatus,
  stockStatusLabels,
  stockUnitLabels,
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
          loginHref={`/login?next=/p/${product.public_code}`}
        />
      </div>
    </main>
  );
}
