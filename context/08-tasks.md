# Master Task Tracker

- [x] **Phase 0 — Foundation & seeds** (complete: Next.js scaffold, migration applied via Supabase, 4 seeded meetings with TTS audio, summaries generated via Groq): init Next.js 15 + Tailwind + shadcn; `supabase/migrations/0001_init.sql` (see 06); `.gitignore` with `.env*`; env wiring; write seed JSON (hero + 3 short meetings); `scripts/generate-audio.ts` (TTS, stitch, emit timings); `scripts/seed.ts` (idempotent); generate `summary_json` via Groq at seed time.
- [x] **Phase 1 — Shell & meetings list:** layout, sidebar, `/meetings` cards, search.
- [x] **Phase 2 — Workspace & player:** `PlayerProvider`, audio player, speaker-band timeline, transcript sync (binary search), click-to-seek, search, speaker filters, summary + chapters.
- [x] **Phase 3 — AI chat** (complete: verified with Playwright on the hero meeting): `/api/chat` streaming, persisted history, ChatDrawer, prompt pills, `[mm:ss]` seek links, 429 handling. Known minor gap: unclosed `**` shows raw asterisks until it closes.
- [x] **Phase 4 — Action Hub** (complete: verified with Playwright on the hero meeting): board UI with To do / Done groups and progress bar, optimistic toggle with rollback, assignee picker, source-time seek chip, `PATCH /api/action-items/[id]`. In-flight saves survive a reload via `keepalive: true` (D33).
- [x] **Phase 5 — Clips** (complete: verified with Playwright on the hero meeting): `POST /api/clips` and `DELETE /api/clips/[id]`, `useClips` hook (optimistic delete), ClipCreator (time fields, "use current time", preview, validation), ClipList (play, copy link, open, inline delete confirm), "Clip from here" on transcript lines, timeline clip brackets update live, public `/clip/[slug]` page (bounded player, excerpt transcript, OG metadata, not-found). Known minor gaps: empty title disables Create without an inline message; the first excerpt line on the public page can start before the clip and shows 00:00.
- [ ] **Phase 6 — Polish & QA:** responsive layout, empty/error states, keyboard shortcuts, a11y pass, end-to-end click-through.
- [ ] **Phase 7 — Submission:** secret-scan `.agent-logs/`, commit logs, Vercel deploy + env vars, verify live URL, README, Loom walkthrough.

## Seed notes (confirmed and shipped)
- **Hero:** "Q4 Launch Readiness Sync", ~12 min, 8 speakers: PM, Eng Lead, Designer, QA Lead, Marketing Lead, Support Lead, Data Analyst, Customer Success. 7–9 action items (mix done/open, varied priority), 4–5 chapters, 3 seeded clips, 3 decisions, 3 risks.
- **Short meetings (3–5 min, 2–4 people):** customer discovery call, 1:1 weekly check-in, design review.
- TTS: Edge neural voices via `msedge-tts` (zero-key). One distinct voice per speaker; real per-segment durations are measured and drive `start_time/end_time`. Shipped: hero is 808s (about 13.5 min), 111 segments.
