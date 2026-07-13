import { NextResponse, type NextRequest } from "next/server";
import { decodeJwtExp } from "./src/lib/auth/decode-jwt-exp";

const PUBLIC_PATHS = ["/login", "/register", "/recover-password", "/reset-password"];

/**
 * @spec RULES.md S1, matrices/permissoes.md
 * Middleware SSR de proteção de rota — hoje ausente do repositório (achado IMPACTO-021 #1).
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const accessToken = request.cookies.get("nave_access_token")?.value;
  const accessTokenValid = accessToken ? isTokenValid(accessToken) : false;

  if (isPublicPath) {
    if (accessTokenValid) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (accessTokenValid) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get("nave_refresh_token")?.value;
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

async function tryRefreshSession(request: NextRequest): Promise<NextResponse | null> {
  const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/backend).*)"],
};
