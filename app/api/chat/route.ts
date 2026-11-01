import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { getGroq, GROQ_MODEL } from "@/lib/groq";
import { buildMessages, loadHistory, loadMeetingData, sse } from "@/lib/chat-context";
import type { ChatStreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const Body = z.object({
  meetingId: z.string().uuid(),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  message: z.string().trim().min(1).max(2000),
  pill: z.enum(["decisions", "email", "risks", "summary", "missed"]).optional(),
  retry: z.boolean().optional(),
});

const json = (status: number, error: string, message: string) =>
  Response.json({ error, message }, { status });

const isRateLimit = (e: unknown) => (e as { status?: number })?.status === 429;

function startStream(messages: ReturnType<typeof buildMessages>, signal: AbortSignal) {
  return getGroq().chat.completions.create(
    {
      model: GROQ_MODEL,
      stream: true,
      temperature: 0.3,
      messages,
      // Groq-specific param for gpt-oss models; not in the OpenAI SDK types.
      reasoning_effort: "low",
    } as unknown as Parameters<ReturnType<typeof getGroq>["chat"]["completions"]["create"]>[0] & {
      stream: true;
    },
    { signal },
  );
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "bad_request", "Invalid request body.");
  const { meetingId, sessionId, message, pill, retry } = parsed.data;

  const db = getAdminClient();
  let stream: Awaited<ReturnType<typeof startStream>>;
  try {
    const data = await loadMeetingData(db, meetingId);
    if (!data) return json(404, "not_found", "Meeting not found.");
    let history = await loadHistory(db, meetingId, sessionId);

    // A retry reuses the user row left behind by the failed attempt instead of inserting a duplicate.
    let reuse = false;
    if (retry) {
      const latest = await db
        .from("chat_messages")
        .select("role, content, pill")
        .eq("meeting_id", meetingId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error) throw new Error(`lookup last: ${latest.error.message}`);
      const row = latest.data;
      reuse = !!row && row.role === "user" && row.content === message && (row.pill ?? null) === (pill ?? null);
    }
    // The reused row is already the last history turn; buildMessages appends the new message itself.
    if (reuse) history = history.slice(0, -1);
    const messages = buildMessages(data, history, message);

    if (!reuse) {
      const saved = await db.from("chat_messages").insert({
        meeting_id: meetingId, session_id: sessionId, role: "user", content: message, pill: pill ?? null,
      });
      if (saved.error) throw new Error(`persist user: ${saved.error.message}`);
    }

    stream = await startStream(messages, request.signal);
  } catch (e) {
    console.error("[api/chat]", e);
    if (isRateLimit(e)) return json(429, "rate_limited", "The AI is busy. Try again in a moment.");
    return json(500, "internal", "Something went wrong.");
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: ChatStreamEvent) => controller.enqueue(encoder.encode(sse(ev)));
      let text = "";
      let persisted = false;
      const persist = async () => {
        persisted = true;
        const row = await db
          .from("chat_messages")
          .insert({ meeting_id: meetingId, session_id: sessionId, role: "assistant", content: text, pill: pill ?? null })
          .select("id")
          .single();
        if (row.error) throw new Error(`persist assistant: ${row.error.message}`);
        return row.data.id as string;
      };
      try {
        for await (const chunk of stream) {
          // Reasoning arrives in delta.reasoning; only delta.content is forwarded.
          const piece = chunk.choices[0]?.delta?.content;
          if (piece) {
            text += piece;
            send({ type: "token", text: piece });
          }
        }
        send({ type: "done", messageId: await persist() });
      } catch (e) {
        if (request.signal.aborted) {
          // Client pressed Stop: keep the partial reply so history matches what they saw.
          // The db client is independent of the aborted request signal.
          if (!persisted && text.trim()) {
            try { await persist(); } catch (err) { console.error("[api/chat] persist partial", err); }
          }
        } else {
          console.error("[api/chat] stream", e);
          const status = (e as { status?: number })?.status;
          send({ type: "error", code: isRateLimit(e) ? "rate_limited" : status ? "upstream" : "internal" });
        }
      } finally {
        try { controller.close(); } catch { /* client already gone */ }
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
