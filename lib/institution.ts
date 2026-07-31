// Dados institucionais impressos no cabeçalho dos documentos (Solicitação de
// Compra aprovada e Ordem de Serviço). A fonte é a tabela singleton
// `church_profile`, editável em /church-profile pelo admin — ver
// lib/institution-server.ts para a leitura.
//
// Este arquivo é puro de propósito: ele viaja para o cliente junto com
// lib/print.ts, então não pode importar `supabaseAdmin`.

export type Institution = {
  name: string;
  legalName: string;
  document: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  /** Caminho/URL do logo; vazio usa o arquivo padrão servido pelo app. */
  logoPath: string;
};

// Usado enquanto o perfil não foi preenchido (ou se a leitura falhar): o
// documento sai com a identidade da igreja, apenas sem os dados cadastrais.
export const defaultInstitution: Institution = {
  name: "Alive Church",
  legalName: "",
  document: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logoPath: "/logo.png",
};

/** Linhas do cabeçalho que estão preenchidas (as vazias não ocupam espaço). */
export function institutionLines(institution: Institution): string[] {
  const contact = [institution.phone, institution.email, institution.website].filter((v) => v.trim() !== "").join(" · ");
  return [institution.legalName, institution.document, institution.address, contact].filter((line) => line.trim() !== "");
}
