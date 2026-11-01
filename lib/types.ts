export interface Summary {
  overview: string;
  decisions: { text: string; time: number }[];
  key_topics: string[];
  chapters: { title: string; start_time: number }[];
  risks: { text: string; severity: "low" | "medium" | "high"; time: number }[];
}

export interface Participant {
  id: string;
  meeting_id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  color: string;
}

export interface Segment {
  id: string;
  meeting_id: string;
  participant_id: string;
  text: string;
  start_time: number;
  end_time: number;
  seq: number;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  task: string;
  assignee_id: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  position: number;
  source_segment_id: string | null;
  source_time: number | null;
}

/** Body of `PATCH /api/action-items/[id]`; at least one field is required. Response: `{ item: ActionItem }`. */
export interface ActionItemPatch {
  completed?: boolean;
  assignee_id?: string | null;
  priority?: ActionItem["priority"];
}

/** Return value of `useActionItems` (`lib/useActionItems.ts`). Updates are optimistic and roll back on failure. */
export interface ActionItemsState {
  items: ActionItem[];
  done: number;
  /** Set when the last update failed and was rolled back; null otherwise. */
  error: string | null;
  dismissError: () => void;
  update: (id: string, patch: ActionItemPatch) => Promise<void>;
}

export interface Clip {
  id: string;
  meeting_id: string;
  title: string;
  start_time: number;
  end_time: number;
  share_slug: string;
  created_by: string;
  created_at: string;
}

/** Body of `POST /api/clips`. Server rules: 0 <= startTime < endTime <= meeting duration, length <= 120s, title 1-80 chars. Response 201: `{ clip: Clip, url: string }` (url is `/clip/<share_slug>`). */
export interface ClipCreateBody {
  meetingId: string;
  title: string;
  startTime: number;
  endTime: number;
}

/** Return value of `useClips` (`lib/useClips.ts`). `create` resolves with the new clip, or null on failure (and sets `error`). `remove` is optimistic and rolls back on failure. */
export interface ClipsState {
  clips: Clip[];
  error: string | null;
  dismissError: () => void;
  create: (input: { title: string; startTime: number; endTime: number }) => Promise<Clip | null>;
  remove: (id: string) => Promise<void>;
}

/** Range handed from "clip from here" in the transcript to the ClipCreator in the Clips tab. */
export interface ClipDraft {
  startTime: number;
  endTime: number;
  title?: string;
}

/** Everything the public `/clip/[slug]` page needs. */
export interface PublicClipData {
  clip: Clip;
  meeting: Meeting;
  participants: Participant[];
  /** Segments overlapping the clip range, in order. */
  segments: Segment[];
}

export interface Meeting {
  id: string;
  slug: string;
  title: string;
  source: "zoom" | "meet" | "teams";
  recorded_at: string;
  duration: number;
  audio_url: string;
  summary_json: Summary | null;
}

/** Row for the /meetings list. */
export interface MeetingListItem extends Meeting {
  participants: Participant[];
  tasks_total: number;
  tasks_done: number;
  clips_count: number;
}

/** Prompt pills in the chat drawer; prompt text lives in `lib/prompts.ts`. */
export type PillId = "decisions" | "email" | "risks" | "summary" | "missed";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pill: PillId | null;
  created_at: string;
}

/** Events streamed by `POST /api/chat` (one JSON object per SSE `data:` line). */
export type ChatStreamEvent =
  | { type: "token"; text: string }
  | { type: "done"; messageId: string }
  | { type: "error"; code: "rate_limited" | "upstream" | "internal" };

/** Everything the workspace page needs. */
export interface MeetingWorkspaceData {
  meeting: Meeting;
  participants: Participant[];
  segments: Segment[];
  actionItems: ActionItem[];
  clips: Clip[];
}
