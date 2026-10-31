# Backend: Routes, Groq, Supabase

## Env vars (never committed; `.env*` in .gitignore)
See the table in `02-tech-stack.md`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `..._ANON_KEY`), `SUPABASE_SECRET_KEY` (server only; legacy `SUPABASE_SERVICE_ROLE_KEY`), `GROQ_API_KEY` (server only), `NEXT_PUBLIC_SITE_URL`.

## Access model
- Reads: server components using the anon key; RLS = `SELECT` allowed on all tables except `chat_messages`.
- Writes: route handlers only, using the service-role client (`lib/supabase/admin.ts`). RLS blocks anon writes.
- `chat_messages` is read/written only through `/api/chat*`, filtered by `session_id`.
- Attribution comes from `DEMO_USER`; no sessions/cookies.

## Routes
| Method | Path | Body / Query | Behavior |
|---|---|---|---|
| POST | `/api/chat` | `{meetingId, sessionId, message, pill?}` | Loads meeting, participants, segments, tasks; builds prompt; streams Groq tokens as SSE; on finish persists user + assistant rows. 429 → `{error:"rate_limited"}` |
| GET | `/api/chat/[meetingId]?sessionId=` | | Returns history ordered by `created_at` |
| PATCH | `/api/action-items/[id]` | `{completed?, assignee_id?, priority?}` | Validates fields, updates, returns row. 404 if missing |
| POST | `/api/clips` | `{meetingId, title, startTime, endTime}` | Validates `0≤start<end≤duration`, `end-start≤120`, title 1–80 chars; nanoid(10) slug; returns clip + url |
| GET | `/api/search?meetingId=&q=` (optional) | | Postgres `websearch_to_tsquery` over segments; client-side filter is the default for the open meeting |

## Groq
- Client: `new OpenAI({ apiKey: GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })`, model `openai/gpt-oss-120b`, `stream: true`, `temperature: 0.3`.
- Context block: meeting title/date, participant roster (name — role), `[mm:ss] Name: text` transcript, current action items. Keep under ~12k tokens (free-tier TPM): if over budget, drop oldest chat turns first, then compress transcript to summary + selected segments.
- System prompt: answer only from the meeting; cite timestamps as `[mm:ss]` so the UI can render them as seek links; say so when information is absent.
- Pill prompts (`lib/prompts.ts`):
  - **Extract Decisions** → bullet list of decisions, owner, timestamp.
  - **Draft Email** → follow-up email: subject, recap, decisions, action items with owners.
  - **Risk Analysis** → risks/blockers with severity and the quote/timestamp that supports each.
- Runtime: `nodejs` with streaming response (avoids Vercel Hobby 10s non-streaming cutoff); `export const maxDuration = 30`.
- Seed-time only: one-off script asks Groq for structured `summary_json` per meeting (JSON mode) and stores it. The only request-time regeneration is the explicit "Regenerate Summary" button (`POST /api/meetings/[id]/summary`, D15).

## Supabase queries (workspace page, one round trip each, run in parallel)
- `meetings` by id
- `participants` by meeting_id
- `transcript_segments` by meeting_id order by `start_time`
- `action_items` by meeting_id order by `position`
- `clips` by meeting_id order by `start_time`

## Validation & errors
Zod on every route body. Errors: `{error: code, message}` with 400/404/429/500. No stack traces to client. Log server-side only.
