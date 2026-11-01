"use client";

import { useEffect, type KeyboardEvent, type MouseEvent } from "react";
import { Pause, Play } from "lucide-react";
import { PlayerProvider, usePlayer } from "@/components/workspace/PlayerProvider";
import { Button } from "@/components/ui/button";
import { fmtTime } from "@/lib/transcript";
import { cn } from "@/lib/utils";
import type { Participant, Segment } from "@/lib/types";

interface ClipPlayerProps {
  src: string;
  /** Full meeting duration, used until the audio reports its own. */
  duration: number;
  start: number;
  end: number;
  segments: Segment[];
  participants: Participant[];
}

// Slack so float noise from timeupdate doesn't count as leaving the range.
const EPS = 0.15;
const KEY_STEP = 5;

function ClipControls({
  start,
  end,
  segments,
  participants,
}: Pick<ClipPlayerProps, "start" | "end" | "segments" | "participants">) {
  const { currentTime, isPlaying, activeIndex, error, seek, pause, playRange } = usePlayer();
  const length = end - start;
  const rel = Math.min(Math.max(currentTime - start, 0), length);

  // Sit at the clip start until the user plays (queued until metadata loads).
  useEffect(() => {
    seek(start);
  }, [seek, start]);

  // Global shortcuts (J/L/arrows/space) act on the whole recording; keep them inside the range.
  useEffect(() => {
    if (currentTime < start - EPS) {
      pause();
      seek(start);
    } else if (currentTime > end + EPS) {
      pause();
      seek(end);
    } else if (isPlaying && currentTime >= end) {
      pause();
    }
  }, [currentTime, isPlaying, start, end, pause, seek]);

  const onToggle = () => {
    if (isPlaying) pause();
    else if (currentTime >= end - EPS || currentTime < start) playRange(start, end);
    else playRange(currentTime, end);
  };

  const seekWithin = (t: number) => seek(Math.min(Math.max(t, start), end - 0.05));

  const onBarClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width <= 0) return;
    seekWithin(start + ((e.clientX - r.left) / r.width) * length);
  };

  const onBarKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = start + rel;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") seekWithin(t - KEY_STEP);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") seekWithin(t + KEY_STEP);
    else if (e.key === "Home") seekWithin(start);
    else if (e.key === "End") seekWithin(end);
    else return;
    e.preventDefault();
  };

  const byId = new Map(participants.map((p) => [p.id, p]));

  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        <Button type="button" size="icon-lg" onClick={onToggle} aria-label={isPlaying ? "Pause" : "Play clip"}>
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <span className="tnum w-11 shrink-0 text-sm text-muted-foreground">{fmtTime(rel)}</span>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Clip position"
          aria-valuemin={0}
          aria-valuemax={Math.round(length)}
          aria-valuenow={Math.round(rel)}
          aria-valuetext={`${fmtTime(rel)} of ${fmtTime(length)}`}
          onClick={onBarClick}
          onKeyDown={onBarKey}
          className="relative h-5 flex-1 cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(rel / length) * 100}%` }} />
          </div>
        </div>
        <span className="tnum w-11 shrink-0 text-right text-sm text-muted-foreground">{fmtTime(length)}</span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error} You can still read the transcript below.
        </p>
      )}

      <div className="mt-6" aria-label="Clip transcript">
        {segments.map((seg, i) => {
          const p = byId.get(seg.participant_id);
          const showSpeaker = i === 0 || segments[i - 1].participant_id !== seg.participant_id;
          const active = i === activeIndex;
          const from = Math.max(seg.start_time, start);
          const jump = () => playRange(from, end);
          return (
            <div
              key={seg.id}
              onClick={jump}
              className={cn(
                "cursor-pointer rounded-md border-l-[3px] px-3 py-1.5",
                showSpeaker && "mt-3 first:mt-0",
                active ? "border-primary bg-primary-soft" : "border-transparent hover:bg-muted/50",
              )}
            >
              {showSpeaker && p && (
                <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium" style={{ color: p.color }}>
                    {p.name}
                  </span>
                  {p.role && <span className="text-muted-foreground">{p.role}</span>}
                </div>
              )}
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label={`Play from ${fmtTime(from - start)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    jump();
                  }}
                  className="tnum mt-0.5 shrink-0 rounded-sm text-xs leading-relaxed text-muted-foreground hover:text-primary"
                >
                  {fmtTime(from - start)}
                </button>
                <p className="max-w-[70ch] text-[15px] leading-relaxed">{seg.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ClipPlayer({ src, duration, start, end, segments, participants }: ClipPlayerProps) {
  return (
    <PlayerProvider src={src} duration={duration} segments={segments}>
      <ClipControls start={start} end={end} segments={segments} participants={participants} />
    </PlayerProvider>
  );
}
