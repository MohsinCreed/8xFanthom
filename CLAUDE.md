# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"8x Fathom AI": a rebuild of fathom.video (AI meeting notetaker) for the 8x Product Engineer assignment. The recording bot is stubbed; meetings are seeded with synthesized audio. `context/` holds the product, architecture, schema and decision docs (`07-decisions.md` is the decision log, `08-tasks.md` the phase tracker). Read those before changing behaviour, and update them when a decision changes.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build        # production build (also type-checks and lints)
npm run lint         # eslint
npx tsc --noEmit     # type check only
npm run seed         # idempotent upsert of seed/*.json into Supabase (add `-- --summary` to regenerate AI summaries via Groq)
npm run audio        # regenerate public/audio/*.mp3 + seed/timings/*.json (needs internet, no key); run `npm run seed` after
```

There is no test runner. Interactive behaviour (player/transcript sync, search, auto-scroll) has been verified with ad-hoc Playwright scripts against the hero meeting `q4-launch-readiness-sync`; they are not in the repo.

Env vars are listed in `.env.example` (Supabase URL + publishable key + secret key, `GROQ_API_KEY`). Node 20+.

## Architecture

**Data access split (RLS).** All tables have row-level security with `SELECT`-only policies for the anon/publishable key, except `chat_messages`, which has no policy (invisible to anon). Pages read through `lib/supabase/server.ts` (`getReadClient`) via `lib/data.ts`. Every write (task toggle, clip create/delete, chat persistence, summary regenerate) must go through a route handler using `lib/supabase/admin.ts` (`getAdminClient`, `server-only`, secret key). Never use the admin client in a client component. `lib/supabase/options.ts` supplies a `ws` transport because supabase-js builds a Realtime client eagerly and Node 20 has no native `WebSocket`.

**Seed pipeline: text → audio → timings → database.** `seed/*.json` holds speakers, segments (text only, no times), action items and clips, all referring to segments by index (`source_seq`, `start_seq`/`end_seq`). `scripts/generate-audio.ts` synthesizes each segment with Edge neural voices (`msedge-tts`), stitches the MP3s, and measures real durations with its own MP3 frame parser; it writes `seed/timings/<slug>.json`. `scripts/seed.ts` derives every `start_time`/`end_time` from those timings, so transcript and audio match exactly. If you edit a transcript you must re-run `audio` then `seed`; the seed script refuses to run if segment counts and timings disagree. IDs are deterministic (v5-style hash of a name), so reseeding updates rows and shared URLs/clip slugs stay stable. Per-segment MP3s are cached in `.audio-cache/` (gitignored); some Edge voices (Davis, Tony) no longer work, see `MALE` in the script.

**Workspace page** (`app/(app)/meetings/[id]/page.tsx` → `components/workspace/WorkspaceShell.tsx`). The server component loads everything with `getMeetingWorkspace`; the shell is one client tree wrapped in `PlayerProvider`. `PlayerProvider` is the only owner of the `<audio>` element and exposes `usePlayer()` (`currentTime`, `activeIndex`, `seek`, `playRange`, ...). Everything that jumps in time (transcript lines, timeline, chapter/decision/risk buttons, search matches, future task/clip links) must call `seek()` from that hook rather than touching audio. The active line is found with the binary search in `lib/transcript.ts` (`findActiveIndex`). Timestamps are seconds (NUMERIC in Postgres, coerced with `Number()` in `lib/data.ts`). Seeks before metadata loads are queued. `playRange` auto-pauses at the end of a clip.

**Summaries.** `meetings.summary_json` (shape in `lib/types.ts` / `context/06-database.md`) is generated once at seed time by `lib/summary.ts`, where the model cites transcript `seq` indexes that are mapped back to seconds. Groq is called through the `openai` SDK (`lib/groq.ts`); the model id lives only there (`openai/gpt-oss-120b`, a reasoning model: use low reasoning effort and keep reasoning tokens out of streamed output).

**Route groups.** `app/(app)/` carries the sidebar shell; the public clip page (`/clip/[slug]`) is planned outside the group so it has no sidebar. The meetings list is `force-dynamic` because task progress changes; keep data-backed pages dynamic.

## Conventions

- UI: light only. Tokens are in `app/globals.css` (warm canvas `#FAF9F6`, indigo `primary`, emerald only for "done"). Headings use Bricolage Grotesque automatically; use the `tnum` class for timestamps. Small radii; no all-caps labels, tracked eyebrows, monospace tags, `→` arrows, gradient washes, or decorative shadows. Sentence-case, plain-language copy. shadcn/ui primitives live in `components/ui`.
- Postgres schema management and Supabase work should go through the Supabase agent plugin; `supabase/migrations/*.sql` stays the source of truth in git.
- Work on the `Dev` branch and commit locally. Do not push to GitHub unless asked; the user pushes and merges to `main`.
- `.claude/hooks/capture.js` logs every prompt and response to `.agent-logs/` (a graded deliverable); keep `.agent-logs/INDEX.md` mapping sessions to phases, and never put secrets in prompts. `.env*` is gitignored except `.env.example`.
- Line endings are LF (`.gitattributes`).
