import { NextResponse, type NextRequest } from "next/server";

// "/p" é a página pública consultiva dos QR Codes (identificação por public_code).
const publicPaths = ["/login", "/api/auth/login", "/p"];

// Só aceita retornos relativos internos (evita open redirect via ?next=).
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
