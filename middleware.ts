import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthed } from "@/lib/auth";

// Demo-only gate: see lib/auth.ts and decision D42.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = isAuthed(req.cookies.get(AUTH_COOKIE)?.value);

  if (pathname === "/login") {
    if (authed) return NextResponse.redirect(new URL("/meetings", req.url));
    return NextResponse.next();
  }

  const isPublic =
    pathname === "/clip" ||
    pathname.startsWith("/clip/") ||
    pathname.startsWith("/audio/") ||
    pathname.startsWith("/api/auth/");
  if (isPublic) return NextResponse.next();

  if (authed) {
    if (pathname === "/") return NextResponse.redirect(new URL("/meetings", req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|woff|woff2|css|js|map|txt|xml)$).*)",
  ],
};
