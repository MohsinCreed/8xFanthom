import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SYSTEM_PROMPT } from "./prompts";
import { compactTranscript, fmtTime } from "./transcript";
import type { ActionItem, ChatStreamEvent, Meeting, Participant, Segment } from "./types";

export const TOKEN_BUDGET = 12_000;
export const MAX_HISTORY_TURNS = 12;

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface MeetingData {
  meeting: Meeting;
  participants: Participant[];
  segments: Segment[];
  actionItems: ActionItem[];
}

const tokens = (s: string) => Math.ceil(s.length / 4);

export function sse(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Loads everything the prompt needs; null when the meeting does not exist. */
export async function loadMeetingData(db: SupabaseClient, id: string): Promise<MeetingData | null> {
  const [m, p, s, a] = await Promise.all([
    db.from("meetings").select("*").eq("id", id).maybeSingle(),
    db.from("participants").select("*").eq("meeting_id", id),
    db.from("transcript_segments").select("*").eq("meeting_id", id).order("start_time"),
    db.from("action_items").select("*").eq("meeting_id", id).order("position"),
  ]);
  const err = m.error ?? p.error ?? s.error ?? a.error;
  if (err) throw new Error(`loadMeetingData: ${err.message}`);
  if (!m.data) return null;
  return {
    meeting: m.data as Meeting,
    participants: p.data as Participant[],
    segments: (s.data as Segment[]).map((x) => ({
      ...x,
      start_time: Number(x.start_time),
      end_time: Number(x.end_time),
    })),
    actionItems: a.data as ActionItem[],
  };
}

function header(d: MeetingData): string {
  const date = new Date(d.meeting.recorded_at).toISOString().slice(0, 10);
  const roster = d.participants.map((p) => `${p.name} - ${p.role ?? "participant"}`).join("\n");
  const names = new Map(d.participants.map((p) => [p.id, p.name]));
  const tasks = d.actionItems
    .map((t) => {
      const who = (t.assignee_id && names.get(t.assignee_id)) || "unassigned";
      return `- ${t.task} (${who}, ${t.completed ? "done" : "open"}, ${t.priority} priority)`;
    })
    .join("\n");
  return `Meeting: ${d.meeting.title}\nDate: ${date}\n\nParticipants:\n${roster}`
    + `\n\nCurrent action items:\n${tasks || "(none)"}`;
}

function summaryBlock(d: MeetingData): string {
  const s = d.meeting.summary_json;
  if (!s) return "";
  const at = (t: number) => `[${fmtTime(t)}]`;
  return [
    `Summary: ${s.overview}`,
    `Decisions:\n${s.decisions.map((x) => `- ${at(x.time)} ${x.text}`).join("\n")}`,
    `Chapters:\n${s.chapters.map((x) => `- ${at(x.start_time)} ${x.title}`).join("\n")}`,
    `Risks:\n${s.risks.map((x) => `- ${at(x.time)} (${x.severity}) ${x.text}`).join("\n")}`,
  ].join("\n\n");
}

/** Keeps the start and end of the transcript and cuts the middle to fit `maxChars`. */
function trimMiddle(lines: string[], maxChars: number): string {
  const total = lines.reduce((n, l) => n + l.length + 1, 0);
  if (total <= maxChars) return lines.join("\n");
  const keep = (from: number, step: 1 | -1, limit: number) => {
    const out: string[] = [];
    let used = 0;
    for (let i = from; i >= 0 && i < lines.length; i += step) {
      used += lines[i].length + 1;
      if (used > limit) break;
      out.push(lines[i]);
    }
    return out;
  };
  const head = keep(0, 1, maxChars / 2);
  const tail = keep(lines.length - 1, -1, maxChars / 2).reverse();
  return [...head, "[... middle of transcript omitted; see the summary above ...]", ...tail].join("\n");
}

/**
 * system = prompt + context, then history, then the new user message.
 * Over budget: drop oldest history first, then fall back to summary + trimmed transcript.
 */
export function buildMessages(d: MeetingData, history: Turn[], message: string) {
  const names = new Map(d.participants.map((p) => [p.id, p.name]));
  const lines = d.segments.map((s) =>
    compactTranscript([{ ...s, speaker: names.get(s.participant_id) ?? "Unknown" }]),
  );
  const head = `${SYSTEM_PROMPT}\n\n${header(d)}`;
  const system = (body: string) => `${head}\n\n${body}`;

  let turns = history.slice(-MAX_HISTORY_TURNS);
  const cost = (sys: string) =>
    tokens(sys) + tokens(message) + turns.reduce((n, t) => n + tokens(t.content), 0);

  let sys = system(`Transcript:\n${lines.join("\n")}`);
  while (cost(sys) > TOKEN_BUDGET && turns.length) turns = turns.slice(1);
  if (cost(sys) > TOKEN_BUDGET) {
    const summary = summaryBlock(d);
    const fixed = tokens(system(summary)) + tokens(message) + 200;
    const maxChars = Math.max(4000, (TOKEN_BUDGET - fixed) * 4);
    sys = system(`${summary}\n\nTranscript (trimmed):\n${trimMiddle(lines, maxChars)}`);
  }

  return [
    { role: "system" as const, content: sys },
    ...turns,
    { role: "user" as const, content: message },
  ];
}

/** Last persisted turns for this (meeting, session), oldest first. */
export async function loadHistory(db: SupabaseClient, meetingId: string, sessionId: string): Promise<Turn[]> {
  const { data, error } = await db
    .from("chat_messages")
    .select("role, content")
    .eq("meeting_id", meetingId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_TURNS);
  if (error) throw new Error(`loadHistory: ${error.message}`);
  return (data as Turn[]).reverse();
}
