"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtTime } from "@/lib/transcript";
import type { Clip, Participant, Segment } from "@/lib/types";
import { usePlayer } from "./PlayerProvider";

export interface TimelineProps {
  segments: Segment[];
  participants: Participant[];
  chapters: { title: string; start_time: number }[];
  clips: Clip[];
}

export function Timeline({ segments, participants, chapters, clips }: TimelineProps) {
  const { currentTime, duration, seek, skip } = usePlayer();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);

  const colors = useMemo(() => new Map(participants.map((p) => [p.id, p.color])), [participants]);

  const total = duration > 0 ? duration : 1;
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / total) * 100))}%`;

  const timeAt = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return { x: 0, t: 0 };
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - r.left), r.width);
      return { x, t: r.width > 0 ? (x / r.width) * total : 0 };
    },
    [total],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const h = timeAt(e.clientX);
    setHover(h);
    seek(h.t);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const h = timeAt(e.clientX);
    setHover(h);
    if (dragging.current) seek(h.t);
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      skip(-5);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      skip(5);
    } else if (e.key === "Home") {
      e.preventDefault();
      seek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seek(total);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full select-none">
        {/* chapter ticks */}
        <div className="relative h-3">
          {chapters.map((c) => (
            <Tooltip key={`${c.start_time}-${c.title}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Chapter ${c.title}, ${fmtTime(c.start_time)}`}
                  onClick={() => seek(c.start_time)}
                  className="absolute top-0 -ml-2 flex h-3 w-4 items-end justify-center rounded-sm"
                  style={{ left: pct(c.start_time) }}
                >
                  <span className="h-2.5 w-px bg-muted-foreground/60" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {c.title} <span className="tnum opacity-70">{fmtTime(c.start_time)}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* strip */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${fmtTime(currentTime)} of ${fmtTime(total)}`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => {
            if (!dragging.current) setHover(null);
          }}
          className="relative h-10 w-full cursor-pointer touch-none rounded-md bg-muted"
        >
          <div className="absolute inset-0 overflow-hidden rounded-md">
            {segments.map((s) => (
              <div
                key={s.id}
                className="absolute inset-y-0"
                style={{
                  left: pct(s.start_time),
                  width: `${Math.max(0, ((s.end_time - s.start_time) / total) * 100)}%`,
                  backgroundColor: colors.get(s.participant_id) ?? "var(--muted-foreground)",
                  opacity: 0.85,
                  borderRight: "1px solid var(--background)",
                }}
              />
            ))}
            {/* dim the unplayed part */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 bg-background/55"
              style={{ left: pct(currentTime) }}
            />
          </div>

          {/* playhead */}
          <div
            className="pointer-events-none absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 bg-foreground"
            style={{ left: pct(currentTime) }}
          >
            <span className="absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-foreground" />
          </div>

          {hover && (
            <div
              className="tnum pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs text-background"
              style={{ left: hover.x }}
            >
              {fmtTime(hover.t)}
            </div>
          )}
        </div>

        {/* clip brackets */}
        <div className="relative h-3">
          {clips.map((c) => (
            <Tooltip key={c.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Clip ${c.title}, ${fmtTime(c.start_time)} to ${fmtTime(c.end_time)}`}
                  onClick={() => seek(c.start_time)}
                  className="absolute top-0 h-3 min-w-1.5 rounded-sm"
                  style={{
                    left: pct(c.start_time),
                    width: `${Math.max(0, ((c.end_time - c.start_time) / total) * 100)}%`,
                  }}
                >
                  <span className="absolute inset-x-0 top-0.5 h-1.5 rounded-b-sm border-x-2 border-b-2 border-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{c.title}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
