"use client";

import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { usePlayer } from "@/components/workspace/PlayerProvider";
import { fmtTime } from "@/lib/transcript";
import type { Summary } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_LABEL: Record<Summary["risks"][number]["severity"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_CLASS: Record<Summary["risks"][number]["severity"], string> = {
  high: "bg-amber-50 text-warn",
  medium: "bg-amber-50/60 text-warn/80",
  low: "bg-muted text-muted-foreground",
};

interface SummaryPanelProps {
  summary: Summary | null;
  participantsCount?: number;
}

export function SummaryPanel({ summary }: SummaryPanelProps) {
  const { currentTime, seek } = usePlayer();

  if (!summary) {
    return (
      <div className="flex flex-col gap-1 py-6">
        <p className="font-medium">No summary yet.</p>
        <p className="text-sm text-muted-foreground">
          A summary appears here once this meeting has been processed.
        </p>
      </div>
    );
  }

  const jump = (t: number, play = true) => seek(t, { play });

  // Last chapter whose start_time has been reached.
  let activeChapter = -1;
  summary.chapters.forEach((c, i) => {
    if (c.start_time <= currentTime) activeChapter = i;
  });

  return (
    <div className="flex flex-col">
      {summary.overview && (
        <Section id="summary-overview" title="Overview" first>
          <p className="max-w-prose text-[15px] leading-relaxed">{summary.overview}</p>
        </Section>
      )}

      {summary.chapters.length > 0 && (
        <Section id="summary-chapters" title="Chapters">
          <ul aria-label="Chapters" className="flex flex-col">
            {summary.chapters.map((c, i) => {
              const active = i === activeChapter;
              return (
                <li key={`${c.start_time}-${i}`}>
                  <button
                    type="button"
                    onClick={() => jump(c.start_time)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "relative flex w-full items-baseline gap-3 rounded-md py-2 pl-3 pr-2 text-left text-[15px] transition-colors hover:bg-muted",
                      active ? "font-medium text-primary" : "text-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                      />
                    )}
                    <span
                      className={cn(
                        "tnum w-12 shrink-0 text-sm",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {fmtTime(c.start_time)}
                    </span>
                    <span>{c.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {summary.decisions.length > 0 && (
        <Section id="summary-decisions" title="Decisions">
          <ul className="flex flex-col gap-3">
            {summary.decisions.map((d, i) => (
              <li key={`${d.time}-${i}`} className="flex items-start gap-3">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 text-[15px] leading-relaxed">{d.text}</p>
                  <TimeButton time={d.time} onJump={jump} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {summary.risks.length > 0 && (
        <Section id="summary-risks" title="Risks">
          <ul className="flex flex-col gap-3">
            {summary.risks.map((r, i) => (
              <li key={`${r.time}-${i}`} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    SEVERITY_CLASS[r.severity],
                  )}
                >
                  {SEVERITY_LABEL[r.severity]}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 text-[15px] leading-relaxed">{r.text}</p>
                  <TimeButton time={r.time} onJump={jump} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {summary.key_topics.length > 0 && (
        <Section id="summary-topics" title="Key topics">
          <ul className="flex flex-wrap gap-2">
            {summary.key_topics.map((topic, i) => (
              <li
                key={`${topic}-${i}`}
                className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-foreground"
              >
                {topic}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  id,
  title,
  first = false,
  children,
}: {
  id: string;
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-3 py-8",
        first ? "pt-0" : "border-t border-border",
      )}
    >
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TimeButton({
  time,
  onJump,
}: {
  time: number;
  onJump: (t: number, play?: boolean) => void;
}) {
  const label = fmtTime(time);
  return (
    <button
      type="button"
      onClick={() => onJump(time, true)}
      aria-label={`Jump to ${label}`}
      className="tnum shrink-0 rounded-md text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      {label}
    </button>
  );
}
