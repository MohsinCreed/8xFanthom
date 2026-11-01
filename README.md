# 8x Fathom AI

A rebuild of [fathom.video](https://fathom.video), the AI meeting notetaker, for the 8x Product Engineer assignment. The recording bot is stubbed: meetings are seeded with real synthesized audio, so the work goes into the workspace: an audio player synced to an interactive transcript, summaries, an action-item board, shareable clips and an AI assistant that has read the meeting.

- **Live app:** `<add Vercel URL>`
- **Walkthrough video:** `<add Loom link>`

**[Explore the full feature list and keyboard shortcuts guide](./FEATURES.md)**, including a step-by-step walkthrough checklist for testing every feature.

## Highlights

- **Synced player and transcript.** Click-to-seek, a speaker-coloured timeline, auto-follow that pauses when you scroll, and search with speaker filters.
- **AI that has read the meeting.** A non-modal drawer streams Groq answers, with one-click prompts and `[mm:ss]` citations that seek the player.
- **Action hub.** Optimistic task updates with rollback, reassignment and links back to the moment each task was raised.
- **Shareable clips.** Time-range clips with a public `/clip/[slug]` page that plays only the clip.
- **Production care.** Row-level security with writes behind server routes, error and loading states, keyboard and screen-reader support, and a mobile layout with a pinned player.

## Engineering notes

- **Data access split.** Pages read with the publishable key under select-only RLS. Every write goes through a route handler with the secret key, which never reaches the client.
- **One owner for audio.** `PlayerProvider` owns the `<audio>` element, and everything that jumps in time calls its `seek()`. This keeps transcript, timeline, tasks and clips in sync.
- **Seed pipeline.** Text becomes audio, audio yields measured timings, and timings become database rows with deterministic ids, so reseeding never breaks shared links.
- **Documented decisions.** 40 numbered decisions with rationale and rejected alternatives are in [`context/07-decisions.md`](./context/07-decisions.md). The prompts and responses from the AI agent sessions that built this are in `.agent-logs/`.
- **Checks.** `npx tsc --noEmit`, `npm run lint` and `npm run build` pass. Interactive behaviour was verified in a browser with Playwright after each phase.

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

## Deploy to Vercel

1. Push the repository to GitHub, then in Vercel choose **Add New > Project** and import it. The framework should be detected as Next.js. No `vercel.json` is needed.
2. Set these environment variables in the project settings. Use the values from your Supabase and Groq dashboards:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server only)
   - `GROQ_API_KEY` (server only)
   - `NEXT_PUBLIC_SITE_URL`: the production URL with no trailing slash, for example `https://<project>.vercel.app`. You can also leave it unset. Do not copy the `http://localhost:3000` value from `.env.example`, or copied clip links will point at localhost.
3. Deploy the project.
4. Prepare the production Supabase project once. Apply every file in `supabase/migrations/` in filename order (currently only `0001_init.sql`), then run `npm run seed` against it. The seed reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` from `.env.local`, so point those at the production project for this run. `GROQ_API_KEY` is only needed for `npm run seed -- --summary` and for the AI chat.

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
