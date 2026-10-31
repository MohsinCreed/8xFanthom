# Product Overview: Fathom Alternative (8x Assignment)

## The 8x brief
Rebuild a live product in 24 hours: **fathom.video** (AI meeting notetaker).
- Faking/stubbing the capture/recording bot layer is explicitly allowed; focus on workspace, interactive player, summaries, clips, and intelligence.
- Must ship seed data: pre-populated multi-person meetings, transcripts, clips, summaries.
- Must track all agent prompts/responses into `.agent-logs/` inside the repo.
- Deliverables: live Vercel deployment, public GitHub repo (with `.agent-logs/`), Loom walkthrough.

## Goal
An intelligent meeting workspace that replaces Fathom's dense interface with an interactive audio-to-transcript player, contextual AI chat, and an action-item task board.

## Our touch (not a pixel copy)
Light, elegant, hyper-functional. Warm off-white canvas `#FAF9F6`, crisp type, deep indigo primary, emerald success. No dark mode.

Four upgrades over Fathom:
1. **Synchronized player & transcript** — audio timeline drives the active transcript line; any line, chapter, task or clip seeks the audio.
2. **Interactive Action Hub** — action items as a task board with instant complete/assignee toggles, each linked to its source moment.
3. **Contextual AI assistant** — persistent slide-over chat with prompt pills (Extract Decisions, Draft Email, Risk Analysis), answers cite `[mm:ss]` as seek links; history persists.
4. **Multi-speaker seeds** — 8-person team sync with rich transcript, search, speaker filters, and shareable time-range clips.

## Scope boundaries
In: meetings list, workspace, player, transcript search, summaries, action board, clips + public clip page, AI chat.
Out: real recording bot, auth, calendar integrations, billing, dark mode, team management.

## Submission checklist
- [ ] Live Vercel URL works with seed data and no setup
- [ ] Public GitHub repo with `.agent-logs/` committed (secret-scanned)
- [ ] Loom walkthrough
- [ ] Clear commit history

See `07-decisions.md` for the rationale behind each choice.
