import { requireUser } from "@/lib/auth";
import { canManageServiceOrders } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { ServiceOrdersTable, type ServiceOrderRow } from "@/components/ServiceOrdersTable";

export const dynamic = "force-dynamic";

// Módulo interno de Ordens de Serviço (admin e gestores).
export default async function ServiceOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!canManageServiceOrders(user)) {
    return <div className="alert error">Apenas administradores e gestores acessam esta área.</div>;
  }

  const params = await searchParams;

  let query = supabaseAdmin
    .from("service_orders")
    .select("id,order_number,title,provider_name,responsible_name,department,service_value,status,issued_at,created_at")
    .order("created_at", { ascending: false });

  if (params.search) {
    const s = params.search.replace(/[().,]/g, " ").trim().slice(0, 100);
    if (s) {
      query = query.or(
        `order_number.ilike.%${s}%,title.ilike.%${s}%,provider_name.ilike.%${s}%,responsible_name.ilike.%${s}%,department.ilike.%${s}%`,
      );
    }
  }
  if (params.status) query = query.eq("status", params.status);

  const { data } = await query;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Ordens de Serviço</h1>
          <p className="muted">Documento interno para impressão e assinatura física do prestador.</p>
        </div>
      </div>

      <ServiceOrdersTable orders={(data ?? []) as ServiceOrderRow[]} />
    </>
  );
}
