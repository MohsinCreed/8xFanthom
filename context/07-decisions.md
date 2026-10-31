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

## Open items
- None.
