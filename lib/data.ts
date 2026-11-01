import { getReadClient } from "./supabase/server";
import type {
  ActionItem, Clip, Meeting, MeetingListItem, MeetingWorkspaceData, Participant, Segment,
} from "./types";

// NUMERIC columns come back as numbers from PostgREST, but be defensive.
const n = (v: unknown) => Number(v);

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

export async function getMeetings(): Promise<MeetingListItem[]> {
  const db = getReadClient();
  const [m, p, a, c] = await Promise.all([
    db.from("meetings").select("*").order("recorded_at", { ascending: false }),
    db.from("participants").select("*"),
    db.from("action_items").select("meeting_id, completed"),
    db.from("clips").select("meeting_id"),
  ]);
  if (m.error) fail("meetings", m.error);
  if (p.error) fail("participants", p.error);
  if (a.error) fail("action_items", a.error);
  if (c.error) fail("clips", c.error);

  return (m.data as Meeting[]).map((meeting) => {
    const tasks = (a.data ?? []).filter((t) => t.meeting_id === meeting.id);
    return {
      ...meeting,
      participants: (p.data as Participant[]).filter((x) => x.meeting_id === meeting.id),
      tasks_total: tasks.length,
      tasks_done: tasks.filter((t) => t.completed).length,
      clips_count: (c.data ?? []).filter((x) => x.meeting_id === meeting.id).length,
    };
  });
}

export async function getMeetingWorkspace(id: string): Promise<MeetingWorkspaceData | null> {
  const db = getReadClient();
  const [m, p, s, a, c] = await Promise.all([
    db.from("meetings").select("*").eq("id", id).maybeSingle(),
    db.from("participants").select("*").eq("meeting_id", id),
    db.from("transcript_segments").select("id, meeting_id, participant_id, text, start_time, end_time, seq").eq("meeting_id", id).order("start_time"),
    db.from("action_items").select("*").eq("meeting_id", id).order("position"),
    db.from("clips").select("*").eq("meeting_id", id).order("start_time"),
  ]);
  if (m.error) fail("meeting", m.error);
  if (!m.data) return null;
  if (p.error) fail("participants", p.error);
  if (s.error) fail("segments", s.error);
  if (a.error) fail("action_items", a.error);
  if (c.error) fail("clips", c.error);

  return {
    meeting: m.data as Meeting,
    participants: p.data as Participant[],
    segments: (s.data as Segment[]).map((x) => ({ ...x, start_time: n(x.start_time), end_time: n(x.end_time) })),
    actionItems: (a.data as ActionItem[]).map((x) => ({
      ...x,
      source_time: x.source_time == null ? null : n(x.source_time),
    })),
    clips: (c.data as Clip[]).map((x) => ({ ...x, start_time: n(x.start_time), end_time: n(x.end_time) })),
  };
}
