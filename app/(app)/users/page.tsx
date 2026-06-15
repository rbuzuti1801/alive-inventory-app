import { UsersManager } from "@/components/UsersManager";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export default async function UsersPage() {
  const user = await requireUser();
  if (user.role !== "admin") return <div className="alert error">Apenas administradores acessam esta área.</div>;

  const [usersResult, sectorsResult] = await Promise.all([
    supabaseAdmin.from("users_internal").select("id,name,username,role,sector_id,active,sectors(name)").order("name"),
    supabaseAdmin.from("sectors").select("id,name").eq("active", true).order("name"),
  ]);
  const users = usersResult.data ?? [];
  const sectors = sectorsResult.data ?? [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Usuários internos</h1>
          <p className="muted">Criação e manutenção de acessos sem cadastro público.</p>
        </div>
      </div>
      <UsersManager users={users} sectors={sectors} />
    </>
  );
}
