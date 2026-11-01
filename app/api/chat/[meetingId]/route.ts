import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({
  meetingId: z.string().uuid(),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
});

export async function GET(request: Request, ctx: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await ctx.params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const parsed = Params.safeParse({ meetingId, sessionId });
  if (!parsed.success) {
    return Response.json({ error: "bad_request", message: "Invalid request." }, { status: 400 });
  }

  try {
    const { data, error } = await getAdminClient()
      .from("chat_messages")
      .select("id, role, content, pill, created_at")
      .eq("meeting_id", parsed.data.meetingId)
      .eq("session_id", parsed.data.sessionId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return Response.json({ messages: data as ChatMessage[] });
  } catch (e) {
    console.error("[api/chat GET]", e);
    return Response.json({ error: "internal", message: "Something went wrong." }, { status: 500 });
  }
}
