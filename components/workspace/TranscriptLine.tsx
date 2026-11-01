"use client";

import { memo, type ReactNode } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtTime } from "@/lib/transcript";
import { cn } from "@/lib/utils";
import type { Participant, Segment } from "@/lib/types";

export interface TranscriptLineProps {
  segment: Segment;
  participant: Participant;
  showSpeaker: boolean;
  active: boolean;
  dimmed?: boolean;
  query?: string;
  matchActive?: boolean;
  onSeek: (t: number) => void;
  onClip?: (segment: Segment) => void;
}

function highlight(text: string, query: string | undefined, strong: boolean): ReactNode {
  const q = query?.trim();
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const lower = q.toLowerCase();
  return text.split(re).map((part, i) =>
    part.toLowerCase() === lower ? (
      <mark
        key={i}
        className={cn("rounded-sm px-0.5 text-foreground", strong ? "bg-yellow-300 ring-1 ring-yellow-500" : "bg-yellow-200/70")}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function TranscriptLineImpl({
  segment,
  participant,
  showSpeaker,
  active,
  dimmed,
  query,
  matchActive,
  onSeek,
  onClip,
}: TranscriptLineProps) {
  return (
    <div
      data-seq={segment.seq}
      aria-current={active ? "true" : undefined}
      onClick={() => onSeek(segment.start_time)}
      className={cn(
        "group cursor-pointer rounded-md border-l-[3px] px-3 py-1.5",
        showSpeaker && "mt-3",
        active ? "border-primary bg-primary-soft" : "border-transparent hover:bg-muted/50",
        dimmed && "opacity-40",
      )}
    >
      {showSpeaker && (
        <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium" style={{ color: participant.color }}>
            {participant.name}
          </span>
          {participant.role && <span className="text-muted-foreground">{participant.role}</span>}
        </div>
      )}
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={`Play from ${fmtTime(segment.start_time)}`}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(segment.start_time);
          }}
          className="tnum -mx-2 -my-1.5 mt-0 shrink-0 rounded-sm px-2 py-2 text-xs leading-relaxed text-muted-foreground hover:text-primary max-md:-my-2.5 max-md:py-3"
        >
          {fmtTime(segment.start_time)}
        </button>
        <p className="max-w-[70ch] text-[15px] leading-relaxed">{highlight(segment.text, query, !!matchActive)}</p>
        {onClip && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Clip from here"
            title="Clip from here"
            onClick={(e) => {
              e.stopPropagation();
              onClip(segment);
            }}
            className="ml-auto opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 max-lg:size-9 [@media(hover:none)]:opacity-100"
          >
            <Scissors />
          </Button>
        )}
      </div>
    </div>
  );
}

export const TranscriptLine = memo(TranscriptLineImpl);
