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

## Phase workflow (orchestrator + sub-agents)

Every new phase is run the same way (decision D21, `context/07-decisions.md`):

1. **Review.** The orchestrator (the main session) reads `context/` and the code the phase touches, then breaks the phase into small tasks with explicit file ownership, interfaces and dependencies. Shared types/contracts are written by the orchestrator *before* dispatch so parallel agents code against the same shapes.
2. **Delegate.** The orchestrator does not write feature code itself. It dispatches sub-agents with the Agent tool: **Sonnet** for architecture, server routes, streaming, state and anything with logic; **Haiku** for simple UI, pure utilities, copy and docs. Independent tasks go out in one message (parallel waves); dependent tasks wait for the previous wave. Each prompt states the goal, files owned (no overlap between agents), the contract, the project conventions to follow, and what to report back.
3. **Sub-agent rules.** No commits, no pushes, no reading or printing `.env*` values, no edits outside owned files, no scope creep. On any error, edge case or ambiguity they stop and report instead of guessing. Anything an agent starts (dev server, background process, browser) it must stop before reporting back, and its report says what it started and that it stopped it.
4. **Integrate and verify.** The orchestrator reviews each result, runs `npx tsc --noEmit` and `npm run lint`, and has a Sonnet agent run a Playwright check of the phase's interactive behaviour on localhost:3000 before it counts as done. The verifier starts the dev server only if port 3000 is free, and shuts down what it started when done (see "Cleanup" below).
5. **Escalate to the human.** Any question, trade-off, failed check the orchestrator can't resolve, or review point goes to the user (AskUserQuestion or a plain summary) rather than being decided silently. Finish each phase with a short review request: what shipped, what was verified, open questions.
6. **Close out.** Update `context/08-tasks.md` and `context/07-decisions.md`, commit locally on `Dev` (orchestrator only), and keep `.agent-logs/INDEX.md` current.

## Cleanup (processes you start)

Whoever starts a process stops it before finishing, whether that is the orchestrator or a sub-agent. This covers dev servers (`npm run dev`, `next start`), background shells, and the Playwright browser (close it with `browser_close`).

- Before starting a server, check whether port 3000 is already in use. If something else is listening, do not kill it; report it.
- On Windows, find the owner with `Get-NetTCPConnection -LocalPort 3000 -State Listen` and stop the whole tree with `taskkill /PID <pid> /T /F` (Next spawns child processes, so killing only the parent leaves the port busy). Confirm the port is free afterwards.
- Remove test data you created (for example QA clips) and confirm the seeded counts are unchanged.
- Never leave a server running between phases. If one is needed again, start it again.

## Conventions

- Any UI/UX work (by the orchestrator or a sub-agent) must load the `frontend-design:frontend-design` skill first and apply it within the conventions below. Sub-agent prompts for UI tasks say so explicitly.
- UI: light only. Tokens are in `app/globals.css` (warm canvas `#FAF9F6`, indigo `primary`, emerald only for "done"). Headings use Bricolage Grotesque automatically; use the `tnum` class for timestamps. Small radii; no all-caps labels, tracked eyebrows, monospace tags, `→` arrows, gradient washes, or decorative shadows. Sentence-case, plain-language copy. shadcn/ui primitives live in `components/ui`.
- Postgres schema management and Supabase work should go through the Supabase agent plugin; `supabase/migrations/*.sql` stays the source of truth in git.
- Work on the `Dev` branch and commit locally. Do not push to GitHub unless asked; the user pushes and merges to `main`.
- `.claude/hooks/capture.js` logs every prompt and response to `.agent-logs/` (a graded deliverable); keep `.agent-logs/INDEX.md` mapping sessions to phases, and never put secrets in prompts. `.env*` is gitignored except `.env.example`.
- Line endings are LF (`.gitattributes`).
- `FEATURES.md` is the user-facing feature guide, keyboard shortcuts table and manual QA checklist. Whenever a feature is added, changed or removed (including shortcuts, quoted UI copy in the checklist, and known limits), update `FEATURES.md` in the same change, and sub-agent prompts for feature work say so.
