# Master Task Tracker

- [x] **Phase 0 — Foundation & seeds** (complete: Next.js scaffold, migration applied via Supabase, 4 seeded meetings with TTS audio, summaries generated via Groq): init Next.js 15 + Tailwind + shadcn; `supabase/migrations/0001_init.sql` (see 06); `.gitignore` with `.env*`; env wiring; write seed JSON (hero + 3 short meetings); `scripts/generate-audio.ts` (TTS, stitch, emit timings); `scripts/seed.ts` (idempotent); generate `summary_json` via Groq at seed time.
- [x] **Phase 1 — Shell & meetings list:** layout, sidebar, `/meetings` cards, search.
- [ ] **Phase 2 — Workspace & player:** `PlayerProvider`, audio player, speaker-band timeline, transcript sync (binary search), click-to-seek, search, speaker filters, summary + chapters.
- [ ] **Phase 3 — AI chat:** `/api/chat` streaming, persisted history, ChatDrawer, prompt pills, `[mm:ss]` seek links, 429 handling.
- [ ] **Phase 4 — Action Hub:** board UI, optimistic toggle, assignee picker, source-time seek, `PATCH` route.
- [ ] **Phase 5 — Clips:** ClipCreator, `POST /api/clips`, ClipList, `/clip/[slug]` page with OG metadata, seeded clips.
- [ ] **Phase 6 — Polish & QA:** responsive layout, empty/error states, keyboard shortcuts, a11y pass, end-to-end click-through.
- [ ] **Phase 7 — Submission:** secret-scan `.agent-logs/`, commit logs, Vercel deploy + env vars, verify live URL, README, Loom walkthrough.

## Seed notes (proposal, confirm in Phase 0)
- **Hero:** "Q4 Launch Readiness Sync", ~12 min, 8 speakers: PM, Eng Lead, Designer, QA Lead, Marketing Lead, Support Lead, Data Analyst, Customer Success. 7–9 action items (mix done/open, varied priority), 4–5 chapters, 3 seeded clips, 3 decisions, 3 risks.
- **Short meetings (3–5 min, 2–4 people):** customer discovery call, 1:1 weekly check-in, design review.
- TTS: one distinct voice per speaker; record real per-segment durations and derive `start_time/end_time` from them.
