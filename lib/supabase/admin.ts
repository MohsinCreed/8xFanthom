import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clientOptions } from "./options";

/** Server-only client with the secret key. Bypasses RLS; use in route handlers only. */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL / secret key not set");
  return createClient(url, key, clientOptions);
}
