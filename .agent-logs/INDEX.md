# Agent Logs Index

Raw prompt/response logs are written automatically by `.claude/hooks/capture.js` (one file per Claude Code session). This index maps them to project phases (see `context/08-tasks.md`).

| Session log | Phase | What happened |
|---|---|---|
| `2026-10-31_21-08-55_8196bafc-…` | Setup | Built and dry-ran the logging hook itself |
| `2026-10-31_21-11-21_76eb5931-…` | Planning + Phase 0 | Capture test; architecture review of `context/`; context files 03–08; decisions D1–D24; Next.js 15 scaffold; migration `0001_init.sql`; seed JSON via sub-agent; TTS audio (fixed dead voices, custom MP3 duration parser); seed script; Supabase key-format and plugin requirement; Phase 0 wrap-up and commit |

Later sessions are appended below as phases complete.
