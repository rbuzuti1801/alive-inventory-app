import { requireUser } from "@/lib/auth";
import { canManagePurchaseRequests } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { PurchaseRequestsTable, type PurchaseRequestRow } from "@/components/PurchaseRequestsTable";

export const dynamic = "force-dynamic";

// Área interna de triagem das solicitações enviadas pelo formulário público.
export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!canManagePurchaseRequests(user)) {
    return <div className="alert error">Apenas administradores e gestores acessam esta área.</div>;
  }

  const params = await searchParams;

  let query = supabaseAdmin
    .from("purchase_requests")
    .select("id,request_number,requester_name,department,item_name,quantity,status,created_at")
    .order("created_at", { ascending: false });

  if (params.search) {
    const s = params.search.replace(/[().,]/g, " ").trim().slice(0, 100);
    if (s) {
      query = query.or(
        `request_number.ilike.%${s}%,requester_name.ilike.%${s}%,item_name.ilike.%${s}%,brand.ilike.%${s}%,requester_contact.ilike.%${s}%`,
      );
    }
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.department) query = query.ilike("department", `%${params.department.slice(0, 100)}%`);

  const { data } = await query;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Solicitações de Compra</h1>
          <p className="muted">Solicitações recebidas pelo formulário público — analise, aprove ou rejeite.</p>
        </div>
      </div>

      <PurchaseRequestsTable requests={(data ?? []) as PurchaseRequestRow[]} />
    </>
  );
}
