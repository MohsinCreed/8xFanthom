"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtTime } from "@/lib/transcript";
import type { Clip, Participant, Segment } from "@/lib/types";
import { usePlayer } from "./PlayerProvider";
import { ShortcutHelp } from "./ShortcutHelp";
import { Timeline } from "./Timeline";

export interface AudioPlayerProps {
  segments: Segment[];
  participants: Participant[];
  chapters: { title: string; start_time: number }[];
  clips: Clip[];
}

const RATES = [1, 1.25, 1.5, 2];

const iconBtn =
  "inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted md:size-9 disabled:pointer-events-none disabled:opacity-50";

export function AudioPlayer({ segments, participants, chapters, clips }: AudioPlayerProps) {
  const { currentTime, duration, isPlaying, rate, activeIndex, error, toggle, skip, setRate } = usePlayer();

  const speaker = useMemo(() => {
    if (activeIndex < 0) return null;
    const id = segments[activeIndex]?.participant_id;
    return participants.find((p) => p.id === id) ?? null;
  }, [activeIndex, segments, participants]);

  const disabled = error !== null;
  const rateLabel = `${rate}×`;
  const cycleRate = () => {
    const i = RATES.indexOf(rate);
    setRate(RATES[(i + 1) % RATES.length]);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-md border border-border bg-card p-2 lg:p-4">
        {error && (
          <p role="status" className="mb-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Audio couldn&rsquo;t be loaded. The transcript is still available.
          </p>
        )}
        <div className="mb-1.5 flex items-center gap-x-2 flex-nowrap lg:mb-3 lg:gap-x-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Back 10 seconds" disabled={disabled} onClick={() => skip(-10)} className={iconBtn}>
                <RotateCcw className="size-5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Back 10 seconds (J)</TooltipContent>
          </Tooltip>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={disabled}
            onClick={toggle}
            className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPlaying ? <Pause className="size-5" aria-hidden /> : <Play className="size-5 translate-x-px" aria-hidden />}
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Forward 10 seconds" disabled={disabled} onClick={() => skip(10)} className={iconBtn}>
                <RotateCw className="size-5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Forward 10 seconds (L)</TooltipContent>
          </Tooltip>
          <button
            type="button"
            aria-label={`Playback speed ${rateLabel}`}
            disabled={disabled}
            onClick={cycleRate}
            className="tnum inline-flex h-10 min-w-12 md:h-8 items-center justify-center rounded-full border border-border px-3 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            {rateLabel}
          </button>
          <div className="ml-auto flex min-w-0 items-center gap-3 whitespace-nowrap text-sm">
            <span className="tnum text-muted-foreground">
              <span className="text-foreground">{fmtTime(currentTime)}</span> / {fmtTime(duration)}
            </span>
            <span className="hidden h-7 w-36 min-w-0 shrink items-center gap-1.5 lg:flex">
              {speaker && (
                <>
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: speaker.color }} aria-hidden />
                  <span className="truncate font-medium">{speaker.name}</span>
                </>
              )}
            </span>
            <span className="hidden lg:inline-flex">
              <ShortcutHelp />
            </span>
          </div>
        </div>
        <Timeline segments={segments} participants={participants} chapters={chapters} clips={clips} />
      </div>
    </TooltipProvider>
  );
}
