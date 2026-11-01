"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Participant, Segment } from "@/lib/types";
import { usePlayer } from "./PlayerProvider";
import { TranscriptLine } from "./TranscriptLine";

export interface TranscriptPaneProps {
  segments: Segment[];
  participants: Participant[];
  className?: string;
}

export function TranscriptPane({ segments, participants, className }: TranscriptPaneProps) {
  const { activeIndex, seek } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const followRef = useRef(true);
  const freshQuery = useRef(true);
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [matchPos, setMatchPos] = useState(0);
  const [filter, setFilter] = useState<Set<string>>(new Set());

  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [] as number[];
    const out: number[] = [];
    segments.forEach((s, i) => {
      if (s.text.toLowerCase().includes(q)) out.push(i);
    });
    return out;
  }, [segments, q]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const safePos = matches.length ? Math.min(matchPos, matches.length - 1) : 0;
  const currentMatch = matches.length ? matches[safePos] : -1;

  const setFollowing = useCallback((v: boolean) => {
    followRef.current = v;
    setFollow(v);
  }, []);

  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const c = containerRef.current;
    if (!c || index < 0) return;
    const el = c.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = el.offsetTop - c.clientHeight / 2 + el.offsetHeight / 2;
    c.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduce ? "smooth" : "auto" });
  }, []);

  // auto-follow
  useEffect(() => {
    if (followRef.current) scrollToIndex(activeIndex, true);
  }, [activeIndex, scrollToIndex]);

  // user scroll detection (not programmatic)
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const off = () => setFollowing(false);
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key)) off();
    };
    c.addEventListener("wheel", off, { passive: true });
    c.addEventListener("touchmove", off, { passive: true });
    // dragging the scrollbar: pointerdown lands on the container itself, not on a child
    const onPointerDown = (e: PointerEvent) => {
      if (e.target === c) off();
    };
    c.addEventListener("pointerdown", onPointerDown);
    c.addEventListener("keydown", onKey);
    return () => {
      c.removeEventListener("pointerdown", onPointerDown);
      c.removeEventListener("wheel", off);
      c.removeEventListener("touchmove", off);
      c.removeEventListener("keydown", onKey);
    };
  }, [setFollowing]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goToMatch = (pos: number) => {
    if (!matches.length) return;
    const p = ((pos % matches.length) + matches.length) % matches.length;
    setMatchPos(p);
    const idx = matches[p];
    seek(segments[idx].start_time);
    scrollToIndex(idx, true);
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (freshQuery.current) {
        freshQuery.current = false;
        goToMatch(e.shiftKey ? matches.length - 1 : 0);
      } else {
        goToMatch(e.shiftKey ? safePos - 1 : safePos + 1);
      }
    } else if (e.key === "Escape") {
      setQuery("");
      setMatchPos(0);
      freshQuery.current = true;
    }
  };

  const toggleSpeaker = (id: string) =>
    setFilter((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onSeek = useCallback((t: number) => seek(t, { play: true }), [seek]);

  const jumpLive = () => {
    setFollowing(true);
    scrollToIndex(activeIndex, true);
  };

  return (
    <div className={cn("relative flex min-h-0 flex-col rounded-md border border-border bg-card", className)}>
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 space-y-2 border-b border-border bg-card p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              ref={searchRef}
              type="text"
              aria-label="Search transcript"
              placeholder="Search transcript (press /)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMatchPos(0);
                freshQuery.current = true;
              }}
              onKeyDown={onSearchKey}
              className="pl-8 pr-20"
            />
            {q && (
              <span className="tnum pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" aria-live="polite">
                {matches.length ? `${safePos + 1} of ${matches.length}` : "0 of 0"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by speaker">
            <button
              type="button"
              aria-pressed={filter.size === 0}
              onClick={() => setFilter(new Set())}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                filter.size === 0 ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              All speakers
            </button>
            {participants.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={filter.has(p.id)}
                onClick={() => toggleSpeaker(p.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  filter.has(p.id) ? "border-primary bg-primary-soft text-foreground" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {q && matches.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No lines match &ldquo;{query.trim()}&rdquo;</p>
        ) : (
          <div className="p-2">
            {segments.map((s, i) => {
              const p = byId.get(s.participant_id);
              if (!p) return null;
              const showSpeaker = i === 0 || segments[i - 1].participant_id !== s.participant_id;
              const dimmed = q ? !matchSet.has(i) : filter.size > 0 && !filter.has(s.participant_id);
              return (
                <div key={s.id} data-index={i}>
                  <TranscriptLine
                    segment={s}
                    participant={p}
                    showSpeaker={showSpeaker}
                    active={i === activeIndex}
                    dimmed={dimmed}
                    query={q ? query : undefined}
                    matchActive={i === currentMatch}
                    onSeek={onSeek}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!follow && (
        <button
          type="button"
          onClick={jumpLive}
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowDown className="size-4" aria-hidden />
          Jump to live
        </button>
      )}
    </div>
  );
}
