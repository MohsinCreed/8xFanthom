# Decisions Log

| # | Decision | Why | Alternatives rejected |
|---|---|---|---|
| D1 | Capture/recording bot is stubbed; meetings are seeded | Brief explicitly allows; effort goes to workspace/intelligence | Real Zoom/Meet bot |
| D2 | Audio = pre-generated multi-voice TTS, stitched to one mp3 per meeting in `/public/audio`; transcript timings come from real TTS durations | Real seeking and exact sync; reviewers can hear it | Simulated clock; unrelated placeholder audio |
| D3 | No auth; hardcoded demo user | Reviewer can click immediately; saves hours | Supabase auth |
| D4 | Reads via anon + select-only RLS; writes via server routes with service role | Public demo can't be vandalised through the anon key | Open RLS writes |
| D5 | Clips are time-range with public `/clip/[slug]` page | Mirrors Fathom's shareable clips; real playback | Selection-only links |
| D6 | Chat history persists in `chat_messages` keyed by anonymous `session_id` (localStorage) | Survives reload, shows well in walkthrough | Stateless chat |
| D7 | Structured `summary_json` generated at seed time | Powers decisions/chapters/risks UI without per-request cost or latency | Single TEXT summary; on-demand generation |
| D8 | Seed = 1 hero meeting (8 speakers, ~12 min) + 3 short meetings (2–4 people, 3–5 min) | Realistic list view with bounded TTS effort | Hero only; 5+ long meetings |
| D9 | Workspace layout: player + summary left, transcript right, tabs Transcript/Action Hub/Clips, AI as slide-over | Closest to Fathom mental model | Three-column; single column |
| D10 | `.agent-logs/` produced by `.claude/hooks/capture.js`, committed after a secret scan | Required deliverable; raw logs are honest | Hand-written logs |
| D11 | Folder is lowercase `context/` | Case-sensitive on Linux/GitHub/Vercel | `Context/` |
| D12 | Groq responses streamed over SSE; timestamps cited as `[mm:ss]` and rendered as seek links | Avoids Vercel timeout; ties AI to the player | Non-streaming JSON |

| D13 | Hero meeting = "Q4 Launch Readiness Sync", 8 roles: PM, Eng, Design, QA, Marketing, Support, Data, CS | Confirmed by user | — |
| D14 | Timestamps are NUMERIC seconds; seeded rows use deterministic UUIDs | Stable shared URLs/clips | Random UUIDs |
| D15 | Summary generated once at seed time and stored; optional "Regenerate Summary" button calls Groq on demand | Instant load for reviewers, still demonstrates live AI | Always on demand |
| D16 | Clips capped at 120s; deletion supported (`DELETE /api/clips/[id]`) | Confirmed by user | No delete |
| D17 | `.agent-logs/INDEX.md` maps session logs to project phases | Confirmed by user | Raw logs only |
| D18 | npm + Node 20+ | Confirmed by user | pnpm/yarn |
| D19 | TTS: Edge neural voices via `msedge-tts` (zero-key). 8 distinct voices for the hero meeting; voice list in `scripts/generate-audio.ts` (en-US-Davis/Tony are dead on the Edge endpoint and were replaced) | No API key or cost, scriptable from Node, good enough realism; ElevenLabs/OpenAI TTS would need keys | ElevenLabs, OpenAI TTS, gTTS |
| D20 | Process: core features first (player sync, transcript seek, action items, Groq drawer, seeds), polish later; develop and test locally on localhost:3000, push to GitHub and test on Vercel only after a phase passes local checks | User execution principles | — |
| D21 | Orchestration: lead agent splits each phase into independent sub-tasks for sub-agents (Sonnet for architecture/state logic, Haiku for simple UI/utilities); any error, edge case or ambiguity pauses and escalates to the user | User execution principles | — |
| D22 | All Postgres schema management, table creation, and Supabase integration tasks must leverage the Supabase agent plugin | User requirement; gives validated migrations, RLS checks and Postgres best-practice review | Hand-run SQL in the dashboard |
| D23 | Env vars use Supabase's new Publishable (`sb_publishable_...`) and Secret (`sb_secret_...`) keys; legacy anon/service_role accepted as fallbacks | Supabase key format change | Legacy keys only |
| D24 | Groq model is `openai/gpt-oss-120b` (not llama-3.3-70b-versatile); seed summaries were generated with it | Chosen by user when configuring `.env.local`; `lib/groq.ts` is the single place the model id lives | llama-3.3-70b-versatile |
| D25 | Product name is "8x Fathom AI" (sidebar wordmark, page titles, README) | User decision | "Recall" (placeholder) |
| D26 | `.gitattributes` sets `* text=auto eol=lf` | Stops LF/CRLF warnings on Windows | Per-machine autocrlf |
| D27 | Chat drawer uses Radix Dialog directly in non-modal mode (no overlay, outside click does not dismiss), not `components/ui/sheet.tsx`; `ChatDrawer` stays mounted so history and streams survive closing | The shared Sheet blocks the player and transcript; users should keep listening while chatting | shadcn Sheet with overlay |
| D28 | Chat: a stopped (aborted) answer is persisted if it has text, upstream errors persist nothing; pill messages display the pill label while the full prompt is stored; Groq called with `reasoning_effort: "low"` and only `delta.content` forwarded; 12k-token budget drops oldest turns, then falls back to summary plus transcript head/tail | History matches what the user saw; keeps the free tier within limits | Dropping partial answers; showing raw pill prompts |
| D29 | Phase workflow codified in `CLAUDE.md`: orchestrator plus Sonnet/Haiku sub-agents, human review at the end of each phase (refines D21) | User request | — |
| D30 | Chat retry sends `retry: true`; the server reuses the user row left by the failed attempt (same content and pill, last row in the session) instead of inserting a duplicate. D27 (non-modal drawer) confirmed by the user | User review of Phase 3 | Always inserting; client-generated message ids |
| D31 | ESLint override turns off `no-require-imports` only for `.claude/hooks/**/*.js` (CommonJS hook scripts) | Keeps lint green without changing the logging hook | Converting the hook to ESM |
| D32 | Action Hub: task state lives in one `useActionItems` hook called by `WorkspaceShell` (so the tab counter and board share it); updates are optimistic, roll back only the patched fields on failure, and ignore superseded responses per item. `PATCH` checks the assignee belongs to the item's meeting. Priority is editable through the API but has no UI | Single source of truth for counters; safe under rapid clicks; keeps scope to what the brief asks | State inside the board component; refetch after each write |
| D33 | A reload during a pending `PATCH` can lose that change (seen once on a cold dev route). Not yet fixed; candidate fix is `keepalive: true` on the fetch | Found in Phase 4 verification; left for the user to decide | — |

## Open items
- Phase 4: add `keepalive: true` to the action-item `PATCH` fetch (D33)? Also unchecked: contrast of white initials on the seeded speaker colors in the assignee avatars.
