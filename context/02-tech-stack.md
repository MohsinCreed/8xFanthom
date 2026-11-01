# Tech Stack Configuration

- **Framework:** Next.js 15 (App Router, TypeScript, React Server Components)
- **Styling:** Tailwind CSS + shadcn/ui primitives (tokens in `04-frontend.md`)
- **Database:** Supabase (PostgreSQL). No Supabase Auth in v1 (see D3).
- **AI inference:** Groq API, `openai/gpt-oss-120b`, via the `openai` SDK with `baseURL` `https://api.groq.com/openai/v1`
- **Audio / TTS:** pre-generated with Microsoft Edge neural voices via `msedge-tts` (zero API key), one distinct voice per speaker, per-segment MP3s stitched into one MP3 per meeting in `/public/audio`; durations measured by our own MP3 frame parser in `scripts/generate-audio.ts`
- **Validation:** Zod on all route bodies
- **IDs/slugs:** `nanoid` for clip slugs
- **Hosting:** Vercel (Node runtime, streaming responses)

## Tooling
- Package manager: npm (lockfile committed)
- Scripts: `npm run seed` (idempotent upsert), `npm run audio` (TTS build), `npm run dev|build|lint`
- Agent logging: `.claude/hooks/capture.js` → `.agent-logs/`

## Environment variables
Supabase moved to Publishable (`sb_publishable_...`) and Secret (`sb_secret_...`) keys alongside the legacy `anon` / `service_role` JWTs. Keys live in `.env.local` (gitignored) and Vercel project settings; `.env.example` is the template.

| Variable | Value | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | public, read-only via RLS |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` (legacy: `SUPABASE_SERVICE_ROLE_KEY`) | server only |
| `GROQ_API_KEY` | `gsk_...` | server only |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally | public |

Code reads the publishable key first and falls back to the anon key; server code reads `SUPABASE_SECRET_KEY` then `SUPABASE_SERVICE_ROLE_KEY`.

## Database tooling
All Postgres schema work goes through the Supabase agent plugin (see D22 in `07-decisions.md`).
