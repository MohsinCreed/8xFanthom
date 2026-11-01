"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Scissors } from "lucide-react";
import type { Clip, ClipDraft } from "@/lib/types";
import { fmtTime } from "@/lib/transcript";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/components/workspace/PlayerProvider";

export const MAX_CLIP_SECONDS = 120;
export const MAX_TITLE_LENGTH = 80;
const DEFAULT_CLIP_SECONDS = 30;

/** Parses "m:ss" (or "h:mm:ss", or plain seconds) to seconds; null when malformed. */
export function parseTime(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

interface ClipCreatorProps {
  duration: number;
  draft: ClipDraft | null;
  onCreate: (input: { title: string; startTime: number; endTime: number }) => Promise<Clip | null>;
  onCreated?: (clip: Clip) => void;
}

export function ClipCreator({ duration, draft, onCreate, onCreated }: ClipCreatorProps) {
  const { currentTime, playRange } = usePlayer();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-apply whenever a new draft object arrives; otherwise default to the playhead.
  useEffect(() => {
    if (draft) {
      setTitle(draft.title?.slice(0, MAX_TITLE_LENGTH) ?? "");
      setStart(fmtTime(draft.startTime));
      setEnd(fmtTime(Math.min(Math.ceil(draft.endTime), duration)));
      return;
    }
    const s = Math.floor(currentTime);
    setStart(fmtTime(s));
    setEnd(fmtTime(Math.min(s + DEFAULT_CLIP_SECONDS, duration)));
    // Only a new draft should reset the form, not playhead movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const startTime = parseTime(start);
  const endTime = parseTime(end);
  const trimmedTitle = title.trim();

  const problem = useMemo(() => {
    if (startTime === null || endTime === null) return "Enter times as minutes:seconds, like 1:05.";
    if (startTime >= endTime) return "The end must be after the start.";
    if (endTime > duration) return `The end can't be later than the recording (${fmtTime(duration)}).`;
    if (endTime - startTime > MAX_CLIP_SECONDS) {
      return `Clips can be at most ${MAX_CLIP_SECONDS / 60} minutes long.`;
    }
    return null;
  }, [startTime, endTime, duration]);

  const valid = problem === null && trimmedTitle.length > 0;
  const length = startTime !== null && endTime !== null ? Math.max(0, endTime - startTime) : 0;

  function preview() {
    if (problem === null && startTime !== null && endTime !== null) playRange(startTime, endTime);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting || startTime === null || endTime === null) return;
    setSubmitting(true);
    const clip = await onCreate({ title: trimmedTitle, startTime, endTime });
    setSubmitting(false);
    if (!clip) return;
    const s = Math.floor(currentTime);
    setTitle("");
    setStart(fmtTime(s));
    setEnd(fmtTime(Math.min(s + DEFAULT_CLIP_SECONDS, duration)));
    onCreated?.(clip);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Scissors className="size-4 text-muted-foreground" aria-hidden />
        Create a clip
      </h3>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="clip-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="clip-title"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is this moment about?"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TimeField
          id="clip-start"
          label="Start"
          value={start}
          onChange={setStart}
          onUseCurrent={() => setStart(fmtTime(currentTime))}
        />
        <TimeField
          id="clip-end"
          label="End"
          value={end}
          onChange={setEnd}
          onUseCurrent={() => setEnd(fmtTime(Math.min(Math.ceil(currentTime), duration)))}
        />
      </div>
      <p className={`text-sm ${problem ? "text-warn" : "text-muted-foreground"}`} aria-live="polite">
        {problem ?? (
          <>
            Length <span className="tnum">{fmtTime(length)}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={preview} disabled={problem !== null}>
          <Play aria-hidden />
          Preview
        </Button>
        <Button type="submit" disabled={!valid || submitting}>
          {submitting ? "Creating..." : "Create clip"}
        </Button>
      </div>
    </form>
  );
}

interface TimeFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUseCurrent: () => void;
}

function TimeField({ id, label, value, onChange, onUseCurrent }: TimeFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          placeholder="0:00"
          className="tnum w-24"
        />
        <Button type="button" variant="ghost" size="sm" onClick={onUseCurrent}>
          Use current time
        </Button>
      </div>
    </div>
  );
}
