-- 8x / Fathom alternative: initial schema. See context/06-database.md.
-- Times are seconds (NUMERIC). Seeded rows use deterministic UUIDs (see scripts/seed.ts).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS meetings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'zoom' CHECK (source IN ('zoom','meet','teams')),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration      INT  NOT NULL CHECK (duration > 0),
  audio_url     TEXT NOT NULL,
  summary_json  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  avatar_url  TEXT,
  color       TEXT NOT NULL,
  UNIQUE (meeting_id, name)
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id     UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id),
  text           TEXT NOT NULL,
  start_time     NUMERIC(8,2) NOT NULL CHECK (start_time >= 0),
  end_time       NUMERIC(8,2) NOT NULL,
  seq            INT NOT NULL,
  search_tsv     TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  CHECK (end_time > start_time),
  UNIQUE (meeting_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_segments_meeting_time ON transcript_segments (meeting_id, start_time);
CREATE INDEX IF NOT EXISTS idx_segments_tsv ON transcript_segments USING GIN (search_tsv);

CREATE TABLE IF NOT EXISTS action_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  task              TEXT NOT NULL,
  assignee_id       UUID REFERENCES participants(id) ON DELETE SET NULL,
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date          DATE,
  position          INT NOT NULL DEFAULT 0,
  source_segment_id UUID REFERENCES transcript_segments(id) ON DELETE SET NULL,
  source_time       NUMERIC(8,2),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actions_meeting ON action_items (meeting_id, position);

CREATE TABLE IF NOT EXISTS clips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  start_time  NUMERIC(8,2) NOT NULL CHECK (start_time >= 0),
  end_time    NUMERIC(8,2) NOT NULL,
  share_slug  TEXT NOT NULL UNIQUE,
  created_by  TEXT NOT NULL DEFAULT 'demo-user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time AND end_time - start_time <= 120)
);
CREATE INDEX IF NOT EXISTS idx_clips_meeting ON clips (meeting_id, start_time);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  pill        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages (meeting_id, session_id, created_at);

-- RLS: anon may read everything except chat_messages; all writes go through
-- server route handlers using the service-role key (which bypasses RLS).
ALTER TABLE meetings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages       ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_meetings   ON meetings            FOR SELECT USING (true);
CREATE POLICY read_participants ON participants      FOR SELECT USING (true);
CREATE POLICY read_segments   ON transcript_segments FOR SELECT USING (true);
CREATE POLICY read_actions    ON action_items        FOR SELECT USING (true);
CREATE POLICY read_clips      ON clips               FOR SELECT USING (true);
