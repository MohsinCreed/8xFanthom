"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MeetingRow } from "@/components/meetings/MeetingRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MeetingListItem } from "@/lib/types";
import { isTypingTarget } from "@/lib/utils";

interface MeetingListProps {
  meetings: MeetingListItem[];
}

export function MeetingList({ meetings }: MeetingListProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search unless the user is already typing somewhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const trimmed = query.trim();

  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.participants.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [meetings, trimmed]);

  // getMeetings() returns newest first, so the first item is the featured one.
  const latestId = meetings[0]?.id;
  const featured = filtered.find((m) => m.id === latestId) ?? null;
  const rest = filtered.filter((m) => m.id !== latestId);

  function clearSearch() {
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) setQuery("");
          }}
          placeholder="Search meetings"
          aria-label="Search meetings"
          autoComplete="off"
          className="h-9 pr-10"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 -translate-y-1/2 items-center rounded-sm border border-border bg-muted px-1.5 text-xs text-muted-foreground sm:inline-flex"
        >
          /
        </kbd>
      </div>

      {filtered.length === 0 ? (
        meetings.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">No meetings yet.</p>
        ) : (
          <div role="status" className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm text-muted-foreground">No meetings match “{trimmed}”.</p>
            <Button variant="outline" size="sm" onClick={clearSearch}>
              Clear search
            </Button>
          </div>
        )
      ) : (
        <ul className="flex flex-col">
          {featured && <MeetingRow meeting={featured} featured />}
          {rest.map((m) => (
            <MeetingRow key={m.id} meeting={m} />
          ))}
        </ul>
      )}
    </div>
  );
}
