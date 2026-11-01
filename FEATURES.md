# 8x Fathom AI: feature guide

8x Fathom AI is a meeting intelligence workspace in the style of [fathom.video](https://fathom.video). You open a recorded meeting and get a synced audio player and transcript, an AI summary, an assistant that has read the meeting, an action-item board and shareable clips, all in one screen.

The recording bot is stubbed (decision D1). Four meetings are seeded with real synthesized audio, and the hero meeting, "Q4 Launch Readiness Sync", has 8 speakers, 111 transcript segments and about 13.5 minutes of audio. Transcript timestamps come from the measured length of each audio segment, so the text and the sound stay in sync.

> **🔑 Demo credentials**
> Email: `demo@8xfathom.ai`
> Password: `fathom2026!`

Back to the [README](./README.md) for setup. Design decisions are logged in [`context/07-decisions.md`](./context/07-decisions.md).

## Contents

- [Interactive audio and transcript sync](#interactive-audio-and-transcript-sync)
- [AI meeting intelligence](#ai-meeting-intelligence)
- [Action hub and task management](#action-hub-and-task-management)
- [Clips and highlights](#clips-and-highlights)
- [Demo login](#demo-login)
- [Mobile, accessibility and error handling](#mobile-accessibility-and-error-handling)
- [Keyboard shortcuts reference](#keyboard-shortcuts-reference)
- [Quality control and manual walkthrough checklist](#quality-control-and-manual-walkthrough-checklist)

## Interactive audio and transcript sync

- **Click to seek.** Click any transcript line and the audio jumps there and plays. Summary chapters, decisions, risks, search matches, task source chips and timeline ticks all seek through the same `seek()` call, so the player never drifts.
- **Speaker bands.** The timeline is coloured by who is speaking. Hovering shows the time under the pointer (the current speaker is named in the player header), dragging scrubs, and chapter ticks and clip brackets sit on top of it.
- **Auto-follow.** The active line is found with a binary search over segment times and kept centred as the audio plays.
- **Scroll pause.** Scrolling, touching or using the keyboard in the transcript pauses auto-follow. A "Jump to live" button brings it back.
- **Search and filters.** Search highlights matches, dims other lines and shows "n of m". Enter steps through matches and Shift+Enter goes back. Speaker chips filter the transcript, and both survive switching tabs.
- **Player controls.** Play or pause, back and forward 10 seconds, and playback speed of 1×, 1.25×, 1.5× and 2×.
- **Summary and chapters.** An AI summary generated once at seed time (so it loads instantly) lists decisions, risks and chapters. Each item links to the moment it came from.

## AI meeting intelligence

- **Non-modal drawer.** "Ask AI" opens a side drawer with no overlay, so you keep listening and scrolling while you chat. The drawer stays mounted, so history and in-flight answers survive closing it.
- **One-click prompt pills.** Extract decisions, Draft follow-up email, Risk analysis, Summarize and What did I miss? Each pill sends a full prompt but shows its short label in the chat.
- **Streaming responses.** Answers stream token by token over server-sent events (Groq `openai/gpt-oss-120b`). A Stop button ends a response early and keeps the text received so far.
- **Clickable timestamps.** The model cites `[mm:ss]`, and each citation becomes a link that seeks the player.
- **Persistent history.** Chats are saved per anonymous browser session and come back after a reload.
- **Resilient.** Rate limits and upstream errors show a clear message with a Retry button, and a retry never duplicates the question.

## Action hub and task management

- **Board with progress.** Tasks sit in To do and Done groups with a progress bar, and the tab label shows a live `done/total` count.
- **Optimistic updates.** Ticking a task updates the screen immediately and rolls back only the changed fields if the save fails. Rapid clicks are safe because older responses are ignored.
- **Reassignment.** Pick any participant of that meeting, or Unassigned. The server rejects an assignee from a different meeting.
- **Meeting timeline sync.** Each task has a source chip with the time it was raised, and clicking it seeks the player to that moment.
- **Survives reloads.** Saves are sent with `keepalive`, so a change made just before navigating away still lands.

## Clips and highlights

- **Custom range.** Set start and end times by typing them, with "Use current time" buttons, or click "Clip from here" on any transcript line (it adds a short lead-out). Clips are capped at 120 seconds.
- **Preview.** Play the range before saving. Playback stops at the clip end.
- **Public share page.** Every clip gets a link at `/clip/[slug]` with no sidebar and no sign-in. It has a bounded player, the transcript excerpt, link-preview metadata and an "Open full meeting at mm:ss" link. Timestamps are meeting offsets.
- **Manage.** Play, copy link, open in a new tab and delete with an inline confirmation. Clip brackets appear on the timeline and update live.

## Mobile, accessibility and error handling

- **Mobile layout.** A compact player pins under the top bar, and "Jump to transcript" skips past the summary. Touch targets are 36 to 40px and "Clip from here" is always visible on touch.
- **Keyboard and screen readers.** There is a skip link, visible focus rings, focus returns to the right control after closing the drawer or confirming a delete, and "Reply ready" is announced when an answer finishes.
- **Contrast and motion.** Text and field borders meet contrast targets, and reduced-motion preferences are respected.
- **Honest errors.** Error pages, a custom 404, loading skeletons and empty states. A real outage shows an error page rather than "not found".

## Keyboard shortcuts reference

Shortcuts are ignored while you are typing in a field or holding Ctrl, Cmd or Alt. Press `?` in the workspace, or use the keyboard icon in the player, to see this list in the app.

| Key | Where | What it does |
|---|---|---|
| `Space` | Workspace | Play or pause. Ignored when a button, tab, checkbox or slider has focus, and inside the chat log. |
| `J` | Workspace | Back 10 seconds |
| `L` | Workspace | Forward 10 seconds (there is no skip key; `J` and `L` are the seek keys) |
| `/` | Workspace | Focus transcript search, switching to the Transcript tab if needed |
| `A` | Workspace | Open the Ask AI drawer |
| `?` | Workspace | Show or hide the shortcuts popover |
| `Esc` | Search box | Clear the query |
| `Esc` | Ask AI drawer | Close the drawer and return focus to the Ask AI button |
| `Enter` | Search box | Next match (first press jumps to the first match) |
| `Shift+Enter` | Search box | Previous match |
| `Enter` | Ask AI input | Send the message |
| `Shift+Enter` | Ask AI input | New line |
| `←` `↓` / `→` `↑` | Focused timeline | Back or forward 5 seconds |
| `Home` / `End` | Focused timeline | Start or end of the meeting |
| `Tab` | Anywhere | The first stop is a "skip to main content" link |

Left and right arrows do not seek globally. They stay free for tabs, menus and popovers (decision D37).

## Demo login

- **Gate.** Everything except the login page and public clip links needs a login. Signed-out visits to `/` or `/meetings/...` redirect to `/login`, and signed-out calls to `/api/...` get a 401 `{ "error": "Unauthorized" }`.
- **Sign in.** Use the demo credentials above, or press "Fill demo credentials". A wrong password shows "Incorrect email or password". Signed-in visits to `/login` go to `/meetings`.
- **Sign out.** The "Sign out" button in the sidebar (and in the mobile menu) clears the session and returns to `/login`.
- **Public clips.** `/clip/[slug]` pages and `/audio/*` files stay public so shared links work without an account.
- **Known limit.** This is a demo-only gate: the cookie (`fathom_demo_auth`, 7 days) has a static value, so it is not real security (decision D42).

## Quality control and manual walkthrough checklist

Run `npm run dev`, open <http://localhost:3000/login>, sign in with the demo credentials, then choose **Q4 Launch Readiness Sync**. Each step says what you should see.

### 0. Login
- [ ] Signed out, open `/meetings`. You land on `/login`.
- [ ] Enter a wrong password. "Incorrect email or password" appears and you stay on the page.
- [ ] Press "Fill demo credentials", then "Sign in". You land on `/meetings`.
- [ ] While signed in, open `/login`. You are sent to `/meetings`.
- [ ] Press "Sign out" in the sidebar. You land on `/login`, and `/meetings` redirects there again.
- [ ] Signed out, open a `/clip/...` link. It plays without a login.

### 1. Meetings list
- [ ] Four meetings appear as cards with date, length, participants and task progress.
- [ ] Typing in the search box filters the cards.

### 2. Player and transcript
- [ ] Click a transcript line. Audio plays from that line and the line is highlighted.
- [ ] Press `Space`. Audio pauses, and pressing it again resumes.
- [ ] Press `J` then `L`. The time moves back 10 seconds, then forward 10.
- [ ] Click the speed button. It cycles 1×, 1.25×, 1.5×, 2×.
- [ ] Click and drag on the timeline. The audio scrubs and a time tooltip follows the pointer.
- [ ] Let it play. The transcript follows. Scroll up and "Jump to live" appears. Click it and following resumes.
- [ ] Press `/`, type "launch", press `Enter` repeatedly. The counter reads "1 of n", "2 of n" and so on, and the audio seeks to each match.
- [ ] Click a speaker chip. Other speakers' lines dim. Click "All speakers" to reset.
- [ ] Switch to Action items and back. The search text and filters are still there.

### 3. Summary
- [ ] The summary lists decisions, risks and chapters.
- [ ] Click a chapter or decision. The player seeks to that time.

### 4. Ask AI
- [ ] Press `A`. The drawer opens and audio keeps playing. Press `Esc`. It closes and focus returns to the Ask AI button.
- [ ] Click **Extract decisions**. The answer streams in and the question shows the short pill label.
- [ ] Click a `[mm:ss]` link in the answer. The player seeks.
- [ ] Ask a long question, then click **Stop**. The partial answer stays.
- [ ] Reload the page and reopen the drawer. The history is still there.

### 5. Action hub
- [ ] Open Action items. Tasks are split into To do and Done with a progress bar.
- [ ] Tick a task. It moves to Done at once and the tab count updates.
- [ ] Change an assignee. The avatar updates and persists after a reload.
- [ ] Click a task's time chip. The player seeks to where it was discussed.
- [ ] Untick the task and restore the original assignee so the seed data stays as it was.

### 6. Clips
- [ ] Hover a transcript line and click "Clip from here". The Clips tab opens with the times filled in and the title focused.
- [ ] Clear the title and click away. The field says "Add a title for this clip."
- [ ] Enter an end time more than 120 seconds after the start. The form refuses it.
- [ ] Preview the clip. It plays and stops at the end time.
- [ ] Save it. It appears in the list and a bracket appears on the timeline.
- [ ] Click **Copy link**, open it in a private window. The public page plays only the clip and shows the excerpt.
- [ ] Open `/clip/not-a-real-slug`. A not-found card appears.
- [ ] Delete the clip with the inline confirmation. It disappears and the bracket goes.

### 7. Mobile (375px wide, or browser device mode)
- [ ] The player stays pinned under the top bar while you scroll.
- [ ] "Jump to transcript" scrolls to the transcript tabs.
- [ ] Speaker chips scroll sideways on one row, and the page has no sideways scroll.
- [ ] The Ask AI button never covers the last item in a tab.

### 8. Errors and edge cases
- [ ] Open `/meetings/not-a-uuid`. A not-found card appears, not a crash.
- [ ] Tab from the top of any page. The first focus stop is "Skip to main content".
- [ ] Turn on reduced motion in your OS. Smooth scrolling and animations are minimal.

### 9. Automated checks
```bash
npx tsc --noEmit   # types
npm run lint       # eslint
npm run build      # production build (type-checks and lints)
```

There is no test runner. Interactive behaviour was verified with Playwright runs against the hero meeting, listed per phase in [`.agent-logs/INDEX.md`](./.agent-logs/INDEX.md).

## Known limits

- Unknown meeting and clip ids show a not-found card but return HTTP 200, because Next streams pages that have a loading skeleton (D39).
- Mobile timeline chapter ticks are hidden below the large breakpoint. Chapters stay reachable from the summary.
- The recording bot is a stub. Audio is synthesized, not captured.
