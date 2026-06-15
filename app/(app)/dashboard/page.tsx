import Link from "next/link";
import { Badge } from "@/components/Badge";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { conservationLabels } from "@/lib/constants";

export default async function DashboardPage() {
  await requireUser();
  const { data } = await supabaseAdmin
    .from("inventory_items")
    .select("id,item_code,description,quantity,acquisition_value,conservation_status,status,updated_at,sectors(name)")
    .order("updated_at", { ascending: false });
  const items = data ?? [];

  const active = items.filter((item) => item.status === "ativo");
  const totalActiveItems = active.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const totalValue = active.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.acquisition_value ?? 0), 0);
  const damagedItems = active.filter((item) => item.conservation_status === "danificado").length;
  const maintenanceItems = active.filter((item) => item.conservation_status === "em_manutencao").length;
  const bySector = active.reduce<Record<string, number>>((acc, item) => {
    const sector = (item.sectors as { name?: string } | null)?.name ?? "Sem setor";
    acc[sector] = (acc[sector] ?? 0) + Number(item.quantity ?? 0);
    return acc;
  }, {});

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Visão geral do inventário ativo da Alive Church.</p>
        </div>
        <Link className="button" href="/inventory/new">Novo item</Link>
      </div>

      <section className="grid cards">
        <div className="card"><span className="muted">Itens ativos</span><div className="card-value">{totalActiveItems}</div></div>
        <div className="card"><span className="muted">Valor estimado</span><div className="card-value">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>
        <div className="card"><span className="muted">Danificados</span><div className="card-value">{damagedItems}</div></div>
        <div className="card"><span className="muted">Em manutenção</span><div className="card-value">{maintenanceItems}</div></div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 18 }}>
        <div className="panel">
          <h2>Itens por setor</h2>
          {Object.entries(bySector).length === 0 && <p className="muted">Nenhum item ativo cadastrado.</p>}
          {Object.entries(bySector).map(([sector, count]) => (
            <p key={sector}><strong>{sector}</strong>: {count}</p>
          ))}
        </div>
        <div className="panel">
          <h2>Últimas atualizações</h2>
          {items.slice(0, 8).map((item) => (
            <p key={item.id}>
              <Link href={`/inventory/${item.id}`}><strong>{item.item_code}</strong> - {item.description}</Link>{" "}
              <Badge kind="conservation" value={item.conservation_status} />
            </p>
          ))}
          {active.some((item) => item.conservation_status === "danificado" || item.conservation_status === "em_manutencao") && (
            <p className="muted">Destaques: {conservationLabels.danificado} e {conservationLabels.em_manutencao} aparecem com badges coloridas.</p>
          )}
        </div>
      </section>
    </>
  );
}
