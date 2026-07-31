import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canManageServiceOrders } from "@/lib/permissions";
import { canEditServiceOrder } from "@/lib/service-orders";
import { supabaseAdmin } from "@/lib/supabase";
import type { ServiceOrderStatus } from "@/lib/constants";
import { ServiceOrderForm, type ServiceOrderFormValues } from "@/components/ServiceOrderForm";

export const dynamic = "force-dynamic";

export default async function EditServiceOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageServiceOrders(user)) {
    return <div className="alert error">Apenas administradores e gestores acessam esta área.</div>;
  }

  const { id } = await params;
  const { data } = await supabaseAdmin.from("service_orders").select("*").eq("id", id).maybeSingle();
  if (!data) return <div className="alert error">Ordem de serviço não encontrada.</div>;

  if (!canEditServiceOrder(data.status as ServiceOrderStatus)) {
    return <div className="alert error">Somente rascunhos podem ser editados.</div>;
  }

  return (
    <div className="grid">
      <div>
        <Link href={`/service-orders/${id}`} className="back-link">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 style={{ marginTop: 6 }}>Editar rascunho</h1>
        <p className="muted">{data.title}</p>
      </div>

      <ServiceOrderForm order={data as ServiceOrderFormValues} defaultResponsible={user.name} />
    </div>
  );
}
