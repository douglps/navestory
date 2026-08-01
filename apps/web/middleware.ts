import { NextResponse, type NextRequest } from "next/server";
import { decodeJwtExp } from "./src/lib/auth/decode-jwt-exp";
import { decodeJwtRole } from "./src/lib/auth/decode-jwt-role";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/recover-password",
  "/reset-password",
];
// @spec SPEC-20260720-001 RF-04 — acessíveis com ou sem sessão, sem nenhum redirect
// (diferente de PUBLIC_PATHS, que redireciona usuário já logado para AUTHENTICATED_HOME).
// @spec SPEC-20260719-001 (Notas Técnicas — "Tela de restore e grupo de rota") — /restore-account
// também entra aqui: o usuário chega com uma conta soft-deleted (JWT do Supabase ainda válido,
// mas bloqueada pelo guard do navestory). Sem token nenhum, a própria chamada a POST /users/me/restore
// falha com 401 tratado pela página; não há necessidade de o middleware forçar /login antes.
const ALWAYS_PUBLIC_PATHS = ["/privacidade", "/termos", "/restore-account"];
const AUTHENTICATED_HOME = "/dashboard";

/**
 * @spec RULES.md S1, matrices/permissoes.md
 * Middleware SSR de proteção de rota.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("navestory_access_token")?.value;
  const accessTokenValid = accessToken ? isTokenValid(accessToken) : false;

  // "/" é a landing pública (não faz parte de PUBLIC_PATHS via startsWith porque
  // toda pathname começa com "/" — precisa de comparação exata).
  if (pathname === "/") {
    if (accessTokenValid) {
      return NextResponse.redirect(new URL(AUTHENTICATED_HOME, request.url));
    }
    return NextResponse.next();
  }

  if (ALWAYS_PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    if (accessTokenValid) {
      return NextResponse.redirect(new URL(AUTHENTICATED_HOME, request.url));
    }
    return NextResponse.next();
  }

  if (accessTokenValid) {
    // @spec SPEC-20260731-008 RF-09 — conveniência de UX (redireciona sem expor dados admin
    // na UI); a garantia real é o RolesGuard no backend, independente do que a UI exibir.
    if (
      pathname.startsWith("/admin") &&
      decodeJwtRole(accessToken as string) !== "admin"
    ) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get("navestory_refresh_token")?.value;
  if (refreshToken) {
    const refreshed = await tryRefreshSession(request);
    if (refreshed) {
      return refreshed;
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

function isTokenValid(token: string): boolean {
  const expiresAt = decodeJwtExp(token);
  return expiresAt !== null && expiresAt > Date.now();
}

async function tryRefreshSession(
  request: NextRequest,
): Promise<NextResponse | null> {
  const apiInternalUrl =
    process.env.API_INTERNAL_URL ?? "http://localhost:3001";

  try {
    const response = await fetch(`${apiInternalUrl}/auth/refresh`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });

    if (!response.ok) {
      return null;
    }

    const nextResponse = NextResponse.next();
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      nextResponse.headers.append("set-cookie", cookie);
    }
    return nextResponse;
  } catch {
    return null;
  }
}

// @spec SPEC-20260712-001 RF-05, RF-07
// `/serwist`, `/manifest.webmanifest`, `/icons` e `/offline` precisam ser alcançáveis sem
// sessão válida: o navegador registra/re-busca o Service Worker mesmo deslogado ou com JWT
// expirado (EC-04), e a página de fallback offline (RF-07) não pode depender de auth.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/backend|serwist|manifest.webmanifest|icons|offline).*)",
  ],
};
