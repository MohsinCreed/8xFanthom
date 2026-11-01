import { nanoid } from "nanoid";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Clip } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLIP_SECONDS = 120;
const MAX_SLUG_ATTEMPTS = 3;

const Body = z
  .object({
    meetingId: z.string().uuid(),
    title: z.string().trim().min(1).max(80),
    startTime: z.number().finite(),
    endTime: z.number().finite(),
  })
  .strict();

const json = (status: number, error: string, message: string) =>
  Response.json({ error, message }, { status });

// Times are NUMERIC(8,2); PostgREST may return NUMERIC as a string.
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "bad_request", "Invalid request body.");
  const { meetingId, title } = parsed.data;
  const startTime = round2(parsed.data.startTime);
  const endTime = round2(parsed.data.endTime);

  try {
    const db = getAdminClient();
    const meeting = await db.from("meetings").select("id, duration").eq("id", meetingId).maybeSingle();
    if (meeting.error) throw new Error(`load meeting: ${meeting.error.message}`);
    if (!meeting.data) return json(404, "not_found", "Meeting not found.");

    const duration = Number(meeting.data.duration);
    if (startTime < 0 || startTime >= endTime || endTime > duration) {
      return json(400, "bad_request", "Pick a range inside the meeting.");
    }
    if (round2(endTime - startTime) > MAX_CLIP_SECONDS) {
      return json(400, "bad_request", "Clips can be at most 2 minutes long.");
    }

    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
      const slug = nanoid(10);
      const inserted = await db
        .from("clips")
        .insert({ meeting_id: meetingId, title, start_time: startTime, end_time: endTime, share_slug: slug })
        .select("*")
        .single();
      if (inserted.error) {
        if (inserted.error.code === "23505" && attempt < MAX_SLUG_ATTEMPTS) continue;
        throw new Error(`insert clip: ${inserted.error.message}`);
      }
      const row = inserted.data as Clip;
      const clip: Clip = { ...row, start_time: Number(row.start_time), end_time: Number(row.end_time) };
      return Response.json({ clip, url: `/clip/${clip.share_slug}` }, { status: 201 });
    }
    throw new Error("insert clip: slug retries exhausted");
  } catch (e) {
    console.error("[api/clips]", e);
    return json(500, "internal", "Something went wrong.");
  }
}
