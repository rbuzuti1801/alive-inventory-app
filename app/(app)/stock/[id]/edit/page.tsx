import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canManageStock } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { StockProductEditForm } from "@/components/StockProductEditForm";

export const dynamic = "force-dynamic";

export default async function EditStockProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const { data: product } = await supabaseAdmin
    .from("stock_products")
    .select("id,name,category,unit,min_quantity,notes,active")
    .eq("id", id)
    .maybeSingle();

  if (!product) return <div className="alert error">Produto não encontrado.</div>;

  return (
    <>
      <div className="topbar">
        <div>
          <Link href={`/stock/${id}`} className="back-link">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <h1 style={{ marginTop: 6 }}>Editar produto</h1>
          <p className="muted">{product.name}</p>
        </div>
      </div>

      {canManageStock(user) ? (
        <StockProductEditForm product={product} />
      ) : (
        <div className="alert error">Você não tem permissão para editar este produto.</div>
      )}
    </>
  );
}
