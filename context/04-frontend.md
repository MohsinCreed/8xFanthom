# Frontend & Design System

## Tokens
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#FAF9F6` | page background |
| `--surface` | `#FFFFFF` | cards, panels |
| `--border` | `#E8E5DE` | hairlines |
| `--ink` | `#1C1B1A` | primary text |
| `--ink-muted` | `#6B675F` | secondary text |
| `--primary` | `#4338CA` (indigo-700) | actions, active line, focus ring |
| `--primary-soft` | `#EEF0FF` | active transcript line, selected pill |
| `--success` | `#059669` (emerald-600) | completed badges |
| `--success-soft` | `#ECFDF5` | done card tint |
| `--warn` | `#B45309` | risk / overdue |

Light only. Speaker colors: 8 distinct, muted, AA-contrast hues on white (indigo, teal, rose, amber, violet, sky, lime, slate); stored per participant.
Type: Inter (UI) + tabular-nums for timestamps. Radius 10px cards / 999px pills. Shadows subtle (`0 1px 2px rgb(0 0 0 / .05)`).

## Screens
1. **/meetings** — search input, meeting cards (title, date, duration, avatars stack, task progress `3/7`, source badge).
2. **/meetings/[id] workspace**
   - Left column (~55%): sticky player (play/pause, ±10s, speed 1/1.25/1.5/2, speaker-band timeline with chapter ticks and clip markers), then summary (overview, decisions, key topics, chapters).
   - Right column (~45%): transcript with search, speaker filter chips, active-line highlight, per-line actions (copy, seek, clip from here).
   - Tabs under/over the right column: **Transcript · Action Hub · Clips**.
   - Floating "Ask AI" button opens the slide-over chat (right, 420px) with pills: Extract Decisions, Draft Email, Risk Analysis (+ Summarize, What did I miss?).
3. **/clip/[slug]** — bounded player, title, excerpt transcript, "Open full meeting at 04:12", copy-link.

## Interaction specs
- Active transcript line: `bg-primary-soft`, 3px left indigo bar; auto-scroll centers it.
- Search: highlights matches, shows `n of m`, Enter jumps and seeks.
- Keyboard: Space play/pause, J/L ±10s, `/` focus search, `A` toggle AI drawer, Esc close.
- Action card: checkbox toggles instantly (optimistic), strike-through + emerald check, assignee avatar popover to reassign, timestamp chip seeks player.
- Empty/loading/error states for every list; skeletons not spinners.
- Responsive: ≥1024 two columns; <1024 stacked with sticky mini-player; chat drawer becomes full-screen sheet.
- Accessibility: all controls focusable, `aria-live="polite"` on active-line announcements disabled by default, contrast AA.
