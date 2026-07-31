import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "@/lib/access";

// Só aceita retornos relativos internos (evita open redirect via ?next=).
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const hasSession = Boolean(request.cookies.get("alive_inventory_session")?.value);

  if (!isPublic && !hasSession && !pathname.startsWith("/_next")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasSession) {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
  }

  return NextResponse.next();
}

// `logo.png` fica fora do gate: é o logo institucional usado no cabeçalho dos
// documentos imprimíveis, carregado por uma janela de impressão que pode não
// levar a sessão — sem a isenção o PDF sairia sem o logo.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
