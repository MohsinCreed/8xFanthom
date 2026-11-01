# 8x Fathom AI

A rebuild of [fathom.video](https://fathom.video), the AI meeting notetaker, for the 8x Product Engineer assignment. The recording bot is stubbed: meetings are seeded with real synthesized audio, so the work goes into the workspace: an audio player synced to an interactive transcript, summaries, an action-item board, shareable clips and an AI assistant that has read the meeting.

Light, warm interface (`#FAF9F6` canvas, deep indigo accent, emerald for done). No dark mode.

## Stack

- Next.js 15 (App Router, TypeScript), Tailwind CSS 4, shadcn/ui
- Supabase (PostgreSQL) for data; reads use the publishable key under row-level security, writes go through server routes with the secret key
- Groq (`openai/gpt-oss-120b`, via the `openai` SDK) for summaries and chat
- Edge neural voices (`msedge-tts`, no API key) for the seeded meeting audio
- Deployed on Vercel

## Run locally

Requires Node 20+ and npm.

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works) |
| `SUPABASE_SECRET_KEY` | `sb_secret_...`, server only (legacy `SUPABASE_SERVICE_ROLE_KEY` also works) |
| `GROQ_API_KEY` | `gsk_...`, server only |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally |

## Database, seed data and audio

1. Apply `supabase/migrations/0001_init.sql` to your Supabase project.
2. Seed it: `npm run seed` (add `-- --summary` to regenerate AI summaries with Groq). The seed is idempotent: ids are deterministic, so re-running updates rows instead of duplicating them and shared links stay stable.
3. The seed content lives in `seed/*.json`: one 8-person hero meeting ("Q4 Launch Readiness Sync", about 13 minutes) and three short meetings.
4. Audio is already committed in `public/audio/`, with matching timings in `seed/timings/`. To regenerate it after editing a transcript, run `npm run audio` (needs internet, no key). Segment timestamps come from the measured duration of each synthesized segment, so the transcript and the audio stay in sync. Re-run `npm run seed` afterwards.

## Project layout

```
app/(app)/              shell + meetings list + meeting workspace
components/             shell, meetings, workspace (player, timeline, transcript, summary), ui
lib/                    data access, Supabase clients, Groq client, transcript helpers
scripts/                generate-audio.ts, seed.ts
seed/                   meeting JSON + audio timings
supabase/migrations/    schema and row-level security
context/                product, architecture and decision docs
.agent-logs/            prompts and responses from the AI agent sessions that built this
```

See `context/` for the architecture, schema and decision log.
