import Link from "next/link";
import { AvatarStack } from "@/components/meetings/AvatarStack";
import { cn } from "@/lib/utils";
import type { MeetingListItem } from "@/lib/types";

const SOURCE_LABEL: Record<MeetingListItem["source"], string> = {
  zoom: "Zoom",
  meet: "Google Meet",
  teams: "Teams",
};

// Fixed locale and timezone so server and client render identical strings.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** First sentence of a paragraph, or the whole text if no sentence end is found. */
function firstSentence(text: string): string {
  const match = text.trim().match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

interface MeetingRowProps {
  meeting: MeetingListItem;
  featured?: boolean;
}

export function MeetingRow({ meeting, featured = false }: MeetingRowProps) {
  const {
    id,
    title,
    recorded_at,
    duration,
    source,
    participants,
    tasks_total,
    tasks_done,
    clips_count,
    summary_json,
  } = meeting;

  const chapters = summary_json?.chapters?.slice(0, 3) ?? [];
  const overview = summary_json?.overview ? firstSentence(summary_json.overview) : "";
  const allDone = tasks_total > 0 && tasks_done === tasks_total;
  const percent = tasks_total > 0 ? Math.round((tasks_done / tasks_total) * 100) : 0;

  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/meetings/${id}`}
        className={cn(
          "block rounded-md px-3 transition-colors hover:bg-primary-soft/50",
          featured ? "py-6" : "py-4",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <h2
              className={cn(
                "font-heading font-semibold tracking-tight text-foreground",
                featured ? "break-words text-2xl sm:text-3xl" : "truncate text-base",
              )}
            >
              {title}
            </h2>

            {featured && overview && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{overview}</p>
            )}

            {featured && chapters.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {chapters.map((c) => (
                  <li
                    key={`${c.start_time}-${c.title}`}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {c.title}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <time dateTime={recorded_at}>{formatDate(recorded_at)}</time>
              <span className="tnum">{formatTime(recorded_at)}</span>
              <span className="tnum">{Math.round(duration / 60)} min</span>
              <span className="rounded-full border border-border px-2 py-px text-xs">
                {SOURCE_LABEL[source]}
              </span>
              {clips_count > 0 && (
                <span className="tnum">
                  {clips_count} {clips_count === 1 ? "clip" : "clips"}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
            <AvatarStack participants={participants} max={5} size={featured ? 32 : 28} />
            {tasks_total > 0 && (
              <div className="flex w-36 flex-col gap-1.5">
                <p className="tnum text-xs text-muted-foreground">
                  {tasks_done} of {tasks_total} tasks done
                </p>
                <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-[width]", allDone ? "bg-success" : "bg-primary")}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
