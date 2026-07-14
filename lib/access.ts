// Rotas acessíveis sem sessão (avaliadas no middleware).
// - "/p": página pública consultiva dos QR Codes (identificação por public_code).
// - "/api/auth/login": autenticação.
// - "/api/stock/quick-withdraw": retirada rápida do voluntário SEM login. É a
//   ÚNICA rota de escrita pública e só permite SAÍDA (o handler fixa o tipo).
//   Sem esta entrada, o POST do voluntário era redirecionado (307) para /login;
//   o fetch seguia o redirect e recebia 200, fazendo a interface exibir sucesso
//   sem que nenhuma movimentação fosse registrada.
export const PUBLIC_PATHS = ["/login", "/api/auth/login", "/p", "/api/stock/quick-withdraw"];

// Casa o caminho exato ou qualquer subcaminho (`/p/E-123`), sem casar prefixos
// coincidentes indevidos (`/login-foo` NÃO é público).
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
