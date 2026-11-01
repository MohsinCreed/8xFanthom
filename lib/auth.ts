// Demo-only auth gate (decision D42). Not real security: the cookie value is static.
export const DEMO_EMAIL = "demo@8xfathom.ai";
export const DEMO_PASSWORD = "fathom2026!";
export const AUTH_COOKIE = "fathom_demo_auth";
export const AUTH_COOKIE_VALUE = "true";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 7;

export function isAuthed(value: string | undefined): boolean {
  return value === AUTH_COOKIE_VALUE;
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
