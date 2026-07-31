// Rotas acessíveis sem sessão (avaliadas no middleware).
// - "/p": página pública consultiva dos QR Codes (identificação por public_code).
// - "/api/auth/login": autenticação.
// - "/api/stock/quick-withdraw": retirada rápida do voluntário SEM login. É a
//   ÚNICA rota de escrita pública e só permite SAÍDA (o handler fixa o tipo).
//   Sem esta entrada, o POST do voluntário era redirecionado (307) para /login;
//   o fetch seguia o redirect e recebia 200, fazendo a interface exibir sucesso
//   sem que nenhuma movimentação fosse registrada.
// - "/solicitacao-compra" + "/api/purchase-requests/public": formulário público
//   de Solicitação de Compra. Só o caminho ".../public" é liberado — a triagem
//   (/api/purchase-requests/{id}) continua exigindo sessão, por isso a rota
//   pública é um caminho-folha e não o prefixo do recurso.
export const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/p",
  "/api/stock/quick-withdraw",
  "/solicitacao-compra",
  "/api/purchase-requests/public",
];

// Casa o caminho exato ou qualquer subcaminho (`/p/E-123`), sem casar prefixos
// coincidentes indevidos (`/login-foo` NÃO é público).
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
