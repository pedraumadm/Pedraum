// =============================
// middleware.ts
// =============================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get("userLoggedIn")?.value;
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  const isPublicRoute = [
    "/",
    "/sobre",
    "/termos",
    "/privacidade",
    "/blog",
  ].some((path) => request.nextUrl.pathname.startsWith(path));

  if (!isLoggedIn && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
