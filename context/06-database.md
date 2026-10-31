# Database Schema (Supabase PostgreSQL)

Units: all times are **seconds** (`NUMERIC(8,2)`), `duration` in seconds. Seed ids are deterministic UUIDs so shared links stay stable.

```sql
CREATE TABLE meetings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'zoom' CHECK (source IN ('zoom','meet','teams')),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration      INT  NOT NULL CHECK (duration > 0),
  audio_url     TEXT NOT NULL,                 -- /audio/<slug>.mp3
  summary_json  JSONB,                         -- see shape below
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  avatar_url  TEXT,
  color       TEXT NOT NULL,                   -- hex, per-speaker UI color
  UNIQUE (meeting_id, name)
);

CREATE TABLE transcript_segments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id     UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id),
  text           TEXT NOT NULL,
  start_time     NUMERIC(8,2) NOT NULL CHECK (start_time >= 0),
  end_time       NUMERIC(8,2) NOT NULL,
  seq            INT NOT NULL,                 -- stable ordering
  search_tsv     TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  CHECK (end_time > start_time),
  UNIQUE (meeting_id, seq)
);
CREATE INDEX idx_segments_meeting_time ON transcript_segments (meeting_id, start_time);
CREATE INDEX idx_segments_tsv ON transcript_segments USING GIN (search_tsv);

CREATE TABLE action_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  task              TEXT NOT NULL,
  assignee_id       UUID REFERENCES participants(id) ON DELETE SET NULL,
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date          DATE,
  position          INT NOT NULL DEFAULT 0,
  source_segment_id UUID REFERENCES transcript_segments(id) ON DELETE SET NULL,
  source_time       NUMERIC(8,2),              -- seek target when segment is gone
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_actions_meeting ON action_items (meeting_id, position);

CREATE TABLE clips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  start_time  NUMERIC(8,2) NOT NULL CHECK (start_time >= 0),
  end_time    NUMERIC(8,2) NOT NULL,
  share_slug  TEXT NOT NULL UNIQUE,            -- nanoid(10)
  created_by  TEXT NOT NULL DEFAULT 'demo-user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time AND end_time - start_time <= 120)
);
CREATE INDEX idx_clips_meeting ON clips (meeting_id, start_time);

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,                   -- anonymous, from localStorage
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  pill        TEXT,                            -- e.g. 'decisions','email','risks'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_session ON chat_messages (meeting_id, session_id, created_at);
```

## `summary_json` shape
```json
{
  "overview": "string",
  "decisions": [{ "text": "string", "time": 123.4 }],
  "key_topics": ["string"],
  "chapters": [{ "title": "string", "start_time": 0 }],
  "risks": [{ "text": "string", "severity": "low|medium|high", "time": 300 }]
}
```

## RLS
```sql
ALTER TABLE meetings, participants, transcript_segments, action_items, clips, chat_messages ENABLE ROW LEVEL SECURITY;
-- anon: SELECT only on all but chat_messages
CREATE POLICY read_all ON meetings FOR SELECT USING (true);  -- repeat for participants, transcript_segments, action_items, clips
-- chat_messages: no anon policy; accessed via service role in /api/chat*
```
(The multi-table `ALTER` above is shorthand; the migration issues one statement per table.)

## Requirement coverage
| Requirement | Tables / fields |
|---|---|
| 8-speaker meeting | `participants` (name, role, color) + `transcript_segments.participant_id` |
| Timestamp seek sync | `start_time/end_time`, index `(meeting_id,start_time)`, chapters in `summary_json` |
| Action item toggle | `action_items.completed/assignee_id/priority`, `PATCH /api/action-items/[id]` |
| AI chat | `chat_messages` + transcript/tasks as context |
| Clips + sharing | `clips.share_slug`, `/clip/[slug]` |
| Transcript search | `search_tsv` GIN index |
