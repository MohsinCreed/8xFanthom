import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_COOKIE_VALUE,
  AUTH_MAX_AGE,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  authCookieOptions,
} from "@/lib/auth";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, AUTH_COOKIE_VALUE, { ...authCookieOptions(), maxAge: AUTH_MAX_AGE });
  return res;
}
