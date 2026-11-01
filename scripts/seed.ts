/**
 * Idempotent seed: upserts meetings, participants, segments, action items and clips
 * with deterministic UUIDs, so re-running never duplicates and shared links stay stable.
 *   npx tsx scripts/seed.ts            # keeps existing summaries
 *   npx tsx scripts/seed.ts --summary  # (re)generate summaries via Groq
 * Requires seed/timings/<slug>.json (run scripts/generate-audio.ts first).
 */
import WebSocket from 'ws';
(globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateSummary } from "../lib/summary";

config({ path: ".env.local" });

const SEED_DIR = path.join(process.cwd(), "seed");

interface SeedMeeting {
  slug: string;
  title: string;
  source: "zoom" | "meet" | "teams";
  recorded_at: string;
  participants: { key: string; name: string; role: string; color: string }[];
  segments: { p: string; text: string }[];
  action_items: {
    task: string;
    assignee: string;
    priority: "low" | "medium" | "high";
    due_date: string | null;
    completed: boolean;
    source_seq: number;
  }[];
  clips: { title: string; start_seq: number; end_seq: number }[];
}
interface Timings {
  duration: number;
  segments: { seq: number; start: number; end: number }[];
}

/** Deterministic UUID (v5-style) from a name. */
function uuid(name: string): string {
  const h = crypto.createHash("sha1").update(`8x-fathom:${name}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (set it in .env.local)`);
  return v;
}

async function main() {
  const withSummary = process.argv.includes("--summary");
  const db = createClient(must("NEXT_PUBLIC_SUPABASE_URL"), process.env.SUPABASE_SECRET_KEY ?? must("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const m: SeedMeeting = JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), "utf8"));
    const timingsPath = path.join(SEED_DIR, "timings", `${m.slug}.json`);
    if (!fs.existsSync(timingsPath)) throw new Error(`No timings for ${m.slug}; run generate-audio first`);
    const timings: Timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
    if (timings.segments.length !== m.segments.length)
      throw new Error(`${m.slug}: timings out of date (segments changed); regenerate audio`);

    const meetingId = uuid(`meeting:${m.slug}`);
    const pid = (key: string) => uuid(`participant:${m.slug}:${key}`);
    const sid = (seq: number) => uuid(`segment:${m.slug}:${seq}`);
    const nameOf = Object.fromEntries(m.participants.map((p) => [p.key, p]));
    for (const s of m.segments) if (!nameOf[s.p]) throw new Error(`${m.slug}: unknown speaker ${s.p}`);

    const up = async (table: string, rows: object[], onConflict = "id") => {
      const { error } = await db.from(table).upsert(rows, { onConflict });
      if (error) throw new Error(`${m.slug} ${table}: ${error.message}`);
    };

    await up("meetings", [
      {
        id: meetingId,
        slug: m.slug,
        title: m.title,
        source: m.source,
        recorded_at: m.recorded_at,
        duration: Math.ceil(timings.duration),
        audio_url: `/audio/${m.slug}.mp3`,
      },
    ]);
    await up(
      "participants",
      m.participants.map((p) => ({
        id: pid(p.key),
        meeting_id: meetingId,
        name: p.name,
        role: p.role,
        color: p.color,
      })),
    );
    await up(
      "transcript_segments",
      m.segments.map((s, i) => ({
        id: sid(i),
        meeting_id: meetingId,
        participant_id: pid(s.p),
        text: s.text,
        start_time: timings.segments[i].start,
        end_time: timings.segments[i].end,
        seq: i,
      })),
    );
    await up(
      "action_items",
      m.action_items.map((a, i) => ({
        id: uuid(`action:${m.slug}:${i}`),
        meeting_id: meetingId,
        task: a.task,
        assignee_id: pid(a.assignee),
        completed: a.completed,
        priority: a.priority,
        due_date: a.due_date,
        position: i,
        source_segment_id: sid(a.source_seq),
        source_time: timings.segments[a.source_seq].start,
      })),
    );
    await up(
      "clips",
      m.clips.map((c, i) => {
        const start = timings.segments[c.start_seq].start;
        const end = timings.segments[c.end_seq].end;
        if (end - start > 120) throw new Error(`${m.slug}: clip "${c.title}" exceeds 120s`);
        return {
          id: uuid(`clip:${m.slug}:${i}`),
          meeting_id: meetingId,
          title: c.title,
          start_time: start,
          end_time: end,
          share_slug: crypto.createHash("sha1").update(`clip:${m.slug}:${i}`).digest("hex").slice(0, 10),
          created_by: "demo-user",
        };
      }),
    );

    const { data: existing } = await db.from("meetings").select("summary_json").eq("id", meetingId).single();
    if (withSummary || !existing?.summary_json) {
      if (!process.env.GROQ_API_KEY) {
        console.warn(`  ! ${m.slug}: GROQ_API_KEY missing, skipping summary`);
      } else {
        const summary = await generateSummary({
          title: m.title,
          participants: m.participants,
          segments: m.segments.map((s, i) => ({
            speaker: nameOf[s.p].name,
            text: s.text,
            start_time: timings.segments[i].start,
            end_time: timings.segments[i].end,
          })),
        });
        const { error } = await db.from("meetings").update({ summary_json: summary }).eq("id", meetingId);
        if (error) throw new Error(`${m.slug} summary: ${error.message}`);
      }
    }
    console.log(
      `✓ ${m.slug}: ${m.participants.length} speakers, ${m.segments.length} segments, ` +
        `${m.action_items.length} tasks, ${m.clips.length} clips`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
