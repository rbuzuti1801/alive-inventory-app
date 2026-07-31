import { defaultInstitution, type Institution } from "@/lib/institution";
import { supabaseAdmin } from "@/lib/supabase";

// Leitura do Perfil da Igreja (tabela singleton `church_profile`). Só roda no
// servidor — as páginas carregam o perfil e passam como prop para os
// componentes que geram os documentos.

export type ChurchProfile = {
  name: string;
  legal_name: string | null;
  document: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  updated_by_name: string | null;
  updated_at: string | null;
};

export async function loadChurchProfile(): Promise<ChurchProfile | null> {
  const { data } = await supabaseAdmin
    .from("church_profile")
    .select("name,legal_name,document,address,phone,email,website,logo_url,updated_by_name,updated_at")
    .limit(1)
    .maybeSingle();

  return (data as ChurchProfile | null) ?? null;
}

export function toInstitution(profile: ChurchProfile | null): Institution {
  if (!profile) return defaultInstitution;
  return {
    name: profile.name || defaultInstitution.name,
    legalName: profile.legal_name ?? "",
    document: profile.document ?? "",
    address: profile.address ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    website: profile.website ?? "",
    logoPath: profile.logo_url?.trim() || defaultInstitution.logoPath,
  };
}

/** Atalho para as páginas que só precisam do formato usado nos documentos. */
export async function loadInstitution(): Promise<Institution> {
  return toInstitution(await loadChurchProfile());
}
