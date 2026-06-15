import { SectorsManager } from "@/components/SectorsManager";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export default async function SectorsPage() {
  const user = await requireUser();
  if (user.role !== "admin") return <div className="alert error">Apenas administradores acessam esta área.</div>;

  const [sectorsResult, subcategoriesResult] = await Promise.all([
    supabaseAdmin.from("sectors").select("*").order("name"),
    supabaseAdmin.from("subcategories").select("*").order("name"),
  ]);
  const sectors = sectorsResult.data ?? [];
  const subcategories = subcategoriesResult.data ?? [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Setores e subcategorias</h1>
          <p className="muted">Gerencie a estrutura do inventário da Alive Church.</p>
        </div>
      </div>
      <SectorsManager sectors={sectors} subcategories={subcategories} />
    </>
  );
}
