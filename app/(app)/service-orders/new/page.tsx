import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canManageServiceOrders } from "@/lib/permissions";
import { ServiceOrderForm } from "@/components/ServiceOrderForm";

export default async function NewServiceOrderPage() {
  const user = await requireUser();
  if (!canManageServiceOrders(user)) {
    return <div className="alert error">Apenas administradores e gestores acessam esta área.</div>;
  }

  return (
    <div className="grid">
      <div>
        <Link href="/service-orders" className="back-link">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 style={{ marginTop: 6 }}>Nova ordem de serviço</h1>
        <p className="muted">A ordem é salva como rascunho — o número é atribuído na emissão.</p>
      </div>

      <ServiceOrderForm defaultResponsible={user.name} />
    </div>
  );
}
