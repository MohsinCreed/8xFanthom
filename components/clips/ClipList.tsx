"use client";

import { useState } from "react";
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
  if (clips.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No clips yet. Pick a start and end above, or press &quot;Clip from here&quot; on a transcript line.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {clips.map((clip) => (
        <ClipRow key={clip.id} clip={clip} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function ClipRow({ clip, onDelete }: { clip: Clip; onDelete: (id: string) => void }) {
  const { currentTime, playRange } = usePlayer();
  const [confirming, setConfirming] = useState(false);
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
        <p className="truncate text-sm font-medium">{clip.title}</p>
        <p className="tnum text-xs text-muted-foreground">
          {fmtTime(start)} to {fmtTime(end)} ({fmtTime(end - start)} long)
        </p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2 text-sm" role="group" aria-label="Confirm delete">
          <span>Delete clip?</span>
          <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(clip.id)}>
            Yes
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => playRange(start, end)}>
            <Play aria-hidden />
            Play
          </Button>
          <ShareButton slug={clip.share_slug} />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/clip/${clip.share_slug}`}>
              <ExternalLink aria-hidden />
              Open
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
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
