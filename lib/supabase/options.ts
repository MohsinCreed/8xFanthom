import ws from "ws";

/** We never use Realtime, but supabase-js constructs it eagerly and Node 20 has no native WebSocket. */
export const clientOptions = {
  auth: { persistSession: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
} as const;
