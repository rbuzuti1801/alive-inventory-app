import { requireUser } from "@/lib/auth";
import { loadChurchProfile } from "@/lib/institution-server";
import { canManageChurchProfile } from "@/lib/permissions";
import { ChurchProfileForm } from "@/components/ChurchProfileForm";

export const dynamic = "force-dynamic";

// Configurações › Perfil da Igreja. É a fonte dos dados institucionais que
// aparecem no cabeçalho dos documentos impressos.
export default async function ChurchProfilePage() {
  const user = await requireUser();
  if (!canManageChurchProfile(user)) {
    return <div className="alert error">Apenas administradores acessam esta área.</div>;
  }

  const profile = await loadChurchProfile();

  return (
    <div className="grid">
      <div className="topbar">
        <div>
          <h1>Perfil da Igreja</h1>
          <p className="muted">
            Dados institucionais usados no cabeçalho dos documentos (Solicitação de Compra e Ordem de Serviço).
          </p>
        </div>
      </div>

      <ChurchProfileForm profile={profile} />
    </div>
  );
}
