# Architecture

## Data flow
```
Browser (Next.js RSC + client islands)
  ├─ Reads  → Supabase (anon key, select-only RLS) via server components
  ├─ Writes → Next.js route handlers → Supabase (service role, server only)
  └─ Chat   → POST /api/chat (SSE stream) → Groq openai/gpt-oss-120b
Static: /public/audio/<meeting-slug>.mp3 (pre-generated multi-voice TTS)
```
No auth. A hardcoded `DEMO_USER` (id/name/avatar in `lib/demo-user.ts`) supplies attribution for `created_by` and assignee defaults.

## Database workflow requirement
All Postgres schema management, table creation, and Supabase integration tasks must leverage the Supabase agent plugin (the `supabase:supabase` and `supabase:supabase-postgres-best-practices` skills and Supabase MCP tools). That covers migrations, schema validation, RLS checks, index/performance review, and advisor checks. `supabase/migrations/*.sql` stays the source of truth in git; the plugin applies and validates it. Only the seed script (`scripts/seed.ts`) writes data directly.

## Folder layout
```
app/
  layout.tsx                      # shell: sidebar + top bar
  page.tsx                        # redirect → /meetings
  meetings/page.tsx               # list + search
  meetings/[id]/page.tsx          # workspace (server component loads everything)
  clip/[slug]/page.tsx            # public clip page (+ generateMetadata for OG)
  api/chat/route.ts               # POST, streams Groq response, persists messages
  api/chat/[meetingId]/route.ts   # GET history by session_id
  api/action-items/[id]/route.ts  # PATCH completed/assignee/priority
  api/clips/route.ts              # POST create clip
components/
  shell/{Sidebar,TopBar}.tsx
  meetings/{MeetingCard,MeetingList,SearchBar}.tsx
  workspace/{PlayerProvider,AudioPlayer,Timeline,TranscriptPane,TranscriptLine,SummaryPanel,ChapterList,WorkspaceTabs}.tsx
  actions/{ActionBoard,ActionCard,AssigneePicker}.tsx
  clips/{ClipList,ClipCreator,ClipPlayer,ShareButton}.tsx
  chat/{ChatDrawer,PromptPills,MessageBubble}.tsx
  ui/                             # shadcn primitives
lib/
  supabase/{server,admin,types}.ts
  groq.ts                         # OpenAI SDK client, baseURL https://api.groq.com/openai/v1
  transcript.ts                   # compactTranscript(), findActiveIndex() (binary search), fmtTime()
  prompts.ts                      # pill → system prompt map
  demo-user.ts
scripts/
  generate-audio.ts               # TTS per segment, stitch, emit segment timings JSON
  seed.ts                         # idempotent upsert from seed/*.json
seed/                             # hero.json + 3 short meetings
supabase/migrations/0001_init.sql
```

## Key mechanisms
**Player sync.** `PlayerProvider` (React context) owns the single `<audio>` element and exposes `currentTime`, `isPlaying`, `seek(t)`, `playRange(start,end)`. `currentTime` updates from `timeupdate` (~250ms) plus rAF while playing. `findActiveIndex(segments, t)` binary-searches `start_time`. TranscriptPane highlights the active line and auto-scrolls; manual scroll pauses auto-scroll and shows a "Jump to live" pill. Click on a line, chapter, task source link or timeline marker calls `seek()`.

**Multi-speaker.** Each segment references a `participants` row (name, role, color, avatar). Timeline renders per-speaker colored bands; transcript groups consecutive segments from one speaker. Speaker filter chips in the transcript header.

**Action Hub.** Board columns derived from `completed` (To do / Done), grouped optionally by assignee. Toggle is optimistic with rollback; each card links to its `source_time`.

**Clips.** `ClipCreator` takes a range (drag on timeline or "clip this line ± N s"). POST validates `0 ≤ start < end ≤ duration` and length ≤ 120s, generates nanoid slug, returns `/clip/<slug>`. `ClipPlayer` calls `playRange` and pauses at `end`.

**AI chat.** Drawer is mounted in the workspace layout so it persists across tabs. Server builds the prompt from `compactTranscript()` (`[mm:ss] Name: text`) plus summary/tasks; streams tokens; persists user + assistant messages with the browser's `session_id`.

## Edge cases
- Overlapping/zero-gap segments: active line = last segment with `start_time ≤ t`.
- Audio fails to load: workspace still renders transcript; player shows an error state, seeking disabled.
- Seek before metadata loaded: queue the seek until `loadedmetadata`.
- Clip slug collision: retry up to 3 times.
- Groq 429/timeout: friendly retry message, partial stream kept.
- Hero transcript ≈ 12 min (~2.5–3k words ≈ 4–5k tokens): fits one request, no chunking needed.
- Reduced-motion: disable smooth auto-scroll.
