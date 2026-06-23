import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AuditList } from "@/components/AuditList";

export default async function AuditPage() {
  await requireUser();

  const [auditsRes, sectorsRes] = await Promise.all([
    supabaseAdmin
      .from("inventory_audits")
      .select("*,sectors(name)")
      .order("started_at", { ascending: false })
      .limit(30),
    supabaseAdmin.from("sectors").select("id,name").eq("active", true).order("name"),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Inventário por Escaneamento</h1>
          <p className="muted">Inicie uma auditoria, escaneie os itens encontrados e acompanhe o progresso.</p>
        </div>
      </div>
      <AuditList audits={auditsRes.data ?? []} sectors={sectorsRes.data ?? []} />
    </>
  );
}
