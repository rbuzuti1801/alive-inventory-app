// Dados institucionais impressos no cabeçalho dos documentos (Solicitação de
// Compra aprovada e Ordem de Serviço). Ficam centralizados aqui — mesma ideia
// dos labels de lib/constants.ts — para que qualquer documento novo herde o
// mesmo cabeçalho sem duplicar texto.
//
// Os campos podem ser sobrescritos por variável de ambiente (sem código novo)
// quando a igreja formalizar CNPJ/endereço/contato definitivos.

export const institution = {
  name: process.env.NEXT_PUBLIC_INSTITUTION_NAME ?? "Alive Church",
  legalName: process.env.NEXT_PUBLIC_INSTITUTION_LEGAL_NAME ?? "Alive Church Alphaville",
  document: process.env.NEXT_PUBLIC_INSTITUTION_DOCUMENT ?? "",
  address: process.env.NEXT_PUBLIC_INSTITUTION_ADDRESS ?? "",
  contact: process.env.NEXT_PUBLIC_INSTITUTION_CONTACT ?? "",
  // Logo servido pela aplicação (public/logo.png).
  logoPath: "/logo.png",
} as const;

/** Linhas do cabeçalho que estão preenchidas (as vazias não ocupam espaço). */
export function institutionLines(): string[] {
  return [institution.legalName, institution.document, institution.address, institution.contact].filter(
    (line) => line.trim() !== "",
  );
}
