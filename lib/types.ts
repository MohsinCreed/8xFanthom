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

/** Everything the workspace page needs. */
export interface MeetingWorkspaceData {
  meeting: Meeting;
  participants: Participant[];
  segments: Segment[];
  actionItems: ActionItem[];
  clips: Clip[];
}
