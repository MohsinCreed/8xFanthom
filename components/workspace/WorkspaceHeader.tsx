import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AvatarStack } from "@/components/meetings/AvatarStack";
import type { Meeting, Participant } from "@/lib/types";

const SOURCE_LABEL: Record<Meeting["source"], string> = {
  zoom: "Zoom",
  meet: "Google Meet",
  teams: "Microsoft Teams",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

interface WorkspaceHeaderProps {
  meeting: Meeting;
  participants: Participant[];
}

export function WorkspaceHeader({ meeting, participants }: WorkspaceHeaderProps) {
  const recorded = new Date(meeting.recorded_at);
  const minutes = Math.max(1, Math.round(meeting.duration / 60));
  const count = participants.length;

  return (
    <header className="flex flex-col gap-3">
      <Link
        href="/meetings"
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        All meetings
      </Link>

      <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {meeting.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>{DATE_FORMAT.format(recorded)}</span>
        <span>{TIME_FORMAT.format(recorded)}</span>
        <span>{minutes} min</span>
        <span>{SOURCE_LABEL[meeting.source]}</span>
        <span className="flex items-center gap-2">
          <AvatarStack participants={participants} />
          <span>
            {count} {count === 1 ? "person" : "people"}
          </span>
        </span>
      </div>
    </header>
  );
}
