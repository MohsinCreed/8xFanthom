"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Play, Trash2 } from "lucide-react";
import type { Clip } from "@/lib/types";
import { fmtTime } from "@/lib/transcript";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/components/workspace/PlayerProvider";
import { ShareButton } from "./ShareButton";

interface ClipListProps {
  clips: Clip[];
  onDelete: (id: string) => void;
}

export function ClipList({ clips, onDelete }: ClipListProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevCount = useRef(clips.length);

  // A deleted row takes focus with it; land on the list heading instead of the page top.
  useEffect(() => {
    if (clips.length < prevCount.current) headingRef.current?.focus();
    prevCount.current = clips.length;
  }, [clips.length]);

  return (
    <section aria-labelledby="clip-list-heading" className="flex flex-col gap-3">
      <h2
        id="clip-list-heading"
        ref={headingRef}
        tabIndex={-1}
        className="rounded-sm text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Your clips{clips.length > 0 ? ` (${clips.length})` : ""}
      </h2>
      {clips.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No clips yet. Pick a start and end above, or press &quot;Clip from here&quot; on a transcript line.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clips.map((clip) => (
            <ClipRow key={clip.id} clip={clip} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ClipRow({ clip, onDelete }: { clip: Clip; onDelete: (id: string) => void }) {
  const { currentTime, playRange } = usePlayer();
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) triggerRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  const start = Number(clip.start_time);
  const end = Number(clip.end_time);
  const inside = currentTime >= start && currentTime < end;

  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        inside ? "border-primary bg-accent" : "border-border bg-background"
      }`}
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{clip.title}</p>
        <p className="tnum text-xs text-muted-foreground">
          {fmtTime(start)} to {fmtTime(end)} ({fmtTime(end - start)} long)
        </p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2 text-sm" role="group" aria-label="Confirm delete">
          <span>Delete clip?</span>
          <Button type="button" variant="destructive" size="sm" className="max-md:h-10" onClick={() => onDelete(clip.id)}>
            Yes
          </Button>
          <Button ref={cancelRef} type="button" variant="ghost" size="sm" className="max-md:h-10" onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="max-md:h-10" onClick={() => playRange(start, end)}>
            <Play aria-hidden />
            Play
          </Button>
          <ShareButton slug={clip.share_slug} className="max-md:h-10" />
          <Button asChild variant="ghost" size="sm" className="max-md:h-10">
            <Link
              href={`/clip/${clip.share_slug}`}
              target="_blank"
              rel="noopener"
              aria-label={`Open clip ${clip.title} in a new tab`}
            >
              <ExternalLink aria-hidden />
              Open
            </Link>
          </Button>
          <Button
            type="button"
            ref={triggerRef}
            variant="ghost"
            size="icon-sm"
            className="ml-auto max-md:size-10"
            aria-label={`Delete clip ${clip.title}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      )}
    </li>
  );
}
